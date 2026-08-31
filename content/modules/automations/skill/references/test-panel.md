# The Test panel — a real conversation, pinned to one automation

A test is not a simulation. `previewResponsesStartForFuelyAutomation` mints a
**preview conversation** — a real livechat conversation on a preview contact —
and every text you send goes through the real pipeline: the same prompts, the
same AI, the same hand-off. What you read in the thread is what a customer would
read.

## Always open, always pinned

The panel is a column beside the scope page from the `wide` band up (below it,
a section under the page — never behind a button). It pins to **one
automation** of the selected source:

- the source's **Default rules** by default;
- the **rule the reader last expanded** on the page (collapsing it goes back to
  Default);
- whatever the header's picker says ("Default rules" / each rule by name);
- `?automation=<id>` on arrival.

Start mutation: `previewResponsesStartForFuelyAutomation(botID, fuelyAutomationID)`
→ `{ id, conversationID, startedAt, platform, fuelyAutomationID }`. The
`platform` on the session is what picks the send mutation — read it back, do not
assume it from the scope.

### Pinned means pinned

A session started for an automation sends **every** message to that automation:

- when the automation is **disabled** — a disabled custom rule and a disabled
  scope base both answered in practice;
- when its **filters would not match** — no keyword, no post id, no ad, no ref
  link is consulted;
- routing between rules is **not emulated** — the bot never gets to pick.

None of that is written on screen. It is written here, because it is a fact
about the API rather than a thing a person reads mid-test — the panel's header
already names what it is pinned to, and the module warns (never blocks) only
when a caveat is actually true of the target in front of you: an `Alert` when it
is off ("the test still answers, customers would not get this") or when its
platform is not connected. There is no routed ("as a customer") mode
anywhere: `previewResponsesStartForBot` exists on the API and no surface offers
it — the flow builder's Test dock is pinned to one flow exactly as this one is
pinned to one automation.

The **All base (Default · All channels) is not previewable**:
`PreviewResponsesFuelyAutomationScopeNotPreviewable` (nested, see the guide's
error section). The panel says so on that source; open any other source and its
Default rules can be tested there. The other start error is
`PreviewResponsesFuelyAutomationDoesNotExist`. Neither code is in the bundled
schema; the module's `errorMessage` table carries both.

## Sending

`previewResponses{Whatsapp,Widget,Instagram,TikTok,Facebook}TextSend(botID,
conversationID, message: { text, clientId })` — pick by the session's `platform`
(`lib/preview.ts` `sendDocumentFor`). Note the casing (`Whatsapp`, `TikTok`). The
result is the In message you sent; **its `id` may be null on the wire** — merge by
`clientId`, never by `id`. Generate the `clientId` with `crypto.randomUUID()` per
send. Text only: no attachments, no templates, no button clicks (comment and
story scenarios cannot be typed in — the pinned session sends the automation a
plain text).

## Receiving — subscribe first, then load

What arrives, and in what order:

- the In echo on `messageAdded`, a second or two after the send;
- `SystemTypingMessage { until }` shortly after that;
- the AI's Out text seconds later — long enough that a client tuned for a form
  submit reads as stuck;
- a hand-off produces the trio, in this order: the Out text →
  `SystemConversationSummaryMessage { summary }` →
  `SystemLivechatOpenedByComponentMessage { originallyDecidedByAI: true }`.

The `messageAdded` / `messageUpdated` subscriptions take **a moment to become
active** and events emitted before that are lost. So: subscribe for the
conversation **first**, then load `bot.conversation(conversationID).messages`
once (belt and braces — a reply that raced the subscribe is picked up), and
reload on reconnect. Sending before the subscription is up loses the echo but
not the reply (the reply is seconds away); the module subscribes the moment the
session is minted, which is well before a person has typed anything.

The typing hint is transient: show it while `until` is ahead of now and drop it
the moment a later message from the automation lands. Do not key a list row on
it — it disappears by itself.

## Restart — a watermark, not a teardown

There is **no stop / reset mutation**. Restart = call the start mutation again.
The preview contact keeps its history, so a restart on the same conversation
does not clear the thread by itself: the module keeps `visibleSince = the new
session's startedAt` and hides rows older than that minus a 2 s skew, because
a session's `startedAt` and a message's `sentTime` are not stamped to the same
millisecond. A
late reply of the previous session is ignored by a start generation. Changing
the pinned automation drops the session (the thread hook tears its
subscriptions down with it). The watermark itself is exercised by
`lib/preview.test.ts`.

## What is NOT available

- no trace of *why* the AI said something — the thread is the whole evidence;
- no readback of "the last automation session" (`Flow.previewResponsesSession`
  exists for flows only) — the conversation id lives in memory; a page reload
  starts over;
- no filter emulation, no way to feed a comment / story reply / ad click into
  the pinned session — a text is all it takes;
- no attachments, no template sends, no clicks; nothing on the preview contact
  is cleaned up afterwards — the thread keeps its history until the session
  eventually stops resolving.

Testing needs the `Ai: Edit` permission (managers cannot
test); the panel is not mounted without it.

## Operations

`AutomationsPreviewStartForAutomation`, `AutomationsPreviewMessages`,
`AutomationsPreviewMessageAdded`, `AutomationsPreviewMessageUpdated`,
`AutomationsPreview{WhatsApp,Widget,Instagram,TikTok,Facebook}TextSend`
in `examples/operations.graphql` — own copies of the preview surface (a module may not import
another module's generated documents); the `AutomationsPvMessage` fragment
selects text for the nine text typenames, `until`, `summary` and
`originallyDecidedByAI`, and nothing else. Any other typename renders as a muted
"Unsupported message" row.

## Where it lives

- `src/modules/automations/components/panel/TestPanel.tsx` — the
  header (target, platform glyph, the picker, Restart), the alerts, the thread;
  `PreviewThread` (`MessageList` + `MessageBubble` + `SystemLine` +
  `TypingIndicator` + `Composer`), `PlatformGlyph`.
- `AutomationsWorkspace.tsx` decides the target (the last-opened rule, else the
  source's Default) and `components/channels/ChannelsView.tsx` decides where the
  panel sits (`lib/layout.ts` `PANEL_INLINE_FROM`).
- `src/modules/automations/hooks/usePreviewSession.ts` — session
  lifecycle over one target; the subscribe → load → merge → send loop is the
  ui library's `useTestChat` (`mergeRows`, `sessionReducer`, `visibleAfter`),
  which this hook wires with the module's own documents.
- `src/modules/automations/lib/preview.ts` + test — send document
  per platform, the row model (`toRow`), `parsePreviewPlatform`,
  `platformOfScope`, `targetKey`; pure and node-tested.
