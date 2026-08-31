### Auth & Team (auth)

Sign-in for the people who use this app, on your own Supabase project. Email +
password only. **Every account that signs up gets a Chatfuel bot of its own, and
can create more** — all of them made by this app's server with your master token
— inside one workspace of their own. They never learn that any other workspace
exists. The topbar switches between the bots they may open. Colleagues arrive by
invite (`/invite/<token>`, shown once at creation) and join the inviter's
workspace instead of getting one of their own. Roles inside a workspace:
**owner** (one) · **admin** · **member**. Owners and admins reach every bot in
the workspace; a member reaches the ones they were granted, on the Team page or
by the invite that brought them in.

The proxy (dev plugin and `server/`) forwards a request to Chatfuel only after
the caller's Supabase session checks out — and only for a bot that session's
workspaces own. The Chatfuel token itself never leaves the server. Requests
about the Chatfuel ACCOUNT behind the token (`currentUser` beyond `id` and
`botRole`, `botsV2`) are refused outright: that list is every customer.

Routes: `/sign-in`, `/sign-up`, `/invite/<token>`, `/forgot-password`,
`/reset-password`, `/no-access`, and **`/team`** (admins and the owner; opened from the
avatar menu top-right — it is not a rail item). Team = one page: members and invites in one
table (invites carry a *Pending* tag) with a **Bots** column that opens each person's access,
a **Bots** table (new · rename · delete), *Invite people*, and the danger zone (leave /
transfer ownership).

**Do this first:** open `/sign-up` and create an account — you will get a bot
of your own, exactly like a customer would — then add a second from Team. Two env
vars must be in `.env` before either works: `SUPABASE_SERVICE_ROLE_KEY`, which
lets the server register the new bot, and `CHATFUEL_WORKSPACE_ID`, the Chatfuel
workspace the bots are created in (the one whose plan pays for them — the wizard
asked which). **Every bot of every account comes out of that one workspace's
allowance**, so watch its `botsLimit`: when it runs out, sign-ups and new bots
alike answer "…is full — its plan allows no more bots".

The database side is `supabase/migrations/` — apply them in name order, each idempotent and
re-runnable; every read and write goes through the `cf_*` RPCs, the tables themselves are not
exposed. See the `chatfuel-auth` skill for the model, the RPC catalog, the gate contract
and the traps.

First-task ideas: a profile page (name, avatar); custom SMTP so *Forgot password* emails
arrive (until then admins issue reset links from the Team row menu, once `AUTH_RECOVERY_LINK_LOG`
is turned on — it's off by default, so a stock install answers 501 there); OAuth providers on the
sign-in page; surfacing the existing per-workspace and deployment-wide bot caps
(`cf_bot_cap`/`cf_bot_total_cap` in `cf_new_bot`, set via `CHATFUEL_BOT_CAP` /
`CHATFUEL_BOT_TOTAL_CAP`) in the UI instead of a bare `PT429`; cloning a
template bot instead of creating an empty one (`copyBot`, plus `workspaceTransferBot` — a clone
does not take a workspace, so it would otherwise land outside the one being paid for).
