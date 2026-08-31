# Security notes

What is actually guarded here, by what, and where the edges are. Read `references/guide.md` first
for the model; this file is the adversarial view of it.

## What each layer answers

Sign-up is open, as in any SaaS: a visitor creates an account, the server creates a Chatfuel bot for
it, and that bot is their whole world. Everything past that point is enforced.

| Question | Answered by |
|---|---|
| May this person create an account? | open sign-up — yes |
| Which bots may this session touch? | `cf_my_bot_ids`, asked by the proxy per session (30 s cache) |
| May this request reach **that** bot? | the proxy's fence, on every HTTP call, REST upload and WS `subscribe` |
| May they manage the team? | `cf_require_admin` / `cf_require_owner`, inside each RPC |
| Which bot belongs to which workspace? | `cf_bot_created` — granted to `service_role` only, called by the server |

The bot boundary is the one that carries the whole promise, because behind the proxy there is a
single Chatfuel account holding every customer's bot. It is enforced in two independent places: the
fence in front of the Chatfuel token, and the RPCs in front of the workspace data. To restrict who
may sign up in the first place, see `playbooks/customize.md`.

## The two secrets, and the two things that only look like secrets

| Value | Where it may live | If it leaks |
|---|---|---|
| `CHATFUEL_TOKEN` | server only (proxy env) | full access to the agency's Chatfuel account — every bot, every conversation |
| `SUPABASE_SERVICE_ROLE_KEY` | server only, required | bypasses RLS and every `cf_*` guard on the Supabase project — including `cf_bot_created`, which is what decides who owns which bot |
| `SUPABASE_ACCESS_TOKEN` | the operator's shell, during the wizard run only | can create/delete Supabase projects in that account. Never written to disk by the wizard |
| `VITE_SUPABASE_ANON_KEY` | the browser bundle — **public by design** | nothing on its own: it only reaches `anon`-granted RPCs |
| `CHATFUEL_WORKSPACE_ID` | server only (proxy env) | not a secret — an id, useless without the master token. It is a **billing** pointer, though: whoever changes it moves every new bot onto a different plan |
| an invite token | the link, until accepted/expired/revoked | someone else arrives with that invite's role. An `admin` invite hands over the workspace. A `member` invite hands over the bots that workspace already holds — which is everything, on a deployment whose sign-ups are closed and where an invite is therefore the only way in at all |
| a recovery link | the server log, only where `AUTH_RECOVERY_LINK_LOG=true` | a working account takeover for whoever can read the log. That is why writing it is opt-in and off by default, and why who may mint one for whom is decided in `cf_recovery_authorize` rather than in the route |
| `PUBLISHING_SECRET` | server only, and hashed in the database | whoever holds it can say what happened to a post the scheduler sent out. It cannot read anything, and cannot report on a post nobody queued |

The wizard's log scrubber masks the Chatfuel token (64 hex), `sbp_…` access tokens, `sb_secret_…`
keys and any JWT on the way to stdout/stderr. It deliberately does **not** mask invite tokens —
those must be printable — which is why every hash in this system is base64 and every raw token is
base64url, never hex.

What it masks is what **the wizard itself** prints. A child process started with inherited stdio —
`npm`, `vercel`, the Supabase CLI — writes to the terminal through descriptors this process never
sees, and nothing masks what those print. So a terminal transcript is not a scrubbed transcript:
read it before pasting it into an issue.

## Why the tables are RPC-only

RLS is enabled on all eleven tables and **no policy is defined** for ten of them, with grants
revoked from `anon` and `authenticated` on every one. Only `cf_profiles` has policies:
self-select and self-update, with `select` and `update (full_name, avatar_url)` granted back to
`authenticated`. Line numbers would be stale by the next migration, so count it out of the file
rather than out of this page — `grep -nE 'enable row level security|create policy'
migrations/0001_chatfuel_auth.sql` answers with one `enable` per table and `create policy` on
`cf_profiles` alone.

PostgREST therefore cannot read or write the other ten at all: the `security definer` functions are
the whole surface.

This buys three things:

1. **No RLS recursion.** The natural policy for `cf_members` ("you may read rows of a tenant you are
   a member of") reads `cf_members`, which re-enters the policy. The classic workaround is a
   `security definer` helper — at which point the functions are the real API anyway.
2. **Token hashes are unreachable.** `cf_invites.token_hash` never crosses PostgREST; `cf_list_invites`
   projects every column except that one. An admin cannot re-read a link they already created.
3. **One place to audit.** Every write path is a function with an explicit guard at the top. There is
   no "this table is writable, but only through the UI".

`cf_profiles` is the exception: `select` and `update (full_name, avatar_url)` are granted to
`authenticated`, narrowed by `id = auth.uid()` policies, so a future profile screen needs no new RPC.
Nobody can read anyone else's profile row directly — team lists come from `cf_list_members`, which is
admin-gated.

## What `anon` can do

One RPC from this module, and it is deliberate:

- `cf_invite_preview(token)` — requires the token itself, and returns a **masked** email hint.
  Guessing a token means guessing 24 random bytes. It is what lets an invite link say who invited
  you and to what, before you have an account.

A second arrives only if the **publishing** module is installed:

- `cf_pub_report(secret, id, botId, status, …)` — the app writing back what happened to a post the
  scheduler sent out. It is `anon`-granted because the shared secret is the whole gate, and the
  alternative is putting the service-role key next to whatever answers callbacks. It reads nothing:
  a wrong secret is 401, a post the scheduler never claimed is 404, and a permalink that is not an
  `https` URL is 422. The secret is one value for the whole deployment, so the bot is named too and
  a row belonging to another one is 404 — holding the secret reaches the posts of the bot the caller
  already knew, not every post in the project.

Everything else answers 401/403 to `anon` — including `cf_claim_workspace`, which needs a session,
so "open sign-up" still means *sign up*, not *reach in with the anon key*. The one rule when
extending:
`revoke execute … from public, anon, authenticated` **first**, then grant. Supabase's default is
`execute` to `anon` on every new `public` function, so a forgotten revoke silently publishes an
admin RPC.

## Auto-confirm: the trade and the compensations

`mailer_autoconfirm: true` means **email addresses are not verified**. Anyone can create an account
claiming any address. Accepted, because a fresh project has no SMTP and the alternative is an app
nobody can sign into. What stops that from mattering:

- **Nothing in the app trusts an address.** Membership is the only thing that grants anything, and
  membership is a row, not a claim in a JWT.
- **The one place an address is checked** is an email-restricted invite (`email_mismatch`) — so
  squatting the address is the only way to steal one, and the real owner can revoke it.
- **Each account owns only what it created.** There is no shared workspace to race for: the wrong
  person signing up gets their own bot, not yours.

Turn "Confirm email" back on the moment SMTP exists; nothing in the app assumes autoconfirm (the
sign-up screens already render a "check your email" state when no session comes back). Note that
confirmation raises the cost of a fake sign-up without changing the model — still open sign-up,
now with a working mailbox required.

## The gate, and what it does not cover

Before the gate asks Supabase anything it reads two unverified claims off the token, which costs no
network: a token with no future `exp` is refused, and so is one whose `iss` is not this project's
own `{SUPABASE_URL}/auth/v1`. Signatures are still PostgREST's job — these two only decide what is
not worth a round trip. Past them, misses are metered per minute, and a fifth of that budget is held
for sessions the gate has already answered `ok` for, so unfamiliar tokens cannot take the room a
returning session needs when its cache entry lapses.

The proxy re-asks Supabase per request, so a removed member loses access within the cache window.
Precisely:

- **HTTP** — at most 30 s of residual access (the gate cache), bounded by the JWT's own `exp`.
- **WebSocket** — the gate runs at **connect** time, and the fence it read stands for the life of
  the socket. Two things bound that life: the admin panel closes the live sockets of a bot it
  deletes or moves, and every socket carries a deadline of its own — the session JWT's `exp`, or an
  hour, whichever comes first — after which it is closed with 1012 and the client reconnects to be
  gated again. So a membership revoked in Supabase, which the proxy is never told about, is felt
  within the token's remaining lifetime rather than never.
- **Resource ids are fenced by memory, not by the schema.** Many operations name a flow, a contact
  or a conversation rather than a bot, and the bot fence cannot read a bot out of those — behind one
  master token every customer's bot is one account's. The proxy
  therefore watches its own traffic: every such id reaches a browser exactly once, inside an answer
  to a request the bot fence had already checked, so it writes down which bot each id was handed
  out under and refuses a later request naming an id known to be somebody else's
  (`CHATFUEL_RESOURCE_FENCE`, default `bound` with the gate on). That memory is one process's, so it
  is given a floor: `CHATFUEL_RESOURCE_STORE` (on by default with the gate and a service-role key)
  shares the bindings through the deployment's own Supabase, read on a miss and written only for the
  ids a caller actually names. So `bound` survives a restart and `strict` — which refuses the
  unknown too — is safe on more than one instance. `bound` is the single-operator setting: it
  forwards an id no binding has been written down for. **A deployment serving more than one customer
  wants `CHATFUEL_RESOURCE_FENCE=strict` together with `CHATFUEL_RESOURCE_STORE`** — that pair is the
  target configuration, and `bound` is the convenience for a deployment with one operator in it.
- **An operation nobody wrote is not forwarded at all.** The bullets above name what is dangerous,
  one mechanism per hole; the allowlist asks the opposite question. Chatfuel's schema is thousands
  of fields wide and the shipped modules send 348 root fields, so the list is generated from the
  operation documents those modules ship and anything else answers `403 OperationNotAllowed` — on HTTP
  and on a socket alike, before any question about who may name what
  (`CHATFUEL_OPERATION_ALLOWLIST`, on by default with the gate). It is a name check on the root
  only: it says which questions exist, not who may ask them. `CHATFUEL_OPERATION_ALLOWLIST_EXTRA`
  widens it by name. Behind the gate the fence takes two
  variables to turn off: `CHATFUEL_OPERATION_ALLOWLIST=off` alone is ignored with a line on the
  startup log, and `CHATFUEL_OPERATION_ALLOWLIST_OFF=1` is what makes it hold.
- **A document this app never wrote is not forwarded at all.** The narrowest fence and the first
  one asked. `src/operationDocs.ts` names the app's generated namespaces and all three hosts hand
  it to the proxy, which forwards those documents and answers `403 OperationNotInRegistry` to every
  other one — on HTTP and on a socket alike, and a batch is admitted whole or not at all. It is
  where the name allowlist above cannot reach: `CurrentUser` and a `CurrentUser` with `apiToken`
  added to it are one root field and two documents. Matching is on the exact text, or on the text
  with whitespace, commas and comments stripped, so a bundler that moved a newline is not a
  refusal; what goes upstream is the app's own text and the app's own operation name, read off the
  document rather than off the request. There is no env var — an app widens it by exporting the
  operation from a namespace the barrel imports.
- **Removal is a real lock-out here.** Somebody removed from a workspace loses it: signing up again
  gives them a NEW empty bot, not the one they were removed from. That is the difference the bot
  boundary makes.

A partially configured gate (one of the two env vars) **fails closed** with a 500. The
alternative — treating "misconfigured" as "off" — would turn a typo in a deploy script into an open
proxy, which is the exact failure this module exists to prevent.

## Threats this design accepts

- **A stranger who finds the URL gets a bot in the deployer's Chatfuel account.** Named and chosen:
  it is what a self-serve SaaS is. It is also the cost model — every sign-up is a bot. Mitigate at
  the network layer, or add a check in `cf_claim_workspace` (`playbooks/customize.md`).
- **A compromised account owns its workspace.** There is no second factor and no admin approval;
  the blast radius is that one workspace and its bot, not the deployment.
- **An admin is trusted with everything below them, and with nothing beside them.** Roles carry a
  rank (owner 3, admin 2, member 1), and every RPC that acts on a person — change role, remove,
  issue a recovery link — refuses a target who is not strictly below the caller (403 `rank`). That
  is not decoration: without it an admin demotes a peer and is then, by the letter of the rank
  check, entitled to reset that peer's password. Anything new that reads a role must read the rank
  the same way.
- **A stolen invite link** works until it expires, is used, or is revoked — that is what a link
  invite *is*, so treat the URL as the bearer credential it is. It is not only an `admin`
  problem: on a deployment with sign-ups closed, which is the shape the deployment guide
  recommends, a `member` invite is the only door there is and it opens onto bots that already
  exist. Email-restrict invites and keep expiry short — and know what the restriction is worth,
  which is that it is checked against the address in the caller's JWT. That proves ownership of
  a mailbox only on a project where addresses are confirmed; under `mailer_autoconfirm` it
  proves that somebody typed the address.
- **A signed-in customer who learns another customer's bot id** still cannot use it: the fence
  answers `403 BotNotAllowed`. A resource id from that bot is refused too (`403
  ResourceNotAllowed`) whenever this instance watched it being handed out — the residual gap is an
  id it never saw, described above.
- **What a bot can be read THROUGH is narrowed, not open.** A caller holds their own bot, and the
  schema hangs the whole account off it. Reads that reach the account rather than the bot — its
  credentials, its invitations, its list of other bots — are refused (`403 AccountScopeBlocked`);
  `bot { members }` and `bot { workspace { id title } }` stay, because the app's assignee pickers
  need them and `PublicUserAccount` carries no address. Mutations that rearrange the deployment
  itself rather than acting on a bot are refused as well (`403 AccountStructureBlocked`): they name
  no bot, so no fence would have stopped them. The exact membership of both lists lives in
  `content/vite-plugin-proxy/src/allowedOperations.ts` and is enforced there, not here.
- **One tenant's share of a shared deployment is capped in the proxy, per process.** Requests per
  minute and live sockets are counted per tenant (`TENANT_REQUESTS_PER_MINUTE`,
  `TENANT_MAX_SOCKETS`), and subscriptions per socket are capped too. This is a noisy-neighbour
  bound, not a boundary: on a host that answers each request from a fresh instance it is per
  instance, which is why the bot caps that matter (`cf_bot_cap`, `cf_bot_total_cap`) live in SQL.
- **The Chatfuel side stays unofficial**: the gate protects the token, not the upstream API's
  stability (see `../chatfuel-core/SKILL.md`).

## Checklist for changes

- New RPC → `security definer`, `set search_path = ''`, revoke, then grant the narrowest role.
- New table → RLS on, grants revoked, reached only through functions.
- New error → `PT4nn` + a `hint` code, mapped in the adapter, rendered as copy.
- New secret → server-side env only, added to the scrubber if it has a recognisable shape.
- Never widen `anon`. If a screen needs data before sign-in, it needs a **new anon RPC with a
  deliberate projection**, not a grant on an existing one.
- Changed the way in? Re-run the SQL scenario (`content/modules/auth/supabase/test/run.sh`, in
  the chatfuel-wizard repository, not in your app) — it asserts who ends up with which role, and
  that `cf_invite_preview` is the only RPC this module grants to `anon`. Publishing's scenario
  asserts the same for its one addition.
