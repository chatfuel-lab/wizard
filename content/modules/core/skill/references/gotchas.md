# Gotchas — read before writing any operation

Cross-domain sharp edges. Domain-specific ones live in each chatfuel-* skill's guide; these bite everywhere.

## Identity & selection

1. **`Conversation.id` IS the contact id.** Every `conversationID` argument = the contact's id. There is no separate conversation identity.
2. **Always select `__typename` on `Contact` and `Conversation`.** Cheap insurance: select `__typename` on every interface/union selection.
3. **`clientId` (messages) must be a fresh UUID per message, unique across ALL clients** of the account — messages are merged by `clientId`. `Message.id` is nullable; `clientId` is the reliable key.
4. Interface field names are **disambiguated per platform** (`whatsappStatus` vs widget `status`, `waReferral`/`fbReferral`/`igReferral`) because one field name must map to one type across implementers. Never assume a field from one platform's message type exists on another's.

## Schema & introspection

5. **Introspection is not available.** Use the bundled `references/schema.graphql`; validate operations with `scripts/validate-operations.mjs` before running them. The bundle is a trimmed copy — it carries the surfaces a scaffolded app works with, and a name that is not in it is a name to treat as unavailable here. The business-info / hours / FAQs / booking notification setters are in it.
6. **The bundle carries names and types only — no descriptions.** It is stripped of every doc-comment and of deprecated members. So a name you cannot find is not necessarily a name you got wrong: it may be one this bundle deliberately does not carry. Prose about a surface lives in these module guides, not in the SDL.
7. **Which error codes a given mutation returns is not in the SDL.** The bundle carries no descriptions, so there is no per-mutation list to read. Take the codes from `DefinedErrorCode`, from the module guide covering that surface, and from what the API actually returns — and switch on the raw `extensions.code` string with a fallback (see `transport-auth.md`).
8. Mutation casing does not follow one rule (`whatsAppTextMessageSend` beside `whatsappAttachmentMessageSend`; `tiktokTextMessageSend` → `TikTokOutTextMessage`). Copy names exactly from the schema.

## Withdrawn → use instead

These names are NOT in the bundle. You will meet them in older code and older
examples; this is what they map to here.

| Withdrawn | Use |
|---|---|
| root `searchContacts` / `countContacts` | `bot.contactsConnection` / `bot.contactsCount` |
| `bot.contactChatsCount` | `bot.contactChatsCountV2(filter:)` |
| `bot.contactDealsTotalsByStages` | `bot.contactDealsByStages(filter:)` |

## Pagination traps

9. `Bot.whatsAppTemplates` returns the full list — do not rely on `first`/`after` here (nullable field). No pagination at all on: `goodsCatalog`, `specialists`, `contactScopes`, `members`, `invites`, `workspaces`, `Workspace.bots`, `bookingsV2`.
10. Message-history direction flips: no cursor / `after` ⇒ newest-first descending; `before` ⇒ ascending. `first` required on contact-ish connections, optional on `messages`. See `references/pagination.md`.

## Data semantics

11. "Deleted or inaccessible" is modeled three ways — handle all: union branches (`DeletedGoodsService`, `DeletedSpecialist`), boolean flags (`PublicUserAccount.isUnknown`, `TikTokPost.isUnknown` ⇒ ignore other fields), and stub types (`UnavailableContact` = no permission, all fields empty; `UnavailableTaskData`).
12. `File.status == Expired` ⇒ the file is gone; don't request or render its other fields.
13. Datetime attribute values travel as **millisecond-timestamp strings** (`"1720456863000"`), not RFC3339 — only the `Time` scalar uses RFC3339.
14. `Task.statuses` is a history (current = latest `startedAt`); past `deadline` = failed. See `references/files-tasks.md`.
15. `contactsCount` respects the caller's visibility restrictions; `contactsTotalCount` doesn't. Pick deliberately.
15a. **Creating a platform link silently replaces the active one for that (bot, platform, kind), and the API keeps no used/expired/revoked state** — read `bot.activePlatformConnectionLinks` / `activePlatformAccessRefreshLinks` before minting; a link gone from the map is gone. See `references/platform-links.md`.

## Transport recap (details in `references/transport-auth.md`)

16. Strip `__typename` from all mutation variables.
17. A 401 can arrive inside an HTTP-200 `errors[]` — check `extensions.code`, not HTTP status, and also `extensions.errors[].extensions.code` when the API relays a wrapped failure.
18. On WS reconnect, refetch everything the socket was feeding — missed events are not replayed.
19. Uploads are REST-then-`FileID`; GraphQL never takes file bytes.
20. Requests are rate-limited per token; a token can be regenerated or stop working — design for rotation.
