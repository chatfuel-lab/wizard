# Auth & Team — guide

Supabase Auth (email + password) in front of a Chatfuel-wizard app, in the shape a SaaS needs:
**one workspace per account, many Chatfuel bots inside it**. Somebody signs up, the app's server
creates their first bot with the deployment's master Chatfuel token, and they can add, rename and
delete more. Colleagues arrive by invite into the same workspace, and which bots they may open is
granted per person. Objects are prefixed `cf_` because the Supabase project may hold the deployer's
own tables too.

## Architecture in one picture

```
browser ── Supabase Auth (GoTrue) ─────────────► session (JWT, auto-refreshed)
   │                                                   │
   │ api-client `token: () => getAccessToken()`        │
   ▼                                                   ▼
proxy (Vite plugin in dev, server/ in prod)      PostgREST /rest/v1/rpc/cf_*
   │  POST /rest/v1/rpc/cf_my_bot_ids                  (the app's own reads/writes:
   │  apikey: <anon>  Authorization: Bearer <user jwt>  workspace, team list, invites)
   │  → ["<bot the caller may open>", …]
   │        every bot named in the request must be in that set
   ▼
Chatfuel API  (CHATFUEL_TOKEN injected server-side, never in the browser)
   ▲
   ├── POST   /chatfuel/auth/provision  — the account's FIRST bot, at sign-up
   ├── POST   /chatfuel/auth/bots       — another one
   ├── PATCH  /chatfuel/auth/bots/<id>  — rename it here and in Chatfuel
   └── DELETE /chatfuel/auth/bots/<id>  — delete it in Chatfuel, then here
       (workspaceCreateBot / renameBot / deleteBot in CHATFUEL_WORKSPACE_ID with
        the master token; cf_new_bot as the CALLER, cf_bot_created with the
        service key)
```

Two independent trust boundaries, and they answer different questions:

- **PostgREST + the `cf_*` RPCs** answer *"what may this user do inside the workspace?"*. The
  functions are `security definer`; the tables have RLS on with **no policies** and revoked grants,
  so the RPCs are the entire read/write surface. A missing capability is a missing RPC — never a
  new table policy.
- **The proxy gate** answers *"may this request reach Chatfuel at all, for THIS bot?"*. It is the
  only thing standing between one customer and another's data, because behind it there is a single
  Chatfuel account holding every customer's bot. It does not trust the app: it re-asks Supabase per
  session (30 s cache) and fences every request against the answer.

Neither of them answers *"may this person have an account?"* — nothing does. See
[Getting in](#getting-in) below.

## Workspaces

A **workspace** is one account's world: one row in `cf_tenants`, its bots in `cf_bots`, the people
invited into it. Its id is random (`gen_random_uuid()`), created at sign-up rather than derived
from anything, and the app learns it from `cf_my_workspace` — the browser never names a workspace,
so there is nothing to tamper with.

`cf_tenants.created_by` is **unique**. That one constraint is what makes sign-up safe: two tabs or
a retried request cannot open two workspaces, and therefore cannot mint two accounts' worth of
bots.

A bot is a row in `cf_bots`. `bot_id` is nullable and unique — null for the seconds between the row
existing and Chatfuel answering with a bot; the app shows that row as being set up, and the gate
never counts it. Adding one is two steps on purpose:

1. `cf_new_bot(p_name)` **as the caller**, which is where the permission check lives — the database
   decides whether they may, not the server. It reserves a row with no `bot_id`.
2. the server creates the bot in Chatfuel with the master token, then `cf_bot_created(p_slot,
   p_bot_id)` **with the service key**. If step 2 fails the reservation is dropped; if the last
   half fails the bot is deleted again. Neither side is left holding what the other forgot.

**Who may open which bot** is one rule, written once in the SQL and repeated by
`cf_gate_for_bot`, `cf_my_bot_ids` and `cf_my_bots_json`: a member of the workspace who either
administers it (`owner`/`admin` reach every bot in it) or was granted this one in
`cf_bot_members`. Owners and admins never carry grant rows — their access comes from the role, and
listing them would read as something that could be revoked.

**Two caps exist, both in `cf_new_bot`, before Chatfuel is ever asked.** `cf_bot_cap()` limits one
tenant's own workspace (default 20, `CHATFUEL_BOT_CAP`); `cf_bot_total_cap()` limits the
deployment across every tenant (default 200, `CHATFUEL_BOT_TOTAL_CAP`) — both raise `PT429`
(`workspace_bot_cap` / `deployment_bot_cap`). Underneath that, the ceiling is also Chatfuel's:
every bot of every account is created inside `CHATFUEL_WORKSPACE_ID`, and that workspace's plan
has its own `botsLimit`. A full one answers 409 `WorkspaceFull` — to sign-ups and to New bot
alike.

### What isolation is, and what it is not

The fence is exact for anything that names a bot: `botID` in the variables, or the root
`bot(id: $x)` field, on HTTP, REST and every WS `subscribe` frame. Naming somebody else's bot is
`403 BotNotAllowed`, and it never reaches Chatfuel.

Two things it does not cover, and cannot:

- **Operations that name a flow, a contact or a conversation instead of a bot** — 267 of the 461
  operations this repo ships. Those ids are issued per bot and never listed across bots, and the
  upstream API will not resolve one to a bot for the proxy: behind the master token every bot
  belongs to the same account. So the proxy learns the bindings from its own traffic and refuses
  an id it has watched being handed out to somebody else (`403 ResourceNotAllowed`, see
  `CHATFUEL_RESOURCE_FENCE`); what it has never seen it forwards, unless the fence is `strict`.
  Treat a resource id it has not seen as unguessable, not as a boundary.
- **Anything the deployer's own Chatfuel account can see.** `currentUser` and `botsV2` are refused
  with `403 AccountScopeBlocked` precisely because they would hand one customer the list of all the
  others. The exceptions are the fields under `currentUser` that name what they answer about: `id`,
  `botRole(botID:)`, and Coworker's `coworkerConversationsConnection(botID:)` and
  `coworkerGetConversation(id:)` — each checked by the fence its argument belongs to.

## Data model

| Table | What it holds |
|---|---|
| `cf_profiles` | Mirror of `auth.users`: id, email, full name, avatar. Filled by an `after insert or update` trigger on `auth.users` that **swallows every exception** — a failing mirror must never turn into "Database error saving new user" at sign-up. |
| `cf_tenants` | id, `created_by` (**unique** — one workspace per account), display name, timestamps. |
| `cf_members` | (tenant, user) → `owner \| admin \| member`. A partial unique index on `(tenant_id) where role = 'owner'` makes "at most one owner" a database fact, not a convention. |
| `cf_bots` | id, tenant, `bot_id` (**unique**, null while the bot is being created), display name, who added it, timestamps. |
| `cf_bot_members` | (bot, user) — a member may open this bot. Owners and admins are never listed: they reach every bot of the workspace by role. |
| `cf_invites` | token **hash**, role, optional email restriction, `bot_ids` (granted when it is accepted), creator, `expires_at`, `revoked_at`, `accepted_at`, `accepted_by`. The raw token exists only in the creator's response and in the link they paste. |
| `cf_migrations` | Which migrations this project has seen. |

`cf_profiles` is the one table with any direct grant: `select` and `update (full_name, avatar_url)`
for `authenticated`, narrowed by two self-only policies. Everything else is RPC-only.

### Roles

`owner` > `admin` > `member`.

- **owner** — at most one, cannot be removed, cannot be demoted, cannot leave. To get out, transfer
  ownership first (one transaction: owner → admin, target → owner, in that order so the single-owner
  index never sees two).
- **admin** — manages members, invites and bots: creating, renaming, deleting, and handing out
  access. Reaches every bot in the workspace without a grant. Cannot touch the owner row.
- **member** — uses the bots they were granted. `/team` shows them an empty state.

Nobody can change **their own** role or remove themselves through the admin RPCs (`self_target`);
that is what *Leave workspace* is for.

A workspace can end up with **no** owner — deleting their auth user in the Supabase dashboard
cascades the membership away. The workspace itself survives (so the people they invited keep
working) and `cf_claim_ownership` closes the loop: an admin who is already inside takes it. Nobody
new can walk in that way.

## The RPC catalog

Every function is `security definer set search_path = ''`, execute revoked from `public, anon,
authenticated` and granted back explicitly. Arguments are `p_`-prefixed (PostgREST maps a JSON body
key to the parameter name). Errors are raised as `sqlstate 'PT4nn'` with a machine-readable code in
`hint` — **PostgREST turns `PTnnn` into HTTP status `nnn`**, so clients can switch on the status and
then on the hint.

### Anyone (anon key, no session)

| RPC | Returns | Notes |
|---|---|---|
| `cf_invite_preview(p_token text)` | `{status, tenant_name, role, inviter_name, email_hint, email_restricted, expires_at}` | `status` ∈ `valid \| expired \| revoked \| accepted \| not_found`. The email is **masked** (`j***@corp.com`) — enough to say "sign in as this address", not enough to harvest one. `inviter_name` is a display name or `null`, never the inviter's address: whoever holds the link is nobody yet. Rate-limited to 60 lookups a minute per bucket (`PT429`, hint `rate_limited`), and the bucket is the first two characters of the token's hash — not the address a caller claims in a header, which is the caller's to write, and not one counter for everybody, which anyone holding the anon key could keep at `PT429` all day. |

### Any signed-in user

| RPC | Returns | Errors (`hint`) |
|---|---|---|
| `cf_my_bot_ids()` | `text[]` — every bot the caller may open | — (the proxy's call, once per session) |
| `cf_gate_for_bot(p_bot_id text)` | `'owner' \| 'admin' \| 'member' \| null` | — (`null` = that bot is not theirs to open) |
| `cf_my_workspace()` | `{tenant_id, name, role, joined_at, bots[]}` or `null` | — (empty `bots` = the first is still being created, or the last was deleted) |
| `cf_claim_workspace(p_name text)` | the same shape | 401 `unauthenticated` |
| `cf_my_membership(p_tenant_id uuid)` | `{role, joined_at, tenant{id, name, bots[]}}` or empty | — |
| `cf_new_bot(p_name text)` | `{id, tenant_id, name}` — a row with no bot yet | 401 `unauthenticated` · 403 `not_admin` · 404 `tenant_not_found` · 422 `bad_name` / `name_too_long` |
| `cf_bot_for_admin(p_slot uuid)` | `{id, tenant_id, bot_id, name}` | 403 `not_admin` · 404 `bot_not_found` |
| `cf_rename_bot(p_slot uuid, p_name text)` | `{id, bot_id, name, previous_name}` | 403 `not_admin` · 404 `bot_not_found` · 422 `bad_name` / `name_too_long` |
| `cf_remove_bot(p_slot uuid)` | `{id, bot_id, name}` | 403 `not_admin` · 404 `bot_not_found` · 409 `bot_still_upstream` (the row still names a Chatfuel bot — only the server, through `cf_bot_deleted`, may let that id go) |
| `cf_grant_bot(p_slot uuid, p_user_id uuid)` | void | 403 `not_admin` · 404 `bot_not_found` / `member_not_found` |
| `cf_revoke_bot(p_slot uuid, p_user_id uuid)` | void | 403 `not_admin` · 404 `bot_not_found` |

The four that change a bot are called by the app's SERVER, not by the browser: each one has a
Chatfuel half that needs the master token, and calling them directly moves the app's idea of a bot
without moving Chatfuel's. Supabase is reachable without the server — the anon key ships in the
bundle by design — so where that divergence costs something, the database refuses it rather than
trusting the route. `cf_remove_bot` is the one that does: the row keeps its Chatfuel id until the
server says the bot is gone, because a row dropped while its bot is alive strands the bot on the
deployment's plan AND hands its place back under both of `cf_new_bot`'s ceilings, which count
rows. `cf_rename_bot` called directly only leaves the name in the app disagreeing with the name in
Chatfuel, and is left alone.
| `cf_claim_ownership(p_tenant_id uuid)` | membership | 403 `not_admin` · 409 `owner_exists` |
| `cf_accept_invite(p_token text)` | membership | 401 `unauthenticated` · 404 `invite_not_found` · 410 `invite_revoked` / `invite_accepted` / `invite_expired` · 403 `email_mismatch` |
| `cf_leave_tenant(p_tenant_id uuid)` | void | 401 `unauthenticated` · 404 `member_not_found` · 409 `owner_cannot_leave` |

`cf_claim_workspace` and `cf_accept_invite` are both **idempotent-ish**: claiming twice returns the
same workspace, and accepting an invite never *downgrades* an existing role (an admin who opens a
member invite stays an admin).

### The server only (service_role key)

| RPC | Returns | Errors (`hint`) |
|---|---|---|
| `cf_bot_created(p_slot uuid, p_bot_id text)` | `{id, tenant_id, bot_id}` | 404 `bot_not_found` · 409 `bot_already_attached` · 422 `bad_bot_id` |
| `cf_drop_bot_slot(p_slot uuid)` | void | — (a row that already holds a bot is left alone) |
| `cf_bot_deleted(p_slot uuid)` | `{id, bot_id}` — the id it let go | — |

Granted to `service_role` and to **nobody else**. `cf_bot_created` is the function that decides
which workspace owns which bot, and therefore what the gate will allow: a browser that could call it
could point its own row at another customer's bot. It is idempotent for the same bot and refuses a
different one, so a retried attempt cannot silently re-point a row. `cf_drop_bot_slot` is its undo,
and it refuses to touch a row that already holds a bot — a mistaken call cannot delete a working
one. `cf_bot_deleted` is the mirror of `cf_bot_created` at the other end of a bot's life: only the
server can know Chatfuel no longer has the bot, and until it says so `cf_remove_bot` refuses to
drop the row (409 `bot_still_upstream`). The row left behind names no bot, which is the same shape
a reservation waiting on Chatfuel has, and the same sweep in `cf_new_bot` clears it if the delete
never finishes.

### Admins and the owner

`cf_require_admin` / `cf_require_owner` guard these; both raise 401 `unauthenticated` when there is
no session and 403 `not_admin` / `not_owner` otherwise.

| RPC | Returns | Errors (`hint`) |
|---|---|---|
| `cf_list_members(p_tenant_id uuid)` | rows of `(user_id, role, email, full_name, avatar_url, joined_at, bots)`, owner first — `bots` is empty for an owner or admin, who need no grant | 403 |
| `cf_list_bots(p_tenant_id uuid)` | rows of `(id, bot_id, name, created_at, members)` — every bot of the workspace, which is wider than the caller's own | 403 |
| `cf_list_invites(p_tenant_id uuid)` | rows of `(id, role, email, created_by, created_by_name, created_at, expires_at, status, bot_ids)` — **never** the token hash | 403 |
| `cf_create_invite(p_tenant_id uuid, p_role text, p_email text, p_expires_in interval, p_bots uuid[])` | `{id, token, role, email, expires_at, bot_ids}` — the raw token, **once** | 403 · 422 `bad_role` · 422 `bad_expiry` (0 < expiry ≤ 30 days) · 404 `bot_not_found` (a bot from another workspace — never silently dropped) |
| `cf_revoke_invite(p_invite_id uuid)` | void | 403 · 404 `invite_not_found` |
| `cf_change_member_role(p_tenant_id uuid, p_user_id uuid, p_role text)` | void | 403 · 422 `bad_role` · 422 `self_target` · 404 `member_not_found` · 409 `is_owner` · 403 `rank` (the target is not below the caller) |
| `cf_remove_member(p_tenant_id uuid, p_user_id uuid)` | void | 403 · 422 `self_target` · 404 `member_not_found` · 409 `is_owner` · 403 `rank` |
| `cf_transfer_ownership(p_tenant_id uuid, p_new_owner uuid)` | void | 403 `not_owner` · 422 `self_target` · 404 `member_not_found` |

Both member RPCs act on people **below** the caller and refuse an equal with 403
`rank`. An admin who could demote a fellow admin would then be above them for
every rank check in the schema — `cf_recovery_authorize` first among them, which
mints a password-reset link for anyone below the caller. Two calls the panel
already offers, in that order, is one admin taking another admin's account. Only
the owner outranks an admin; an admin keeps every power over members.

There is no settings RPC. The workspace is named after the account that created it
(`alice@acme.io` → "Alice") and is not editable in the app — one less write path.

Helpers exist for the functions above and carry **no grants at all**: `cf_require_admin`,
`cf_require_owner`, `cf_require_bot_admin`, `cf_my_bots_json`, `cf_workspace_name_for`,
`cf_hash_token`, `cf_new_token`, `cf_role_rank`, `cf_mask_email`, `cf_auth_email`, plus the
trigger function `cf_handle_auth_user_change`. Adding a function without the revoke is the one mistake this schema
cannot survive — **Supabase default-grants `execute` on new `public` functions to `anon`**.

Call shapes for every one of these, as `supabase-js` and as `curl`, are in `examples/rpc-calls.md`.

## Getting in

### 1. Sign-up, and the bot that comes with it

There is one way in, and it is the sign-up form every SaaS has. What makes this one different is
what happens after GoTrue accepts the account: the app calls the SERVER, at
`POST /chatfuel/auth/provision` with its own bearer token, and the server does three things in
order — the order is the whole design:

1. `cf_claim_workspace` **as the caller**. Somebody who already has a workspace — their own, or one
   they were invited into — gets it back, and if it already holds a bot with an id nothing else
   runs. `created_by` is unique, so two tabs produce one workspace.
2. `cf_new_bot` **as the caller**, reserving a row with no `bot_id`. The permission check lives
   here, in the database, rather than in the server deciding for itself.
3. `workspaceCreateBot(workspaceID:, initialTitle:)` against Chatfuel **with the master token**.
   This is the only reason the route exists: that token must never reach a browser. The workspace
   is `CHATFUEL_WORKSPACE_ID` — see [Where the bots live](#where-the-bots-live).
4. `cf_bot_created` **with the service-role key**, naming the new bot to the row.

If step 3 fails, the reservation is dropped. If step 4 fails, the server **deletes the bot it just
made** and answers 503. Without either, every retry would leave another orphan — a bot nobody can
reach, or a row that says "setting up" forever.

The app shows a row with no `bot_id` as being set up; the state machine calls it `provisioning`.

**A reservation is not a bot, and the route counts only bots.** This is the difference between a
sign-up that works and one that looks like it did. Signing up asks twice within milliseconds — the
SIGNED_IN membership fetch, and the sign-up screen's own await — and a route that counted rows
rather than ids would let the second call see the first's reservation, read it as finished and
answer 200 with a workspace holding nothing openable. The app believes such an answer, the real
failure arrives under a stale epoch and is dropped, and the account is left on "No bots yet".

So the second caller is stopped on purpose now, at three depths:

- the browser holds ONE in-flight `provisionWorkspace` per account (`lib/singleFlight.ts`), so the
  two sign-up paths are one request;
- the route holds one run per tenant per process, and a joined caller re-reads its own workspace
  rather than borrowing the winner's row;
- across processes (serverless scale-out shares no memory) the database settles it: after
  reserving, the loser sees an older LIVE reservation — `cf_list_bots` carries `created_at`, which
  `cf_my_workspace` does not — drops its own row and waits for the winner. A reservation older than
  a couple of minutes belongs to a run that died and is ignored, so nothing waits on a ghost.

**An account with no bot it can OPEN is provisioned**, not only an account with no workspace at
all. The old rule existed to protect one state — an owner who had just deleted their last bot, who
must not be handed another on the deployment's plan — and that state no longer exists: the delete
route refuses a workspace's last bot. Zero openable bots therefore means one thing, that
provisioning did not finish, and asking again is the right answer. A **member** is the exception
and does not provision: they see only the bots they were granted, so zero is "ask an admin", and
`cf_new_bot` would refuse them anyway.

**An invited colleague gets no bot.** They accept first, which makes them a member, and step 1 then
hands back the inviter's workspace; which bots they may open is granted to them.

### 2. Another bot, later

`POST /chatfuel/auth/bots {name}` runs steps 2–4 above and nothing else. `PATCH` and `DELETE` on
`/chatfuel/auth/bots/<id>` are the other two, and the ORDER of each is the design:

- **rename** — the database first (`cf_rename_bot`, which authorizes and reports the old name),
  then `renameBot` in Chatfuel. If Chatfuel refuses, the old name is written back: a bot called one
  thing here and another there is worse than a rename that did not happen.
- **delete** — Chatfuel first (`cf_bot_for_admin` to authorize and read the id, then `deleteBot`),
  the row second. A row without its bot is a dead entry in everybody's switcher; a bot without its
  row is merely out of reach, and the next attempt finishes the job — deleting an already-deleted
  bot reads as success on purpose. Chatfuel does not say "no such bot" about one it has already
  deleted: it answers `NotEnoughPermissions`, and that is read here as "already
  gone", or a delete whose second half failed once could never finish.

  Before any of that, TWO fences, both answering 409 `LastBotInWorkspace` with one sentence —
  from where the customer sits both mean "this is the last bot in the app".

  The first is **the caller's own workspace**, asked of the database (`cf_my_workspace` as the
  caller, who has already proved they administer this bot) and therefore free of upstream traffic.
  A workspace with nothing openable in it is the state provisioning exists to end, and the app
  answers it by asking for another bot — so deleting your way into it would quietly buy one on the
  deployment's plan. A reservation does not count as the replacement: it may never finish. The way
  out is in the sentence (create another first), and a bot that only needs a different name is
  renamed rather than replaced.

  The second is **the last bot in `CHATFUEL_WORKSPACE_ID`**.
  **Chatfuel deletes a workspace when its last bot goes** — and every
  account's bots live in that one workspace, so the customer who happened to delete the last bot in
  it would take sign-up away from every other customer, permanently: the variable would name
  something that no longer exists, and only the operator could fix it. The check costs one query
  per delete and fails closed (503 `BotDeleteUnavailable`) when Chatfuel cannot be asked, because a
  delete that says "try again in a moment" is recoverable and a workspace that is gone is not.

All three clear the gate's cache when they are done: it was filled seconds ago, and without that
the bot just made would answer "not yours" for the rest of the TTL. Creating one clears the WHOLE
cache rather than the caller's entry — the same person may be signed in on a second device under a
different JWT, and a colleague's tab is stale in exactly the same way.

Step 3 fails in four ways the person cannot do anything about, and the routes say which:

| Chatfuel answers | the route answers | what it means |
|---|---|---|
| `TooManyBotsInWorkspace` | `409` `WorkspaceFull` | the workspace's plan allows no more bots — raise it, or free one |
| `NotEnoughPermissions` / `WorkspaceDoesNotExist` | `500` `ProxyAuthMisconfigured` | `CHATFUEL_WORKSPACE_ID` is wrong, or not this token's workspace |
| anything else, or a non-200 | `502` `ProvisionRefused` | Chatfuel answered and we do not know what it said — the HTTP status rides in the message, because a wrong or expired `CHATFUEL_TOKEN` lands here |
| nothing at all | `502` `ProvisionUnreachable` | a network failure or a timeout; the only one of the four a retry can fix |

All four reach the screen word for word (`membershipError`), because "try again in a moment" would
be untrue of three of them: nothing changes on a retry. The adapter reads the route's own CODE
before falling back to the status — by status alone the two 502s both became `Unknown`, whose copy
("Something went wrong. Try again.") is the wrong sentence AND is filtered out of `/no-access`
entirely, which is how a customer's failed sign-up ended up saying nothing at all.

Every non-ok answer also writes one `console.error` naming the codes, the upstream status and
`CHATFUEL_WORKSPACE_ID` — never the token. It is the only line this proxy logs, and it exists
because the first time this failed in the field there was nothing to read on either side.

Chatfuel's codes arrive nested — `errors[].extensions.errors[].extensions.code`, under a
generic outer message — so read them with `graphqlErrorCodes()`
rather than off the first level.

### Where the bots live

Chatfuel's **Workspace** is its billing container: an agency pays for one, and every bot inside it
draws on that payment. (Not to be confused with this module's own workspace — one account's world
inside the app. The Chatfuel one appears in exactly two places: the wizard prompt and
`CHATFUEL_WORKSPACE_ID`.)

The wizard asks which one to use — `currentUser { workspaces { id title botsLimit bots { id } } }`,
which is the only way to list them (there is no root `workspaces` field, and the workspace roster
is not read here) — and writes it to the env. The
alternative, plain `createBot`, is not a fallback: it puts each bot in a throwaway workspace of its
own, with a bot limit of 1 and nobody's plan behind it, and that workspace outlives the bot when it
is deleted. So a deployment without `CHATFUEL_WORKSPACE_ID` refuses to provision at all.

**One allowance, shared by everybody.** Every account's first bot and every extra one they add are
created in that same workspace, so its `botsLimit` is the ceiling for the whole deployment — not
per customer. `cf_new_bot` caps it first (`cf_bot_cap()` per tenant, `cf_bot_total_cap()` across
the deployment — see "What isolation is" above), but neither is sized against Chatfuel's own
`botsLimit`, so exhausting the plan itself still answers 409 `WorkspaceFull` to sign-ups and to
New bot alike. Watch the number the wizard printed when it asked, and raise the plan before it
bites, or lower `CHATFUEL_BOT_TOTAL_CAP` to stay under it.

So: anyone who reaches the app can create an account, and doing so creates a Chatfuel bot in the
deployer's account. That is the product — it is also the cost model, and the one thing worth a
second thought before publishing the URL. To restrict sign-up, see `playbooks/customize.md`.

### 2. Invites — the role, not the admission

An admin creates one on `/team`; the RPC returns the raw token once and the UI builds
`/invite/<token>`. The token is never readable again — the table has only its hash, so "copy link"
is enabled only for invites created in the current browser session. Expired, revoked and used
invites all preview cleanly instead of 404-ing, so the recipient sees *why* it did not work.

An invite may be **email-restricted**: then only that address can accept it, and the preview shows a
masked hint so the recipient knows which account to use.

What an invite buys is a **seat in somebody else's workspace**, with the role the invite names and
no workspace of its own. An invite for a member can also carry **bots** (`p_bots`): they are
granted the moment it is accepted, so somebody can arrive able to work rather than waiting for a
second action. An admin needs none — the role reaches every bot in the workspace. A bot from
another workspace is refused outright (404 `bot_not_found`) rather than silently dropped, because a
link that grants less than the person writing it meant is worse than one that fails.

Somebody who already owns a workspace keeps it — accepting adds a second membership, `cf_my_bot_ids`
then covers the bots of both, and `cf_my_workspace` still hands back the one they own.
`cf_accept_invite` never downgrades: an existing admin who opens a member invite stays an admin.

## The runtime gate

The browser never holds the Chatfuel token; it holds a Supabase JWT and hands it to the proxy:

- **HTTP** — the api-client's `token: TokenGetter` becomes `Authorization: Bearer <jwt>`.
- **WebSocket** — `connection_init { authToken: "Bearer <jwt>" }`. `graphql-ws` re-reads
  `connectionParams()` on every reconnect, so a refreshed token is picked up automatically.

The proxy then calls `cf_my_bot_ids` with the **anon key as `apikey`** and the **user's JWT as
`Authorization`**, and fences the request against the answer:

| Situation | What the proxy does |
|---|---|
| the request names only bots in the set | forward: strip the browser's `Authorization`, inject `CHATFUEL_TOKEN` |
| the request names a bot outside it | 403 `BotNotAllowed` (WS: an error frame for that subscription) |
| the set is empty (signed in, no workspace yet) **and the request names a bot** | 403 `AuthTenantForbidden` — the app answers it by provisioning (WS: refused at connect, close `4403`, whether or not a bot is named) |
| the query reaches for the account (`currentUser` beyond the bot- and resource-scoped fields, `botsV2`) | 403 `AccountScopeBlocked` |
| PostgREST 401 | 401 `AuthSessionRequired` (bad or expired JWT) |
| anything else | 503 `ProxyAuthUnavailable` |

A request that names no bot and no fenced resource never reaches the fence at all: an empty set is
not by itself a refusal on the HTTP path, and what decides such a request is the account-scope and
operation checks.

No JWT and no local crypto: PostgREST verifies the signature, so the proxy needs no JWT secret. A
missing or `exp`-expired bearer is rejected **before** any network call. Results are cached 30 s per
`sha256(jwt)`, bounded by the token's own `exp` — so a fresh invite is felt within half a minute,
and so is a membership taken away.

WebSockets are gated at connect (a session with no workspace is closed 4403, since nothing it could
subscribe to is its own) and again per `subscribe` frame, which is where the bot id actually
appears.

The gate is **on** iff `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are both set. Neither set →
today's open mode (a single-user dev scaffold). **One of the two** → the proxy fails closed with a
500, because a half-configured gate that quietly lets everyone through is the worst outcome
available. `SUPABASE_SERVICE_ROLE_KEY` additionally mounts `/chatfuel/auth/provision` and
`/chatfuel/auth/recovery-link`; without it nobody can finish signing up. The recovery-link
route delivers by writing the link to the server log, and that link takes over the account it
names — so it delivers only where `AUTH_RECOVERY_LINK_LOG` says the log is a fit place for one,
and answers 501 otherwise. Configuring SMTP in Supabase avoids the route entirely. Who may be
named is `cf_recovery_authorize`'s decision, not the route's: the target must be a member of the
caller's workspace, rank strictly below them, **and belong to no other workspace on this
deployment** — the link resets an account, so a target who stands in a second workspace would
carry this workspace's admin into one they were never admitted to. Every issue leaves a row in
`cf_recovery_events` (`cf_list_recovery_events` for the workspace's admins,
`cf_my_recovery_events` for the person it names). The provisioning route
also needs `CHATFUEL_WORKSPACE_ID` — it is mounted without one, and answers
`ProxyAuthMisconfigured` naming the variable, so the failure says what is missing instead of
looking like a Chatfuel outage.

Consequences to design around: a revoked member keeps working for up to 30 s over HTTP, and keeps an
**already open** WebSocket until it drops — the gate runs at connect time, not per frame. (Provisioning
is the one place the cache is dropped on purpose: the session was gated seconds earlier, when it owned
no bot, so the route calls `gate.forget()` after attaching one.)

Anything stored **against the Chatfuel user** is refused for the same reason — `AccountScopeBlocked`
on `currentUser.userStorageItem`. That is not one feature: livechat (inbox views, canned
responses), deals (saved views), contacts (saved views, table columns) and knowledge-base
(preferences, gap dismissals) all sit on it, plus bookings' preferences. That storage
belongs to the single account behind the master token, so allowing it would hand every customer the
same list. All of them degrade to "nothing saved yet"; a per-account version would live in Supabase,
not in Chatfuel. The
details and a reimplementation for another stack are in `examples/proxy-gate.md`.

## Env vars

| Name | Who reads it | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | browser + proxy | `https://<ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | browser + proxy | publishable (`sb_publishable_…`) preferred, legacy anon JWT accepted. Public by design. |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only**, required | mounts `/chatfuel/auth/provision` (creating each account's bot) and the admin recovery-link route; bypasses every check — never expose it to the browser |
| `AUTH_RECOVERY_LINK_LOG` | **server only**, optional | `true` lets the recovery-link route write its link to the server log. That link is a working account-takeover token for anyone who can read the log, so it is off by default and the route answers 501 instead (only for callers it would have admitted — a request with no session gets 401 either way). Configure SMTP in Supabase rather than turning this on |
| `CHATFUEL_WORKSPACE_ID` | **server only**, required | the Chatfuel workspace every account's bot is created in — the one whose plan pays for them. Not a secret; without it provisioning answers `ProxyAuthMisconfigured` |
| `SUPABASE_PROJECT_REF` | bookkeeping | written on the access-token path |
| `VITE_APP_NAME` | browser | the name on the sign-in screen; there is no workspace to name it after yet |
| `VITE_APP_LOGO` | browser | the mark beside that name — a file in `public/`, or an absolute URL. Unset falls back to a shield glyph |

`VITE_CHATFUEL_WORKSPACE_ID` stops meaning anything with this module on: the workspace picker is
hidden and the bots come from the session, not from the deployment. The proxy's own bot fence is
likewise bypassed — the gate's per-session answer replaces it.

`VITE_*` values are **baked into the bundle at build time**, while the proxy reads its env at
runtime. In Docker that means `ARG`/`ENV` pairs for the `VITE_*` vars at build time and the same
values present at run time; the server logs `auth gate: on (bots per account, …)` / `auth gate:
off` at startup so a mismatch is visible in the first line of the container log.

## Email: what works without SMTP, and what does not

A fresh Supabase project has **no SMTP**, so the wizard sets `mailer_autoconfirm: true` — sign-up
creates a usable session immediately, and no confirmation mail is expected. That is the only way
email + password can work out of the box, and in practice this shows sharply: with autoconfirm
**off**, GoTrue's default provider rejects addresses it considers undeliverable outright
(`400 email_address_invalid`) and caps the rest at `rate_limit_email_sent` — **2 per hour** on the
free plan, after which every sign-up is `429 over_email_send_rate_limit`. A project whose auth
config was not patched is not "unpolished", it is a workspace nobody can join.

Combined with open sign-up it means addresses are never verified and the first account through owns
the workspace, which is exactly why the wizard's last line is "create your account first". A gap
between the install finishing and the installer signing up is a gap in which somebody else can be
first.

*Forgot password* therefore **cannot deliver mail** until the user configures SMTP
(Authentication → SMTP). Two things make that survivable:

- The forgot-password screen always reports "if that address exists, a link is on its way" (no
  account enumeration) — it is honest about the mechanism, not about whether the mailbox exists.
- An admin can issue a reset link directly from the Team row menu. That route runs **on the server**
  with `SUPABASE_SERVICE_ROLE_KEY`: it gates the caller (owner/admin), confirms the target is a
  member using the caller's own JWT, calls GoTrue `admin/generate_link`, and responds
  `{ delivered: 'server-log' }` — the link itself is never in that response. It reaches only the
  server log, and only where `AUTH_RECOVERY_LINK_LOG` says the log is a fit place for one; unset,
  the route answers 501 instead of writing anywhere. Keeping the link out of the HTTP response is
  deliberate, not a gap to close: an admin's request is the caller's own browser, which is exactly
  where a takeover token must not land.

The admin link always uses `token_hash` + `verifyOtp`, **not** a GoTrue redirect with a PKCE code.
That is deliberate: a PKCE recovery link only works in the browser that requested it, which is
exactly wrong for a link an admin pastes into Slack.

The emailed link uses `token_hash` too — but only where Supabase lets us say so. Custom email
templates are a **paid feature**: on the free plan with the default email provider, `PATCH
/config/auth` answers `400 "Email template modification is not available for free tier projects
using the default email provider"`. So the wizard sends the template as its **own** PATCH, after the
settings one, and treats a refusal as a note. On a free project *Forgot password* then falls back to
Supabase's default email, whose link carries a PKCE `?code=` — same-browser only. The admin route is
unaffected, which is why it is the one the docs point at.

## Re-running and extending the migration

The migration is idempotent by construction (`create table if not exists`, `create or replace
function`, `drop policy if exists` + `create policy`) and ends with `notify pgrst, 'reload schema'`
so PostgREST picks up new functions without a restart. Run it as often as you like.

**Never edit `0001`.** One agency project serves many deployments, and each one may re-apply the file
it was shipped with; an edited `0001` means two databases with the same recorded migration and
different schemas. Add `0002_<name>.sql` instead, with the same rules:

- `security definer set search_path = ''`, and call extensions explicitly (`extensions.digest`).
- `revoke execute on function … from public, anon, authenticated;` then `grant execute … to
  authenticated;` (or `anon` for a genuinely public read). Supabase grants `execute` to `anon` by
  default — the revoke is not optional.
- Raise errors as `PT4nn` with a `hint` code, and add the code to the adapter's mapping.
- Token hashes stay **base64**, never 64-hex: the wizard's log scrubber masks any 64-hex string, so
  a hex hash would turn parts of the file and the logs into `[chatfuel-token]`.
- End with `insert into public.cf_migrations …` and `notify pgrst, 'reload schema'`.

### Dry-running the SQL before it touches a project

The chatfuel-wizard repository (not your app — this harness is not part of the scaffold) carries
a harness for exactly this: `content/modules/auth/supabase/test/run.sh`.

```bash
PGBIN=/path/to/postgresql/bin content/modules/auth/supabase/test/run.sh          # a local install
PGDOCKER=my-postgres PGDOCKER_USER=postgres content/modules/auth/supabase/test/run.sh   # one in a container
```

`PGBIN` is the directory holding `psql`, `initdb` and `pg_ctl` — wherever your own Postgres
install keeps them. `PGDOCKER` is the name of a running container instead, which is where most
machines keep their Postgres; the harness copies the SQL in and runs `psql` there. Either way it
works in a database of its own and reads nothing else in the cluster.

It starts a throwaway local Postgres, applies `test/shim.sql` (which stands in for the parts of a
Supabase project the migration touches — the `auth` and `extensions` schemas, pgcrypto, the `anon`
and `authenticated` roles, `auth.users`, `auth.uid()` / `auth.jwt()` over `request.jwt.claims`, and
Supabase's default grants), runs the migration **twice** to prove it is re-runnable, then runs
`test/scenario.sql`: every RPC called as the role PostgREST would use, with expected failures
asserted by SQLSTATE, plus the structural invariants (anon may execute only `cf_invite_preview`;
every `cf_` table is RPC-only and has RLS on). Any `FAIL` line, or a missing
`--- scenario complete`, means the contract moved.

It needs a Postgres binary rather than a Supabase project, so it is not part of `npm test`, and it
is not copied into a scaffolded app — it is the cheap check between live passes.

The file that *does* ship inside the app (`supabase/migrations/0001_chatfuel_auth.sql`, with a
README beside it) means the SQL editor is always a valid way to repair a deployment.

## What the wizard does (to redo it by hand)

The `authSetup` step runs after the bot picker and before the scaffold. With a Supabase **personal
access token** (`SUPABASE_ACCESS_TOKEN` or `--supabase-token`) it drives the Management API at
`https://api.supabase.com`:

1. `GET /v1/organizations` — verifies the token. 401 → mint one at
   `https://supabase.com/dashboard/account/tokens`; 403 → a fine-grained token is missing a scope
   (projects read/write, secrets read, database write, auth config write).
2. `GET /v1/projects` → pick one, or create: `GET /v1/projects/available-regions?organization_slug=…`
   then `POST /v1/projects {name, organization_slug, db_pass, region_selection}`. The generated
   database password is random and deliberately **not stored** — the app never connects to Postgres
   directly. Then poll `GET /v1/projects/{ref}` until `ACTIVE_HEALTHY` and
   `GET /v1/projects/{ref}/health?services=auth,db,rest` until every service is healthy (6 min cap).
3. `GET /v1/projects/{ref}/api-keys?reveal=true` → the anon slot prefers `type: publishable` and
   falls back to the legacy key named `anon`; the secret slot prefers `type: secret`, falls back to
   `service_role`.
4. `POST /v1/projects/{ref}/database/query` with the migration. That is the whole SQL story —
   there is nothing to seed, because workspaces are created at sign-up.
5. `GET` + `PATCH /v1/projects/{ref}/config/auth`: `mailer_autoconfirm: true`,
   `external_email_enabled: true`, `disable_signup: false`, `uri_allow_list` = existing ∪
   `http://localhost:5173/**` ∪ `<app origin>/**` as one comma-separated string, `site_url` only
   when the current value is empty or Supabase's default `http://localhost:3000` (one project may
   serve more than this app — a custom `site_url` belongs to somebody).
6. A **second** `PATCH /config/auth` with the recovery email template
   (`{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery`), on its own and
   allowed to fail — see the email section. One PATCH carrying both would lose the settings above to
   a free-plan refusal.

`--dry-run` skips the three mutating calls and prints what they would do. `--yes` never prompts, so
the project has to be named on the command line: `SUPABASE_ACCESS_TOKEN` together with either
`--supabase-project <ref>` for one that exists or `--supabase-create <name>` for one to make, or
`--supabase-url` + `--supabase-anon-key` for the manual path. The manual path makes no network call
at all — it collects URL and keys, ships the migration, and prints the dashboard instructions.

`--supabase-create` looks for a project already carrying that exact name before it creates
anything, and reuses it — a scripted install run twice ends with one project, not two, which
matters on a free plan that allows two. A paused project of that name is a refusal, not a reason to
create a second one. The organization and the region are worked out (the only organization the
token can see; the recommended region) and overridden with `--supabase-org <slug>` and
`--supabase-region <code>` — the first is required when the token sees more than one organization,
because guessing which one owns the project is not the wizard's call to make.

## Traps

- **Supabase grants `execute` to `anon` on every new `public` function.** Revoke, then grant. This is
  the difference between an admin-only RPC and a public one.
- **`POST /database/query` with `parameters` runs a prepared statement**, and a prepared statement
  takes one command: anything multi-statement answers `42601: cannot insert multiple commands into
  a prepared statement`. The migration is multi-statement, so it goes as plain text.
- **Never send the email template together with the auth settings.** A free-plan project refuses the
  template with a 400 and the whole PATCH is lost, including `mailer_autoconfirm` — which is the one
  setting sign-up cannot live without.
- **RLS recursion**: a policy on `cf_members` that reads `cf_members` deadlocks in an infinite
  recursion error. Sidestepped here by having no policies at all and going through `security
  definer` functions.
- **The `auth.users` trigger must never throw.** A mirror that fails turns every sign-up into
  "Database error saving new user". Hence the exception swallow.
- **`cf_bot_created` must stay `service_role`-only.** It is the one call that decides which
  workspace owns which bot; granted to `authenticated`, it would let any account claim any
  customer's bot and the gate would then wave the requests through. The same goes for
  `cf_drop_bot_slot`, which is why it refuses to touch a row that already holds a bot.
- **A created bot with no row is an orphan** in the deployer's Chatfuel account, invisible to
  everyone and billable — and it eats the shared workspace's allowance. The routes delete the bot
  when the database will not take it; anything that reorders those steps has to keep that property.
- **A row with no bot is the same problem seen from the other side**: it shows as "setting up"
  forever. `cf_new_bot` sweeps the caller's own reservations older than ten minutes, which is what
  keeps a server that died mid-way from leaving one behind.
- **Every write to a bot must call `gate.forget(jwt)`.** The gate caches the caller's bot set for
  30 s; without the forget, a bot created a moment ago answers "not yours" until the TTL runs out.
- **PKCE `?code=` lands in `location.search`, errors come back as a `#error=…` fragment.** Hash
  routing must map that fragment to the callback screen or the user sees a blank app.
- **`detectSessionInUrl` exchanges the code at client construction**, so `INITIAL_SESSION` is the
  first reliable truth — a screen that reads the session synchronously on mount reads `null`.
- **Autoconfirm means unverified emails.** Anyone can sign up claiming anyone's address, and get a
  bot for it. Membership — not the address — is what the gate checks; the only place an address is
  checked at all is an email-restricted invite.
- **Deleting an owner's auth user does not close their workspace.** The membership cascades away,
  the workspace and its bot stay, and an admin inside it can take over with `cf_claim_ownership`.
  Deleting the Chatfuel bot is a separate, manual act.
- **Legacy anon/service_role keys are deprecated** (end of 2026). Both kinds work today; the wizard
  prefers publishable/secret and records which kind it wrote.
- **Free plans allow two active projects.** "Create a new project" fails with a plain 403 when the
  third one is asked for.
- **`/v1/projects/{ref}/database/query` is a beta endpoint.** It is the only way to apply SQL without
  the Supabase CLI, and it is why a failure there degrades to "run this file in the SQL editor"
  instead of aborting the wizard.
