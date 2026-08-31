### Flow Builder (flow-builder)

The visual flow editor: pick a flow on the left, view its blocks and
connections on a canvas, click a block or element card to inspect and edit
content on the right. Route: `/flow-builder`; a deep link is
`/flow-builder?flow=<flowId>&b=<blockId>` and selects that block on load.

Shipped scope: **the full editor**. Canvas: drag to move
(optimistic, rollback on failure), drag-to-connect from the block-level
"next" pip or any element outlet (handle ids encode `element::handle`, see
`lib/graph.ts`), edge delete via Delete/Backspace, block delete behind a
confirm dialog (danger button or Delete key), drag-an-edge-into-empty-canvas
opens the create-and-connect picker (`<plugin>CreateWithBlockAndConnection`
— block + wired edge in ONE atomic call; entry-point families are excluded,
they cannot be edge targets), and an Auto-layout button (pure layered BFS in
`lib/layout.ts` → `updateBlockPositionBulk`). Block inspector: rename,
set-as-starting-point, entry-point toggle (enabling is refused server-side
with `ComponentHasValidationErrors` while elements are invalid — the switch
shows the message inline and a warning lists the error count), element
list with reorder (`sortBlockElements`) and per-element delete
(`blockElementDelete` — botID-scoped, the one odd signature).

Element editors: **24 dedicated** — every type the schema has setters for is
fully editable (WhatsApp text/media quartet/text+buttons/text+URL/list/
template with catalog pick + params + header media, widget text+buttons/
image, condition + audience segments on a shared SegmentEditor, contact
property set/clear, send-JSON incl. headers/payload/URL params/parsing
rules/live test request, summarize-chat entries, redirect, default reply,
triggered message + trigger domain, one-time broadcast (Send is live-fire —
confirm dialog, Draft-only), scheduled message (UTC weekday-shift lives in
`lib/schedule.ts` — never inline that math), Fuely/legacy/custom AI agents.
Segments are written WHOLESALE (`SegmentInput`) — `lib/segmentInput.ts`
round-trips unread filter parts verbatim; never bypass it. Validation is
state, not failure: fresh elements start with errors, every mutation returns
recomputed `errors`, `segmentErrors` roll into the same badges and list.

Read-only BY SCHEMA (no setters exist — do not fake edits): widget entry
point, the four switch-to-human variants, WhatsApp template content beyond
its params (Meta-managed), AI-agent token counters, broadcast status/
sent-count. Unknown element typenames render via the generic read-only
inspector and must never crash the canvas.

The **Test dock** floats over the canvas, bottom-right, open by default and
collapsible to a pill (`T`, or ⌘K). It is a real preview conversation pinned
to the open flow: `FlowTestStart` runs the flow from its starting point at
once, buttons and list rows are pressable (six click mutations, matched by
message id + the title STRING), media and templates render, and a reload
rejoins the same session through `Flow.previewResponsesSession` — flows are
the only preview target with a readback. Restart is a client-side watermark;
there is no stop mutation. A flow with no starting point cannot be run and the
dock says so with a button that takes you to a block. Sending needs
`Inbox: Edit` while starting needs only `Flows: View`, so the dock can be
readable with a closed composer. `references/test-panel.md` is the contract;
the thread itself is `~ui`'s `TestChat`, shared with the Automations panel.
**No message carries a block id**, so there is no trace of which block said
what — do not build one.

Create*Block responses are deliberately slim (`FlowBlocksSlim` — whole-flow
result types across ~26 ops blow up generated-type size and tsc memory), so
the module diffs the new block id and refetches `FlowStructure`; codegen
runs this module with `inlineFragmentTypes: 'combine'` for the same reason —
keep new ops on slim/BlockParts returns.

First-task ideas:
1. Open a flow and clear a validation error: select a block that carries one →
   Set contact property → pick an attribute; watch the error badge disappear.
2. Prettier auto-layout: `lib/layout.ts` is a deliberately simple layered
   BFS — swap in dagre/elkjs for edge-crossing minimization.
3. A Facebook-platform test: `facebook` has no flow-builder blocks at all
   (guide.md) — the picker shows such flows, the canvas will just be empty,
   and Facebook preview sessions are refused.
4. Flow groups: the rail reads `flowGroups`, but the group CRUD
   (`createFlowGroup`, `updateFlowGroupName`, `deleteFlowGroup`,
   `moveFlowToGroup`) is generated in `examples/operations.graphql` with no
   control on it yet — the rail's section headers are the place to put one.
5. The `...CreateWithBlockAndWATemplate` variants (triggered message / OTN /
   scheduled message born WITH a template element) are documented in the
   schema but not in the ops file — wire them if template-first creation
   matters to your flows.
