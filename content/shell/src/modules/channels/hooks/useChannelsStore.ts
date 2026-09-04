import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  BotChannelsDocument,
  BotDisconnectContactScopeDocument,
  BotPlatformAccessRefreshLinkCreateDocument,
  BotPlatformConnectionLinkCreateDocument,
  PlatformOperationLinkPlatform,
} from '~api/generated/core/graphql';
import { navigateExternal } from '~ui';
import { channelsOf, type LinkPlatform } from '../lib/channels';
import { channelsReducer, initialChannelsState, type ChannelsState } from '../lib/channelsStore';
import { errorMessage, isAlreadyGone } from '../lib/errors';
import { returnUrls } from '../lib/returnUrl';
import type { ApiClient } from '../types';

/**
 * How long a tab may have been away before coming back re-reads the page.
 * A channel is connected on Chatfuel's own page, in this same tab or another
 * one, so what is on screen goes stale without anything here noticing.
 */
export const CHANNELS_REFETCH_THROTTLE_MS = 60_000;

const API_PLATFORM: Record<LinkPlatform, PlatformOperationLinkPlatform> = {
  whatsapp: PlatformOperationLinkPlatform.Whatsapp,
  instagram: PlatformOperationLinkPlatform.Instagram,
  tiktok: PlatformOperationLinkPlatform.Tiktok,
};

export interface ChannelsStore {
  state: ChannelsState;
  refresh(): void;
  /** Mint a connection link and leave for it. Rejects with what to show inline. */
  connect(platform: LinkPlatform): Promise<void>;
  /** The same for the asset already connected: re-grant its permissions. */
  refreshAccess(platform: LinkPlatform): Promise<void>;
  /** A channel already gone resolves — the page re-reads instead of complaining. */
  disconnect(scopeId: string): Promise<void>;
}

/**
 * One read and three writes over one reducer.
 *
 * Connecting is a hand-off, not a form: the API has no way for this app to
 * carry somebody through a platform's OAuth, so the app mints a one-shot link
 * and sends the browser to the page Chatfuel serves for it, with both
 * redirects pointing back at this page. Nothing about the link reaches the
 * screen — it is a credential with a job, and the job starts immediately.
 *
 * Successes are felt by arriving back with the channel connected; failures are
 * rethrown for the caller to show where the action was taken.
 */
export function useChannelsStore(client: ApiClient, botId: string): ChannelsStore {
  const [state, dispatch] = useReducer(channelsReducer, undefined, initialChannelsState);
  const loadedAtRef = useRef<number | null>(null);
  // In an effect, not in the render body: what a visibilitychange handler reads
  // later is state that has been committed, and a render stays a render.
  useEffect(() => {
    loadedAtRef.current = state.scopes.state === 'ready' ? state.scopes.loadedAt : null;
  }, [state.scopes]);

  // The token is read here and carried into the answer, so a write that lands
  // first wins: see `channelsReducer`.
  const token = state.token;
  useEffect(() => {
    if (state.epoch === 0) return;
    let cancelled = false;
    const epoch = state.epoch;
    client
      .query(BotChannelsDocument, { botID: botId })
      .then((data) => {
        if (cancelled) return;
        dispatch({ type: 'scopesLoaded', epoch, token, channels: channelsOf(data.bot.contactScopes), at: Date.now() });
      })
      .catch((err: unknown) => {
        if (!cancelled) dispatch({ type: 'scopesFailed', epoch, token, message: errorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
    // `token` is the stamp this read leaves with, not a reason to read again:
    // a write bumps it, and re-running here would answer its own mutation with
    // a second query. The epoch is what says a new read is wanted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, botId, state.epoch]);

  // First load, and a fresh one per (client, bot).
  useEffect(() => {
    dispatch({ type: 'reset' });
  }, [client, botId]);

  // Reconnect → reload; a tab that comes back after a while → reload (throttled).
  // Nothing on the server pushes a channel connecting or going away, and the
  // connecting itself happens on somebody else's page, so this is the whole of
  // how this one learns.
  useEffect(() => {
    const offReconnect = client.onReconnect(() => dispatch({ type: 'reset' }));
    const onVisible = () => {
      if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
      const at = loadedAtRef.current;
      if (at === null || Date.now() - at > CHANNELS_REFETCH_THROTTLE_MS) dispatch({ type: 'reset' });
    };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
    return () => {
      offReconnect();
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
    };
  }, [client]);

  const refresh = useCallback(() => dispatch({ type: 'reset' }), []);

  const run = useCallback(async (key: string, work: () => Promise<void>) => {
    dispatch({ type: 'opStarted', key });
    try {
      await work();
    } finally {
      dispatch({ type: 'opFinished', key });
    }
  }, []);

  /* The link is minted and spent in one gesture. It is never held, never
     shown, and never reused: a second press replaces the first link on the
     server anyway, and a fresh one carries redirects built from where the app
     is standing now. */
  const handOff = useCallback(
    (kind: 'connect' | 'refresh', platform: LinkPlatform) =>
      run(`${kind}:${platform}`, async () => {
        const variables = { botID: botId, platform: API_PLATFORM[platform], ...returnUrls(platform) };
        const url =
          kind === 'connect'
            ? (await client.mutate(BotPlatformConnectionLinkCreateDocument, variables)).botPlatformConnectionLinkCreate
                .url
            : (await client.mutate(BotPlatformAccessRefreshLinkCreateDocument, variables))
                .botPlatformAccessRefreshLinkCreate.url;
        if (!navigateExternal(url)) {
          throw new Error('Chatfuel sent back an address this app will not open. Ask support to check the connection.');
        }
      }),
    [client, botId, run],
  );

  const connect = useCallback<ChannelsStore['connect']>((platform) => handOff('connect', platform), [handOff]);
  const refreshAccess = useCallback<ChannelsStore['refreshAccess']>(
    (platform) => handOff('refresh', platform),
    [handOff],
  );

  const disconnect = useCallback<ChannelsStore['disconnect']>(
    (scopeId) =>
      run(`disconnect:${scopeId}`, async () => {
        try {
          const data = await client.mutate(BotDisconnectContactScopeDocument, {
            botID: botId,
            contactScopeID: scopeId,
          });
          dispatch({
            type: 'scopesReplaced',
            channels: channelsOf(data.botDisconnectContactScope.contactScopes),
            at: Date.now(),
          });
        } catch (err) {
          /* Every disconnect failure re-reads, because this one refusal cannot
             be read from the code. A scope the bot no longer has answers
             `InternalServerError` — the same thing a genuine fault answers —
             so the page reconciles first and shows the error second, and a
             card left over from another tab does not survive the round trip. */
          dispatch({ type: 'reset' });
          if (!isAlreadyGone(err)) throw err;
        }
      }),
    [client, botId, run],
  );

  return useMemo(
    () => ({ state, refresh, connect, refreshAccess, disconnect }),
    [state, refresh, connect, refreshAccess, disconnect],
  );
}
