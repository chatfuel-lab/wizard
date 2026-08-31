import { useCallback, useEffect, useState } from 'react';
import { InstagramAccountStateDocument } from '~api/generated/publishing/graphql';
import { canPublish, type Account, type AccountGate, type ApiClient } from '../types';
import { errorMessage } from '../lib/errors';

/**
 * Which of the four Instagram screens this deployment is on.
 *
 * The account hangs off a contact scope rather than off the bot, so the answer
 * is a walk over `contactScopes` for the one branch that carries it. Three
 * different nothings have to be told apart, because each is a different screen
 * and only one of them is a fault:
 *
 *   * no scope at all — nobody has connected an account. Offer the connect flow.
 *   * a scope without the publish permission — an account is connected, but it
 *     was granted the Minimal group. Offer the re-grant flow, not the connect one.
 *   * a query that failed — say so, and offer a retry.
 *
 * Asking up front is what lets the composer be absent rather than present and
 * broken: a publish into an unpermitted account fails several seconds later with
 * InstagramMissingPermissionsOrExpiredToken, after the operator has written the
 * whole post.
 */
export interface AccountApi {
  gate: AccountGate;
  /** The account when there is one, whatever its permissions. */
  account: Account | null;
  reload: () => void;
}

export function useAccount(client: ApiClient, botId: string, refreshToken = 0): AccountApi {
  const [gate, setGate] = useState<AccountGate>({ state: 'loading' });
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let live = true;
    setGate({ state: 'loading' });
    client
      .query(InstagramAccountStateDocument, { botID: botId })
      .then((data) => {
        if (!live) return;
        const scope = data.bot.contactScopes.find(
          (candidate): candidate is Extract<typeof candidate, { instagramAccount: Account }> =>
            'instagramAccount' in candidate && Boolean(candidate.instagramAccount),
        );
        const account = scope?.instagramAccount ?? null;
        if (!account) setGate({ state: 'absent' });
        else setGate(canPublish(account) ? { state: 'ready', account } : { state: 'unpermitted', account });
      })
      .catch((err: unknown) => {
        if (!live) return;
        setGate({ state: 'error', message: errorMessage(err) });
      });
    return () => {
      live = false;
    };
  }, [client, botId, tick, refreshToken]);

  const account = gate.state === 'ready' || gate.state === 'unpermitted' ? gate.account : null;
  return { gate, account, reload };
}
