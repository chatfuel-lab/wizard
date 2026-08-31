# Flow builder

Build a visual flow editor: flows, blocks on a canvas, plugin cards, buttons, connections. Operations: `examples/operations.graphql` (its `FlowStructure` fragments cover **every** concrete block and element type — copy them wholesale).

## Mental model

```
Bot ─ flowGroups[] ─ flows[]            (RegularFlow)
    ─ flowsWithoutGroup[]               (RegularFlow)
    ─ defaultReplyFlows[]               (DefaultReplyFlow)

Flow ─ blocks[]        (16 concrete Block types, x/y canvas coords)
     ─ connections[]   (derived edges — see below)
     ─ startingPointBlock
     ─ entryPoints[]   (denormalized: the EntryPointBlock subset of blocks)

Block ─ blockElements[]   (the "plugin" cards, 29 concrete BlockElement types)
Element ─ buttons/rows/handles (ComponentHandleID — connection sources)
```

- Everything is **strongly typed** — there is no JSON config anywhere. Each plugin is its own GraphQL type with its own fields and its own family of single-field setter mutations. Branch on `__typename`.
- 100% GraphQL on the standard `/graphql` endpoint. The only REST call is the media upload (below).
- Interface hierarchy: `Block` → `ContentBlock {isStartingPoint, stats}` / `ActionBlock {isStartingPoint}` / `EntryPointBlock {showToggle, isEntryPointEnabled}`; `RedirectToFlowBlock` implements `Block` directly (still has `isStartingPoint`). `BlockElement` → `ContentBlockElement {waitForReplies, saveContactReply, savingToAttribute}`.
- Permissions: reads need `Flows: View`, edits `Flows: Edit`.

## Reading

- `FlowsList`: three flat arrays on Bot (`flowGroups`, `flowsWithoutGroup`, `defaultReplyFlows`) — **no pagination**.
- `FlowStructure`: `bot.flow(flowID)` loads one flow entirely — blocks with all elements, connections, starting point, entry points, `inboundLinks` (which other flows redirect here).
- Render **all 16** block `__typename`s and **all 29** element `__typename`s at least generically (name + summary + errors) — unknown types will otherwise crash your canvas when the product adds content. `../chatfuel-core/references/possible-types.json` has the authoritative lists under `Block` / `BlockElement`. Real flows may also contain block/element types outside this bundled schema subset — the interface-level fields (`__typename`, `id`, `name`, positions, `errors`) still come back for them, so the generic fallback covers those too.
- ⚠ **Cast Blocks concretely, never through the interface.** A wide `blockElements` selection under Block **interface** casts (`... on ContentBlock`, `... on ActionBlock`, `... on EntryPointBlock`) is a shape the API will not answer. **Concrete-type** casts return the same data — the `BlockParts` fragment in the examples is written that way for this reason. Small selections are unaffected.

## Plugin catalog (element `__typename` → what it is)

| Family | Element types | Notes |
|---|---|---|
| WhatsApp content | `WhatsAppText/Image/Video/Audio/Document BlockElement` | stackable in one block |
| WhatsApp interactive | `WhatsAppTextAndButtons/TextAndURL/List/Template BlockElement` | one card per block |
| Widget content | `WidgetTextAndButton BlockElement` (note singular "Button"), `WidgetImageBlockElement` | stackable |
| Actions | `SetCondition`, `SetContactProperty`, `ClearContactProperty`, `SendJson`, `SummarizeChat` (AI), 4× `<Platform>SwitchToChatWithHumanAgent` | stackable |
| Redirect | `RedirectToFlowBlockElement` | own block |
| Entry points | `WidgetEntryPoint`, `DefaultReply`, `TriggeredMessage`, `WhatsAppOneTimeNotification`, `WhatsAppScheduledMessage` `BlockElement` | own block, toggleable |
| AI agent | `FuelyAIAgentBlockElement` (current), `AiAgentBlockElement` (deprecated legacy), `AiAgentCustomBlockElement` (editable prompt) | own block |

There is **no gallery, carousel, quick-replies or delay plugin** in this API. Platform gating is client-side (filter your add-menu by `Flow.platform`); `facebook` has no flow-builder blocks at all.

## Creating things

- `createFlow(botID, platform)` / `createFlowGroup(botID)` take **no name** — the server names them; rename via `updateFlowName` / `updateFlowGroupName`. There is **no flow clone/duplicate/import/export**.
- There is **no `createBlock`**. Blocks are born through the plugin creation triad — every family follows the same shape, just swap the prefix:
  - `<plugin>CreateWithBlock(flowID, positionX, positionY): Flow!`
  - `<plugin>CreateWithBlockAndConnection(flowID, request: UndefinedTargetBlockConnectionCreateRequest!, positionX, positionY): Flow!` — creates the block AND wires an edge from `request.sourceBlockID` (+ optional `sourceBlockElementID`/`sourceHandleID`) to it. This is "drag an edge into empty canvas".
  - `<plugin>CreateInBlock(blockID): <Block>!` — appends a card to an existing block. Exists **only** for stackable plugins (see table); WA interactive, AI agent, redirect and entry points are one-card-per-block.
- Extra creation args: `aiAgentCreateWithBlock(..., templateID: AiAgentTemplateID!)` (catalog via `aiAgentTemplates(locale)`). Entry points: `widgetEPCreate(flowID, x, y)`; WhatsApp chat triggers use `...CreateWithBlockAndWATemplate(flowID, x, y)` variants. `DefaultReplyBlock` is never user-created.

## Editing

- **Setter convention:** ~230 mutations, all single-field, keyed by `blockElementID`, args are scalars, return the enclosing `ContentBlock!`/`ActionBlock!`/`<Specific>Block!` (or `Flow!` for structural ops). Grep `../chatfuel-core/references/schema.graphql` by prefix (`whatsAppList`, `sendJson`, `widgetTextAndButtons`, …) for a family's full list; `examples/operations.graphql` shows one of each shape.
- **Reconcile from mutation results.** There are **no flow-builder subscriptions** and no version/revision field — last write wins. Re-render from each mutation's returned aggregate; poll `bot.flow(flowID)` if you need cross-client freshness. In a normalized cache (Apollo etc.) configure list fields (`blocks`, `connections`, `entryPoints`, `buttons`, `rows`, `headers`, `errors`) to be **replaced** by incoming arrays, not merged.
- Positions are `Int!` — round before sending. Save on drag-end: `updateBlockPosition` (single, returns `Block!`) vs `updateBlockPositionBulk` (returns `Flow!`).
- `blockSetStartingPoint`, `blockEnableEntryPoint` / `blockDisableEntryPoint` (enable fails with `ComponentHasValidationErrors` while the element has validation errors; triggered-message EPs can also raise `TriggerIsInInvalidState`).
- `sortBlockElements(blockID, elementIDs)` reorders cards; `blockElementDelete(botID, elementID)` — note it takes **botID, not flowID**.
- Naming inconsistencies to expect: `whatsAppList/whatsAppTextAndButtons/whatsAppTextAndURL` use `...WaitForReplies` (no `Set`), widget uses `SetWaitForReplies`; `widgetTextAndButtonsAddNewPhoneButton` but `SetButtonPhone`. When in doubt, grep the schema, don't guess.
- Defaults on creation: a new content element has `waitForReplies: true` — at runtime the flow **pauses at that block until the contact replies** before following the next-block edge; set it to `false` for uninterrupted chains. `whatsAppTextAndButtonsCreateWithBlock` pre-creates one empty ContinueFlow button (empty title/connection = validation errors until filled or deleted).

## Undo: compensating forward requests, never a revert

There is **no server-side revert, no revision field and no history** — last write wins. So an undo is not a rollback to a captured state; it is a *forward mutation aimed backwards*, and an operation is undoable exactly when such a mutation exists. What that leaves:

| Operation | Undo | The inverse |
|---|---|---|
| `updateBlockPosition` / `updateBlockPositionBulk` | lossless | move back to the coordinates captured before the drag |
| `blockToBlockConnectionCreateOrUpdate` | yes | **it is an upsert** — the inverse of "connect A→B when A pointed at C" is "connect A→C" from the pre-state; only when A pointed at nothing is it `blockToBlockConnectionDelete` |
| `componentToBlockConnectionCreateOrUpdate` | yes | the same upsert, keyed by `(sourceBlockElementID, sourceHandleID)` — reconnect the displaced target, or `componentToBlockConnectionDelete(elementID, handleID)` if there was none |
| `blockToBlockConnectionDelete` / `componentToBlockConnectionDelete` | yes | reconnect from the parts captured while the edge still existed — the delete request does not name its target, so it has to be read out of `Flow.connections` first |
| `blockSetStartingPoint` | yes, unless there was none | restore the captured block. A flow that had **no** starting point cannot be put back: the mutation only ever moves one, and nothing clears it |
| `blockEnableEntryPoint` / `blockDisableEntryPoint` | may legitimately fail | undoing a disable is a re-enable, which the server refuses with `ComponentHasValidationErrors` (or `TriggerIsInInvalidState`) while the block's elements are invalid — and disabling it is often how the user got there |
| `deleteBlock` / `blockElementDelete` | **never** | there is no undelete. Creating it again yields a **new id** and an empty copy: every setter's contents are lost, and every connection that pointed at it stays broken |

Consequences worth stating rather than hiding:

- Because a connection is an upsert, an undo that always disconnected would destroy an edge the user never touched. The pre-state has to be read **before** the mutation is issued, and keyed on connection **parts** — `ConnectionID` is synthesized per request, so an id captured beforehand matches nothing in the flow that comes back.
- A ⌘Z on a delete has to **say why it cannot**, not fail silently. The operation is worth recording precisely so there is something to explain.
- Element content setters (the ~230 single-field mutations) are **not** in the history. Undoing a canvas operation does not touch a text edit, and ⌘Z inside an editor field is that field's own undo.

## What the reference module does with all this

The `flow-builder` module in this repo is the worked example of the rules above, and the shape it settled on is worth stating so a client built from this skill does not have to rediscover it:

- **Own canvas, no graph library.** Nodes are DOM (cards with buttons, badges, a dark theme), edges and the marquee are two `<svg>` layers on either side of them; the viewport is a transform, never React state. `FlowStructure` is projected to nodes and edges by pure functions keyed on `flow.blocks` and `flow.connections` separately, so an element setter's response re-renders one card, not the canvas.
- **A reducer, not a hook full of `useState`.** Every mutation is optimistic per block with a per-block rollback; every response carries the epoch it was issued under and a stale one is dropped; a refused write is remembered against the block it happened to and shown on its card, not only in a header banner.
- **Undo is compensating forward requests** (see the table above); a ⌘Z that cannot undo says so with a toast rather than doing nothing.
- **Multi-select and group drag** go out as one `updateBlockPositionBulk`; alignment guides exclude the nodes moving with the drag.
- **First paint from a local snapshot** of the last `FlowStructure` (keyed by bot, flow, and a fingerprint of the query text, so a shape change invalidates it), marked as possibly stale until the network answers. Safe precisely because there are no subscriptions.
- **Islands over the canvas** — a tool strip, a block palette you drag from (the block lands under the pointer), a selection bar, a minimap; ⌘K over a pure command list, `?` for a cheat sheet that a test keeps in step with the bindings; `/` searches blocks; keys are scoped to the editor element so a host page's own inputs never lose one.
- **Every editor is a lazy chunk**, fetched on the first visit to a block that needs one.

## Buttons, handles, connections

- Buttons live inside elements: union `WidgetButton` (`ContinueFlow | OpenURL | CallPhone`) and `WhatsAppButton` (`OpenURL | ContinueFlow`); list rows `WhatsAppListRow`. Every button/row `id` is a `ComponentHandleID` — an outlet you can connect from. Other handles: `SetConditionBlockElement.handleID`, `DefaultReplyBlockElement.nextBlockHandleID`, `WidgetEntryPointBlockElement.nextBlockHandleID`, chat-trigger elements' `handleID`.
- Buttons do **not** carry target block ids. Edges are the separate `Flow.connections` list:
  - `BlockToBlockConnection {sourceBlockID, targetBlockID}` — the block's implicit "next" edge. **At most one per source block**: `blockToBlockConnectionCreateOrUpdate` is an upsert, `blockToBlockConnectionDelete(sourceBlockID)` needs no target.
  - `ComponentToBlockConnection {sourceBlockID, sourceBlockElementID, sourceHandleID, targetBlockID}` — from a handle. Keyed by `(sourceBlockElementID, sourceHandleID)`; delete takes those two.
- ⚠ `ConnectionID` is derived from the parts it joins, not an identity of its own. Never persist it or key a cache on it — key on the parts.
- WA `TextAndButtons` can only add `ContinueFlow` buttons; `TextAndURL` carries the OpenURL button (`SetButtonURL` lives in that family). Widget supports all three button kinds.

## Rich text: the TemplateStr protocol

- **Reads** are structured: `TemplateStr { parts: [TemplateStrText {text, errCode} | TemplateStrAttribute {attribute, errCode}] }`.
- **Writes** are plain `String!` — the server parses `{{attribute name}}` placeholders. Not allowed inside the braces: `{`, `}`, `%`, newline.
- Round-tripping (TemplateStr → editable string) is your job: concatenate parts, rendering attribute parts as `{{name}}`.
- Attribute autocomplete: `bot.botAttributes(...)` (cursor-paginated; fire twice like the dashboard — `attributeTypes: [custom]` and `[system]`). Attribute default values: `botAttributeCreate/Update/DeleteDefaultVal`.

## Validation is state, not errors

Mutations **succeed** while leaving the element invalid. Validation lives on the element:

- `BlockElement.errors: [BlockElementError!]!` — recomputed by every mutation. 11 concrete error types; the extra locator field tells you what to highlight (`ButtonValidationError.buttonID`, `SendJsonHeaderError.headerID`, `AiAgentRuleError.ruleID`, `SummarizeChatEntryValidationError.entryID`, `WhatsAppTemplateParamValueRequiredError.paramName`, …). `code` is a free-form string (`header_title_required`, `at_least_one_entry_required`, …) and the bundled SDL publishes no list of the possible values, so switch on the codes you observe and fall back to the error `__typename`, which is a closed set.
- Segment-based elements additionally expose `segmentErrors: [FilterValidationError {filterID, code}]` (empty `filterID` = whole-segment error).
- `TemplateStr` parts carry per-part `errCode` (bad attribute reference etc.).
- **Re-read `errors` from every mutation result**, not only from the initial query. The hard failure only comes at `blockEnableEntryPoint` (`ComponentHasValidationErrors`).
- `sendJsonTestRequest(blockElementID)` is the one dry-run: fires the real HTTP request, returns the full exchange (`SendJsonTestResponse`); `TestRequestConnectionRefused` on failure.

## Segments (condition / audience elements)

`SetCondition`, `TriggeredMessage`, `WhatsAppOneTimeNotification`, `WhatsAppScheduledMessage` carry a `segment: Segment!` read model and are written **wholesale** via `...UpdateSegment(blockElementID, request: SegmentInput!)` — same `SegmentInput` construction as contacts (client-generated UUIDs for segment/filter ids; see `../chatfuel-contacts/references/guide.md` — chatfuel-contacts skill, if installed). Audience sizing: `bot.contactsCount` (root `countContacts` is deprecated).

## Media upload (the only REST)

```
POST {base}/api/filestorage/upload/plugin?fileType=Image|Video|Audio|Document&botID=<botID>&pluginID=<blockElementID>
Authorization: Bearer <token>
multipart/form-data, field "file"        →  { "id": "<FileID>" }
```

Then attach: `whatsAppImageSetImageFile(blockElementID, fileID)`, `whatsAppVideo/Audio/DocumentSet*File(blockElementID, fileID, fileName)`, `widgetImageSetImageFile`, `whatsAppTemplateSetHeader{Image,Video,Document}File`. Attach an uploaded file promptly — one that is never attached does not persist. `fileType` values are capitalized. Size caps are enforced upstream — images around 4 MB (jpeg/png), video/audio/document around 15 MB; the API is the authority.

## Chat-trigger entry points (WhatsApp broadcasts)

`WhatsAppOneTimeNotification` (one-off broadcast: `...UpdateSegment`, `...Send`, status `BroadcastStatus`), `WhatsAppScheduledMessage` (recurring: `SetFirstSendTime/SetWeekdays/SetOnCertainDates/SetRepeatEveryNDays/SetRepeatType` — ⚠ the UTC/weekday-shift algorithm applies — it is written out in `../chatfuel-core/references/misc.md`), `TriggeredMessage` (`triggeredMessageSetSegment` + the `trigger*` mutations from the trigger domain — disable the trigger first or get `EnabledTriggerIsImmutable`).

## AI-agent block

In scope, with flags:

- Created via `aiAgentCreateWithBlock[AndConnection](flowID, x, y, templateID)`; `AiAgentTemplateID` enum: `aiAgentHelpCustomers | BookAppointments | ManageNewMessages | SellProducts | SortThroughLeads | Custom`. Template catalog: `aiAgentTemplates(locale)`.
- Three element variants: **`FuelyAIAgentBlockElement`** — current (edit `additionalInstructions` + `rules`; `charsCount` for the limit, err `FuelyAdditionalInstructionsCharLimitExceeded`); **`AiAgentBlockElement`** — deprecated legacy (render read-only; `knowledgeItems`, token counters); **`AiAgentCustomBlockElement`** — user-editable `prompt` + `rules`.
- Mutations: `aiAgent{CreateRule, DeleteRule, UpdateRuleTitle, UpdateRulePrompt, UpdateAdditionalInstructions, UpdateKnowledgeItemPrompt, ClearAllKnowledgeItemPrompts}` for the template/Fuely variants; `aiAgentCustom{CreateRule, DeleteRule, UpdateRuleTitle, UpdateRulePrompt, UpdatePrompt}` for custom — **separate mutation names, not a flag**.
- Availability is gated by the bot's Fuely AI configuration. This block only scripts the agent *inside a flow*; how the bot's AI behaves per channel is the automations domain (the chatfuel-automations skill).

## Error codes (DefinedErrorCode)

`FlowStartingPointBlockDoesNotExist`, `ComponentHasValidationErrors`, `FlowGroupCanNotBeDeleted`, `ScopeNotConnectedToBot`, `TestRequestConnectionRefused`, `WAListTooManyRows`, `WAListCannotDeleteLastRow`, `WAListRowNotFound`, `WAListInvalidRowsOrdering`, `WhatsAppOneTimeBroadcastAlreadyStarted`, `TriggerIsInInvalidState`, `SummarizeChatEntryCountExceededLimit`, `SummarizeChatEntryDescriptionTooLong`, `SummarizeChatEntryDoesNotExist`, `FuelyAdditionalInstructionsCharLimitExceeded`, plus cross-domain `EnabledTriggerIsImmutable`.

⚠ `NotAllowedBySubscriptionFeatureSet` can also arrive, which is **not a member
of the enum** — the enum never listed it, and the bundled SDL carries no
descriptions to warn you. So switch on the raw `extensions.code` string with a
fallback branch, not on an exhaustive enum that is not exhaustive.

## Uninitialized bots

Some bots have no flow-builder state at all: EVERY flow-builder operation on
them, `createFlow` and even reading `bot.defaultReplyFlows` included, fails.
There is no API-side fix — open the bot's flow builder once in the Chatfuel
dashboard, or use a bot that already has flows. Anything that reads
flows fails loudly on such a bot; that is this platform state, not a bug in the
caller.
