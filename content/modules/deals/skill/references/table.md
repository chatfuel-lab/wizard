# The table view — two engines, and when to route to which

A board built on `contactDealsConnection` can only sort by
`lastSalesStageUpdateTime` desc and can only filter by assignee. Everything else
a sales list needs — search, a stage subset, attribute predicates, a chosen sort
— comes from two other queries, and they are **mutually exclusive** in what they
can express. Routing between them honestly is the whole design of this view.

## Engine B — `contactChatsConnection` (the default)

```
contactChatsConnection(first, before, after, assigneeFilter, unreadOnly,
                       salesStageV2Filter: [SalesStageV2!]!, textInputFilter)
```

The unlock is that `salesStageV2Filter` is a **list** here, unlike the board's
singular argument: one query isolates deals across all six stages *and* searches
server-side over contact name and phone. It returns the same `ContactConnection`
as engine C, so the existing `DealContact` fragment spreads unchanged, and
`contactsChatUpdates` keeps it live.

Sort is fixed to `lastConversationMessageTime` desc — there is no `orderBy`.

Count comes from `contactChatsCountV2(filter: ContactChatsCountFilter!)`.

**Trap.** The *connection* has no time arguments; only `ContactChatsCountFilter`
carries `lastMessageTimeAfter` / `lastMessageTimeBefore`. Never offer a
last-message-time filter on the table: the rows would be filtered client-side
while the count came from the server, and the two numbers would disagree by
construction. A time window belongs to the forecast, which gets one legitimately
through `DealsByStagesFilter`.

**The subscription's arguments must match the connection's exactly** (minus
paging), or the stream and the list describe different sets. This is the same
filter-lock invariant the board holds by building both from one `vars` object.

## Engine C — `contactsConnection` + `SegmentInput`

Arbitrary attribute predicates and `orderBy` on any attribute name. The price:

- **`SegmentInput` cannot reach `salesStageV2`.** Deal isolation is lost — the
  result is contacts, not deals, and a stage filter can only be applied
  client-side to the rows that happened to load.
- **No subscription exists for this shape.** The view goes stale until refetch.
- **Custom attributes always report `dataType: string`**, so `orderBy` sorts as
  text: `"9"` comes after `"1000"`.
- Range predicates are approximate by design: the Default strategy ORs the
  string / int / float / date interpretations of a value and counts the
  condition satisfied if *any* of them holds.

- **`SegmentID` and `FilterID` must be UUIDs.** The bundled SDL says only
  `scalar SegmentID` / `scalar FilterID`, but the API enforces it: an id like
  `deals-table-inline` or `deal-p1` fails the whole query with a generic
  error that names no field. The API client's `stableUuid` now derives a v4-shaped uuid
  from the predicate's own id, so the ids stay stable (a random one per render
  is a refetch loop) and valid.

Route here only when a filter needs a predicate or a sort engine B cannot
express, and say so in the UI.

## Deals with no conversation

Whether `contactChatsConnection` returns a deal that has never had a
conversation is not stated anywhere in the SDL. **Do not assert a caveat —
measure the gap.** The table already asks for `DealsTableCount`, and the module
already has `DealsTotals`. When the chat count is below the sum of the per-stage
totals, say so factually and with the real numbers:

> Showing 118 of 124 deals; 6 have no conversation.

That is true on every bot, needs no probe, and is strictly better than prose
about what might be missing.

**The gap has a precondition**: `DealsTotals` takes a
`DealsByStagesFilter`, which carries an assignee filter and a stage-update
window and *nothing else*. A text search or an unread filter therefore narrows
the chat count without narrowing the totals, and the difference stops meaning
"no conversation" — it means "the two queries were asked different questions".
So the sentence is gated on `q` being empty and `unreadOnly` being false, and
the totals are summed over **the stages actually in play** rather than all six.
`planQuery` exposes that gate as `totalsComparable`; `countGapCaveat` returns
null without it. Measuring the wrong thing is a worse failure than saying
nothing.

## How the built view routes

`lib/queryPlan.ts` is the whole decision, as one pure function: a filter goes
in, `{ engine, vars, clientFilters, caveats, live }` comes out, and every
downstream choice reads off that object. Its test asserts **every caveat string
verbatim**, which is what turns "honest about its limits" into a build gate.

Four rules it applies that the sections above do not spell out:

- **`plan.vars` is the query's variables minus paging, and the subscription's
  variables minus nothing.** One object, so the filter-lock invariant is
  structural rather than remembered.
- **A sort with no predicate is floored with `IS_NOT_EMPTY` on the sort
  attribute.** `orderBy` cannot exclude blanks, `SegmentInput` is optional, and
  a sort-only route would otherwise order every contact on the bot by an
  attribute most of them have never had — a page of dashes. The floor is a
  caveat of its own, not a silent narrowing.
- **Stage, search and unread become client-side filters under engine C**, over
  the rows that happened to load, and the caveat names exactly the ones that
  moved. `contactsCount` still counts the whole segment, so the total reads
  higher than the list — which the same caveat says.
- **Only attribute-backed columns are sortable.** Engine B has no `orderBy` at
  all, and engine C's takes an `AttributeName`; there is no attribute name for
  "stage" or "last message", so a sortable header there would be a control that
  cannot work.

`AttrFilterInput.dateStrategy` is deliberately unused. Its `comparableDate` is
an RFC3339 `Time`, while this module's canonical date form is a millisecond
timestamp *string*, and nothing in the SDL says how those two meet. The default
strategy's OR-of-interpretations is at least a known approximation, and it is
the one the range caveat describes.

## Selection, and what the keyboard does

The selection lives in the **reducer** (`lib/dealsTableStore.ts`), not in the
view, and that is not tidiness. `reset` and `liveBatch` are the only two places
that can prune it correctly: a selected id left behind by a subscription
`Remove` would later fire a mutation against a contact the server has already
retired, and that failure has no visible cause on screen. The board's selection
lives in its reducer for exactly the same reason.

Three rules the view holds on top of that:

- **Restricted contacts are never selectable.** `UnavailableContact` rows go to
  `DataTable` through `isRowDisabled`, so they are excluded from the header's
  tri-state box and from a shift-range without the module knowing what a range
  is. `selectionSet` prunes them a second time on the way in, because the
  context menu and the keyboard set the selection from ids rather than from
  checkboxes.
- **Right-click follows the selection.** Right-clicking a row that is part of
  the selection acts on the whole selection; right-clicking one outside it acts
  on that row alone and leaves the selection untouched. Same convention as a
  drag on the board, and as every file manager — deviating from it loses work
  silently.
- **A filter change clears it.** The rows the selection named are about to be
  replaced, and a bulk action against a set nobody can still see is not one
  anybody asked for.

The keyboard is `DataTable`'s `rowNavigation` plus the module's own stage keys:

- **Tab** enters the body once — the rows are a single tab stop, not one per row.
- **↑ / ↓** move between rows, **Enter** opens the deal, **Space** selects it.
- **Shift-click** a checkbox takes a range; the anchor stays put, so a second
  shift-click grows the same range rather than starting a new one.
- **`1`–`6`** move the selection to that stage, **`[` / `]`** step it one stage,
  **Esc** clears it. These are bound only while something is selected — a stray
  `3` over an empty table would otherwise swallow the keystroke and do nothing.

The stage keys are taken from `BOARD_BINDINGS` rather than restated, so the `?`
sheet documents the board and the table at once and the `Kbd` hints in the
context menu cannot drift from what is actually bound. `[` and `]` step
relative to a stage, and a selection can span several — the **first selected
row** is the reference, and the whole selection then lands on that one stage,
exactly as a keyboard move on the board works from the focused card.

There is no bulk mutation in this API, so a bulk move is N sequential round
trips. Past `MAX_MULTI_MOVE` the move is refused with an explanation rather
than firing sixty requests at a rate-limited bot, and a partial failure is an
ordinary outcome that gets its own toast.

## Undo re-stamps the sort key

Undo here is a **compensating forward mutation**, not a revert:
`contactSetSalesStage(id, salesStageV2: SalesStageV2!)` is the only write and it
is non-null, so going back means moving the deal again. Two consequences the
table has to own rather than hide, and the toast says both:

- The server re-stamps `lastSalesStageUpdateTime`. On the board that means the
  card returns to the top of its old column; on the table it means the deal's
  *stage age* resets, which the rot clock (`lib/rot.ts`) reads. A deal that had
  been sitting in Sorting for nine days comes back looking fresh.
- **A row that had no stage at all cannot be undone.** Engine C returns
  contacts, so a row can arrive with `salesStageV2: null`, and there is no
  value of `SalesStageV2` meaning "none". Those moves are real and simply not
  undoable; the entry omits them rather than offering an Undo that would
  silently skip some of what it named.

**The table's own order does not move**, which surprises people who learned
this on the board. The board sorts by `lastSalesStageUpdateTime`, so a card
undone there jumps to the top of its column; the table sorts by
`lastConversationMessageTime` (engine B) or by an attribute (engine C), and
neither is the field being re-stamped. The row stays exactly where it is
wearing a different stage — which is why the toast has to say what happened
rather than leaving the list to show it.

One entry, not a stack — see `DealsUndoContext.ts`. A second undo would not
restore an earlier arrangement, it would just move deals again.

## What a bulk action means on engine C

**Engine C has no live updates**, and that changes what a bulk move looks like
rather than just how fresh the list is. On engine B a deal moved out of the
current stage filter disappears on its own, because `contactsChatUpdates`
delivers the change and the reducer drops the row. On engine C nothing
delivers anything: the rows stay exactly where they are, still showing their
new stage, still inside a filter they no longer match. Say it plainly — the
list is a snapshot, and after a bulk action it is a snapshot that disagrees
with the server until Refresh.

Two smaller consequences of the same fact:

- The stage filter is client-side here, so moving deals out of it does not
  shrink the list either. The `clientSide` caveat already says the filter
  applies to loaded rows only; after a bulk move it is also stale.
- `contactsCount` counts the segment, not the pipeline, so it does not move
  when stages do. There is nothing to reconcile and nothing worth pretending
  to.

Export is not affected: `csvContactExportStartByIDsList` takes the ids the
selection actually holds, so it exports those deals on both engines regardless
of what the list is showing.

## Deliberately not offered

- **No last-message-time filter** — the trap above.
- **No virtualization.** The `IntersectionObserver` sentinel auto-pages up to a
  cap (`AUTO_PAGE_CAP` in `lib/dealsTableStore.ts`) and then hands over to a
  button, which bounds the DOM without breaking find-in-page or scroll
  anchoring. Revisit the cap before reaching for a windowing library.
- **No OR between attribute predicates.** `resultOperator` is `AND`; a grouping
  UI has no room in the filter model, and multi-value operators already express
  the one case that matters.
- **Predicates are not in the URL** — unbounded, and a link carrying them would
  be unshareable. `parseDealsParams` returns `predicates: []` on every round
  trip, so the view owns them and adopts a non-empty list only when one arrives
  from above, which can only be a saved view.
- **No exit animation on a removed row.** A `Remove` retires the record in the
  reducer, and fading the row out would mean rendering one the store no longer
  holds — selectable, and with a mutation one keystroke away, after the server
  has dropped it. Rows that *arrive* on a live batch flash once; rows that
  leave simply leave.
- **No "open" or "copy link" on a multi-selection.** One panel exists and a
  link carries one `deal` id, so both entries are omitted rather than shown
  disabled.

## Operations

`DealsTableChats`, `DealsTableCount`, `DealsTableUpdates`,
`DealsAttributeSearch`, `DealsSegmentCount` — all in
`examples/operations.graphql`.
