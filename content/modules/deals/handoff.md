### Deals Kanban (deals)

Three views over contacts by `salesStageV2` (New, Sorting, Ready, Working on,
Won, Lost): a kanban **board** with Pointer-Events drag-and-drop that works on
touch, a **table** over three different server query engines, and a **forecast**
with windowed totals, a weighted pipeline, win rate, CSV export and saved
views. Route: `/deals` (the board); `/deals/table` and `/deals/forecast` are the
other two, and `?deal=<contactID>` opens a
deal beside it — as a drawer below 1280px and as an inline second column above
it. A deal IS a contact — there is no separate Deal entity; moving a card runs
`contactSetSalesStage`, and amount / close date / company are **custom contact
attributes** written by `contactAttributeUpdate` (names in `lib/dealFields.ts`).

The workspace also owns one window key listener (`lib/shortcuts.ts` is the
single source of every binding), a ⌘K command palette, a `?` cheat sheet the
test suite keeps honest, a 60-second undo for stage moves, and a per-user
assignee filter.

Read `skill/references/guide.md` before changing the board — the drag protocol,
the keyboard map and the ageing rules all have reasons that are not obvious from
the code. `skill/references/table.md` is the same for the table's three query
engines, and `skill/references/forecast.md` is the list of analytics this API
genuinely cannot support. `skill/playbooks/customize.md` is the index of knobs.

First-task ideas:

1. Drag cards between columns; open a second browser tab to watch
   the subscription echo the move live. Then select two cards, drag them
   together, and watch a partial failure roll back only the card that failed.
   Press `?` for the rest of the keyboard, and ⌘Z straight after a move — note
   that the card comes back to the **top** of its old column, because the server
   re-stamps the sort key and there is no revert mutation.
2. **Wire saved views into ⌘K.** `lib/commands.ts` already builds the group and
   `DealsCommandPalette` already has an icon for it; `DealsApp` passes
   `savedViews: []` and an empty `applySavedView`, because the list lives behind
   `useSavedViews` — a hook `SavedViewsMenu` owns and the workspace cannot see.
   Lift `useSavedViews()` into `DealsWorkspace`, map its views into the command
   context, and point `applySavedView` at the same `patch({ view, filter })` the
   menu already uses. Two lines of real change; the interesting part is deciding
   whether the menu keeps its own copy of the hook or takes the list as a prop.
3. Add a deal field: one entry in `DEAL_FIELDS` and it appears in the panel; add
   its key to `CARD_FIELDS` and it appears on the card, in the table's columns
   and in the CSV column picker, because all three derive from the same specs.
4. Export a filtered set of deals. `csvContactExportStartByIDsList` can only
   carry the ids that are **loaded**, which is why the forecast offers "load the
   rest" beside the export — and `SegmentInput` has no sales-stage predicate, so
   the segment export cannot be narrowed to the pipeline at all. Making a
   filtered export honest is a real design problem, not a plumbing one.
5. Give the board a work-in-progress limit per column. Deliberately not built: `localStorage`
   is per-browser and shares a namespace inside an embed, so it belongs in saved
   views (`setUserStorageItem`) rather than beside the column header.
6. Quick-add ("add an existing contact to Ready"). Deliberately not built on the
   board: it needs contact search, which is the table's engine, not the board's.
   `contactSetSalesStage` requires a contact that already exists — the only
   create mutation is WhatsApp-only and lives in another module.

Things that look like bugs and are not: the forecast's money figures are sums
over loaded rows with their coverage printed beside them, because there is no
aggregation API of any kind; a window with nothing closed in it shows no win
rate rather than 0%; and saved views are per signed-in user, because
`setUserStorageItem` is the only persistence this API has.
