# Forecast — pipeline analytics, and the four things it must never fake

The API keeps **one** timestamp per deal, `lastSalesStageUpdateTime`, and it is
the *last* transition. There is no stage-change history anywhere in the schema.
That single fact removes four features every CRM dashboard has, and the honest
move is to not build them rather than to approximate them:

1. **No time-in-stage.** We know when a deal last moved, not when it entered any
   particular stage.
2. **No funnel conversion.** A deal that went New → Ready → Won leaves the same
   trace as one that went straight to Won.
3. **No sales velocity and no average days to close.**
4. **No cohort analysis.** A window selects deals whose *last* update falls in
   it, which is not the same set as deals that *entered* the pipeline in it.

> This list is the only copy — there is no `UNAVAILABLE_ANALYTICS` constant in
> `lib/forecast.ts`, so if you are moving this file, move the list with it. All four are
> named in the UI as prose rather than rendered as disabled controls: a greyed
> out button says "not yet", and the truth is "not from this data".

## What is server-truthful

`contactDealsByStages(filter: DealsByStagesFilter!)` takes
`salesStageUpdatedAfter` and `salesStageUpdatedBefore`, so per-stage counts for
a window are exact, and period-over-period is the same query called twice with
two windows. **This needs no new operation** — `DealsTotals` already takes the
whole filter object.

Win rate is `Won / (Won + Lost)` over the window, exact for that window, with
the cohort caveat above stated beside it rather than in a tooltip.

## What is loaded-rows-only

**There is no server-side aggregation of any attribute** — no SUM, no AVG. Every
money figure is a client-side sum over the rows that happen to be loaded, so it
must always render its coverage:

> Σ €412k · 60 of 128 loaded

with an action to load the rest. A bare number here is a lie, and mixed
currencies must refuse to sum rather than print a wrong total — the same rule
`lib/dealRollup.ts` already enforces for a column header.

**Where those rows come from matters.** The only deal-isolated list is
`contactDealsConnection`, and it takes **no time arguments** — the window is
server-side on the counts and client-side on the rows. The connection is
ordered by `lastSalesStageUpdateTime` desc, the same key the window filters on,
which has one consequence worth designing for:

- a window ending *now* is a **prefix** of the connection, so the first page
  already covers the most recent deals and coverage climbs quickly;
- a window in the **past** is not. The first page can contain zero rows inside
  it, and the honest render is `Σ — · 0 of 40 loaded` plus the load action —
  never an empty state that implies there is no money there.

**Weighted forecast is amount × probability, per deal, and nothing else.**
`deal probability` is a custom attribute like any other. A deal that has an
amount but no probability is **excluded and counted as excluded** — deriving a
probability from the stage would be inventing exactly the history this API does
not keep. Same rule, same reason as the four features below.

## CSV export

`csvContactExportStartBySegment(botID, platforms, segment, attributes)` and
`csvContactExportStartByIDsList(botID, contactIDs, attributes)` both return a
`Task`; poll `getTask` or subscribe `taskUpdated`. An **empty** `attributes`
list exports *all* attributes.

**The two starts are not two ways to export the same thing.** `SegmentInput`
has no sales-stage predicate — the same limitation that costs the table's
attribute engine its deal isolation — so a segment export **cannot be narrowed
to deals**. It is every contact on the bot, and the dialog has to say so rather
than let the pipeline filters on screen imply otherwise. The by-ids start is the
one that means "these deals", and it can only carry the ids that are loaded:
"load the rest" is therefore not only about the money, it is what makes an
export complete.

Because empty means *all*, "every column ticked" and "all attributes" are
different requests, and a selection with nothing ticked cannot be sent at all —
it would silently become the widest possible export.

**The cancel id is not the task id.** `csvContactExportCancel(botID, id: String!)`
takes a `String!` while `getTask(id: TaskID!)` takes the scalar, and
`CSVContactsExport implements TaskData { id: String! }`. Pass `task.data.id`;
select `Task.id` too and fall back to it if a cancel is rejected.

An export survives a page reload — pick it back up from
`bot.lastActiveCSVContactsExportTask` on mount rather than losing it. Adopt it
**only while it is still running**: "last active" includes a finished task, and
restoring one of those pops a download panel for an export the user started
somewhere else entirely.

`Task.statuses` is a log, not a state — the current phase is its latest entry by
`startedAt`, and a task can carry `Created` and `InProgress` and `Finished` at
once. Progress is `completedPoints / totalPoints`, and `totalPoints` is `0`
until the server has counted the work: that window is the one honest use of an
indeterminate bar.

## Saved views

`setUserStorageItem(id, value)` / `currentUser.userStorageItem(id)` is the
**only** persistence this API offers, and it is scoped to the signed-in user.
The UI must say "your views", never "shared views", and must not imply a
teammate will see them. `value` is nullable: an id that was never written reads
back as an item with `value: null` rather than erroring.

The whole list lives in **one** item under one id, so every rename and delete
rewrites all of it — and the state must only move once the write has landed, or
a failed mutation leaves the menu showing views the server does not have.

There is no server-side validation of that string and no migration path, which
makes the parser the load-bearing part: a value written by an older version, by
another tab or by a person with a console has to degrade to the default rather
than throw. Unknown enum members fall back, an entry that cannot be repaired is
dropped, and anything unparseable reads as an empty list — losing saved views is
recoverable, a menu that throws is not.

## What moves, and why almost nothing does

The two kinds of number above also decide the motion, which is why it is
documented here rather than treated as styling.

**Only the loaded-rows sums are allowed to roll.** They are the one figure on
this view that changes *without a refetch* — "load the rest" pages more rows in
and the total climbs while the reader is looking at it, which is exactly the
change an animated number is for. The open-pipeline money and the weighted
forecast therefore count up to their new value; the per-stage money does not,
because six figures ticking at once through one paging pass reads as a slot
machine rather than as a report.

**Server-truthful counts must not roll.** A per-stage count, the open count and
the win rate only change when the window changes, and a window change tears the
whole block down behind a skeleton. Animating across that would assert a
continuity the data does not have — it is a different query, not a growing
number. They snap, and the cards arrive in a short stagger instead.

Nothing rolls up from zero on first paint. `shouldRoll` treats a null-to-number
step as a mount and skips it: a figure nobody watched change has not changed.

The stagger and the roll are both Web Animations API, so both consult
`prefersReducedMotion()` explicitly — the CSS duration tokens collapse to 1ms
under reduced motion but WAAPI never sees that block. The arithmetic behind
them (`staggerDelay`, `rollProgress`, `rollValue`, `shouldRoll`) is pure and in
`lib/forecast.ts` with the rest, because vitest here is node-only and anything
left in a component is untestable forever.

## The reporting window's keyboard

The preset row is a `SegmentedControl`: one Tab stop, arrow keys within it,
type-ahead over the labels. Activation is **explicit** — arrowing across a
preset moves focus without selecting it, and Space or Enter commits. That is
not the ARIA default for a radiogroup and it is deliberate: every preset change
fires `DealsTotals` twice plus one `DealsColumn` per stage, so
selection-follows-focus would launch eight requests per arrow press.

Choosing "Custom" reveals two date inputs, and focus is moved into the first of
them on that transition only. No key listener lives on this view at all — the
module owns exactly one, at its root, and a second would race it.

## Operations

`DealsTotals` (reused, with a window), `DealsExportBySegment`,
`DealsExportByIDs`, `DealsExportTask`, `DealsExportUpdated`,
`DealsExportCancel`, `DealsExportRestore`, `DealsSavedViews`, `DealsSaveView` —
all in `examples/operations.graphql`.

## Where it lives

The arithmetic is pure and unit-tested, because the React files cannot be:
`lib/forecast.ts` (window boundaries, win rate, deltas, weighted forecast,
coverage strings, and the motion timings), `lib/savedViews.ts` (serialization
and the tolerant parser), `lib/csvColumns.ts` (column selection, and reading a
`Task`). The hooks — `useDealStats`, `useSavedViews`, `useDealExport` — hold
only the requests, and `ForecastView` holds only the layout.

Saved views are reachable from the header menu but **not** from the ⌘K palette.
`lib/commands.ts` already builds the group; `DealsApp` passes it an empty list,
because the data lives behind `useSavedViews`, which `SavedViewsMenu` owns and
`DealsApp` therefore cannot read. Closing that is two lines in `DealsApp` —
lift `useSavedViews` to the workspace and hand the list and an apply callback
to the command context. The module's handoff notes carry the steps.
