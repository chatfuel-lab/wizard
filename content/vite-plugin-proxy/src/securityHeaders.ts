/**
 * The security headers every response this package writes carries, wherever it
 * is written from.
 *
 * They live in their own module rather than in server.ts because they are not
 * the standalone server's business alone: `upstream.ts` writes proxied answers
 * on all three hosts, and a header set that only the static-file path applied
 * was a header set two of the three hosts did without. Vercel already sends
 * the same list from `vercel.json` for every path, HSTS included; this is how
 * the other two catch up, and now the whole set is one list in one place
 * instead of a JSON copy this file could drift from unnoticed.
 *
 * `strict-transport-security` goes out unconditionally, including from the
 * plain-http Vite dev server — that is not the gap it looks like. A browser
 * only remembers HSTS from a response it received over an actual TLS
 * connection (RFC 6797 §7.2); one delivered over plain http is required to be
 * ignored, and every shipping browser does. So on `http://localhost:5173` the
 * header is inert by the same rule that makes it real everywhere else, and
 * checking "is this the dev server" here would be a second way to answer a
 * question the browser already answers correctly on its own.
 */
import type { ServerResponse } from 'node:http';

/**
 * What the browser is allowed to do with a page this server hands out.
 *
 * The app is a static bundle with no inline script — Vite emits one module tag
 * and nothing else — so `script-src 'self'` costs nothing and is the whole
 * point: an injection that survives React's escaping still has no origin to
 * load from and no inline block to run. `object-src 'none'` and `base-uri
 * 'self'` close the two classic ways around that, and `form-action 'self'`
 * keeps a planted form from posting a session somewhere else.
 *
 * `style-src` keeps `'unsafe-inline'` because React writes `style={…}` as a
 * style attribute; that is a styling hole, not a scripting one.
 *
 * The permissive halves are permissive on purpose. `img-src`/`media-src`/
 * `connect-src` face the Chatfuel media CDN, the Supabase project and whatever
 * host an attachment came from — none of them knowable when this file is
 * written, all of them different per deployment. A guess here does not fail
 * loudly; it silently blanks an avatar or kills a subscription. So the scheme
 * is pinned (https/wss, never http) and the host is not.
 *
 * `frame-ancestors 'none'` + `X-Frame-Options` say this app is never framed.
 * Modules are embeddable inside the shell; the shell itself is a top-level
 * page, and clickjacking a livechat means sending messages as the bot.
 *
 * `Referrer-Policy: no-referrer` matters more than it looks: an operator can be
 * on `/reset-password?token_hash=…`, and every image, upload and outbound link
 * on that page would otherwise carry the recovery token to a third party.
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

/**
 * The same set Vercel sends from `vercel.json` — all three hosts serve the
 * same bundle and must not disagree about what it may do.
 *
 * `strict-transport-security` matches Vercel's own value: two years,
 * subdomains included. Not `preload` — that is a one-way submission to
 * browser vendors' hardcoded list, and no deployment of this app has asked
 * for it.
 *
 * `microphone=(self)` stays enabled: the coworker composer records voice notes.
 * The rest of the powerful features this app never asks for are switched off,
 * so a script that got in cannot ask for them either.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  'content-security-policy': CSP,
  'strict-transport-security': 'max-age=63072000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'cross-origin-opener-policy': 'same-origin',
  'permissions-policy': 'camera=(), geolocation=(), payment=(), usb=(), microphone=(self)',
};

export function setSecurityHeaders(res: ServerResponse): void {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);
}
