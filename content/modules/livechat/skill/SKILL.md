---
name: chatfuel-livechat
description: Build live-chat (operator inbox) clients on the Chatfuel GraphQL API — conversation lists with live updates, message threads with per-platform rendering (WhatsApp, Instagram, Facebook, TikTok, web widget), sending text and attachments, take-over and close-to-flow, GraphQL subscriptions over WebSocket. Use when embedding Chatfuel live chat into another product (CRM, helpdesk) or building any operator-side chat UI against the Chatfuel API. Requires the chatfuel-core skill (auth, CORS proxy, pagination, schema).
---

# Chatfuel Live Chat

Operator-side chat on the Chatfuel platform API: the conversation list, the message thread, sending per platform, conversation lifecycle, real-time subscriptions. **`Conversation.id` IS the contact id** — every `conversationID` argument takes the contact's id.

> Before writing code read `../chatfuel-core/SKILL.md`: required inputs (base URL, token, botID), the mandatory CORS proxy, and the working rules.

## Quickstart: minimal live chat client

```
1. token  = provided by the account owner (see chatfuel-core Required inputs)
2. bots   = BotsList                      -> pick botID          (../chatfuel-core/examples/operations.graphql)
3. chats  = ChatList + ChatListUpdates    -> left pane           (examples/operations.graphql)
4. thread = ConversationMessages          -> newest-first pages
5. live   = MessageAdded / MessageUpdated -> per open conversation
6. send   = Send<Platform>Text / ...      -> branch on platform; fresh UUID clientId per message
7. read   = MarkConversationRead          -> newest MessageID/cursor as `before`
8. close  = TakeOverConversation / CloseConversationToFlow
```

## Files

| File | What's inside |
|---|---|
| `references/guide.md` | Chat list, message history, sending, lifecycle, subscriptions, cache-merge rules |
| `examples/operations.graphql` | Validated ready-to-use operations — copy these as the starting point |
| `../chatfuel-core/references/gotchas.md` | Read before writing any operation |
| `../chatfuel-core/references/pagination.md` | Message-history direction quirks, list merge rules |
| `../chatfuel-core/references/misc.md` | WhatsApp template filling, flow ids for close-to-flow |

## Rules

- Validate every operation with `../chatfuel-core/scripts/validate-operations.mjs` against `../chatfuel-core/references/schema.graphql` before running it live.
