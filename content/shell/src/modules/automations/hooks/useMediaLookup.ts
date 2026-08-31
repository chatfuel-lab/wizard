import { useEffect, useMemo, useRef, useState } from 'react';
import { AutomationsInstagramMediaDocument } from '~api/generated/automations/graphql';
import { useAutomations } from '../AutomationsContext';
import {
  createMediaCache,
  lookupAll,
  resolveMedia,
  takeBatch,
  unresolvedIds,
  type MediaCache,
  type ResolvedMedia,
} from '../lib/mediaLookup';
import type { ApiClient } from '../types';

export type { ResolvedMedia } from '../lib/mediaLookup';

export interface MediaLookup {
  /** id → resolved media; undefined while it is still being asked for. */
  byId: Record<string, ResolvedMedia | undefined>;
  /** At least one of the ids is still in flight. */
  loading: boolean;
  /** Put an answer the caller already has (a picker page) into the cache, so it is never asked for. */
  prime: (media: ResolvedMedia) => void;
}

/* One cache, one in-flight set and one set of waiting callers per bot, for the
 * session. Module-level on purpose: the same two posts show on the Channels
 * card, in the Rules panel and in the picker's chips, and each should cost one
 * query, not three. */
interface BotLookup {
  cache: MediaCache;
  inFlight: Set<string>;
  /** Mounted callers' pumps — every finished answer lets each of them start the next id. */
  pumps: Set<() => void>;
  /** Mounted callers' re-render pokes. */
  listeners: Set<() => void>;
}
const BOTS = new Map<string, BotLookup>();
const lookupFor = (botId: string): BotLookup => {
  let entry = BOTS.get(botId);
  if (!entry) {
    entry = { cache: createMediaCache(300), inFlight: new Set(), pumps: new Set(), listeners: new Set() };
    BOTS.set(botId, entry);
  }
  return entry;
};

const CONCURRENCY = 3;

async function resolveOne(client: ApiClient, botId: string, id: string): Promise<void> {
  const bot = lookupFor(botId);
  try {
    const data = await client.query(AutomationsInstagramMediaDocument, { botID: botId, id });
    const scope = data.bot.contactScopes.find(
      (s): s is Extract<(typeof data.bot.contactScopes)[number], { __typename: 'InstagramAccountContactScope' }> =>
        s.__typename === 'InstagramAccountContactScope',
    );
    bot.cache.set(id, resolveMedia(id, scope?.instagramAccount.media ?? null));
  } catch {
    // Not connected, or the id blew up: an unanswered id reads as Unavailable —
    // and is cached so a flapping account does not re-ask on every render.
    bot.cache.set(id, resolveMedia(id, null));
  } finally {
    bot.inFlight.delete(id);
    bot.listeners.forEach((l) => l());
    bot.pumps.forEach((p) => p());
  }
}

/**
 * Resolves picked Instagram media ids to `{ id, kind, caption, thumbnailUrl,
 * isUnknown }` through `instagramAccount.media(id)` — one query per id, at
 * most three at a time (the small queue), answers cached per bot for the
 * session (`lib/mediaLookup.ts`). B1's Posts / Stories editors and the
 * RuleCard call it; the Instagram picker primes it with the pages it loads.
 */
export function useMediaLookup(ids: readonly string[]): MediaLookup {
  const { client, botId } = useAutomations();
  const [version, setVersion] = useState(0);
  const key = ids.join(' ');
  const idsRef = useRef(ids);
  idsRef.current = ids;

  useEffect(() => {
    const bot = lookupFor(botId);
    const listener = () => setVersion((n) => n + 1);
    bot.listeners.add(listener);
    return () => {
      bot.listeners.delete(listener);
    };
  }, [botId]);

  // Ask for what is missing, a few at a time; every finished answer re-pumps.
  useEffect(() => {
    const bot = lookupFor(botId);
    const pump = () => {
      const queue = unresolvedIds(idsRef.current, bot.cache, bot.inFlight);
      for (const id of takeBatch(queue, bot.inFlight.size, CONCURRENCY)) {
        bot.inFlight.add(id);
        void resolveOne(client, botId, id);
      }
    };
    bot.pumps.add(pump);
    pump();
    return () => {
      bot.pumps.delete(pump);
    };
    // `key` stands in for `ids` — a fresh array on every render of the caller.
  }, [client, botId, key]);

  return useMemo<MediaLookup>(() => {
    const bot = lookupFor(botId);
    const byId = lookupAll(ids, bot.cache);
    const loading = ids.some((id) => id.trim() !== '' && byId[id] === undefined);
    return {
      byId,
      loading,
      prime: (media) => {
        if (bot.cache.has(media.id)) return;
        bot.cache.set(media.id, media);
        bot.listeners.forEach((l) => l());
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botId, key, version]);
}
