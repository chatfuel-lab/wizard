# Coworker (operator AI assistant)

The AI assistant the bot builder chats with in the dashboard ("Coworker"): it answers questions and performs account actions via tools, with a manual-approval gate. Operations: `examples/operations.graphql`.

## Model

- **Conversations are per-(user account, bot).** The list lives on `currentUser.coworkerConversationsConnection(first!, after, botID)`; another operator of the same bot cannot see your conversations. `currentUser.coworkerGetConversation(id)` returns **null** (not an error) for missing/non-owned ids.
- One flat message type: `CoworkerMessage {id, clientID, role, content, attachments, toolCalls, clientActionType, time}`. `role` ∈ `coworker | user` (lowercase; assistant replies and tool results both arrive as `coworker`). There are no separate entry/status types and no per-message status.
- `toolCalls` is populated only on tool-**result** messages (0 or 1 element): `CoworkerToolOther {toolID}` | `CoworkerToolButtons {buttons}` | `CoworkerFrontendAction {actionType, parameters}`. Assistant messages that *requested* tools show `toolCalls: []`. **Failed tool results and rejections arrive as fully empty messages** (`content` empty, `toolCalls` null/empty).
- ⚠ **Every tool call therefore costs TWO messages, and both have empty `content`:** the request (`toolCalls: []`) and the result (one `toolCalls` entry). Filtering on "no content" hides the whole run — the rule that works is *no content **and** no tool calls is noise; a message carrying tool calls is a step.*
- **`content` is markdown**, not plain text: `**bold**`, `-` lists and fenced ```` ```json ```` blocks all appear in ordinary answers.
- `toolID` families seen in practice: `chatfuel_gql-<action>` (account reads and writes), `frontend_action-<type>`, **`skill-<name>`** (the assistant loading its own instructions), and built-ins `get_frontend_state`, `search_help_docs`, `fetch_url`.
- `CoworkerToolButtons` **does not come back in practice** — asked for buttons, the assistant answers with a row of `suggest_quick_reply` frontend actions instead. Render it, but do not design around it.
- `title` is server-generated from the first user message, so it is a whole sentence and can be long; it is sometimes the literal string `"null"`, and it can be a greeting rather than a subject. **No rename, delete, or archive exists** in the public API — `frontendStateStorage` is where a client-side title or pin belongs, and it is server-persisted.
- Fresh `coworkerConversationCreate` conversations are empty but appear in the list — hide rows whose `messagesConnection(first: 1)` has no edges.

## The async contract (most important)

**Every send/click/approve mutation returns immediately** (`CoworkerConversation!` or `true`); your own message, the assistant's reply, tool results and state changes all arrive asynchronously. Two ways to receive them:

1. **Subscriptions (proper):** one bot-scoped `coworkerAnyConversationUpdated(botID)` covers all your conversations — demultiplex by `conversationID` (the `CoworkerConversationUpdated` member has none; read `conversation.id`). Events:
   - `CoworkerMessageStreamingChunk {conversationID, messageID, chunk}` — content **deltas** with a pre-generated id; buffer per `messageID` (chunks can precede any other mention of that id) and append.
   - `CoworkerMessageAdded {message}` — the authoritative full message (user, assistant and tool-result alike). For a streamed id, **overwrite** the accumulated buffer. Your own sends echo `clientID` here — key optimistic entries by `clientID` when present, else `id`.
   - `CoworkerConversationUpdated {conversation}` — loop started/finished, `pendingAction` set/cleared, unread counters.
   - `CoworkerFrontendStateRequested {requestID, query}` — see below.
   - `coworkerConversationUpdated(id)` is not in this schema; don't reach for it.
   - Reference resilience pattern: if no event lands for ~15s while a loop is active, refetch state and resubscribe; refetch on WS reconnect.
2. **Polling (HTTP-only clients):** poll `CoworkerState` (in examples) every 2–3s while `isAgentLoopActive` — messages only appear once **complete** (nothing is persisted mid-stream; you simply don't see typing-out). Dedupe by `node.id`. Show a typing indicator from `isAgentLoopActive`. ⚠ A polling client never sees `CoworkerFrontendStateRequested` — that tool call expires unanswered (harmless, but screen-context features won't work).

`isAgentLoopActive` is a hint, not a guarantee — do not treat it as proof an answer is still coming; keep a timeout of your own.

Interrupt a running loop with `coworkerConversationStopStreaming(id)` — partial content is persisted.

## Tool approval

Pending approval is **conversation state**, not a message: `CoworkerConversation.pendingAction`:

- `CoworkerToolApprovalRequest {requestedInMsgID, tools: [{toolID, arguments, needsManualApprove}]}`. Not every listed tool has `needsManualApprove: true`, but at least one does; **none of the batch runs until resolved**. `requestedInMsgID` may point to an invisible message — its only use is being passed back.
- Resolve with `coworkerConversationRespondToolApproval(clientID, conversationID, messageID: requestedInMsgID, approved, denialMessage)` — **one boolean for the whole batch**, returns `true` immediately (async resume). On reject, each tool gets an invisible failed-result message and (if `denialMessage` set) a visible user message, then a fresh loop runs.
- **Implicit reject:** sending a normal text message while approval is pending = reject with that text as `denialMessage`. Sending *attachments* while pending ⇒ `AttachmentInvalid`.
- **No expiry** — a pending approval blocks the conversation indefinitely until resolved. Edge case: if the triggering message is no longer the newest, the pending action is silently dropped and nothing executes.
- `CoworkerUserMessageRejected {rejectedMessage, reason}` (e.g. `InvalidAttachments`) is the other `pendingAction` variant: render the message in an error state; re-send (replaces it) or `coworkerConversationAbortRejectedUserMessage(id)`.
- `toolID` naming: `chatfuel_gql-<action>` for account mutations (e.g. `chatfuel_gql-create_booking`), `frontend_action-<type>` renders as `CoworkerFrontendAction`, plus built-ins (`search_help_docs`, `fetch_url`, …). After a `chatfuel_gql-*` tool completes, refetch the dashboard data it touched.
- **Reads do not need approval.** `chatfuel_gql-list_catalog` and `chatfuel_gql-list_specialists` ran with no `pendingAction` at all; the gate appears for writes. The shape of one batch:

  ```json
  { "requestedInMsgID": "…", "tools": [{
      "toolID": "chatfuel_gql-create_service",
      "needsManualApprove": true,
      "arguments": { "botId": "…", "service": {
        "title": "Example service", "description": "", "durationSeconds": 900,
        "images": [], "isAvailable": true,
        "price": { "amount": "1.00", "currency": "USD" } } } }] }
  ```

  Arguments are deep and tool-specific — a readable summary has to be derived per tool, with an honest generic fallback.
- On reject with a `denialMessage`, that text appears in the thread as a **visible user message**.

## Frontend-state requests, frontend actions & storage

- `CoworkerFrontendStateRequested {requestID, query: screen_context}`: the agent asks what the operator is looking at and **waits only a few seconds** for `coworkerConversationFrontendStateSubmitReply(conversationID, requestID, data: Map!)`. Late/unknown `requestID` ⇒ `FrontendStateRequestNotFound`. The tool is called `get_frontend_state` and the model receives your map wrapped as `{"success":true,"data":{…}}`.
- **`Map!` is not a string map.** Nested objects, arrays, numbers and booleans all round-trip to the model verbatim — a reply of `{module:'deals', nested:{view:'board',rows:34}, list:['a','b'], num:7, bool:true}` arrives quoted exactly. Send structure; do not flatten.
- ⚠ **Exactly one client may answer a `requestID`.** If two surfaces (a docked assistant and its own page) both hold a thread, both will reply and the loser gets `FrontendStateRequestNotFound`. Answer from one place that outlives both.
- **`CoworkerFrontendAction {actionType, parameters}` has two values**, and neither is a URL:
  - `navigate` `{pathKey: 'Deals'}` — a *named page*. The vocabulary is the dashboard's page list, not your app's. Resolve every name against your own pages; a name you do not have is not an error, it is a page this product does not include.
  - `suggest_quick_reply` `{text: 'Option 1'}` — **one action per option**; a request for three buttons arrives as three actions in a row. This is how the assistant offers choices. Send the chosen text back with `clientActionType: QuickReply`.
  - Anything else is unknown — show it, do not guess at it.
- ⚠ A frontend action is a *message*, so it is in the history forever. Act on it only when it arrives on the socket, or every reload re-navigates.
- `frontendStateStorage: Map` + `coworkerConversationSet/UnsetFrontendStorageItem` — per-conversation string scratchpad the agent can read; empty `value` is rejected. Real conversations have it empty, so a client may use it (a renamed title, a pin) — remembering the agent can read what you put there.

### Both halves of the loop

- **It sees.** `get_frontend_state` comes back with whatever the client answered — the app's own name, the module and view it is on, the URL and its params, a small `detail` object, and a `destinations` list. Listing the destinations is what teaches the model which pages this deployment actually has.
- **It moves.** A request to open the contacts list arrives as `navigate {"pathKey":"Contacts"}`. A request for the bookings calendar arrives as `{"pathKey":"Calendar"}` — a name this app does not use, which is why the client resolves names through an alias table rather than by exact match.
- ⚠ **The window is short.** A page whose first module is still loading misses it, and the tool answers `{"success":false,"message":"failed to retrieve user's current frontend state"}`. Answer from something that is already alive, not from a component that still has to mount.

## Pagination & unread

- Both connections are **newest-first**; `after` pages backwards into history. Cursors are the raw entity ids.
- ⚠ **Do not page on `hasNextPage`** — page until you receive fewer than `first` edges. A cursor whose row has since been deleted no longer resolves — restart from the top.
- Unread: `unreadMessagesCountFromAssistant` (increments on *every* assistant message incl. invisible ones — treat as approximate), reset all-or-nothing via `coworkerConversationMarkAllAssistantMessagesAsRead(id)`.

## Attachments

Upload first via REST `POST {base}/api/filestorage/upload/bot?fileType=Image|Document&botID=...` → `FileID`, then `coworkerConversationSendMessageWithAttachments`. Limits: ≤15 files/message, ≤50 MB each; images png/jpeg/webp/gif, documents pdf/office/text; **video and audio files are rejected** (voice notes go through `coworkerConversationSendAudioMessage` with an uploaded audio file). Message attachments are server-side copies, and they are not kept forever.

## Auth, gating, limits

- Creating a conversation and subscribing require `Bot: View`; everything conversation-scoped is **ownership-checked** (wrong user ⇒ `CoworkerConversationDoesNotExist`).
- No plan/feature gate at the API level; hard failures may still surface `NotAllowedBySubscriptionFeatureSet`.
- The agent loop is rate-limited per user account — past the limit a reply may simply not arrive, so do not treat a successful mutation as proof the loop started.
- **Behind the auth proxy, the list must name its bot.** `botID` is optional in the schema, and omitted the field lists every bot the deploying account holds — so the proxy refuses that form with `403 AccountScopeBlocked`, along with the form that passes a variable arriving null. Always send `botID`. Reading one thread with `coworkerGetConversation(id:)` is allowed and checked by the same resource fence that covers every other in-bot id.

## Don't use

`coworkerConversationCreateIceBreakers` and `coworkerConversationClickIceBreaker`, neither of which is usable from this API; `coworkerIncognitoConversationCreate`; `userAccountCreateWAVerificationCodeForCoworker` / `hasContactInCoworkerWAProxyBot`, which this API does not document; skill-scoped creates, which need an id this API does not list.

## Error codes

`CoworkerConversationDoesNotExist`, `AttachmentInvalid`, `SkillDoesNotExist`, `UserDefinedSkillDoesNotExist`, `FrontendStateRequestNotFound`, `UserAlreadyHasWAProxyContactMapping` + the global `Unauthorized` / `NotEnoughPermissions` / `InternalServerError` (a handful of states — a dead cursor, an empty storage value, an abort with nothing pending — have no code of their own, so treat `InternalServerError` here as "this call is not going to work", not as a transient to retry).
