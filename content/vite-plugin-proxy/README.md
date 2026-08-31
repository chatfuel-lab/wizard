# @chatfuel/vite-plugin-proxy

The Chatfuel proxy implementing shape A of
`content/modules/core/skill/references/cors-proxy.md` (installed into scaffolded apps
as the `chatfuel-core` skill), plus the auth gate and the production server.
The Chatfuel token
stays server-side: HTTP requests get `Authorization` injected, and the WS
relay sends its own `connection_init {authToken}` while discarding the
browser's payload.

| file                 | what it is                                                                     |
| -------------------- | ------------------------------------------------------------------------------ |
| `core.ts`            | assembly + facade (`createChatfuelProxy(options, env)`) over the concern files |
| `proxyConfig.ts`     | options, env resolution (`resolveProxyConfig`), startup-line descriptions      |
| `context.ts`         | the shared per-instance state the handlers take as their first argument        |
| `admission.ts`       | the gate → misconfig → token sequence, and the bot fences                      |
| `envelope.ts`        | request/response plumbing: bodies, synthetic envelopes, 405s                   |
| `queryAnalysis.ts`   | pure GraphQL text/payload analysis (bot ids, account scope, slow fields)       |
| `upstream.ts`        | the two ways Chatfuel is called: passthrough `forward` and `upstreamGraphql`   |
| `passthrough.ts`     | the forwarded routes: GraphQL POSTs and the REST passthrough                   |
| `supabaseRpc.ts`     | the PostgREST layer (caller / service-role / refusal mapping)                  |
| `botRoutes.ts`       | provisioning and the bots CRUD, sequenced across Chatfuel and the database     |
| `recoveryLink.ts`    | the admin-issued password-recovery link                                        |
| `publishing.ts`      | the Instagram publish queue routes and the scheduler callback                  |
| `publishingMedia.ts` | durable media storage for queued posts                                         |
| `wsRelay.ts`         | the graphql-transport-ws relay, node:http + `ws`                               |
| `gate.ts`            | the Supabase auth gate (`createAuthGate`), node:crypto + fetch                 |
| `workspaceFence.ts`  | the request-time deployment fence (`createWorkspaceFence`)                     |
| `egress.ts`          | outbound HTTP through `HTTPS_PROXY`/`NO_PROXY` (`outboundFetch`)               |
| `egress-ws.ts`       | the WS half of egress (kept apart so `./egress` stays dependency-free)         |
| `vite.ts`            | the dev-server plugin (`chatfuelProxy()`) — the only file importing vite       |
| `server.ts`          | the production server (`createChatfuelServer`) — static `dist/` + core         |
| `index.ts`           | re-exports vite + core + gate + fence (NOT server: it must stay vite-free)     |

```ts
// vite.config.ts
import { chatfuelProxy } from '@chatfuel/vite-plugin-proxy';

export default defineConfig({
  plugins: [react(), chatfuelProxy()],
});
```

```ts
// server/entry.ts  (production)
import { createChatfuelServer } from '@chatfuel/vite-plugin-proxy/server';

const app = createChatfuelServer({ distDir: '…/dist', env: process.env });
await app.listen();
```

Routes (defaults): `POST /chatfuel/graphql`, WS `/chatfuel/graphql`,
`/chatfuel/api/*` → `https://panel.chatfuel.com/api/*` (REST file uploads),
and — only with a service-role key — `POST /chatfuel/auth/recovery-link`.

The REST route is an allowlist, not a passthrough: the five
`/filestorage/upload/*` endpoints the app uses, and nothing else under `/api`.
Everything there answers to the master token while this route's fence reads a
single `botID` query parameter, so a path that names its bot some other way
would be forwarded with the deployment's whole authority and nothing to check
it against. Another path answers `403 RestPathNotAllowed`; a module that truly
needs one adds it to `REST_ALLOWED_PATHS` in `passthrough.ts`, having decided
what fences it. Three rules follow from that fence being the only one there is:

- **`?botID=` is required** on the four bot-scoped paths (`bot`, `livechat`,
  `plugin`, `widget`). Without it there is nothing for the fence to check, so it
  answers `400 InvalidRequest`. Two `botID` parameters answer `400` too: the
  fence can check one, upstream reads one, and the only reason to send two is to
  have them disagree.
- **POST only.** Every upload is a POST, and the method is written rather than
  forwarded — a DELETE or PATCH to an allowlisted path would otherwise reach
  Chatfuel under the master token. Anything else answers `405` with `allow: POST`.
- **`/filestorage/upload/useraccount` is refused with the gate on**
  (`403 AccountOperationBlocked`). It writes to the Chatfuel account behind the
  master token rather than to any caller's bot — the same reason the
  account-level GraphQL operations are refused. With the gate off (single-user
  dev) it still works.

Every ceiling in this section has a default, and the defaults are in
`src/proxyConfig.ts` rather than here: that file is the one place they cannot
drift out of date, and a number copied into prose is a number somebody tunes
against the prose instead of against their own traffic. Read the env name here,
read the number there, and set your own.

Both forwarded routes cap the body they will read — GraphQL small, REST much
larger — and answer `413 RequestTooLarge` **at the byte that crosses the ceiling** — the
rest of the body is dropped rather than read, and the connection is closed
after the refusal, because a caller who is still sending will otherwise keep
sending. GraphQL also requires `content-type: application/json`
(`415 UnsupportedMediaType`): a body a browser can send with no preflight is
the whole cross-site problem. REST uploads are counted while they are in
memory and answer `503 ProxyBusy` with `retry-after: 5` past
`REST_MAX_CONCURRENT` in flight; GraphQL requests are counted from
admission to the upstream answer and get the same refusal past
`GRAPHQL_MAX_CONCURRENT`. A batch counts as one request to both
of those and to the tenant's minute, so the entries have a ceiling of their
own: past `GRAPHQL_MAX_BATCH` the body is refused `413
BatchTooLarge` before any document in it is read.
Token: `CHATFUEL_TOKEN` from the env bag (never exposed to the client bundle;
a missing token answers with a synthetic `ProxyTokenMissing` envelope instead
of crashing the dev server).

Upstream disconnects close the browser socket (upstream 4000–4999 codes pass
through so fatal auth closes are not retried; anything else becomes 1012) —
the client's graphql-ws reconnects through a fresh relay, which is what makes
the api-client's `onReconnect` refetch signal fire.

## Who may call it: the origin policy

The proxy answers on the app's own origin and forwards under the master token,
so a request carrying the browser's ambient credentials is a request it will
forward — which is what a cross-site request forgery is. With the gate on the
shape of the requests already closes most of it (every route wants an
`Authorization` header, which no cross-origin `fetch` sets without a preflight
this proxy would have to allow). What the check is really for is the mode this
package documents for a dev server and a single-user deployment: gate off,
token behind the proxy, no header required — a POST that needs no header needs
no preflight either. `new WebSocket()` has no preflight to hide behind in
either mode.

So every route is checked before it runs (`origin.ts`):

- `sec-fetch-site: same-origin` or `none` — the browser's own word, which
  script cannot forge — is allowed.
- An `Origin` naming this deployment's own host is allowed. The scheme is not
  compared: behind an edge that terminates TLS the socket is plain `http` while
  the browser correctly says `https`, and reading `x-forwarded-proto` would let
  the caller answer the question being asked of them.
- An `Origin` in `ALLOWED_ORIGINS` (comma- or space-separated; `*` allows every
  origin) is allowed and gets the CORS headers that let it read the answer,
  including the `OPTIONS` preflight.
- Everything else answers `403 ProxyOriginForbidden`, and a WS upgrade is
  refused `403` before a socket exists.
- A request with **no** `Origin` and nothing from Fetch Metadata is not a
  browser request at all — curl, a server-side caller, this package's tests —
  and is left alone. Refusing it would break every non-browser client without
  stopping a single browser.

The origin answers one question — which page is calling. It cannot answer the
second one, *am I the host that page thinks it reached?*, because a browser
writes `Origin` and `Host` from the same address: a name the caller owns,
pointed at this server, makes the two agree honestly. That is DNS rebinding,
and against a proxy holding the master token it gets a check of its own:

- `ALLOWED_HOSTS` (comma- or space-separated; `*` turns the check off) names
  the authorities this deployment answers to. The hosts of `ALLOWED_ORIGINS`
  and `PUBLIC_URL` are added to it, and under the Vite plugin so is Vite's own
  `server.allowedHosts`, so there is no second list to keep in sync — set it
  only for a tunnel or preview URL none of those name. An entry without a port
  matches any port.
- Loopback names are always allowed. They are the whole of the defence: a
  request arriving as `localhost` cannot have come from a page served at
  `evil.example`, because `Host` is written from the URL the browser fetched.
- A deployment that named none of its hosts and is not bound to loopback is not
  checked — refusing on a guess would break correct deployments, and that shape
  is what the startup refusals already cover. A loopback bind is checked
  without being configured, which is the dev server holding the master token
  with the gate off.
- Refusals answer `403 ProxyHostForbidden`, before the origin is looked at at
  all — a request that reached the wrong name has no business collecting a CORS
  header on its way out.

Both checks live in `requestRefusal`, together, because the two ways in do not
share a path: the routes run inside middleware, the WebSocket upgrade hangs off
the bare `httpServer` and sees none of it.

## The auth gate

Set both of `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the `auth`
module's env) and the gate is on: every request must carry the caller's
Supabase access token — HTTP `Authorization: Bearer <jwt>`, WS
`connection_init {authToken: "Bearer <jwt>"}` — and every bot the request
names must belong to a workspace that session is a member of. Neither set =
open mode (single-user dev behaviour). One but not the other = **fail
closed**: every proxied request answers `500 ProxyAuthMisconfigured`.
`auth: false` never gates; an `auth: {…}` object forces it on with explicit
values.

The proxy verifies nothing itself. It reads the JWT's unverified `exp` (an
expired token is refused with zero network) and otherwise asks the project's
own PostgREST:

```
POST {supabaseUrl}/rest/v1/rpc/cf_my_bot_ids
apikey: <anon/publishable key>
authorization: Bearer <the caller's jwt>
{}
→ 200 ["<bot id>", …]   the bots of every workspace this session belongs to
→ 200 []                signed in, no workspace yet (provisioning fixes that)
→ 401                   bad or expired JWT (PostgREST checks the signature)
```

Answers map to:

| situation                     | HTTP                          | WS close                |
| ----------------------------- | ----------------------------- | ----------------------- |
| no / expired / bad token      | 401 `AuthSessionRequired`     | 4401 `AuthSessionRequired` |
| no workspace, request names a bot | 403 `AuthTenantForbidden` | 4403 `AuthTenantForbidden` |
| Supabase unreachable          | 503 `ProxyAuthUnavailable`    | 1013 `ProxyAuthUnavailable` |
| partial env                   | 500 `ProxyAuthMisconfigured`  | 4500 `ProxyAuthMisconfigured` |
| no browser init in 5 s        | —                             | 4408 Connection initialisation timeout |

(The api-client turns the first two into `ChatfuelSessionError` on both
transports.) Answers are cached per `sha256(jwt)`, always bounded by the token's
own `exp`: a grant and a 401 for a short window, a 503 for far less than that
(the auth service is expected back, and nobody should be locked out of a
recovered one while it is). Refusals are cached too, because an uncached one is a free RPC per
request and a stream of bad tokens would otherwise be load this gate passes
straight on to Supabase. Concurrent askers about one session share a single flight, the
cache is bounded (expired entries evicted first, then oldest), and misses that
reach Supabase are metered by `maxMissesPerMinute` — past it
the gate answers `503 ProxyAuthUnavailable` without asking. Part of that budget
is reserved for sessions the gate has already admitted, so a run of tokens it
has never seen cannot take the room a returning session needs. Two claims are
read before any of this and cost no network: a token with no future `exp` is
refused, and so is one whose `iss` is not this project's own
`{SUPABASE_URL}/auth/v1`. A just-invited user
is let in on their next request past the TTL, or at once if the admin panel
forgets them. The raw JWT is never stored.

WS order matters: the relay accepts the subprotocol, **waits for the browser's
`connection_init`**, gates it, and only then opens the upstream socket and
sends its own init. An unauthenticated socket therefore never touches
Chatfuel. **The fence is read once, at connect** — a bot added mid-session is
felt on the next connect, and HTTP calls follow the cache window above. A grant
the admin panel *takes away* does not wait for either: revoking one closes the
live sockets that hold that bot with `4401 Unauthorized`, which is the client's
"do not retry with this session".

The relay's own ceilings, all of them about what one socket can cost:
a ceiling on the size of a frame, and on how many frames — and how many bytes of
them — may be held while the gate is still answering (past it the socket closes `4400`; a client that pipelines
its `subscribe` frames behind `connection_init` is normal, an unbounded buffer
on a socket nobody has been admitted on is not), `WS_MAX_SOCKETS`
open browser sockets per process — the upgrade past it is refused `503` before a
socket exists — `TENANT_MAX_SOCKETS` of them for any one tenant, and
a ceiling on open subscriptions per socket. `TENANT_MAX_SOCKETS` cannot count a socket
whose tenant is still unknown, so the sockets still short of their
`connection_init` have a budget of their own: `WS_PRE_AUTH_SOCKETS`,
past which the upgrade is refused `503` while the admitted sockets go on. A socket also carries a lifetime: its
session JWT's `exp`, or an hour, whichever is sooner, after which it closes
`1012` and the client reconnects to be gated again.

### The recovery-link route (optional)

Mounted only when `SUPABASE_SERVICE_ROLE_KEY` is in the env *and* the gate is
on. `POST /chatfuel/auth/recovery-link {"email": "member@example.com"}`, called
by an owner/admin, hands the whole decision to `cf_recovery_authorize` — one
RPC, asked with the **caller's** JWT — and mints a reset link through GoTrue's
`admin/generate_link` only if it returns. It exists so admins can reset
passwords before custom SMTP is configured. The service key never leaves the
server, and the link is never returned to the caller — the response is
`{ "delivered": "server-log" }` and the link goes to the server log.

The database decides rather than the route because the route can only see **one
workspace's** slice of `cf_members`, and a recovery link resets an *account*.
Three conditions, all in SQL: the target is a member of the caller's workspace
(`not_member`), ranks strictly below the caller (`rank`), and belongs to **no
other workspace on this deployment** (`cross_tenant`). Without the last one an
admin of workspace X could mint a link for a member of X who happens to own
workspace Y, take the account, and get Y — which the route would never see.
The same call writes a row to `cf_recovery_events`: the link goes to a log, and
a log is not a record of who asked for one. `cf_list_recovery_events` shows a
workspace's rows to its admins, `cf_my_recovery_events` shows the target theirs.

**That link is a working account-takeover token**, and the log is a wider
audience than the route's own admission: every member of the Vercel project,
anyone with shell or journal access on your own server, anyone who can run
`docker logs`. So the write is **opt-in** — set `AUTH_RECOVERY_LINK_LOG=true`
(or pass `recoveryLinkLogging`) to enable it. Unset, the route answers `501
RecoveryLinkNotEnabled` and mints nothing, which the app already shows as
"password reset links are not enabled on this deployment". Configure SMTP in
Supabase and this route is not the one to use at all.

## Operations the fence cannot check

Both fences — the caller's workspaces under the gate, and the deployment's own
workspace without it — answer one question: *is this bot yours?* A request that
names no bot has nothing for them to check, and is forwarded. That is right for
most of the API (an operation addressing a flow, a contact or a conversation is
reached through a bot the caller already holds) and wrong for the operations
that address the **Chatfuel account** the token belongs to.

Those are refused by name, whether the gate is on or off, with
`403 AccountOperationBlocked`: Public API token minting and revocation, the
account's own `auth*`/`logout` identity mutations, and bot team membership
changes, which are addressed by member or invite id rather than by bot id. The
list is `ACCOUNT_OPERATIONS` in `queryAnalysis.ts`, with the reasoning for each
family beside it, and it is matched against the root selection of the parsed
document — an alias or a fragment spread is the same operation.

Introspection is refused the same way, with `403 IntrospectionBlocked`: a
document whose root selection is `__schema` or `__type` names no bot, so every
fence passes it, and what it answers with is the shape of the whole API behind
the master token. Nothing needs it through the proxy — the client is generated
from the SDL snapshot the core skill bundles, which
`content/api-client/codegen.ts` reads from disk. `__typename` is **not** refused: every generated operation selects
it, and it names the type of a field the caller already reached.

**What a bot can be read through.** Holding a bot is not holding the account it
sits in, but the schema hangs one off the other: `bot { apiToken }` is that
bot's own REST API token in the clear — not the deployment's master token, but a
working Chatfuel credential that outlives the session and reaches Chatfuel with
no proxy in front of it — `bot { invites }` is the deployer's own Chatfuel
invite list, and `bot { workspace { bots { id } botsLimit } }` enumerates every
other tenant of the deployment. With the gate on, a selection that reaches any
of them is refused with `403 AccountScopeBlocked` — see `BOT_SCOPE_DENIED` and
`WORKSPACE_SCOPE_ALLOWED` in `queryAnalysis.ts`. `bot { members }` and
`bot { workspace { id title } }` stay: four modules' assignee pickers select
them, and `PublicUserAccount` carries no address.

**Account structure.** `createWorkspaceAndBot`, `workspaceCreate`,
`workspaceCreateBot`, `workspaceRename`, `workspaceDelete`,
`workspaceTransferBot`, `deleteBot` and `renameBot` change which workspaces and
bots this deployment has. They name no bot the fence could weigh, or the
caller's own, so nothing else would stop them — and creating bots through the
proxy is precisely how a caller would walk around the SQL-side caps
(`cf_bot_cap`, `cf_bot_total_cap`), which only guard the app's own bot routes.
With the gate on they are refused with `403 AccountStructureBlocked`
(`ACCOUNT_STRUCTURE_OPERATIONS`). With the gate off nothing changes: the caller
IS the deployer, and the admin panel's routes send these on purpose.

**Ids that are not bot ids.** A flow, a contact or a conversation id is a handle
to data inside a bot, and most of the operations this repo ships name one of
those instead of the bot. Upstream authorizes the token, not the bot an id belongs
to, so the proxy keeps its own memory of them: every such id reaches a browser exactly once, inside an answer to a
request the bot fence had already checked, and `resourceFence.ts` writes down
which bot each was handed out under. A later request naming an id known to be
another bot's is refused with `403 ResourceNotAllowed`, before the master token
sees it.

`CHATFUEL_RESOURCE_FENCE` picks the mode — `bound` (the default with the gate
on) refuses only what it knows to be foreign, so it cannot turn a legitimate
request away; `strict` also refuses an id it has never seen; `off` is the
default without the gate, where there is one tenant and nobody to be foreign to.
An id seen under two bots is marked shared rather than re-owned, and an id the
request itself carried is never learned from that request's answer — the
poisoning an attacker would try costs a refusal at worst, never a read.

That memory is one Node process's, and `CHATFUEL_RESOURCE_STORE` gives it a
floor: one table on the
deployment's own Supabase, read when this process holds no binding and written
when it does — lazily, and only for the ids a caller actually names, because an
answer carries thousands of ids and a session asks about a handful. So `bound`
survives a restart and `strict` is safe on more than one instance. What `bound`
forwards is still what its definition says it forwards — an id no binding has
been written down for; `strict` is the setting for a deployment that would
rather refuse that one. The table is service-role
only — a caller who could read it could ask which bot an id belongs to, which is
the question the fence exists to refuse — and a Supabase that does not answer
costs knowledge for a few seconds, not latency.

**Operations nobody wrote.** The fences above name what is dangerous, one
mechanism per hole. `allowedOperations.ts` asks the opposite question: of the
thousands of fields in Chatfuel's schema, which does this app actually send?
348, and every one of them is written down already — the modules'
`skill/examples/operations.graphql` files are what codegen reads, so the list is
generated from them rather than curated. A root field that is not on it is
refused with `403 OperationNotAllowed` before any question about who may name
what is asked, over HTTP and over a socket alike.

It is a NAME check on an operation's root fields, and deliberately no more: who
may name a bot, a workspace or a flow is still the bot, account and resource
fences' business. `CHATFUEL_OPERATION_ALLOWLIST` turns it on and off — on with
the gate, off without it, where the caller is the deployer and refusing them a
field of their own schema protects nobody. The repository's validator re-derives
the list and fails when it and the modules disagree, so a module that gains an
operation cannot ship a feature the proxy would 403.

`CHATFUEL_OPERATION_ALLOWLIST_EXTRA` widens that list by name. It is the older
hatch and the weaker one — a name says nothing about what the document under it
selects — so an app that writes operations of its own should reach for the
registry below instead, and keep this for the case the registry cannot cover.

**The documents this app ships.** The narrowest fence of all, and the first one
asked. Pass the app's generated namespaces to the plugin and the proxy forwards
those documents and no others:

```ts
import { operations } from './src/operationDocs.js';

chatfuelProxy({ operations });
```

`src/operationDocs.ts` is written by the wizard and is a barrel of namespace
imports — `import * as livechat from './vendor/api/generated/livechat/graphql.js'`
and one line per module, never `export *`, which would silently drop a name two
namespaces share. All three hosts pass the same object: the Vite plugin, the
standalone server (`proxy: { operations }`) and the Vercel function.

A document is admitted two ways. By its exact text, which is what the generated
client sends; and failing that by `sha256(stripIgnoredCharacters(text))`, so a
bundler that moved a newline is not a production refusal. Whitespace, commas and
comments are the only differences the second lane absorbs — a field added, an
alias, a `@include`, or a different operation name is a different document. What
goes upstream is then the app's own text and the app's own operation name, read
off the document rather than off the request: a caller who put one of the app's
names beside a body of their own choosing does not get to choose what runs.
Anything else is refused with `403 OperationNotInRegistry`, over HTTP and over a
socket alike; a batch is admitted whole or not at all.

This is what the name allowlist cannot do. `CurrentUser` and a `CurrentUser` with
`apiToken` added to it have the same root field, so the allowlist sees one
operation where the registry sees two. Building it costs ~35 ms at startup for
the largest app this repo can generate (508 documents), and nothing per request
beyond a hash.

A host that passes no `operations` at all keeps serving with the check off — an
app scaffolded before the barrel existed still boots — and says so on its startup
line: `operations: NO REGISTRY`. That is the migration path, not a mode to stay
in; `chatfuel-update` writes the barrel for an app that has none. An app that
passes `operations: []` is a different statement — it ships nothing, so nothing
is forwarded.

Behind the gate, `off` takes two variables rather than one. Every caller there is
a stranger, so turning the widest fence off is the master token answering the
whole account schema — and a deploy script that carried the value off a laptop
looks exactly like somebody meaning it. `CHATFUEL_OPERATION_ALLOWLIST=off` on its
own is dropped and the startup line names it;
`CHATFUEL_OPERATION_ALLOWLIST_OFF=1` beside it is what makes it hold. Without the
gate there is nothing to say twice.

**One tenant's share.** `restMaxConcurrent`, `wsMaxSockets` and the gate's
misses-per-minute are the deployment's ceilings; with many tenants behind one
deployment they are also what one tenant can spend on everybody else's behalf.
So requests per minute and live sockets are counted per tenant as well
(`TENANT_REQUESTS_PER_MINUTE` → `429 TenantBusy`;
`TENANT_MAX_SOCKETS` → close 4429), keyed by the fence the caller was
admitted under, and one socket holds a bounded number of open subscriptions.
A fenced caller with no bots yet shares a bucket with every other such caller,
at a fraction of both ceilings, since nothing distinguishes one such account
from the next.

Two conditions change what these counters mean, and both are worth setting up
around rather than reading about after the fact. Per-tenant counting needs a
tenant to count, so it is a multi-tenant deployment's mechanism: give the fence
something to key on. And the counters are in the process, so a deployment that
answers each request from a fresh one gives each of them its own — put the
ceilings you actually rely on in front of the deployment, at the CDN or the
platform's own rate limiter, and let these be the second line.

**Sockets outlive their gate, but not for long.** The gate runs at connect and
the fence it read stands for the life of the socket, so a membership revoked in
the customer's own Supabase project — which this proxy is never told about —
would otherwise be felt only when the client disconnects. Every socket therefore
carries a deadline: its session JWT's `exp`, or an hour, whichever comes first.
Past it the relay closes with 1012 and graphql-ws reconnects, asks for a token
again, and is gated from scratch.

**The publish callback's credential.** `POST /chatfuel/publishing/publish-due` is
authenticated by the sha256 of the publishing secret — the same value
`cf_pub_config` stores, presented in `x-chatfuel-publish-key`. Its reach is
narrow enough to state exactly: the column is unreadable by the app's own key
(RLS on with no policies, and `revoke all … from anon, authenticated,
service_role`; `cf_pub_config_json()` answers with `has_secret` booleans), and
presenting it publishes nothing of the caller's choosing — the body is one post
id, and `cf_pub_take` only yields a row `cf_pub_claim_due` has already flipped
to `publishing` this minute. So holding it buys a race with the scheduler over
a post the scheduler had already decided to publish. Whoever can read it can
also rewrite the queue and let cron publish for them, which is strictly more,
so a second credential here would protect nothing.

Every fence above answers "may this caller name that?". The other shape — the
app's own documents, with everything else refused — is what a multi-tenant
deployment ultimately wants, and it ships in both strengths: the name allowlist
and the document registry, see **Operations nobody wrote** and **The documents
this app ships** above. Keep all of them. The registry is only as complete as the
barrel it was handed, an app extended by hand can widen either list, and the
named fences are what still holds when one of them is widened.

## The production server

`createChatfuelServer({ distDir, port = Number(PORT ?? 3000), host = '0.0.0.0',
env = process.env, proxy?, healthPath = '/chatfuel/healthz' })` → `{ server, proxy,
listen(), close() }`. Order per request: `healthz` → `proxy.handleRequest` →
static. Static is GET/HEAD only, contained inside `distDir` twice over
(traversal and leading-dot segments are refused before any filesystem call;
the matched file is then `realpath`'d and re-checked, so a symlink under
`distDir` cannot serve outside it), `public, max-age=31536000, immutable`
under `/assets/`, `no-cache` for `index.html`, `x-content-type-options:
nosniff` everywhere, and unknown extension-less paths fall back to
`index.html` (the app routes in the path). Upgrades that are not the relay path are
destroyed. `SIGTERM` closes.

## Vendoring contract

The wizard copies the **whole `src/` directory** into scaffolded apps as
`vendor/chatfuel-proxy/` — recursively, with no file list, so new modules
travel without anyone naming them — and rewrites the marked imports:
`@chatfuel:proxy-import` in `vite.config.ts` → `./vendor/chatfuel-proxy/vite`,
`@chatfuel:proxy-server-import` in `server/entry.ts` →
`../vendor/chatfuel-proxy/server`, and `@chatfuel:proxy-vercel-import` in
`api/chatfuel.ts` → `../vendor/chatfuel-proxy/core`. Every relative import in
`src/` carries its `.js` extension because the Vercel builder deploys these
files as-is. The app therefore needs `ws`, `undici` and `https-proxy-agent` as
runtime **dependencies** (the production server relays WebSockets and honours
`HTTPS_PROXY` under `npm ci --omit=dev`) and `@types/ws` in devDependencies;
`vite` itself provides the `loadEnv`/`Plugin` imports for `vite.ts` only.

## Live check (the relay-vs-production risk)

```
pnpm --filter @chatfuel/vite-plugin-proxy live-check                          # HTTP + WS through the relay
pnpm --filter @chatfuel/vite-plugin-proxy live-check -- --send --contact <id> # + mutating echo test
```

⚠ `--send` writes to your live Chatfuel account (creates a conversation and
sends a message). Omit it for read-only checks.
