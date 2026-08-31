/**
 * An in-memory cache of requests issued on hover, for the click that usually
 * follows.
 *
 * The picker starts a `FlowStructure` request when the pointer settles on a
 * row; the editor that mounts on the click TAKES that request instead of
 * issuing its own, and the round trip is already partly or wholly paid. Two
 * rules keep a hover from becoming a cost:
 *
 * One request per key, ever, until it is taken or dies. A pointer that sweeps
 * the list ten times issues at most one request per row, because the second
 * hover finds the first in flight and returns it.
 *
 * A failure evicts itself. A hover fetch that failed on a network blip must not
 * be handed to the click as its answer — the click deserves its own attempt,
 * and gets one, because the rejected entry is already gone.
 *
 * `take` is one-shot: a prefetch feeds exactly one open. After that the editor
 * owns the flow, reconciles it from mutations, and writes it to the device;
 * a cached promise re-used minutes later would show a flow with none of that
 * and no mark saying so. The TTL guards the same thing on the other side: a
 * hover from a while ago is not an answer to a click now.
 *
 * `now` is injected so a test can move the clock without waiting on it.
 */
import { getDocMeta } from '~api';
import { FlowStructureDocument } from '~api/generated/flow-builder/graphql';
import { shapeFingerprint, type SnapshotScope } from './flowSnapshot';

/**
 * The one place the flow's cache scope is spelled: the device snapshot and the
 * hover prefetch are keyed identically, so "which flow, in which shape" is
 * answered the same way by both.
 *
 * Printing the document is what the transport does on the first request
 * anyway, and `getDocMeta` caches it, so the fingerprint costs nothing twice.
 */
export function flowScope(botId: string, flowId: string): SnapshotScope {
  return { botId, flowId, shape: shapeFingerprint(getDocMeta(FlowStructureDocument).text) };
}

export interface PrefetchCache<T> {
  /**
   * The request for `key`, started now if there is not one already. Returns
   * the shared promise either way — callers that only want to warm the cache
   * ignore it.
   */
  prefetch(key: string, load: () => Promise<T>): Promise<T>;
  /**
   * The request for `key` if one is in flight or settled within the TTL,
   * removed from the cache as it goes; null otherwise. Never returns a request
   * that has already failed.
   */
  take(key: string): Promise<T> | null;
  /** True while `take` would return something. */
  has(key: string): boolean;
  readonly size: number;
}

export interface PrefetchOptions {
  /** How long a SETTLED result stays takeable. In-flight ones always are. */
  ttlMs?: number;
  /** Bound on memory: beyond this the oldest entry goes. */
  maxEntries?: number;
  now?: () => number;
}

interface Entry<T> {
  promise: Promise<T>;
  issuedAt: number;
  /** Set when the promise resolves; the TTL counts from here. */
  settledAt: number | null;
}

/** Long enough to cover a hover, a pause, and the click; short enough that "a while ago" is not an answer. */
export const PREFETCH_TTL_MS = 30_000;
export const PREFETCH_MAX_ENTRIES = 8;

export function createPrefetchCache<T>(options: PrefetchOptions = {}): PrefetchCache<T> {
  const ttlMs = options.ttlMs ?? PREFETCH_TTL_MS;
  const maxEntries = options.maxEntries ?? PREFETCH_MAX_ENTRIES;
  const now = options.now ?? (() => Date.now());
  const entries = new Map<string, Entry<T>>();

  const alive = (entry: Entry<T>): boolean => entry.settledAt === null || now() - entry.settledAt <= ttlMs;

  const lookup = (key: string): Entry<T> | null => {
    const entry = entries.get(key);
    if (!entry) return null;
    if (alive(entry)) return entry;
    entries.delete(key);
    return null;
  };

  return {
    prefetch(key, load) {
      const held = lookup(key);
      if (held) return held.promise;
      const entry: Entry<T> = { promise: load(), issuedAt: now(), settledAt: null };
      entries.set(key, entry);
      entry.promise.then(
        () => {
          entry.settledAt = now();
        },
        () => {
          /* Only if it is still ours: a `take` in between handed the promise
             to a caller who is handling the rejection, and a new prefetch may
             have been issued under the same key since. */
          if (entries.get(key) === entry) entries.delete(key);
        },
      );
      /* Insertion order is age; the first key is the oldest. Evicted AFTER the
         insert so a cache of one still holds the request just made. */
      while (entries.size > maxEntries) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        entries.delete(oldest);
      }
      return entry.promise;
    },

    take(key) {
      const entry = lookup(key);
      if (!entry) return null;
      entries.delete(key);
      return entry.promise;
    },

    has(key) {
      return lookup(key) !== null;
    },

    get size() {
      return entries.size;
    },
  };
}
