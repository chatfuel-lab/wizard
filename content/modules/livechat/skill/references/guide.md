# Live chat

Operator-side chat: list of conversations, message thread, sending, real-time updates. Operations: `examples/operations.graphql`. Permissions: `Inbox: View` to read, `Inbox: Edit` to send/mark-read/take-over (+ `People: View` for the contact card).

## Data model

- `Contact` (interface: `WidgetContact | WhatsappContact | InstagramContact | FacebookContact | TikTokContact | UnavailableContact`) — always request `__typename`, or fields come back missing.
- `Conversation` — **`Conversation.id` equals the contact id**; every `conversationID` argument takes it. `status: open | closed | automated`. Always request `__typename` here too.
- `Message` — interface with ~70 concrete types across 5 platforms + `System*` messages. Base fields: `id` (nullable!), `clientId` (non-null), `sentTime`, `updatedAt`, `sender`, `errors`. Platform payload fields are **disambiguated by prefix**: `whatsappStatus` vs widget `status`; never assume a field exists on all implementers — spread inline fragments per concrete type (see the `*MessageParts` fragments in the examples).

## Chat list (left pane)

- Query `ChatList` → `bot.contactChatsConnection(first!, after, assigneeFilter!, unreadOnly!, salesStageV2Filter!, textInputFilter)`. Unfiltered: `{type: Any}`, `false`, `[]`. Sort key: `lastConversationMessageTime` desc.
- Count: `ChatListCount` → `contactChatsCountV2(filter: {...same filters..., lastMessageTimeAfter, lastMessageTimeBefore})`.
- Live updates: subscription `ChatListUpdates` → union:
  - `ContactsChatUpdatesBatch { updates { action edge } }` with `action: Add | Update | Remove`. The server does NOT give positions: on Add/Update upsert the edge and re-sort by `lastConversationMessageTime` desc (dedupe by contact id); on Remove drop it. An `Update` for a contact that no longer matches the filter also arrives as `Remove`.
  - `ContactListUpdateStopped { willResumeAt }` — the server throttled the stream. Schedule a full list refetch at `willResumeAt`.
- Filters in the subscription must match the query's filters exactly, or you'll merge events from a different result set.
- Unread badge: `UnseenOpenDialogsCount` + subscription `UnseenOpenDialogsCountChanged`.

## Message thread

- Query `ConversationMessages`; newest-first; pagination semantics in `../chatfuel-core/references/pagination.md`. Typical page size 50–100.
- Subscriptions per **open** conversation only: `MessageAdded` + `MessageUpdated`. Also `OpenContactUpdated` for the contact card. Subscribe on open, unsubscribe on close: holding many of these open at once is not what the subscription is for.
- **Merging incoming messages: match by `clientId`, not `id`.** `Message.id` is nullable and an optimistic/echoed message may arrive via subscription before the mutation response. Keep one entry per `clientId`, prefer the record with the newer `updatedAt`.
- `messageUpdated` delivers status transitions (sent → delivered → read) and delivery errors (`Message.errors[]`) — apply by replacing the matching message.
- Skip `SystemTypingMessage` when inserting into the thread (render a transient typing indicator from it instead; it carries `until`).
- On WS reconnect: refetch the thread and the chat list (events during the gap are lost).

### Reading a message: shape → typenames → fields

`Message` is an interface with 73 implementers across five platforms plus a System pseudo-platform, and the fields that matter are **not** on the interface. **Payload fields are disambiguated by platform PREFIX** — delivery state is `whatsappStatus` on the WhatsApp types, `status` on the widget types, `instagramStatus` / `facebookStatus` / `tiktokStatus` on the other three; the words are `text` on one type, `caption` on another, `bodyText` on a third and `body.text` on a fourth. **Read a field only through a check on the concrete `__typename`.** An `'text' in node` check, a cast or an interface-level access compiles and silently reads nothing for the prefixes nobody thought of. Direction is `sender.__typename === 'ContactMessageSender'` → inbound; nothing else is uniform (widget typenames carry no In/Out prefix). `sender.name` is not a real name on `ContactMessageSender` or `AutomationMessageSender` — never print it; only an `AdminMessageSender` carries one.

| Shape | Typenames | Fields the operations document selects |
|---|---|---|
| text | `WhatsAppIn/OutTextMessage`, `WebWidgetTextMessage`, `InstagramIn/OutTextMessage`, `FacebookIn/OutTextMessage`, `TikTokIn/OutTextMessage` | `text` (+ Out status field) |
| image | `WhatsAppIn/OutImageMessage` (`caption file`), `WebWidgetAttachmentMessage` (`attachment{type file}` — `WebWidgetAttachmentType` has one member, `image`), `InstagramIn/OutImageMessage`, `FacebookIn/OutImageMessage`, `TikTokIn/OutImageMessage` (`file`) | `file{...FileInfo}`; caption only on WhatsApp |
| video | `WhatsAppIn/OutVideoMessage` (`caption file`), `InstagramIn/OutVideoMessage`, `FacebookIn/OutVideoMessage` (`file`) | — |
| audio | `WhatsAppInAudioMessage`, `InstagramInAudioMessage`, `FacebookInAudioMessage` (`file transcriptionStatus transcribedText`); `WhatsAppOutAudioMessage`, `InstagramOutAudioMessage`, `FacebookOutAudioMessage` (`file`, no transcription) | show `transcribedText` only when `transcriptionStatus == finished` — it is `String!`, so "not yet" is `""` |
| document | `WhatsAppIn/OutDocumentMessage` (`caption fileName file`), `FacebookInFileMessage` (`file` — no fileName exists) | size from `File.size` (bytes, nullable) |
| buttons | `WhatsAppOutTextAndButtonsMessage`, `WhatsAppOutTextAndURLMessage` (`headerText bodyText footerText whatsappButtons{__typename title ...on WhatsAppOpenURLMessageButton{url}}`), `WebWidgetTextAndButtonsMessage` (`text buttons{__typename title ...url ...phone}`) | message-side button types are plain strings, NOT the flow-builder `WhatsAppButton` union |
| list | `WhatsAppOutListMessage` | `bodyText buttonTitle listRows{title description}` |
| template | `WhatsAppOutTemplateMessage` | `header{__typename ...Text{text} ...Image/Video{file} ...Document{file fileName}} body{...Text{text}} footer{...Text{text}} waTemplateButtons{__typename ...URL{text url} ...QuickReply{text} ...CallPhone{text phoneNumber} ...WhatsAppCall{text} ...CopyCode{text code}}` — **there is no template NAME on the wire** |
| comment | `InstagramInFeed/Reel/AdCommentMessage` (`text commentID mediaContainer{media{__typename ...on InstagramPost/Reel/Ad/Story{isUnknown caption ownerUsername url thumbnailPreview}}}` — the flat `post`/`reel`/`ad`/`story` fields are not in this schema), `FacebookInPostCommentMessage` (`text commentID` — `FacebookPost` has only an id, and selecting it breaks the query, see below), `TikTokInTextPostCommentMessage` (`text commentID post{isUnknown url}`), `*OutPublicCommentReplyMessage` (`text` + status, tied to no post) | `isUnknown` on the media means "render a placeholder, read nothing else" |
| story | `InstagramInStoryReplyMessage` | `text mediaContainer{...}` |
| tap | `WhatsAppInContinueFlowButtonClickMessage`, `WhatsAppInTemplateQuickReplyButtonClickMessage` (`buttonTitle`), `WhatsAppInListRowClickMessage` (`rowTitle rowDescription`), `WebWidgetContinueFlow/OpenURL/CallPhoneButtonClickMessage` (`button{title url? phone?}`) | the contact tapped rather than wrote |
| placeholder / unknown | `WhatsAppIn/OutMediaPlaceholderMessage`, `WhatsAppIn/OutUnknownMessage`, `Instagram/Facebook/TikTokIn/OutUnknownMessage` | **no payload fields at all** — and no status field either; the only honest rendering is a labelled chip |
| system | `SystemLivechatOpenedManuallyMessage` (`byUser{name isUnknown}`), `SystemLivechatClosedByAutoClosingMessage` (`delay` — a string the server has already formatted, in no fixed format: `1h23m` and `24h:00m:00s` both occur, so parse it and print it in words, never interpolate it raw), `SystemLivechatOpenedByComponentMessage` (`originallyDecidedByAI`), `SystemConversationSummaryMessage` (`summary`), `SystemTypingMessage` (`until` — not a row), the rest carry nothing | a centred line, not a bubble |

Delivery: every Out type of every platform carries its platform's status field — WhatsApp `Sending|Sent|Delivered|Read|Failed`, widget `Seen|Unseen|Sending` (reception, not delivery: `Unseen` is *sent*, `Seen` is *read*, and there is no `Failed`), Instagram/Facebook/TikTok `Sending|Sent|Read|Failed` (no `Delivered`). Map each enum totally; `errors[]` outranks any status.

**Buttons render UNDER the bubble**, in its column, never inside it: WhatsApp draws reply buttons, list rows and template buttons as their own rows below the text, and a button inside the bubble box reads as part of the text. In an operator's inbox they are a transcript of what the contact was offered — a URL button stays a link and a call button a `tel:` link; a reply button is not pressable.

**Type-condition field collisions:** when two type conditions select a same-named field whose scalar type differs between them, the merged selection is rejected. Select each platform's fields under their own type condition.

## Sending

1. Branch on `Conversation.platform` → `SendWidgetText` / `SendWhatsAppText` / `SendInstagramText` / `SendFacebookText` / `SendTikTokText` (and `*Attachment` variants).
2. Generate a **fresh UUID per message** for `message.clientId`. It must be unique across ALL clients writing to the account — a colliding clientId corrupts merge logic on both sides. Use it for optimistic rendering and reconciliation.
3. Attachments are 2-step: REST upload → `FileID` → attachment mutation:
   `POST {base}/api/filestorage/upload/livechat?fileType=<Image|Video|Audio|Document>&botID=<botID>&contactID=<contactID>` (multipart field `file`, `Authorization: Bearer <token>`) → response contains the file `id`.
4. WhatsApp extras: `SendWhatsAppTemplate` for template messages (see `../chatfuel-core/references/misc.md` for filling template parameters); attachment sends can fail with `FileTooBig` / `FileContentTypeNotSupported` / `FileDoesNotExist`.
5. Platform constraints surface later as `Message.errors[]` via `messageUpdated` (e.g. WhatsApp 24-hour window errors), not as mutation errors — watch for them.

**A widget PREVIEW conversation is read-only for the inbox.** The contact `previewResponsesStartForBot` creates can be read like any conversation — `ConversationMessages`, `MarkConversationRead`, its contact card — but `conversationStart` and `widgetTextMessageSend` on it do not work, and it is not listed by `ChatList`. It is a demo of INBOUND data only: sends, take-over and close need a conversation from an ordinary channel.

## Conversation lifecycle

- `TakeOverConversation` (`conversationStart`) — operator takes the chat from automation; status → `open`.
- `CloseConversationToFlow` (`conversationFinishSendToFlow(flowID)`) — close the live chat and hand the contact back to a bot flow. There is no plain "close" mutation; handing back to a flow IS the close. Get the flow ids from `InboxFlowsList` (`bot.flowsWithoutGroup` + `bot.flowGroups`); filter the picker by `Flow.platform` against `Conversation.platform`.
- `MarkConversationRead` (`conversationReadMessages(before:)`) — pass the newest message cursor/id (`pageInfo.startCursor` of the first page). Fire it when the operator views the thread and after sending.
- `CreateConversation(contactID)` — ensure a conversation exists for a contact (e.g. to message a contact who never chatted).

## Contact panel

Needs `People: View` on top of `Inbox: View`. All operations carry an `Inbox*` prefix because operation names are globally unique across skills — these are this skill's own copies of the contacts equivalents, not shared ones.

- `InboxContactGet` → `bot.contact(id)` (non-null; a bad id errors, it does not return null). Live updates for the open contact already arrive via `OpenContactUpdated`, so the panel does not need to poll.
- **Attributes**: `InboxContactDetail` selects `attributes` with no `names:` argument = all of them. `InboxAttributeUpdate` / `InboxAttributeDelete` both return the whole contact — re-render from the response. `attrValue` is always a String whatever the `dataType`: milliseconds for `datetime`, `"true"`/`"false"` for `boolean`. **Writing a name that does not exist creates the attribute** — that is the only way to add one. `InboxAttributesCatalog` feeds the picker; every argument except `inputSubstring`/`first`/`after` is required by the schema.
- **Note**: `InboxSetNote`; `note` is nullable, pass null to clear. No separate delete.
- **Assignee**: three states — `InboxSetAssignee` (a human), `InboxSetAIAssignee` (Fuely AI), `InboxRemoveAssignee` (nobody). The roster comes from `InboxTeam`; `assigneeID` is **`member.user.id` (UserAccountID), not `member.id` (BotTeamMemberID)** — both are opaque strings, so the wrong one fails only at runtime.
- **Identity is per-platform**: `phone` exists only on `WhatsappContact`, `username`/`availableForDMs` only on Instagram and TikTok, and `WidgetContact`/`FacebookContact`/`UnavailableContact` have neither. There is no common handle on the `Contact` interface — branch on `__typename`. `scope` names the *inbox* side (which WA number, which IG account), not the contact.

## Reference client shape

```
state: chatList (edges, sorted), openConversation {id, platform, messages by clientId}
wire:  1 WS connection; subs: ChatListUpdates (always), MessageAdded/Updated + OpenContactUpdated (open chat only)
on reconnect: refetch ChatList, ConversationMessages, UnseenOpenDialogsCount
```

## What the reference module does with all this

The `livechat` module in this repo is the worked example. What it settled on:

- **Pure reducers for the list, the thread, uploads, the contact panel and the template form**, each with an epoch so a late answer never overwrites a fresher event; a lifecycle answer (take-over, hand-over, mark-read, sales stage) is applied to the thread and the list in the same tick through one patch, before the server's own `Update` arrives.
- **Composer:** attachments upload the moment they are picked and are sent as their own messages, files first, each with its own `clientId`; emoji and saved replies (per-user, in `setUserStorageItem`) insert at the caret through the composer's own `ref.insert`; a shut 24-hour window greys the box with a short placeholder and leaves the template button lit — that button is the way back.
- **WhatsApp templates:** picker filtered to `IsSupportedInLivechat && status == Approved`, a form built from the server's temporary filled copy where `errors` on the copy IS the send gate (each error printed beside the field it names), then `whatsAppTemplateSend` on the same clientId path as text.
- **Close is a menu:** mark as won / lost (`contactSetSalesStage` — the contact's stage, the conversation stays as it was) or hand over to a flow (the only real close). The list row is the contact and shows the stage through its filter.
- **Contact panel** on the inbox's own `Inbox*` operations; an attribute write is confirmed by the response, never assumed, because an unknown name is silently dropped rather than refused.
- **Keyboard:** `j`/`k` walk the list, `e` hand-over, `a` assignee, `/` search, `?` cheat sheet, ⌘K — all scoped to the module root, standing down in inputs; letters in the composer stay letters.
