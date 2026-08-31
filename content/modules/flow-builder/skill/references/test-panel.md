# The Test panel — a real conversation, pinned to one flow

A test is not a simulation. `previewResponsesStartInFlow(flowID)` mints a
**preview conversation** — a real livechat conversation on a synthetic preview
contact — and immediately runs this flow from its starting-point block. Sends
reach the bot exactly as a real message from that platform would, so WhatsApp
behaves like real WhatsApp (lists, template quick replies) and the
widget like the real widget. What you read in the thread is what a customer
would read.

Everything downstream is the ORDINARY livechat API: `conversationID` is the
preview contact's conversation, history is `bot.conversation(id).messages`,
realtime is `messageAdded` / `messageUpdated`, and messages are merged by
`clientId`. If the livechat skill is installed alongside, its guide is the
fuller account of those mechanics; everything this panel needs is below.

## A dock over the canvas, not a page

The panel floats over the flow canvas, bottom-right, open by default and
collapsible to a pill; below the `narrow` band it is a bottom drawer. It is not
a column, because the canvas already gives its right side to the block
inspector, and it is not a page, because you test the flow you are editing —
the panel is pinned to the open flow and to nothing else.

Nothing starts on its own. A session is a real conversation the production bot
answers, so a person presses **Start test**; the empty state carries the button.

## Roles are inverted

You are the contact. Your sends come back as `In*` / contact-side message types
and the flow's output arrives as `Out*` types, so the thread renders an In
message as an OUTGOING bubble on the right and the flow's Out message as an
INCOMING bubble on the left. Direction check:
`sender.__typename === 'ContactMessageSender'` means the message is yours. The
widget is the exception with one typename both ways
(`WebWidgetTextMessage`) — read the sender.

## The session

`FlowTestStart` → `PreviewResponsesFlowSession { id, conversationID, startedAt,
startingBlock }`.

- **The session carries no platform.** `PreviewResponsesBotSession` and
  `…FuelyAutomationSession` do; the flow session does not. The FLOW's platform
  is what picks the send mutation.
- `startingBlock` is nullable — the block may have been deleted since.
- **Restore after reload**: `FlowTestSessionReadback` reads
  `Flow.previewResponsesSession`, the latest session of the signed-in user for
  this flow. Flows are the only preview target with a readback (an automation
  session's id lives in memory and a reload starts over), which is why the dock
  can survive a reload.
- Start errors: `FlowStartingPointBlockDoesNotExist` — the flow has no starting
  point, so there is nothing to run; the panel says so and offers the fix
  (select a block, then "Set as starting point" in the inspector).
  `ScopeNotConnectedToBot` — the bot has no preview scope for that platform.
  Both are empty states, never toasts.
- `previewResponsesStartForFuely` is not in this schema. Don't use it, nor
  `PreviewResponsesKeywordSession` (a dead type; no mutation produces it).

## Sending

`previewResponses{Widget,Whatsapp,Instagram,TikTok,Facebook}TextSend(botID,
conversationID, message: { text, clientId })`, picked by the flow's platform.
Note the casing (`Whatsapp`, `TikTok`). Generate the `clientId` with
`crypto.randomUUID()` per send. **The result's `id` may be null on the wire** —
merge by `clientId`, never by `id`.

**Clicks advance the flow**, and this is the half a flow test cannot live
without — a flow is buttons. Six mutations, `click: { messageId, buttonTitle |
rowTitle, clientId }`:

| Button | Mutation | Advances the flow |
|---|---|---|
| widget, continue-flow | `FlowTestWidgetContinueFlowClick` | yes |
| widget, open-URL | `FlowTestWidgetOpenURLClick` | no — open it yourself; this only records it |
| widget, call-phone | `FlowTestWidgetCallPhoneClick` | no — `tel:` yourself |
| WhatsApp, continue-flow | `FlowTestWhatsAppContinueFlowClick` | yes |
| WhatsApp, template quick reply | `FlowTestWhatsAppTemplateQuickReplyClick` | yes |
| WhatsApp, list row | `FlowTestWhatsAppListRowClick` (`rowTitle`) | yes |

WhatsApp URL buttons have **no** click mutation at all — render them as links.
Instagram, TikTok and Facebook previews are text-only.

⚠ Clicks are matched by `messageId` + the **title string**, not by a handle id.
Duplicate titles inside one message are ambiguous and the first match wins. A
mismatch answers with an error string that is NOT a `DefinedErrorCode` value — do not branch on it as a code. A
message whose `id` is null cannot be clicked; the panel renders those buttons
inert rather than failing the click.

⚠ Message-side button types (`WhatsAppMessageButton` / `WebWidgetButton`, plain
string titles, no ids) are DIFFERENT types from the flow-builder's own button
unions (`WhatsAppButton` / `WidgetButton`, `ComponentHandleID` + `TemplateStr`).
Never share a fragment between the canvas and the chat.

**Not available in preview:** attachments and voice sends, WhatsApp template
sends, and starting from a chosen block — only whole-flow, whole-bot and
per-automation starts exist. Don't promise them.

## Receiving — subscribe first, then load

The `messageAdded` / `messageUpdated` subscriptions take **a moment to become
active** and events emitted before that are lost. So: subscribe for the
conversation first, then load one page of
`bot.conversation(conversationID).messages` (no cursor ⇒ newest-first), and
reload on reconnect.

The same pipeline as the automations panel: the In echo a second or two after
the send, `SystemTypingMessage { until }` shortly after that, the reply seconds
later. The typing hint is transient — show it while `until` is
ahead of now, drop it the moment a later message from the bot lands, and never
key a list row on it.

**End of flow**: when the newest message is
`SystemLivechatOpenedByComponentMessage`, the flow handed the conversation to a
human. Nothing else will answer — the composer closes and Restart is the way on.
A hand-off arrives as a trio, in this order: the Out text →
`SystemConversationSummaryMessage { summary }` →
`SystemLivechatOpenedByComponentMessage { originallyDecidedByAI }`.

## Restart — a watermark, not a teardown

There is **no stop / reset mutation**. Restart = call `FlowTestStart` again. The
preview contact keeps its history, so the panel holds `visibleSince = the new
session's startedAt` and hides rows older than that minus a 2 s skew, because a
session's `startedAt` and a message's `sentTime` are not stamped to the same
millisecond. A late
reply of the previous session is ignored by a start generation counter. Nothing
is cleaned up in between: the thread keeps its history until the session
eventually stops resolving.

## What is NOT available

- **No block traceability.** No message carries a component or block id, and
  `MessageSender` has no component variant — there is no "which block said
  this", no highlight-the-current-block, no trace of why the bot answered as it
  did. The thread is the whole evidence. `startingBlock` on the session is the
  one and only structural link, and it only says where the run began.
- No way to start from a chosen block.
- No stop, no clear, no history reset.

## Permissions

Starting needs `Flows: View` (the same permission the canvas already needs);
the send and click mutations need `Inbox: Edit`, checked against the preview
contact. A token with only Flows permissions can start a test and not talk to
it — the panel reads, and the composer says why it is closed.

## Operations

`FlowTestStart`, `FlowTestSessionReadback`, `FlowTestMessages`,
`FlowTestMessageAdded`, `FlowTestMessageUpdated`,
`FlowTest{Widget,WhatsApp,Instagram,TikTok,Facebook}TextSend` and the six click
mutations, in `examples/operations.graphql`. They are own copies of the preview
surface: a module may not import another module's generated documents, and the
automations Test panel keeps its own set for the same reason. The `FtMessageParts`
fragment covers the text, media, buttons, list, template and system typenames;
anything else renders as a muted "Unsupported message" row rather than crashing.
