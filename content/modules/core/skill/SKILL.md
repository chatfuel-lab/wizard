---
name: chatfuel-core
description: Foundation for building anything on the Chatfuel GraphQL API — auth tokens and their lifecycle, the mandatory CORS proxy, HTTP + WebSocket transport (GraphQL subscriptions over graphql-transport-ws), cursor pagination semantics, cross-domain gotchas, the full bundled schema SDL, shared operations (CurrentUser, BotsList, MyBotRole, file readback) and the operation validator. Use whenever working with the Chatfuel API: read this before writing any operation, and alongside every domain skill (chatfuel-livechat, chatfuel-contacts, chatfuel-flow-builder, …). Required by all chatfuel-* skills.
---

# Chatfuel GraphQL API — core

The foundation every `chatfuel-*` skill builds on: transport & auth, the mandatory backend proxy, pagination, cross-domain gotchas, the bundled schema, shared operations and the validator. Domain surfaces (live chat, contacts, deals, automations, flow builder, preview chat, Coworker, knowledge base, bookings, team management) live in the sibling `../chatfuel-*` skills.

## Required inputs

Ask the user for these before writing code:

1. **Base URL** — the Chatfuel dashboard origin. Production: `https://panel.chatfuel.com`. Derive endpoints from it:
   - HTTP: `POST {base}/graphql`
   - WebSocket: `wss://{host}/graphql` (subprotocol `graphql-transport-ws`)
   - REST (uploads etc.): `{base}/api/...`
2. **API token** — a Chatfuel dashboard auth token. The account owner generates it at `https://panel.chatfuel.com/integration/auth/token` and pastes it in; rotation means generating a new one there. Treat it as a server-side secret.
3. **botID** — the Chatfuel project ("bot") id. Discoverable via the `BotsList` operation (`examples/operations.graphql`) once the token works.

## Architecture requirement: a backend proxy

Browsers on foreign origins cannot call the API directly — production CORS allows only `https://panel.chatfuel.com`. **Any browser-based UI must route GraphQL through the integrator's own backend**, which also keeps the token off the browser. Read `references/cors-proxy.md` before designing anything browser-facing. Server-to-server calls need no proxy.

One consequence is worth stating on its own, because every fence in this codebase exists because of it: there is **one** token, it holds the whole account, and it does not distinguish the deployment's customers from each other. A proxy serving more than one of them is the only thing standing between one customer's request and another customer's bot, so it decides which bot a caller may name — it never asks the caller.

## Mental model

- Hierarchy: **UserAccount → Workspace → Bot ("project") → ContactScope (channel: WhatsApp number / Instagram / Facebook page / TikTok / web widget) → Contact → Conversation**.
- Almost everything is scoped by `botID` — you read data by traversing `bot(id:)` and `currentUser`, not via per-entity root queries.
- Platforms: `widget | facebook | instagram | whatsapp | tiktok`. Message types, send mutations, and some fields are **per-platform** — always branch on `Conversation.platform` / `__typename`.
- **`Conversation.id` IS the contact id** (server-side alias). Every `conversationID` argument takes the contact's id.
- Real-time = GraphQL subscriptions over one lazy WebSocket (`graphql-transport-ws`). Lists update via batched Add/Update/Remove edge events that the client must merge and re-sort itself. Exception: the **flow builder has no subscriptions** — reconcile from mutation results.
- Two separate automation surfaces, don't confuse them. **Automations** = how the AI behaves, configured per scope (channel + entry point): **Bot → FuelyAutomation (one base per scope, plus custom ones) → FuelySetting** (the chatfuel-automations skill). **Flows** = scripted logic on a canvas: **Bot → Flow → Block (canvas node) → BlockElement ("plugin" card) → buttons/handles → connections**, strongly typed per plugin, no JSON configs (the chatfuel-flow-builder skill).
- Permissions per bot role (`Admin | Editor | Agent | Custom`): `Inbox` gates live chat, `People` contacts, `ContactsAssignedToOthers`/`ContactsUnassigned` visibility. Check with the `MyBotRole` operation (`examples/operations.graphql`).

## Files in this skill

| File | What's inside |
|---|---|
| `references/schema.graphql` | Full SDL (introspection is disabled in production — this is your only schema source; grep it for exact fields) |
| `references/possible-types.json` | interface/union → concrete types map (needed by normalized caches, e.g. Apollo `possibleTypes`) |
| `references/transport-auth.md` | Endpoints, auth header, WS connection, reconnect strategy, error envelope, rate limits, token lifecycle |
| `references/cors-proxy.md` | Why a proxy is mandatory + requirements spec for building it |
| `references/pagination.md` | Cursor pagination semantics (typed cursors, direction quirks) |
| `references/files-tasks.md` | REST file uploads, File entity, async Task tracking patterns |
| `references/misc.md` | Uncovered surfaces map: widget config, WhatsApp templates, keywords, broadcasts, platform connections, Meta Ads, IG publishing |
| `references/gotchas.md` | **Read this before writing any operation** — cross-domain sharp edges |
| `examples/operations.graphql` | Shared operations every module needs: `CurrentUser`, `BotsList` (bot discovery), `MyBotRole` (permissions), `FileGet`/`FileStartDownload` |
| `scripts/validate-operations.mjs` | Validates this skill's and every sibling chatfuel-* skill's examples against the schema — extend it to validate your own operations before shipping |

## Working rules

1. **Never introspect production** — it's disabled. Use `references/schema.graphql`.
2. **Validate every operation you write** against the bundled schema (reuse `scripts/validate-operations.mjs`) before running it against the live API.
3. Read `references/gotchas.md` first; it prevents the recurring classes of bugs (missing `__typename`, wrong per-platform field names, names this schema does not publish, fake pagination).
4. Copy operations from the relevant skill's `examples/operations.graphql` as the starting point — they encode the known quirks.
4a. **A generated app refuses a document it does not ship.** In an app scaffolded by `@chatfuel/wizard`, the proxy checks every request against the documents exported from the namespaces in `src/operationDocs.ts` and answers `403 OperationNotInRegistry` for anything else — a field added to an existing operation included, since that is a different document. So an operation of your own has to be exported from a namespace that barrel imports, not merely written somewhere the client can reach.
5. When output must go to a browser UI, design the proxy first (`references/cors-proxy.md`).
