/**
 * The shared half of the resource fence: the bindings this deployment knows,
 * rather than the ones this process happens to have seen.
 *
 * resourceFence.ts holds a Map. It is free, it is fast, and it is one Node
 * process: a second instance of the same deployment starts knowing nothing, and
 * so does the first one after a restart. That is the difference between a fence
 * that refuses a foreign id and one that refuses it only if the request happens
 * to land where the answer came from.
 *
 * So the memory gets a floor under it — one table on the deployment's own
 * Supabase project, written by the SERVER and readable by nobody else, holding
 * `resource id → bot id` and nothing more. Two rules keep it small and keep it
 * off the hot path:
 *
 *  - Only ids a caller NAMES are written. Learning stays free and in memory:
 *    an answer carries thousands of ids and a session names a handful, and it
 *    is the handful the fence is ever asked about.
 *  - A write is a batch on a timer, and a failed one is not an error anybody
 *    hears about. The fence works without this table; what it loses when
 *    Supabase is unreachable is knowledge, which in `bound` mode is exactly
 *    where it started.
 *
 * A read is on the request's critical path, which is why this module does not
 * go through supabaseRpc.ts: those calls give the database ten seconds, and ten
 * seconds is a request the caller has given up on. Reads here have their own,
 * much shorter deadline, and a deadline that passes puts the store to sleep for
 * a moment rather than making the next caller wait for the same timeout again.
 */

/** What one lookup came back with. */
export interface ResourceRows {
  /**
   * False when the database did not answer. Nothing was learned, and — this is
   * the part that matters — nothing may be concluded: an id missing from a
   * failed lookup is not an id the deployment has never seen.
   */
  ok: boolean;
  /** Only the ids the table holds. `null` is a shared id; an absent one is unknown. */
  rows: ReadonlyMap<string, string | null>;
}

export interface ResourceStore {
  /** What the deployment knows about these ids. Never rejects. */
  lookup(ids: readonly string[]): Promise<ResourceRows>;
  /**
   * Record a binding this process is standing on, for the instances that were
   * not there when it was learned. `botId` null means shared. Returns at once:
   * the write is batched and nothing waits for it.
   */
  remember(botId: string | null, id: string): void;
  /** Send what is queued now. */
  flush(): Promise<void>;
  close(): void;
}

/**
 * How long a lookup may hold a request open.
 *
 * Short on purpose: a caller is waiting behind it, and on a WebSocket every
 * frame behind it is waiting too. Past this the fence falls back to what this
 * process knows, which is what it knew before this module existed.
 */
const LOOKUP_TIMEOUT_MS = 2_000;

/** A write nobody is waiting for can afford the ordinary one. */
const WRITE_TIMEOUT_MS = 5_000;

/**
 * How long the store sleeps after the database failed to answer. Without it a
 * Supabase outage costs every request the full timeout above, one after
 * another, which turns a lost fence into a slow proxy.
 */
const BACKOFF_MS = 5_000;

/** How long a batch of writes is held, so a burst of frames is one call. */
const FLUSH_MS = 250;

/** Ids in one `cf_resource_bind` call — the ceiling the function itself keeps. */
const WRITE_CHUNK = 500;

/** Ids that may be queued before the batch goes without waiting for the timer. */
const MAX_PENDING_IDS = 2_000;

/**
 * How long the same binding is not written again. A row is refreshed by any
 * instance that uses it, so a re-write buys nothing until it is close to
 * expiring; the table's own TTL is a day.
 */
const REWRITE_AFTER_MS = 6 * 60 * 60 * 1000;

/** How many of those "already written" notes are kept. */
const MAX_WRITTEN = 50_000;

const NO_ROWS: ReadonlyMap<string, string | null> = new Map();

export interface ResourceStoreOptions {
  supabaseUrl: string;
  /** Service-role key. A SECRET — it is the whole reason this table is not readable by a caller. */
  serviceRoleKey: string;
  fetch: typeof globalThis.fetch;
  /** Test injection; defaults to Date.now. */
  now?: () => number;
  flushMs?: number;
}

export function createResourceStore(options: ResourceStoreOptions): ResourceStore {
  const now = options.now ?? Date.now;
  const flushMs = options.flushMs ?? FLUSH_MS;

  /** When the store may be asked again after a failure. */
  let sleepingUntil = 0;
  /** `${botId}|${resourceId}` → when it may be written again. */
  const written = new Map<string, number>();
  /** Queued writes, by bot id — the empty string is the shared binding. */
  const pending = new Map<string, Set<string>>();
  let pendingCount = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  /** The write chain, so two flushes never race on the same rows. */
  let writing: Promise<void> = Promise.resolve();

  const call = (name: string, body: unknown, timeoutMs: number): Promise<Response> =>
    options.fetch(`${options.supabaseUrl}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: options.serviceRoleKey,
        authorization: `Bearer ${options.serviceRoleKey}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

  /** Room for one more note. Expired first, then the oldest — insertion order is age order. */
  const trimWritten = (at: number): void => {
    if (written.size <= MAX_WRITTEN) return;
    for (const [key, until] of written) {
      if (until <= at) written.delete(key);
    }
    for (const key of written.keys()) {
      if (written.size <= MAX_WRITTEN) break;
      written.delete(key);
    }
  };

  const flushNow = (): Promise<void> => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    const batches = [...pending].map(([bot, ids]) => ({ bot, ids: [...ids] }));
    pending.clear();
    pendingCount = 0;
    if (batches.length === 0) return writing;
    writing = writing.then(async () => {
      for (const { bot, ids } of batches) {
        for (let from = 0; from < ids.length; from += WRITE_CHUNK) {
          const chunk = ids.slice(from, from + WRITE_CHUNK);
          try {
            const response = await call(
              'cf_resource_bind',
              { p_bot_id: bot === '' ? null : bot, p_ids: chunk },
              WRITE_TIMEOUT_MS,
            );
            if (response.ok) continue;
          } catch {
            /* falls through to the same forgetting as a refusal */
          }
          // The write did not land, so the note that says it did must go too,
          // or this binding is never offered to the other instances again.
          for (const id of chunk) written.delete(`${bot}|${id}`);
        }
      }
    });
    return writing;
  };

  return {
    async lookup(ids) {
      if (ids.length === 0) return { ok: true, rows: NO_ROWS };
      const at = now();
      if (at < sleepingUntil) return { ok: false, rows: NO_ROWS };
      try {
        const response = await call('cf_resource_owner_lookup', { p_ids: ids }, LOOKUP_TIMEOUT_MS);
        if (!response.ok) {
          sleepingUntil = now() + BACKOFF_MS;
          return { ok: false, rows: NO_ROWS };
        }
        const body: unknown = await response.json();
        if (!Array.isArray(body)) {
          sleepingUntil = now() + BACKOFF_MS;
          return { ok: false, rows: NO_ROWS };
        }
        const rows = new Map<string, string | null>();
        for (const entry of body) {
          if (!entry || typeof entry !== 'object') continue;
          const row = entry as Record<string, unknown>;
          if (typeof row.resource_id !== 'string') continue;
          rows.set(row.resource_id.toLowerCase(), typeof row.bot_id === 'string' ? row.bot_id.toLowerCase() : null);
        }
        return { ok: true, rows };
      } catch {
        sleepingUntil = now() + BACKOFF_MS;
        return { ok: false, rows: NO_ROWS };
      }
    },

    remember(botId, id) {
      const bot = botId === null ? '' : botId.toLowerCase();
      const key = id.toLowerCase();
      // Keyed by BOTH halves: an id that has just gone shared is a different
      // binding from the one already written for it, and it is the correction
      // the other instances most need.
      const note = `${bot}|${key}`;
      const at = now();
      const until = written.get(note);
      if (until !== undefined && until > at) return;
      written.set(note, at + REWRITE_AFTER_MS);
      trimWritten(at);
      let queued = pending.get(bot);
      if (!queued) {
        queued = new Set<string>();
        pending.set(bot, queued);
      }
      if (queued.has(key)) return;
      queued.add(key);
      pendingCount += 1;
      if (pendingCount >= MAX_PENDING_IDS) {
        void flushNow();
        return;
      }
      if (timer === undefined) {
        timer = setTimeout(() => {
          timer = undefined;
          void flushNow();
        }, flushMs);
        timer.unref?.();
      }
    },

    flush: flushNow,

    close() {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      pending.clear();
      pendingCount = 0;
      written.clear();
    },
  };
}
