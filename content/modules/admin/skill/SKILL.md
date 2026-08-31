---
name: chatfuel-admin
description: Build an operator-only admin panel inside a Chatfuel-wizard app — the account behind the master token, its workspaces and their bots, created, renamed and deleted from the app, one bot's details and channels, per-bot access for the app's own accounts, and a health page over the deployment itself. Its authorization is a password in the server environment rather than a Chatfuel or Supabase identity, and its routes deliberately bypass the proxy's auth gate and workspace fence. Use when building any operator, back-office or fleet-management surface over a Chatfuel deployment. Requires the chatfuel-core skill; recommends chatfuel-auth (per-bot access needs the accounts it creates).
---

# Chatfuel Admin

An operator's view of the whole Chatfuel account a deployment runs on, and the controls that go with it: workspaces with their bot counts against the plan, bots created and deleted in a chosen workspace, one bot's details, who in this app reaches which bot, and what the deployment itself is missing.

Everything it reads and writes goes through routes the vendored proxy adds under `/chatfuel/admin`. The module makes no GraphQL call of its own — the questions it asks need the master token, so they are asked on the server.

> Before writing code read `../chatfuel-core/SKILL.md`: required inputs (base URL, token, botID), the mandatory CORS proxy, and the working rules.

## Files

| File | What's inside |
|---|---|
| `references/access.md` | The password, the signed cookie, the throttle, what the panel deliberately bypasses, and the threat model in plain terms |
| `references/bots.md` | The order create, rename and delete must run in, the last-bot trap that deletes a workspace, and the two caches that must be cleared |
| `references/health.md` | What the health page reports, and the rule that a secret is a yes or no and never a value |
| `playbooks/customize.md` | Every knob: session length, the password floor, the throttle, the tabs, the rail |
| `playbooks/embed.md` | Mounting inside a host app: the proxy prefix, the cookie path, and what an embed cannot offer |
| `../chatfuel-auth/references/guide.md` | The tenants, members and grants the access page reads, if installed |
| `../chatfuel-core/references/gotchas.md` | Read before writing any operation |

## Rules

- The admin password is read from `ADMIN_PASSWORD`, **unprefixed** — a `VITE_` name would put it in the browser bundle. Never send it anywhere, never log it, never write it into a file other than `.env`.
- Never select `apiToken` on a bot. It opens that bot's public API, and a panel that prints it turns one secret on a screen into another.
- The health page reports every secret as present or absent. Values never leave the server.
- Deleting the last bot of a workspace deletes the workspace. The workspace this deployment names may never be emptied; any other one is refused once and allowed on a second, explicit ask.
- After creating or deleting a bot, clear the workspace fence and the auth gate. Both cache their answers, and a bot the panel just made is otherwise refused by the proxy for up to a minute.
