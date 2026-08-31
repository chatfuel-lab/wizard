---
name: chatfuel-auth
description: Add user sign-in to a Chatfuel-wizard app with Supabase Auth on the user's own project, where every account that signs up gets a Chatfuel bot of its own and can add more — created by the app's server with the deployment's master token — plus invite links, owner/admin/member roles, per-bot access, a Team page, and a proxy gate that lets a session reach only the bots it was granted. Use when a Chatfuel app is turned into a self-serve product, when adding or changing invites, roles, per-bot access or provisioning, or when wiring the gate into another host. Requires the chatfuel-core skill.
---

# Chatfuel Auth & Team

Supabase Auth (email + password) in front of a Chatfuel-wizard app, in the shape a SaaS needs: **one workspace per account, as many Chatfuel bots inside it as the plan allows**. Somebody signs up, the app's server creates their first bot with the deployment's master Chatfuel token, and they can add, rename and delete more from the Team page. The token stays server-side; the proxy asks Supabase which bots the caller's session may open and refuses every request that names another one.

Colleagues arrive by **invite** and join the inviter's workspace with the role the invite names. **Which bots they may open is granted per person** — except for owners and admins, who administer the workspace and reach every bot in it. The topbar switches between the ones they have.

> **Unofficial API** — the Chatfuel side is unofficial (see `../chatfuel-core/SKILL.md`). The Supabase side is your project: you own its data and its keys.

## Files

| File | What's inside |
|---|---|
| `references/guide.md` | Architecture, the data model, the RPC catalog with error codes, sign-up and provisioning, invites, the runtime gate contract, env vars, SMTP + reset links, re-running / extending / dry-running the migration, the wizard's Supabase flow |
| `references/security.md` | What anon can call, why tables are RPC-only, what the bot fence does and does not cover, the auto-confirm caveat, threat notes |
| `playbooks/embed.md` | Mounting the gate + auth screens inside a host app |
| `playbooks/customize.md` | Knobs: roles, invite expiry, providers, SMTP, styling — and how to restrict who may sign up |
| `examples/rpc-calls.md` | Every `cf_*` RPC as `supabase-js` and PostgREST `curl` calls |
| `examples/proxy-gate.md` | The gate call the proxy makes, and how to reproduce it in another stack |

The SQL lives in the app, not in this skill: `supabase/migrations/` (idempotent, applied in name
order — `0001_chatfuel_auth.sql` is the whole schema) and a
README next to them. There is nothing to seed — workspaces are
created at sign-up. In embed mode they land under `supabase/chatfuel/` in the host project.

## Rules

- Never print, log or commit `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN` or the Chatfuel token. Anon/publishable keys are public by design.
- Every workspace read and write goes through a `cf_*` RPC. Do not add table policies to work around a missing RPC — add an RPC (SECURITY DEFINER, `set search_path = ''`, revoke from anon, grant explicitly).
- `cf_bot_created` and `cf_drop_bot_slot` stay granted to `service_role` and nothing else. They decide which workspace owns which bot; from a browser that would break every other guarantee here.
- Creating a bot happens on the server, never in the browser: `POST /chatfuel/auth/provision` for the first one, `POST /chatfuel/auth/bots` for the rest. The caller reserves the row as themselves (`cf_new_bot`, so the database decides whether they may), then the server creates the bot; if either half fails, the other is undone — no orphans in the deployer's Chatfuel account, and no row that points at nothing.
- A reserved row is NOT a bot, and provisioning counts only rows with a `bot_id`. Counting the reservation is what once let two concurrent sign-up calls answer "done" with nothing made. Concurrent provisioning is stopped at three depths: one in-flight request per account in the browser, one run per tenant per proxy process, and — across processes — the loser drops its reservation and waits, deciding by the `created_at` only `cf_list_bots` carries.
- An account with no bot it can OPEN is provisioned again; a workspace may not delete its own last bot, which is what makes that safe. A member is the exception: they see only granted bots, so zero means "ask an admin", not "make me one".
- Renaming and deleting are the server's too (`PATCH` / `DELETE /chatfuel/auth/bots/<id>`), because both touch Chatfuel: a rename writes the database first and puts the old name back if Chatfuel refuses; a delete removes the bot in Chatfuel first, so a half-done delete leaves a bot out of reach rather than a dead entry in everybody's switcher.
- Bots are created with `workspaceCreateBot` in `CHATFUEL_WORKSPACE_ID` — Chatfuel's billing container, the workspace the deployer's plan is paid on. Plain `createBot` is not a fallback: it puts the bot outside that workspace. Without the variable the route refuses (`ProxyAuthMisconfigured`); when the workspace is full it answers 409 `WorkspaceFull`, and the sign-up screen repeats that sentence.
- The proxy gate is the security boundary. UI role checks are convenience; the RPCs and the fence enforce.
- Sign-up is open unless somebody closed it, and every sign-up costs a bot — as does every bot an account adds later. All of them come out of the ONE Chatfuel workspace named by `CHATFUEL_WORKSPACE_ID` and its plan's `botsLimit`. `cf_bot_total_cap()` and `cf_bot_cap()` bound the total and the per-workspace count (`CHATFUEL_BOT_TOTAL_CAP` / `CHATFUEL_BOT_CAP` at install, or re-run the two one-line functions); above them the Chatfuel plan is the ceiling, and a full workspace answers 409 `WorkspaceFull`. Whether anyone may sign up at all is the Supabase project's own **Allow new users to sign up** toggle — chosen at install (`--signup open|confirm-email|closed`) and never reopened by a later run. To restrict *which* of them gets a workspace, add a check in `cf_claim_workspace` via a `0002_…` migration (`playbooks/customize.md`).
- Keep every migration idempotent — one project serves every workspace, and they are re-run on every deployment.
