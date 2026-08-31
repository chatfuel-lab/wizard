/**
 * How much of a shared deployment one tenant may take.
 *
 * The proxy's existing ceilings — `restMaxConcurrent`, `wsMaxSockets`, the auth
 * gate's misses-per-minute — are the deployment's, and they are the whole of
 * the protection while the deployment serves one customer. With the gate on it
 * serves many, and a ceiling that is only global is a ceiling one tenant can
 * spend on everybody else's behalf: 256 sockets is 256 sockets whether they
 * come from 256 customers or from one script.
 *
 * So the same shape again, keyed by tenant: a token bucket for requests and a
 * counter for live sockets. Neither is a security boundary — the fences are
 * that — and neither is meant to be felt by an app doing its job. A dashboard
 * opens one socket and asks a few dozen questions on load; these numbers are
 * an order of magnitude above that, and what they stop is the case where one
 * customer's runaway loop is every other customer's outage.
 *
 * The key is the fence itself, not the session: a tenant with four tabs, or one
 * that signed in again this minute, is still one tenant, and the bots they may
 * touch is the only stable name this proxy has for them. A caller with no fence
 * at all is not keyed and not limited — open mode has no tenants to tell apart,
 * and the global ceilings are already its limit.
 *
 * A fence with NOTHING in it is the third case, and it is not the second one. A
 * signed-in account that has no bot yet is fenced — it may touch none of them —
 * but every such account hashes to the same nothing, so they cannot be told
 * apart either. They share one bucket, at a fraction of a tenant's, because
 * what they can legitimately do is finish signing up: a handful of calls, one
 * socket. Whoever can open accounts on the deployment can otherwise mint an
 * unlimited caller per account, which is the ceiling one signature away from
 * not existing.
 *
 * Held in THIS process, like every other counter here, so what they bound is one
 * instance's share of a noisy neighbour. The caps that have to hold across all
 * of them live in SQL, on the deployment's own database, and are enforced there.
 */
import { createHash } from 'node:crypto';

/** What a tenant over its request budget is told. */
export const TENANT_BUSY_MESSAGE =
  'This workspace is sending more requests than the proxy will forward for one workspace — slow down and retry';

/** …and what closes a socket over the per-tenant socket count. */
export const TENANT_SOCKETS_MESSAGE =
  'This workspace already has as many live sockets open as the proxy will hold for one workspace';

/**
 * How many tenants are tracked. Past it the idle ones go: an entry whose bucket
 * is full and whose sockets are all closed is indistinguishable from one that
 * was never created.
 */
const MAX_TENANTS = 10_000;

/** How long an idle entry is kept before a sweep may drop it. */
const IDLE_MS = 5 * 60 * 1000;

export interface TenantLimitsOptions {
  /** Requests per minute per tenant, also the burst. */
  requestsPerMinute: number;
  /** Live browser sockets per tenant. */
  maxSockets: number;
  /** Test injection; defaults to Date.now. */
  now?: () => number;
}

/**
 * The one name every fenced caller with no bots shares.
 *
 * Not a hash: there is nothing to hash, and a constant says so. It cannot
 * collide with a real key — those are 32 hex characters.
 */
export const NO_BOTS_KEY = 'no-bots';

/**
 * What that shared bucket gets, as a fraction of one tenant's.
 *
 * An account between signing up and having its first bot asks a handful of
 * questions and holds one socket. Ten times smaller than a working tenant is
 * far above that and far below what an enumerator would want.
 */
const NO_BOTS_DIVISOR = 10;

export interface TenantLimits {
  /**
   * A stable name for the caller behind this fence, or undefined when there is
   * no fence to name them by — an unkeyed caller is not limited here.
   */
  key(botIds: ReadonlySet<string> | undefined): string | undefined;
  /** Spend one request from this tenant's budget; false when it is empty. */
  takeRequest(key: string | undefined): boolean;
  /** Count one live socket; false when the tenant is already at its ceiling. */
  openSocket(key: string | undefined): boolean;
  /** Release a socket counted by `openSocket`. */
  closeSocket(key: string | undefined): void;
  /** Live sockets this tenant holds — for tests and diagnostics. */
  sockets(key: string | undefined): number;
  readonly size: number;
  clear(): void;
}

export function createTenantLimits(options: TenantLimitsOptions): TenantLimits {
  const now = options.now ?? Date.now;
  const capacity = Math.max(1, options.requestsPerMinute);
  const maxSockets = Math.max(1, options.maxSockets);

  const sharedCapacity = Math.max(1, Math.floor(capacity / NO_BOTS_DIVISOR));
  const sharedSockets = Math.max(1, Math.floor(maxSockets / NO_BOTS_DIVISOR));
  const capacityFor = (key: string): number => (key === NO_BOTS_KEY ? sharedCapacity : capacity);
  const socketsFor = (key: string): number => (key === NO_BOTS_KEY ? sharedSockets : maxSockets);

  type Entry = { tokens: number; refilledAt: number; sockets: number; touched: number };
  const tenants = new Map<string, Entry>();

  const sweep = (at: number): void => {
    if (tenants.size < MAX_TENANTS) return;
    for (const [key, entry] of tenants) {
      if (entry.sockets === 0 && entry.tokens >= capacityFor(key) && at - entry.touched > IDLE_MS) {
        tenants.delete(key);
      }
    }
    // A sweep that freed nothing means every tenant is live; the oldest go
    // anyway rather than let the map grow without bound. An entry lost this
    // way forgives its spent request budget, which is the safe direction, and
    // its live `sockets` count, which is not — the ceiling is rebuilt from
    // zero while the sockets it counted are still open. The trade is accepted
    // because reaching it needs MAX_TENANTS live tenants at once, and an
    // unbounded map is the worse of the two failures.
    for (const key of tenants.keys()) {
      if (tenants.size < MAX_TENANTS) break;
      tenants.delete(key);
    }
  };

  const entryFor = (key: string, at: number): Entry => {
    const found = tenants.get(key);
    if (found) {
      found.touched = at;
      return found;
    }
    sweep(at);
    const fresh: Entry = { tokens: capacityFor(key), refilledAt: at, sockets: 0, touched: at };
    tenants.set(key, fresh);
    return fresh;
  };

  return {
    key(botIds) {
      if (!botIds) return undefined;
      if (botIds.size === 0) return NO_BOTS_KEY;
      const hash = createHash('sha256');
      for (const id of [...botIds].sort()) hash.update(id).update('|');
      return hash.digest('hex').slice(0, 32);
    },

    takeRequest(key) {
      if (key === undefined) return true;
      const at = now();
      const entry = entryFor(key, at);
      const room = capacityFor(key);
      const refill = ((at - entry.refilledAt) / 60_000) * room;
      if (refill > 0) {
        entry.tokens = Math.min(room, entry.tokens + refill);
        entry.refilledAt = at;
      }
      if (entry.tokens < 1) return false;
      entry.tokens -= 1;
      return true;
    },

    openSocket(key) {
      if (key === undefined) return true;
      const entry = entryFor(key, now());
      if (entry.sockets >= socketsFor(key)) return false;
      entry.sockets += 1;
      return true;
    },

    closeSocket(key) {
      if (key === undefined) return;
      const entry = tenants.get(key);
      if (!entry) return;
      entry.sockets = Math.max(0, entry.sockets - 1);
      entry.touched = now();
    },

    sockets(key) {
      return key === undefined ? 0 : (tenants.get(key)?.sockets ?? 0);
    },

    get size() {
      return tenants.size;
    },

    clear() {
      tenants.clear();
    },
  };
}
