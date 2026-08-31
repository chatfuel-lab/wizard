# Creating, renaming and deleting bots

Two systems can disagree about a bot: Chatfuel, which holds it, and the
deployment's own database, which holds who may open it. Every order below exists
because getting it wrong leaves one side with a bot the other has forgotten.

## Create

`workspaceCreateBot`, never `createBot`. A bot made without a workspace lands in
a throwaway one of its own, which outlives the bot, and — the part that matters
— it is outside the workspace whose plan the deployer pays for.

With a database:

1. reserve the row (`cf_admin_new_bot`),
2. create the bot in Chatfuel,
3. record the id on the row (`cf_bot_created`).

The workspace to hand the bot to is optional — the form offers "nobody yet". The
row is reserved either way, with a null `tenant_id`, and the first
`cf_admin_grant_bot` settles which workspace it belongs to: the one the caller
names in `p_tenant_id`, or — when nobody names one — the workspace the person
being granted it stands in, or a refusal if they stand in several. Until then
nobody can reach it, because every rule joins `cf_bots` to `cf_members` through
`tenant_id`.

Which also means it is in no workspace's list of bots, so `cf_admin_tenants_json`
cannot carry it: `cf_admin_unassigned_bots_json` is where the panel finds it
again, and the access screen offers it on every row. The panel grants from a row
that is already inside a workspace, so it passes that workspace's id and the
person's several memberships stop being a question.

Step 2 failing drops the reservation. Step 3 failing deletes the bot again: a
bot that exists in Chatfuel and in no workspace here is invisible to the people
it was made for, and leaving it behind means a retry creates another one every
time.

Without a database, only step 2 runs.

## Rename

The database first, because it is the one that can say no; Chatfuel second. If
Chatfuel refuses, the old name goes back — a bot called one thing here and
another there is worse than a rename that did not happen.

A bot with no row here (one created outside the app) renames in Chatfuel only,
and the database half reports that it had nothing to do rather than failing.

## Delete — the trap

**Chatfuel deletes a WORKSPACE when its last bot goes.**

For the workspace this deployment names, that is unrecoverable from inside the
app: the id in the environment would point at something that no longer exists,
and on a deployment with sign-up nobody could create an account again. So it is
refused outright, and no flag gets past it.

For any other workspace it is a real thing an operator may want. It is refused
once, with a sentence saying what it costs, and allowed when the same delete
arrives again with `force=1` — the panel only sends that after somebody has read
the refusal and clicked a second time.

When Chatfuel cannot be asked which workspace a bot is in, the delete is refused.
Every fence in this proxy fails closed for the same reason: a delete that says
"try again in a moment" is recoverable and a workspace that is gone is not.

Order: Chatfuel first, the database second — the opposite of a rename. A row
without its bot is a dead entry in everybody's switcher; a bot without its row is
merely out of reach, and the next attempt finishes the job.

## Already gone reads as success

Asked about a bot it has already deleted, Chatfuel answers `NotEnoughPermissions`
— not "no such bot". Treating only `BotDoesNotExist` / `NotFound` as "already
gone" leaves a half-finished delete that can never complete. The proxy's
`deleteBotUpstream` reads all three as success, and both the app's bot routes
and this panel share that one function so the reading cannot drift.

## The caches that must be cleared

Two answers are held after a bot changes, and neither notices on its own:

| Cache | Held for | What a stale one does |
|---|---|---|
| the workspace fence | 60 s | a bot the panel just made is refused by the proxy |
| the auth gate, per session | 30 s | a person is told their own new bot is not theirs |

Both are cleared whole after a create or a delete, and the gate again after a
grant or a revoke. This is not a nicety: a cache holding the empty bot set
from the seconds before a bot existed goes on telling the newcomer, for the
rest of the window, that they have no bots.
