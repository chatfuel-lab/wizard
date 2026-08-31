/**
 * The admin panel's door: the password check, the signed cookie it hands out,
 * and the throttle in front of both.
 *
 * This is the ONE authorization in the proxy that is not an identity. Every
 * other route asks "who is this, and which bots are theirs" — the gate reads a
 * Supabase session, the fence reads the account's own workspaces. The admin
 * panel exists to look at the whole account, fences included, so identity is
 * the wrong question: the person it is for is whoever holds the master token,
 * and in an open-mode deployment they have no account inside the app at all.
 *
 * So the credential is a password held next to the token, in the server-only
 * half of .env, and the session is a signed cookie:
 *
 *     cf_admin = v3.<issuedAtMs>.<expiresAtMs>.<hmacSHA256(key, payload)>
 *
 * with the key derived from the password by scrypt, salted per deployment. That
 * buys three things worth having and costs one worth stating:
 *
 *   + nothing is stored, so it survives a serverless function that lives for
 *     one request and is replaced by another instance on the next;
 *   + rotating ADMIN_PASSWORD invalidates every live session, because the key
 *     that signed them is gone;
 *   + signing out revokes the sessions this instance has issued, because
 *     `issuedAtMs` is in the payload and the sign-out route remembers the
 *     instant everything older than it stopped counting.
 *   - that watermark lives in one process's memory. On a host that answers each
 *     request from a fresh instance, signing out is felt by the instance that
 *     served it and no other, so a stolen cookie is still good until it expires
 *     or the password is rotated. Rotation remains the only revocation that
 *     holds everywhere.
 *
 * One cookie and no other — in particular no second, readable one saying an
 * admin is signed in. The panel is never in the nav rail, so nothing in the
 * browser has a reason to ask, and a cookie nobody reads is a cookie that will
 * one day be mistaken for a credential.
 *
 * `Path=/` rather than the narrower `/chatfuel`, because a deployment mounted
 * under a base path ('/app') sends the proxy '/app/chatfuel/…' from the
 * browser and would never see it.
 *
 * node:crypto and node:http only — this file is vendored into scaffolded apps.
 */
import { createHmac, timingSafeEqual, createHash, scryptSync } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { sendSyntheticEnvelope } from './envelope.js';
import type { ProxyContext } from './context.js';

export const ADMIN_COOKIE = 'cf_admin';

/**
 * The floor a password must clear before the routes mount at all.
 *
 * The throttle below lives in one process's memory, and a deployment on
 * per-request functions may have as many of those as it has concurrent
 * requests — so on the host this is most likely to run on, rate limiting is
 * best-effort and the length of the secret is what actually stands between the
 * panel and a guess. Sixteen characters is the point where it stops being
 * guessable at any rate an attacker can reach.
 */
export const ADMIN_MIN_PASSWORD_LENGTH = 16;

/**
 * How long one unlock lasts.
 *
 * Two hours, and the reason it is not a working day is the sign-out above it:
 * the watermark that revokes a cookie lives in one process's memory, so on a
 * host that answers each request from a fresh instance the only revocations
 * that hold everywhere are the clock and a password rotation. This is that
 * clock. It is the window a stolen cookie is good for after its owner has
 * signed out and believes it is not — long enough that an operator working
 * through the panel is not asked again mid-task, short enough that the mistake
 * costs an afternoon rather than a night.
 */
export const ADMIN_SESSION_MS = 2 * 60 * 60 * 1000;

export const ADMIN_REQUIRED_MESSAGE = 'Admin sign-in required';
export const ADMIN_BAD_PASSWORD_MESSAGE = 'That password is not the admin password';
export const ADMIN_THROTTLED_MESSAGE = 'Too many attempts — wait a moment and try again';
export const ADMIN_MISCONFIGURED_MESSAGE = `ADMIN_PASSWORD is set but shorter than ${ADMIN_MIN_PASSWORD_LENGTH} characters — the admin panel refuses to run behind a guessable password`;

/**
 * A flat pause on EVERY attempt, right or wrong.
 *
 * Not the rate limit — the counter below is that, and this pause sits in front
 * of it. What the pause does is make a wrong answer cost the same as a right one
 * from the outside, on top of the constant-time compare, and take the edge off a
 * burst that arrives before the counter has caught up.
 */
export const ADMIN_ATTEMPT_DELAY_MS = 250;

/**
 * The version tag in the cookie, and the tag mixed into the scrypt salt: a
 * bump is what makes every cookie the previous format issued unverifiable.
 *
 * The format has drifted away from its documentation twice. When it changes
 * again, `content/modules/admin/skill/references/access.md` changes with it —
 * agents rewrite this session from that document.
 */
const COOKIE_VERSION = 'v3';

/** Cookies as a plain map. Nothing is decoded: our two values are cookie-safe by construction. */
export function parseCookies(header: string | undefined): Map<string, string> {
  const out = new Map<string, string>();
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const name = part.slice(0, eq).trim();
    if (name) out.set(name, part.slice(eq + 1).trim());
  }
  return out;
}

/**
 * The key the cookie is signed with, derived from the password rather than
 * being it.
 *
 * What the payload is decides this. The payload is entirely predictable, so
 * anyone holding one cookie holds a known plaintext and its MAC — a reverse
 * proxy's log, a shared browser, a backup — and can guess ADMIN_PASSWORD
 * offline, with no request to this server and nothing to throttle. The key
 * must be one a guess is expensive to test, which is what scrypt is here for.
 * The sixteen characters the password check demands are a floor on length, not
 * a substitute for this — length alone says nothing about how much a guess
 * costs.
 *
 * `salt` is per deployment, and that is the other half of the cost. A salt
 * fixed in this source is the same salt in every deployment that ever runs this
 * code, so one table built once — against a published constant — answers every
 * one of them, and the expense scrypt was chosen for is paid once by the
 * attacker rather than once per target. See `adminCookieSalt` in
 * proxyConfig.ts for where a deployment's own comes from.
 *
 * Derived once and kept, because a KDF per request is a denial of service
 * pointed at ourselves — expense is the whole of what it is for. A deployment
 * on per-request functions pays it once per instance instead, ~25 ms on the
 * admin routes only.
 */
let derivedKey: { password: string; salt: string; key: Buffer } | null = null;

const keyFor = (password: string, salt: string): Buffer => {
  if (derivedKey?.password !== password || derivedKey.salt !== salt) {
    derivedKey = { password, salt, key: scryptSync(password, `cf-admin-${COOKIE_VERSION}.${salt}`, 32) };
  }
  return derivedKey.key;
};

const sign = (password: string, salt: string, payload: string): string =>
  createHmac('sha256', keyFor(password, salt)).update(payload).digest('hex');

/**
 * The cookie value for a session issued at `issuedAtMs` that ends at
 * `expiresAtMs`.
 *
 * `issuedAtMs` is in the payload so that a sign-out has something to compare
 * against: without it a cookie says only when it stops being valid, and every
 * cookie ever minted from one password is indistinguishable from every other.
 */
export function signAdminSession(password: string, salt: string, issuedAtMs: number, expiresAtMs: number): string {
  const payload = `${COOKIE_VERSION}.${issuedAtMs}.${expiresAtMs}`;
  return `${payload}.${sign(password, salt, payload)}`;
}

/**
 * Is this cookie one we issued, for a session that has not run out and has not
 * been signed out from under it?
 *
 * The signature is compared with timingSafeEqual like the password is — a
 * cookie is guessed the same way a password is, one byte of feedback at a time.
 */
export function verifyAdminSession(
  password: string,
  salt: string,
  value: string | undefined,
  nowMs: number,
  revokedBeforeMs = 0,
): boolean {
  if (!value) return false;
  const parts = value.split('.');
  if (parts.length !== 4) return false;
  const [version, issuedText, expText, mac] = parts as [string, string, string, string];
  if (version !== COOKIE_VERSION) return false;
  const issuedAt = Number(issuedText);
  const expiresAt = Number(expText);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || expiresAt <= nowMs) return false;
  /* The signature is still checked on a revoked cookie: answering faster for
     one that was ours than for one that was never signed at all would say which
     is which. */
  const signed = equalHex(sign(password, salt, `${version}.${issuedText}.${expText}`), mac);
  return signed && issuedAt > revokedBeforeMs;
}

/** Constant-time hex compare that does not throw on a wrong-length candidate. */
function equalHex(expected: string, candidate: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(candidate, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Does the submitted password match?
 *
 * Both sides are hashed first so the buffers are always 32 bytes: comparing the
 * raw strings would need a length check in front of timingSafeEqual, and that
 * check is itself a side channel that gives away how long the real password is.
 */
export function passwordMatches(password: string, candidate: unknown): boolean {
  if (typeof candidate !== 'string' || candidate.length === 0) return false;
  const a = createHash('sha256').update(password, 'utf8').digest();
  const b = createHash('sha256').update(candidate, 'utf8').digest();
  return timingSafeEqual(a, b);
}

/* -------------------------------------------------------------------------- */
/* Cookies on the wire                                                        */
/* -------------------------------------------------------------------------- */

/** The hosts a browser itself treats as a secure context over plain http. */
const LOOPBACK_HOST = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;

/**
 * `Secure` is left off only for plain http to a loopback host: such a cookie
 * is dropped by the browser without a word, and the dev server would then look
 * like a login that silently never works. Everywhere else it is on.
 *
 * `x-forwarded-proto` is a header the caller writes, so it is read in one
 * direction only: `https` may turn `Secure` ON, nothing here lets the header
 * turn it OFF. That is what keeps this question independent of
 * `trustForwardedFor`, which governs the throttle key and must stay off unless
 * an edge really does write that header. Tying the two together made one flag
 * answer two unrelated questions, and answering this one from an untrusted
 * `x-forwarded-proto: http` would have stripped `Secure` from an admin session
 * on a public host.
 *
 * The fallback is the host, not the socket: behind an edge that terminates TLS
 * the socket is not encrypted, and an admin cookie crossing the public
 * internet must carry `Secure` whether or not the edge announced itself.
 */
function isSecureRequest(req: IncomingMessage): boolean {
  if ((req.socket as { encrypted?: boolean }).encrypted) return true;
  const forwarded = req.headers['x-forwarded-proto'];
  const proto = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (proto?.split(',')[0]?.trim() === 'https') return true;
  return !LOOPBACK_HOST.test(req.headers.host ?? '');
}

export function setAdminCookie(
  req: IncomingMessage,
  res: ServerResponse,
  password: string,
  salt: string,
  nowMs: number,
): void {
  const expiresAt = nowMs + ADMIN_SESSION_MS;
  const maxAge = Math.floor(ADMIN_SESSION_MS / 1000);
  const secure = isSecureRequest(req) ? '; Secure' : '';
  const cookie = signAdminSession(password, salt, nowMs, expiresAt);
  res.setHeader(
    'set-cookie',
    `${ADMIN_COOKIE}=${cookie}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Strict${secure}`,
  );
}

export function clearAdminCookie(req: IncomingMessage, res: ServerResponse): void {
  const secure = isSecureRequest(req) ? '; Secure' : '';
  res.setHeader('set-cookie', `${ADMIN_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${secure}`);
}

/* -------------------------------------------------------------------------- */
/* Throttle                                                                   */
/* -------------------------------------------------------------------------- */

export interface AdminThrottle {
  /** How much longer this caller must wait; 0 when they may try now. */
  waitMs(key: string): number;
  /**
   * Record a wrong password and lengthen the wait, up to `maxWaitMs` — which
   * the caller lowers when the bucket is shared (see `throttleKey`).
   */
  fail(key: string, maxWaitMs?: number): void;
  /** Record a right one and forget the history. */
  succeed(key: string): void;
}

/** Wrong answers tolerated before the wait starts — a typo must not cost a minute. */
const FREE_ATTEMPTS = 3;
export const MAX_WAIT_MS = 5 * 60 * 1000;

/**
 * The ceiling when the bucket is not per-caller.
 *
 * A shared bucket counts everyone's mistakes against everyone, so the longest
 * wait is no longer something an attacker imposes on themselves — it is
 * something they impose on the admin, by getting the password wrong on purpose
 * until the door is shut for five minutes. Thirty seconds still costs a
 * guessing run most of its rate while leaving the panel usable.
 */
export const SHARED_MAX_WAIT_MS = 30 * 1000;

const ENTRY_CAP = 1_000;

export function createAdminThrottle(now: () => number = Date.now): AdminThrottle {
  const seen = new Map<string, { fails: number; until: number }>();

  /**
   * Room for one more counter. Expired entries first, then the oldest: a cap
   * that only dropped what had already expired stopped capping anything as soon
   * as enough live entries filled it, which is the shape a caller with a
   * spoofable key would aim for.
   */
  const sweep = (at: number): void => {
    if (seen.size < ENTRY_CAP) return;
    for (const [key, entry] of seen) {
      if (entry.until <= at) seen.delete(key);
    }
    for (const key of seen.keys()) {
      if (seen.size < ENTRY_CAP) break;
      seen.delete(key);
    }
  };

  return {
    waitMs(key) {
      const entry = seen.get(key);
      if (!entry) return 0;
      const left = entry.until - now();
      return left > 0 ? left : 0;
    },
    fail(key, maxWaitMs = MAX_WAIT_MS) {
      const at = now();
      const entry = seen.get(key) ?? { fails: 0, until: 0 };
      entry.fails += 1;
      const over = entry.fails - FREE_ATTEMPTS;
      entry.until = over > 0 ? at + Math.min(1_000 * 2 ** (over - 1), maxWaitMs) : at;
      seen.set(key, entry);
      sweep(at);
    },
    succeed(key) {
      seen.delete(key);
    },
  };
}

/**
 * Who to count attempts against, and whether that bucket is really theirs.
 *
 * The socket address is the default, because it is the one thing the caller
 * cannot forge. `x-forwarded-for` is only consulted when the deployment says it
 * sits behind a trusted edge — otherwise a caller spoofs a fresh chain per
 * request and the counter never bites, turning the speed bump off for the one
 * caller it exists to slow.
 *
 * And when it IS trusted, the LAST hop is read, not the first. The chain grows
 * left to right and only the rightmost entry was written by the edge this
 * deployment trusts; everything to its left was in the request as it arrived,
 * which is to say the caller's own text. Reading the first entry would hand
 * the caller a fresh bucket per request under exactly the flag that was meant
 * to make the bucket reliable — the setting that hardens the throttle would be
 * the setting that turns it off. `TRUST_FORWARDED_FOR` says "the hop in front
 * of us is ours", and this reads that hop and nothing further out.
 *
 * `shared` reports the case in between: a request that arrived with a forwarded
 * chain on a deployment that does not trust it. There IS an edge in front, so
 * the socket address is the edge's and every caller lands in one bucket — which
 * turns the lockout into something one caller can point at everybody else. The
 * caller lowers the ceiling accordingly rather than switching the throttle off,
 * since the same bucket is still the only thing slowing a guessing run.
 */
export function throttleKey(req: IncomingMessage, trustForwardedFor: boolean): { key: string; shared: boolean } {
  const forwarded = req.headers['x-forwarded-for'];
  // Multiple header lines are one chain in order, which is how they arrived.
  const chain = Array.isArray(forwarded) ? forwarded.join(',') : forwarded;
  const hops = (chain ?? '')
    .split(',')
    .map((hop) => hop.trim())
    .filter((hop) => hop !== '');
  const edgeHop = hops.length > 0 ? hops[hops.length - 1]! : undefined;
  if (trustForwardedFor && edgeHop) return { key: edgeHop, shared: false };
  return { key: req.socket.remoteAddress || 'unknown', shared: hops.length > 0 };
}

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/* -------------------------------------------------------------------------- */
/* The check every admin route starts with                                    */
/* -------------------------------------------------------------------------- */

/**
 * A custom header every admin call must carry.
 *
 * With SameSite=Strict the cookie should never ride a cross-site request in the
 * first place; this is the second lock on the same door. A form posted from
 * another origin can send a cookie but cannot set a header, so a request
 * without this one is not a request the app made.
 */
export const ADMIN_HEADER = 'x-cf-admin';

/**
 * True when this request may proceed. False when a refusal has been written.
 *
 * Deliberately NOT admitRequest: no gate, no fence, no session bearer. The
 * cookie IS the authorization here, and the panel's whole purpose is to show
 * the workspaces and bots the fence exists to keep a request away from.
 */
export function requireAdmin(ctx: ProxyContext, req: IncomingMessage, res: ServerResponse): boolean {
  const { adminPassword, adminMode, adminCookieSalt } = ctx.config;
  if (adminMode === 'misconfigured') {
    sendSyntheticEnvelope(res, 500, ADMIN_MISCONFIGURED_MESSAGE, 'AdminMisconfigured');
    return false;
  }
  if (!adminPassword) {
    sendSyntheticEnvelope(res, 401, ADMIN_REQUIRED_MESSAGE, 'AdminSessionRequired');
    return false;
  }
  if (req.headers[ADMIN_HEADER] === undefined) {
    sendSyntheticEnvelope(res, 401, ADMIN_REQUIRED_MESSAGE, 'AdminSessionRequired');
    return false;
  }
  const cookie = parseCookies(req.headers.cookie).get(ADMIN_COOKIE);
  if (!verifyAdminSession(adminPassword, adminCookieSalt, cookie, Date.now(), ctx.adminRevokedBefore)) {
    sendSyntheticEnvelope(res, 401, ADMIN_REQUIRED_MESSAGE, 'AdminSessionRequired');
    return false;
  }
  return true;
}
