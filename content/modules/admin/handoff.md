### Admin (admin)

The account behind this deployment's Chatfuel token, for the person who owns it.
**Bots**: the workspaces on a rail with their bot counts against the plan, one
workspace's bots beside it, and a drawer over one bot — its id, when it was
made, its time zone, country and industry, the channels connected to it, its
Chatfuel team, and what this token may do to it. Rename in place, delete with a
confirm, and Open to point the whole app at it. **Access** (only with the auth
module): who in this app reaches which bot, granted and revoked per person.
**Health**: whether the token is still accepted, which fence is in force and how
many bots it holds, whether the database answers, and what the deployment is
missing. Route: `/admin`, the next segment picks the tab (`/admin/health`),
`?w=` names the workspace on the rail and `?b=` the bot whose drawer is open.

Getting in is a password — `ADMIN_PASSWORD` in the server environment, at least
16 characters — and not a Chatfuel or app identity: an open deployment has no
accounts at all, and in one that does, the operator is usually not a customer of
their own product. The password buys one signed, HttpOnly cookie good for two
hours, and nothing else is written to the browser.

**The panel is never in the nav rail.** `/admin` is the whole way in, before
unlocking and after — the rail is the list of places a product's USERS go, and
an operator's door does not belong on it even once its owner has opened it.

Read `skill/references/access.md` before changing anything about the door, and
`skill/references/bots.md` before changing anything about bots — the last-bot
rule (Chatfuel deletes a workspace when its last bot goes), the
`NotEnoughPermissions`-means-already-deleted reading and the two caches that must
be cleared after a create or a delete are none of them visible in the schema.

First-task ideas:

1. Unlock the panel, create a bot in a workspace that is not the deployment's,
   then switch to it from the topbar — it is there immediately, because the
   create clears the fence cache. Delete it again and read the refusal you get
   the first time.
2. Add a column to the bots table showing which channels a bot has: the detail
   route already returns `contactScopes`, and the table would need it in the
   list route instead.
3. Put the panel behind your own identity provider: `requireAdmin` in the
   vendored proxy's `adminSession.ts` is the single check every route starts
   with, and everything above it is unchanged.
4. Add a per-workspace action that creates a Chatfuel workspace as well as a bot
   — `workspaceCreate` exists. The trap: do not select `bots` on the workspace
   you just created. Reading it back that soon can answer with an error and no
   data, and the workspace is created either way — so selecting it would cost a
   real, orphaned workspace on every run.

Deliberately not built, and why:

- **Anything that shows a secret.** The health page reports `CHATFUEL_TOKEN` and
  the service-role key as present or absent. Printing a value would make one
  browser screen as sensitive as the environment file.
- **A bot's `apiToken`.** It opens that bot's public API. The panel never
  selects it.
- **Rotating the admin password from the panel.** The password is the
  environment's, and a deployment that could rewrite its own environment from a
  browser would be a worse door than the one it replaced.
- **Session revocation.** The cookie is stateless, which is what makes it work
  on per-request functions. Rotating `ADMIN_PASSWORD` invalidates every session
  at once, and that is the whole revocation story.

Things that look like bugs and are not: there is no Admin item in the rail and
there never will be (`/admin` always routes — bookmark it); deleting the last
bot of the deployment's own workspace is refused however many times you ask; a
bot created outside this app can be renamed and deleted here but has no row in
the database, so the Access page does not list it.
