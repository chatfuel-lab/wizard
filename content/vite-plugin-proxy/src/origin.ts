/**
 * Who is allowed to make this request from a browser.
 *
 * The proxy holds the master Chatfuel token and answers on the same origin as
 * the app, so a request that carries the browser's ambient credentials is a
 * request the proxy will forward under that token. Nothing in the routes below
 * cares which page sent it — which is exactly what a cross-site request forgery
 * is, and what this file is for.
 *
 * With the auth gate on, the shape of the requests already closes most of it:
 * every route wants an `Authorization` header, which no cross-origin fetch can
 * set without a preflight, and no preflight succeeds without the CORS headers
 * this proxy hands out here. What this check is really for is the mode this
 * package documents for a dev server and for a single-user deployment — gate
 * off, token behind the proxy, no header required. There a POST needs no
 * header the browser would have to preflight, so the origin is the only thing
 * left to check it against. The WebSocket relay has no preflight to hide
 * behind in either mode: `new WebSocket()` is not bound by the same-origin
 * policy and the answers come back readable.
 *
 * So: same-origin is allowed, anything the deployment lists is allowed and gets
 * CORS headers, and everything else is refused before it reaches a route. A
 * request with no `Origin` and nothing from Fetch Metadata is not a browser
 * request at all — curl, a server-side caller, this package's own tests — and
 * is left alone, because refusing it would break every non-browser client
 * without stopping a single browser.
 *
 * The origin answers one question — which page is calling — and it is the only
 * question this file used to ask. It cannot answer the second one, "am I the
 * host that page thinks it reached?", because a browser writes `Origin` and
 * `Host` from the same address: a name the caller owns, pointed at this server,
 * makes the two agree honestly. That is DNS rebinding, and against a proxy
 * holding the master token it is worth a check of its own — `hostAllowed`.
 *
 * Both questions are asked in one place, `requestRefusal`, because the two ways
 * in do not share a path. The routes run inside middleware; the WebSocket
 * upgrade hangs off the bare httpServer and sees none of it, so a check that
 * lives anywhere but here is a check the socket does not get.
 *
 * node:http only: vendored into scaffolded apps like the rest of src/.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

export interface OriginPolicy {
  /** Origins allowed besides the request's own, lowercased and without a trailing slash. */
  readonly allowed: ReadonlySet<string>;
  /** ALLOWED_ORIGINS='*' — every origin, credentials and all. See proxyConfig. */
  readonly any: boolean;
}

/**
 * The policy the admin panel is served under, whatever `ALLOWED_ORIGINS` says.
 *
 * The panel is a page of this deployment talking to its own origin, so it has
 * no legitimate cross-origin caller to lose — and it reaches past the auth gate
 * and the bot fence by design, which makes it the one surface where a listed
 * (or wildcarded) neighbour would be reading every tenant. `SameSite=Strict` is
 * no help here: it is a *site* boundary, so `old.example.com` scripting
 * `app.example.com` still carries the cookie, and the preflight that blesses
 * `x-cf-admin` would hand the neighbour the second lock as well.
 */
export const SAME_ORIGIN_ONLY: OriginPolicy = { allowed: new Set<string>(), any: false };

/**
 * The names this deployment answers to, and whether it knows them.
 *
 * `expected` holds authorities as a browser writes them in `Host` —
 * `app.example.com`, `localhost:5173`. An entry without a port matches any
 * port, because a deployment that names its hostname has named its hostname
 * and the port it happens to be reached on is not the question being asked.
 */
export interface HostPolicy {
  /** Authorities this deployment answers to, lowercased and without a scheme. */
  readonly expected: ReadonlySet<string>;
  /** ALLOWED_HOSTS='*' — the Host header is not checked at all. See proxyConfig. */
  readonly any: boolean;
  /**
   * True when the socket is bound to loopback, and so no name but a loopback
   * one can be the right one. It is what lets a dev server be checked without
   * being configured: nobody sets PUBLIC_URL to run `vite dev`, and that is
   * precisely the deployment holding the master token with the gate off.
   */
  readonly loopbackOnly: boolean;
}

/** A proxy that knows none of its names and is bound where anyone may reach it. */
export const ANY_HOST: HostPolicy = { expected: new Set<string>(), any: true, loopbackOnly: false };

export const ORIGIN_FORBIDDEN_MESSAGE =
  'This request came from an origin this deployment does not serve, so it was not forwarded';

export const HOST_FORBIDDEN_MESSAGE =
  'This request was addressed to a host this deployment does not answer to, so it was not forwarded';

/** The headers a browser may send us. `authorization` is the session; `x-cf-admin` is the panel's. */
const ALLOWED_REQUEST_HEADERS = 'authorization, content-type, x-cf-admin';

const headerOf = (req: IncomingMessage, name: string): string | undefined => {
  const value = req.headers[name];
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' && first ? first : undefined;
};

/** `https://app.example.com`, as a browser writes it. `null` for an opaque origin. */
export const originOf = (req: IncomingMessage): string | undefined => headerOf(req, 'origin')?.toLowerCase();

/**
 * Does this origin name the host the request was sent to?
 *
 * Host and port only. The scheme is not compared because the proxy cannot see
 * its own: behind an edge that terminates TLS the socket is plain http while
 * the browser correctly says `https`, and reading `x-forwarded-proto` here
 * would let the caller answer the question being asked of them.
 */
function sameOrigin(origin: string, req: IncomingMessage): boolean {
  const host = req.headers.host?.toLowerCase();
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** The names that can only mean this machine, however they are written. */
const LOOPBACK_HOSTNAMES: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * The hostname out of an authority, port dropped, IPv6 brackets kept.
 *
 * Kept because `[::1]` is the hostname — an IPv6 literal is only a hostname
 * while it is bracketed, and stripping them would leave `::1` to be split on
 * its own colons.
 */
function hostnameOf(authority: string): string {
  if (authority.startsWith('[')) {
    const end = authority.indexOf(']');
    return end === -1 ? authority : authority.slice(0, end + 1);
  }
  const colon = authority.indexOf(':');
  return colon === -1 ? authority : authority.slice(0, colon);
}

export const isLoopbackHostname = (name: string): boolean => LOOPBACK_HOSTNAMES.has(name.trim().toLowerCase());

/**
 * Do we know our own name well enough to refuse one we do not recognise?
 *
 * Only when the deployment told us — through ALLOWED_HOSTS, ALLOWED_ORIGINS or
 * PUBLIC_URL — or when the bind answers for it. A proxy on a public interface
 * that named nothing is one we cannot judge, and refusing on a guess would
 * break every correctly-configured deployment that simply never needed to say
 * where it lives. So it stays open there, and the startup refusals are what
 * cover that shape: a public bind with the gate off already has to be
 * acknowledged out loud.
 */
const hostChecked = (policy: HostPolicy): boolean => policy.loopbackOnly || policy.expected.size > 0;

/**
 * Is this request addressed to a name this deployment actually answers to?
 *
 * The one thing an attacker cannot forge here is which name their own page had
 * to be served from: `Host` is written from the URL the browser fetched, and to
 * reach us at all under a name they own, that name must be the one in the bar.
 * So a request arriving as `localhost` cannot have come from `evil.example` —
 * which is the whole of the defence, and why the loopback names are allowed
 * flatly rather than listed.
 *
 * Non-browser callers are not the subject and are not being helped: a request
 * with no `Host` is refused rather than waved through, since HTTP/1.1 requires
 * one and every client this proxy has ever been called by sends it.
 */
export function hostAllowed(req: IncomingMessage, policy: HostPolicy): boolean {
  if (policy.any || !hostChecked(policy)) return true;
  const authority = req.headers.host?.trim().toLowerCase();
  if (!authority) return false;
  if (policy.expected.has(authority)) return true;
  const hostname = hostnameOf(authority);
  return isLoopbackHostname(hostname) || policy.expected.has(hostname);
}

/**
 * True when this request may proceed.
 *
 * `sec-fetch-site` is consulted first because the browser writes it and script
 * cannot: `same-origin` and `none` (a typed address, a bookmark) are its own
 * statement that this is not a cross-site request. Anything else falls through
 * to the origin, and an absent origin on a request the browser DID label
 * cross-site is refused — there is nothing left to allow it by.
 */
export function originAllowed(req: IncomingMessage, policy: OriginPolicy): boolean {
  const site = headerOf(req, 'sec-fetch-site')?.toLowerCase();
  if (site === 'same-origin' || site === 'none') return true;
  const origin = originOf(req);
  if (origin === undefined) return site === undefined;
  if (policy.any || policy.allowed.has(origin.replace(/\/+$/, ''))) return true;
  return sameOrigin(origin, req);
}

/**
 * Write the CORS answer for an origin already found allowable, so a listed
 * cross-origin app can actually read what it asked for.
 *
 * `vary: origin` because the answer differs per origin and a shared cache must
 * not hand one origin's to another.
 */
function writeCorsHeaders(req: IncomingMessage, res: ServerResponse): void {
  const origin = originOf(req);
  if (!origin || sameOrigin(origin, req)) return;
  res.setHeader('access-control-allow-origin', origin);
  res.setHeader('access-control-allow-credentials', 'true');
  res.setHeader('vary', 'origin');
}

/** Both questions, for the two ways in that have nothing else in common. */
export interface RequestPolicy {
  readonly origin: OriginPolicy;
  readonly host: HostPolicy;
}

/** What a caller is told, and the code the app matches on. */
export interface RequestRefusal {
  readonly message: string;
  readonly code: 'ProxyHostForbidden' | 'ProxyOriginForbidden';
}

/**
 * Why this request may not proceed, or undefined when it may.
 *
 * The host is asked first. It is the question about this server rather than
 * about the caller, and a request that reached the wrong name has no business
 * collecting a CORS header on its way to being refused.
 */
export function requestRefusal(req: IncomingMessage, policy: RequestPolicy): RequestRefusal | undefined {
  if (!hostAllowed(req, policy.host)) return { message: HOST_FORBIDDEN_MESSAGE, code: 'ProxyHostForbidden' };
  if (!originAllowed(req, policy.origin)) return { message: ORIGIN_FORBIDDEN_MESSAGE, code: 'ProxyOriginForbidden' };
  return undefined;
}

/**
 * The whole policy, applied to one request.
 *
 * False when this function has already answered — a 403 for a host or an origin
 * that is not served, or the 204 that ends a preflight — and the caller must
 * not run the route.
 */
export function applyRequestPolicy(
  req: IncomingMessage,
  res: ServerResponse,
  policy: RequestPolicy,
  refuse: (res: ServerResponse, refusal: RequestRefusal) => void,
): boolean {
  const refusal = requestRefusal(req, policy);
  if (refusal !== undefined) {
    refuse(res, refusal);
    return false;
  }
  writeCorsHeaders(req, res);
  if ((req.method ?? 'GET').toUpperCase() !== 'OPTIONS') return true;
  res.statusCode = 204;
  res.setHeader('access-control-allow-methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('access-control-allow-headers', ALLOWED_REQUEST_HEADERS);
  res.setHeader('access-control-max-age', '600');
  res.end();
  return false;
}
