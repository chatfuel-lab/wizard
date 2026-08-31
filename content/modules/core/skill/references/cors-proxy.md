# CORS & the mandatory backend proxy

## The problem

Production CORS allows **only `https://panel.chatfuel.com`** as an origin. A browser app on any other domain fails the preflight for `POST /graphql`. Additionally the panel sends `Content-Security-Policy: frame-ancestors 'self' *.chatfuel.com`, so iframing the Chatfuel dashboard is not a workaround.

Consequences:

- **Server-to-server** integrations (sync jobs, webhooks, backend rendering): no CORS involved — call the API directly, no proxy needed.
- **Browser UIs on your own domain**: must route GraphQL through your backend.

Note the asymmetry: raw WebSocket connections are not subject to CORS preflight, so subscriptions *can* technically connect from a foreign origin — but doing so requires shipping the API token to the browser, which the token model below forbids. Proxy both.

## Token model

The Chatfuel token is a **full-account credential** (everything the user's role allows, no scoping). Therefore:

- Store it server-side only (secret manager / env var of the integrator's backend). Never embed it in frontend bundles, localStorage, or cookies readable by JS.
- Browser clients authenticate to **your** backend with your existing session mechanism; your backend attaches the Chatfuel token.
- One token per Chatfuel account. If each of your customers has their own Chatfuel account (e.g. one CRM instance per client), store one token per instance/tenant.
- **If they do not** — if many of your customers sit inside one Chatfuel account — then the token is not a tenant boundary and nothing upstream will draw one for you. Your proxy is the only place a boundary can exist, which is what steps 3-5 below are.

## Proxy requirements spec

Implement in the integrator's existing backend stack (any language — it's ~2 small route handlers). Do not introduce a separate service just for this.

### HTTP endpoint

1. Route: e.g. `POST /chatfuel/graphql` on your backend.
2. Authenticate the caller with YOUR app's auth. Reject anonymous calls.
3. **Authorize what the request names, not only who sent it.** This is the step that is easy to skip and expensive to skip. The token is one account's, and that account holds every bot in it, so an authenticated caller who edits the `botID` in the body reaches a bot that is not theirs — with the same credential, through the same route, and it will look like a normal request in your logs. Resolve from your own database which bots this caller may use, read the `botID` out of the **parsed** document, and refuse anything else. Parse rather than pattern-match: the id travels as a literal, as a variable, as a variable's default, inside an input object, behind an alias and inside a fragment, and a fence that misses one of those shapes is a fence that is not there.
4. **Decide about the ids that live inside a bot too** — a flow, a contact, a conversation, a block. No `botID` check covers them, and the API will not check them for you: behind one account token it has one customer, and that customer is you. Either resolve each one to its owner before forwarding, or know, and write down, that any authenticated caller who learns such an id can read it.
5. **Allowlist the root fields your own client actually sends.** The account schema is far wider than any one product and includes fields that read the account itself rather than a bot. An allowlist is the cheapest fence here and the only one that covers the operations nobody has thought of yet; anything not on it is refused before any other question about it is asked.
6. Forward the JSON body unchanged to `{base}/graphql`.
7. Set `Authorization: Bearer <chatfuel-token>` on the outgoing request. Strip any client-supplied `Authorization`/cookies — never forward them upstream.
8. **Sanitize the response before returning it.** The upstream envelope is written for the account that owns the token, and your caller is not that account — see the section below. Keep `data` and the GraphQL error *shape*; replace anything in an error that names an internal service, a host, a stack or a query plan with your own message and a stable code of your own.
9. **Allowlist the response headers you pass back**, the same way you allowlisted the request ones. `content-type` and your own correlation id are usually the whole list; upstream `set-cookie`, `x-*` diagnostics and rate-limit counters belong to the token's account, not to your caller.
10. Timeouts: 30 s is plenty. Send `Content-Type: application/json` only.
11. Do not log request variables or the token (messages contain end-user PII; the token is a credential). Log the correlation id and the upstream status; if you must keep the upstream error text, keep it server-side only, keyed by that id.
12. Optional: enforce your own per-user rate limit below the API's own per-token ceiling so one user can't exhaust the shared token's budget.

Steps 3-5 are what separates a proxy that hides a token from a proxy that is safe to put many customers behind. A proxy that stops at step 2 has moved the credential out of the browser and left every caller holding the whole account — which is fine for a single-tenant internal tool, and is an IDOR in anything else.

### WebSocket endpoint (subscriptions)

Pick one of two shapes:

**A. Message-aware proxy (recommended).** Your backend accepts a WS connection from the browser (with your session auth), opens its own WS to `wss://{host}/graphql` with subprotocol `graphql-transport-ws`, sends `connection_init` with `{"authToken": "Bearer <token>"}` itself, and relays all subsequent frames both ways verbatim. The browser's own `connection_init` payload is discarded/ignored. This keeps the token fully server-side.

**B. Backend-owned subscriptions.** Your backend holds the subscriptions (one lazy upstream WS per tenant) and fans events out to browsers via your existing realtime channel (Socket.IO, SSE, Pusher, …). More work, but fits if you already have a realtime layer and many concurrent operators.

Either way: reconnect with backoff upstream, and propagate a "reconnected" signal to clients so they refetch (see `references/transport-auth.md` — the socket does not replay missed events).

**And sanitize what comes back on the socket too.** A `next` frame carries the same GraphQL envelope as an HTTP answer, and `error` and `connection_error` frames carry upstream text with nothing in front of it. A proxy that scrubs its HTTP path and relays WS frames verbatim has one clean door and one open window; run both through the same function.

## Sanitizing the response

This is step 8 in full, because it is the step most implementations skip.

The upstream answer is written for the account that holds the token — that is who the API thinks it is talking to. Your caller is one tenant behind that account, so an upstream error is not addressed to them and must not be handed to them as it arrived. Treat every part of a failed answer as content you did not write and cannot predict: `message`, `path`, and above all `extensions`, whose shape and contents are the upstream's to change without telling you. Scrub the whole envelope rather than the fields you have seen fail so far.

What to do, in the order the work happens:

1. **Keep the shape.** A GraphQL client needs `{ data, errors: [{ message, path, extensions.code }] }`, and HTTP-200-with-`errors` is a real answer, not a failure. Rewriting the shape breaks the client for no gain; rewriting the *content* is the whole job.
2. **Replace any message that names something internal** with one neutral sentence of your own. Walk `errors[].message`, `errors[].extensions` recursively (services nest their own `errors` array in there), and every string underneath — a service name travels as easily in `extensions.detail` as in `message`.
3. **Give a scrubbed error a code of your own** — a single stable constant, e.g. `UpstreamServiceError`. An error whose only classifier was the name you just removed is otherwise unclassifiable by the client, which turns a scrub into a bug report.
4. **Attach a correlation id** to both the response and your server-side log line. That is what makes a scrubbed error debuggable: the caller quotes an id, and the operator reads the original text in a place the caller cannot reach.
5. **Fail closed on shapes you do not recognize.** If a body is not the JSON envelope you expect, return your own error rather than the bytes — an unparsed body is one you did not sanitize.

Test both paths, and test them on the payload rather than the happy path: an upstream error naming a service, the same name one level down in `extensions`, an HTTP 500 with an HTML body, and the same three over the WebSocket. This repo's own proxy does exactly this (`scrubUpstreamErrors` in `queryAnalysis.ts`, applied on both transports) — the reference and the implementation are the same rule.

### Checklist

- [ ] Caller authenticated by your app before proxying
- [ ] Every bot id in the **parsed** outgoing document checked against the bots that caller may use
- [ ] Ids inside a bot (flows, contacts, conversations) resolved to an owner, or the exposure written down and accepted
- [ ] Root fields restricted to what your client sends; account-scope operations refused
- [ ] Token injected server-side; never present in any response, log, or client bundle
- [ ] Client `Authorization`/cookies stripped from upstream requests
- [ ] WS `connection_init` payload built server-side (shape A) or WS terminated at backend (shape B)
- [ ] Reconnect → client refetch signal wired
- [ ] No logging of GraphQL variables / message bodies
- [ ] Upstream errors (incl. HTTP-200-with-errors) sanitized on BOTH transports: shape kept, internal names replaced, own error code attached
- [ ] Response headers allowlisted; upstream cookies and diagnostics not relayed
- [ ] Correlation id on the response and in the server-side log, so a scrubbed error is still debuggable

## Why a platform rewrite cannot replace the proxy

Every CDN/PaaS has a "rewrite this path to that external origin" feature —
Vercel's `rewrites` in `vercel.json`, Netlify's `_redirects` with a 200 status,
Cloudflare's origin rules. On paper `/graphql` → `https://panel.chatfuel.com/graphql`
looks like the whole job, done in four lines of config and no code.

It is not, and the reason is the same on every platform: **a rewrite forwards
the request it received. It cannot add a header to it.** The token would have
to already be on the browser's request, which is exactly what the token model
above forbids. (On Vercel specifically: the `headers` block in `vercel.json`
sets RESPONSE headers, not request ones — it looks like the missing piece and
is not.) A rewrite also has nowhere to run the "authenticate the caller with
YOUR app's auth" step, so the route would be an open relay to a full-account
credential.

So a rewrite is only ever a path map — public path in front of the handler that
does the real work. In this repo's scaffold that is exactly its job:
`vercel.json` maps `/chatfuel/:cfpath*` onto one serverless function, and that
function runs `vendor/chatfuel-proxy/core.ts`, the same core the Vite dev server
and the standalone Node server mount. Shape A above, WebSocket relay included:
Vercel Functions accept incoming upgrades when the module's default export is an
`http.Server`.

One trap if you copy this shape. Vercel's zero-config `api/` directory is not
Next.js routing: a catch-all filename (`api/chatfuel/[...path].ts`) compiles to
a route that matches exactly ONE path segment,
`^/api/chatfuel/([^/]+)$`. `/chatfuel/graphql` goes through and
`/chatfuel/auth/provision` 404s before any code runs — which reads as "sign-up
is broken", not as "routing is broken". Use a single static filename and carry
the requested path in a query parameter the rewrite fills
(`/chatfuel/:cfpath* -> /api/chatfuel`, then rebuild `/chatfuel/<cfpath>` inside
the handler). Check the generated route table by running `vercel build` and reading the
config it writes under `.vercel/output/` — it is the only place this is visible
before a deploy.

## Why not call the API from the browser

The Chatfuel API does not send CORS headers for arbitrary origins, so a browser cannot call it
directly — which is why this proxy exists. And a browser that could call it would be a browser
holding the token: acceptable only for a trusted internal tool, never for a multi-tenant product.
