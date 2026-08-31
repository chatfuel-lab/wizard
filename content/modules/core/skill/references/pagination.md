# Pagination

Relay-style cursor connections (`edges { cursor node } pageInfo { hasNextPage hasPreviousPage startCursor endCursor }`) — with platform-specific quirks.

## Typed cursors

Every connection has its own cursor **scalar** and its own PageInfo **type** (there is no shared `PageInfo`): `MessagesCursor`, `ContactSearchCursor`, `BotsCursor`, `BotAttributeCursor`, `WhatsAppTemplateCursor`, `KeywordRuleCursor`, `FbPageCursor`, `InstagramMediasCursor`, `MetaAdCursor`, … Cursors are opaque strings; never construct one, only echo values from `pageInfo`/`edges`.

## `first` requiredness varies

- `Conversation.messages(first, after, before)` — `first` is **optional**.
- `Bot.contactsConnection` / `contactChatsConnection` / `contactDealsConnection` — `first` is **required** (`Int!`).

Check the field signature in `references/schema.graphql` rather than assuming.

## Message history direction semantics (non-obvious)

`Conversation.messages`:

- **No cursor, or `after`** ⇒ **descending** — newest message first. `after: pageInfo.endCursor` walks **backwards into history** (older pages).
- **`before`** ⇒ ascending order.
- Practical loop for a chat UI: initial load `messages(first: 100)`; "scroll up to load older" = `messages(first: 100, after: <endCursor>)`; `pageInfo.startCursor` is the NEWEST message's cursor (used for mark-as-read).

## Chat/contact/deal lists

Forward-only in practice: page with `after: pageInfo.endCursor`, guard with `hasNextPage`, and never issue a page fetch while the previous one is in flight. Changing any filter argument resets the connection — throw away accumulated edges.

## Client-side merge rules

When accumulating pages and applying subscription updates into the same list:

1. **De-duplicate by node id** — an incoming page or update may contain nodes you already hold; replace rather than append.
2. Live updates (`contactsChatUpdates`, `contactsDealUpdates`) do NOT tell you the position: re-sort yourself — chat list by `lastConversationMessageTime` desc, deals by `lastSalesStageUpdateTime` desc.
3. Messages merge by **`clientId`** (not `id`) — see the chatfuel-livechat skill's guide.

## Watch out

- `Bot.whatsAppTemplates` returns the full list; do not rely on `first`/`after`/`before` here (and the field is nullable).
- No pagination at all (full list every time): `Bot.goodsCatalog`, `Bot.specialists`, `Bot.contactScopes`, `Bot.members`, `Bot.invites`, `Workspace.bots`, `CurrentUserAccount.workspaces`.
- An `after` cursor that has fallen out of the result window can produce an "invalid cursor" error — recover by refetching from the start.
