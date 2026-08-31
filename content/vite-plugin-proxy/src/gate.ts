/**
 * The auth gate: which Chatfuel bots may this Supabase session touch?
 *
 * Every account that signs up gets a workspace of its own with one bot in it,
 * so "who are you" and "whose bot is this" are the same question. The gate asks
 * it once per session: `POST {supabaseUrl}/rest/v1/rpc/cf_my_bot_ids` with the
 * caller's JWT answers the bot ids of every workspace they belong to (their own
 * plus any they were invited into). The proxy then fences each request against
 * that set — and since the proxy is what holds the master Chatfuel token, this
 * set IS the isolation boundary for bot-scoped calls.
 *
 * The proxy never verifies JWT signatures itself — PostgREST does, on the user's
 * own Supabase project; a bad or expired token is a PostgREST 401. The local
 * JWT work is reading two unverified claims: `exp`, which lets the gate refuse
 * an expired token with zero network and bounds the cache so a
 * revoked-then-expired token can never outlive its own lifetime, and `iss`,
 * which must be this project's own `{supabaseUrl}/auth/v1`. A token minted for
 * some other project is answerable by PostgREST too — with a 401, after a round
 * trip — so recognising it here is the same answer for no traffic.
 *
 * Cache: sha256(jwt) → { result, until }, 30 s by default for a positive answer
 * (a new workspace or a fresh invite is felt within that window), swept when it
 * grows past 1000 entries and evicted oldest-first when a sweep frees nothing.
 * The raw JWT is never stored.
 *
 * Refusals are cached too, briefly: a 401 for as long as the positive TTL
 * (bounded, like a positive answer, by the token's own `exp`) and a 503 for a
 * second. Without that, every repeat of one junk token is a round trip to
 * PostgREST the sender gets for free, which would make this proxy a way to
 * point traffic at somebody else's Supabase project. Concurrent asks about the
 * same token share one flight for the same reason.
 *
 * Distinct tokens cannot be deduplicated by hash, so the misses themselves are
 * metered: `maxMissesPerMinute` bounds how often this gate will talk to
 * Supabase at all, and over the limit the answer is a 503 that costs no network.
 * The ceiling is far above real traffic — a signed-in session misses once per
 * TTL.
 *
 * That budget is not spent first-come-first-served. A share of it is held for
 * sessions this gate has already admitted: every token that came back `ok` is
 * remembered by hash for as long as it can remain valid, and a token on that
 * list may draw the bucket down to empty while an unfamiliar one may not. A run
 * of tokens this gate has never admitted therefore cannot take the room a
 * returning session needs to be re-asked about when its cache entry lapses.
 *
 * An empty set is still `ok: true`: the caller is signed in but has no workspace
 * yet, which is exactly the state the provisioning route exists to leave.
 *
 * node:crypto + fetch only — no `vite`, no `ws`: this file is vendored into
 * scaffolded apps together with core.ts / vite.ts / server.ts.
 */
import { createHash } from 'node:crypto';

export type GateFailureCode = 'AuthSessionRequired' | 'AuthTenantForbidden' | 'ProxyAuthUnavailable';

export type GateResult =
  | { ok: true; botIds: ReadonlySet<string> }
  | { ok: false; status: 401 | 403 | 503; code: GateFailureCode; message: string };

export interface AuthGateOptions {
  /** The Supabase project URL, e.g. https://abc.supabase.co (trailing slash tolerated). */
  supabaseUrl: string;
  /** The publishable (or legacy anon) key — sent as `apikey` on every RPC. */
  anonKey: string;
  /** Positive-answer cache TTL. Default 30 000. */
  cacheTtlMs?: number;
  /**
   * How many cache misses per minute may reach Supabase, as a token bucket that
   * also holds a full minute's worth as burst. Default 600.
   */
  maxMissesPerMinute?: number;
  /**
   * The `iss` every accepted session token must carry. Defaults to
   * `{supabaseUrl}/auth/v1`, which is what Supabase Auth mints; set it only for
   * a deployment whose issuer is not derived from the project URL.
   */
  issuer?: string;
  /** The RPC name. Default 'cf_my_bot_ids'. */
  rpcName?: string;
  /** Upstream RPC timeout. Default 5 000. */
  timeoutMs?: number;
  /** Test injection; defaults to globalThis.fetch. */
  fetch?: typeof globalThis.fetch;
  /** Test injection; defaults to Date.now. */
  now?: () => number;
}

export interface AuthGate {
  /** `bearer` is the raw token (already stripped of its `Bearer ` scheme — see `bearerOf`). */
  verify(bearer: string | undefined): Promise<GateResult>;
  /**
   * Drop one session's cached answer. The provisioning route calls it after
   * attaching a bot: that session was cached seconds earlier with an EMPTY set
   * (it had no bot yet), and without this the app spends the rest of the TTL
   * being told its own brand-new bot is not its own.
   */
  forget(bearer: string | undefined): void;
  /** Cached answers, positive and negative alike. */
  readonly size: number;
  clear(): void;
}

export const GATE_MESSAGES: Record<GateFailureCode, string> = {
  AuthSessionRequired: 'Sign in required — the session token is missing, invalid or expired',
  AuthTenantForbidden: 'This account has no workspace yet',
  ProxyAuthUnavailable: 'The auth service could not be reached — try again shortly',
};

const SWEEP_ABOVE = 1000;

/** How long a 503 is remembered. Short: the auth service is expected back. */
const UNAVAILABLE_TTL_MS = 1_000;

/** The default ceiling on gate misses that reach Supabase, per minute. */
const MISSES_PER_MINUTE = 600;

/** The share of that ceiling only sessions this gate has already admitted may spend. */
const RESERVED_FOR_KNOWN = 0.2;

/** The token behind a `Bearer <token>` value (scheme case-insensitive); undefined for anything else. */
export function bearerOf(value: string | string[] | undefined | null): string | undefined {
  const header = Array.isArray(value) ? value[0] : value;
  if (typeof header !== 'string') return undefined;
  const match = /^\s*bearer\s+(\S+)\s*$/i.exec(header);
  return match?.[1] || undefined;
}

/** The unverified claims this gate reads. Absent or unusable ones come back undefined. */
export interface JwtClaims {
  /** Seconds since epoch. */
  exp?: number;
  iss?: string;
}

/** The unverified payload claims of a JWT, or undefined when the token is not decodable at all. */
export function decodeJwtClaims(jwt: string): JwtClaims | undefined {
  const parts = jwt.split('.');
  if (parts.length !== 3) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8')) as {
      exp?: unknown;
      iss?: unknown;
    };
    return {
      exp: typeof payload.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp : undefined,
      iss: typeof payload.iss === 'string' ? payload.iss : undefined,
    };
  } catch {
    return undefined;
  }
}

/** The unverified `exp` claim (seconds since epoch) of a JWT, or undefined when absent/undecodable. */
export function decodeJwtExp(jwt: string): number | undefined {
  return decodeJwtClaims(jwt)?.exp;
}

function failure(status: 401 | 403 | 503, code: GateFailureCode): GateResult {
  return { ok: false, status, code, message: GATE_MESSAGES[code] };
}

export function createAuthGate(options: AuthGateOptions): AuthGate {
  const supabaseUrl = options.supabaseUrl.replace(/\/+$/, '');
  const rpcUrl = `${supabaseUrl}/rest/v1/rpc/${options.rpcName ?? 'cf_my_bot_ids'}`;
  const issuer = options.issuer ?? `${supabaseUrl}/auth/v1`;
  const ttl = options.cacheTtlMs ?? 30_000;
  const timeoutMs = options.timeoutMs ?? 5_000;
  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  const now = options.now ?? Date.now;
  const body = '{}';

  type Entry = { result: GateResult; until: number };
  const cache = new Map<string, Entry>();
  /** One flight per token: concurrent askers about one session share an answer. */
  const inFlight = new Map<string, Promise<GateResult>>();

  const budget = options.maxMissesPerMinute ?? MISSES_PER_MINUTE;
  let tokens = budget;
  let refilledAt = now();
  const reserved = budget * RESERVED_FOR_KNOWN;

  /**
   * Tokens this gate has answered `ok` for, by hash, until the moment they
   * expire. The raw JWT is no more stored here than in the cache above, and the
   * entry outlives the cached answer on purpose: what it records is that this
   * session was admitted once, which stays true for the token's whole life.
   */
  const known = new Map<string, number>();

  /**
   * A miss is only allowed to reach Supabase while the bucket has something in
   * it. The bucket refills at `budget` per minute and holds a minute's worth.
   * A token already on the known list may take the last of it; one that is not
   * stops at `reserved`, leaving that much for the sessions that are.
   */
  const allowMiss = (at: number, isKnown: boolean): boolean => {
    tokens = Math.min(budget, tokens + ((at - refilledAt) / 60_000) * budget);
    refilledAt = at;
    const floor = isKnown ? 0 : reserved;
    if (tokens < floor + 1) return false;
    tokens -= 1;
    return true;
  };

  /** The known list is bounded the same way the cache is, and by the same rule. */
  const remember = (key: string, until: number, at: number): void => {
    if (known.size >= SWEEP_ABOVE) {
      for (const [k, expiresAt] of known) {
        if (expiresAt <= at) known.delete(k);
      }
      for (const k of known.keys()) {
        if (known.size < SWEEP_ABOVE) break;
        known.delete(k);
      }
    }
    known.set(key, until);
  };

  /**
   * Room for one more answer. Expired entries go first; when none are, the
   * oldest go — a map that only ever grew was itself the leak, since a sweep
   * that frees nothing leaves the ceiling doing nothing.
   */
  const makeRoom = (at: number): void => {
    if (cache.size < SWEEP_ABOVE) return;
    for (const [key, entry] of cache) {
      if (entry.until <= at) cache.delete(key);
    }
    for (const key of cache.keys()) {
      if (cache.size < SWEEP_ABOVE) break;
      cache.delete(key);
    }
  };

  /**
   * How long an answer stands. Never past the token's own expiry: a session
   * that has expired must be re-asked about rather than answered from a memory
   * of when it was still valid, and that holds for a refusal as much as for a
   * grant.
   */
  const cacheFor = (result: GateResult, at: number, expMs: number): number => {
    const ceiling = result.ok || result.status === 401 ? ttl : UNAVAILABLE_TTL_MS;
    return Math.min(at + ceiling, expMs);
  };

  async function ask(bearer: string, isKnown: boolean): Promise<GateResult> {
    const at = now();
    if (!allowMiss(at, isKnown)) return failure(503, 'ProxyAuthUnavailable');

    let res: Response;
    try {
      res = await fetchImpl(rpcUrl, {
        method: 'POST',
        headers: {
          apikey: options.anonKey,
          authorization: `Bearer ${bearer}`,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      return failure(503, 'ProxyAuthUnavailable');
    }

    if (res.status === 401) return failure(401, 'AuthSessionRequired');
    if (res.status !== 200) return failure(503, 'ProxyAuthUnavailable');

    let payload: unknown;
    try {
      payload = (await res.json()) as unknown;
    } catch {
      return failure(503, 'ProxyAuthUnavailable');
    }
    // `text[]` comes back as a JSON array; anything else means the RPC is not
    // the one we think it is, and guessing would open the fence.
    if (!Array.isArray(payload)) return failure(503, 'ProxyAuthUnavailable');
    return { ok: true, botIds: new Set(payload.filter((id): id is string => typeof id === 'string')) };
  }

  async function verify(bearer: string | undefined): Promise<GateResult> {
    if (!bearer) return failure(401, 'AuthSessionRequired');
    const at = now();
    const claims = decodeJwtClaims(bearer);
    // Zero network for tokens that cannot possibly be valid, or are not ours.
    const exp = claims?.exp;
    if (exp === undefined || exp * 1000 <= at) return failure(401, 'AuthSessionRequired');
    if (claims?.iss !== issuer) return failure(401, 'AuthSessionRequired');
    const expMs = exp * 1000;

    const key = createHash('sha256').update(bearer).digest('hex');
    const hit = cache.get(key);
    if (hit) {
      if (hit.until > at) return hit.result;
      cache.delete(key);
    }

    const seenAt = known.get(key);
    if (seenAt !== undefined && seenAt <= at) known.delete(key);
    const isKnown = seenAt !== undefined && seenAt > at;

    const flying = inFlight.get(key);
    if (flying) return flying;

    const flight = ask(bearer, isKnown).then(
      (result) => {
        // `forget` drops the flight along with the entry: an answer decided
        // before the change it was told about must not be written after it.
        if (inFlight.get(key) === flight) {
          inFlight.delete(key);
          const settledAt = now();
          makeRoom(settledAt);
          const until = cacheFor(result, settledAt, expMs);
          if (until > settledAt) cache.set(key, { result, until });
          if (result.ok && expMs > settledAt) remember(key, expMs, settledAt);
        }
        return result;
      },
      (err) => {
        if (inFlight.get(key) === flight) inFlight.delete(key);
        throw err;
      },
    );
    inFlight.set(key, flight);
    return flight;
  }

  return {
    verify,
    forget(bearer) {
      if (!bearer) return;
      const key = createHash('sha256').update(bearer).digest('hex');
      cache.delete(key);
      inFlight.delete(key);
    },
    get size() {
      return cache.size;
    },
    clear() {
      cache.clear();
      inFlight.clear();
      known.clear();
    },
  };
}
