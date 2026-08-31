---
name: chatfuel-coworker
description: Embed the Chatfuel Coworker AI-assistant chat (streaming, tool approval, an assistant that reads your screen and navigates your app) via the GraphQL API — per-(user, bot) conversations, the async send contract (mutations return immediately, replies arrive via subscription or polling), streaming chunks, the manual tool-approval gate, screen-context requests and frontend actions, quick replies, attachments and voice notes, unread counters. Use when embedding the Coworker assistant into another product or building an operator-facing AI chat UI on the Chatfuel API. Requires the chatfuel-core skill (auth, CORS proxy, schema).
---

# Chatfuel Coworker

The AI assistant the bot builder chats with in the dashboard: it answers questions and performs account actions via tools, with a manual-approval gate. Everything is asynchronous — every send returns immediately and results stream in.

It is also *aware of the app around it*. `get_frontend_state` asks the client what the operator is currently looking at and waits a few seconds for the answer, and `CoworkerFrontendAction` asks the client to do something — navigate to a named page, or offer a quick reply. Both are optional to implement and both are what turn the chat into an assistant that works alongside somebody rather than in a box beside them.

> Before writing code read `../chatfuel-core/SKILL.md`: required inputs (base URL, token, botID), the mandatory CORS proxy, and the working rules.

## Files

| File | What's inside |
|---|---|
| `references/guide.md` | The async contract, streaming vs polling, tool approval, screen context and frontend actions, pagination quirks, attachments, don't-use list |
| `examples/operations.graphql` | Validated ready-to-use operations — copy these as the starting point |
| `../chatfuel-core/references/gotchas.md` | Read before writing any operation |
| `../chatfuel-core/references/files-tasks.md` | REST upload endpoint for message attachments |

## Rules

- Validate every operation with `../chatfuel-core/scripts/validate-operations.mjs` against `../chatfuel-core/references/schema.graphql` before running it live.
