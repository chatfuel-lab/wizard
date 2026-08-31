# Deals / Leads

Kanban of contacts over sales stages. Operations: `examples/operations.graphql`.

## Model

There is **no Deal entity** — a "deal" is a `Contact` whose `salesStageV2` is set. Stages are a fixed enum:

```
SalesStageV2: New | Sorting | Ready | WorkingOn | Won | Lost
```

Relevant contact fields: `salesStageV2`, `lastSalesStageUpdateTime` (the board's sort key), `assignee`, `note`, `unhandledSwitchToHuman`.

## Board

- One query per column: `DealsColumn` → `bot.contactDealsConnection(first!, after, assigneeFilter!, salesStageV2Filter!)`. **`salesStageV2Filter` is a single value here** (unlike the chat list where it's a list) — fetch the 6 columns with 6 queries (typical page size 10, load more per column via `after`).
- Column totals: `DealsTotals` → `bot.contactDealsByStages(filter: { assigneeFilter, salesStageUpdatedAfter, salesStageUpdatedBefore })`. (`contactDealsTotalsByStages` was the older variant and is not in this schema.) With per-column `first: 10`, render "+N more" from `total - fetched` for heavy columns like Won/Lost instead of paginating them fully.
- `assigneeFilter`: `{type: Any | Unassigned | FuelyAI | AssigneeID, assigneeID}` — set `assigneeID` only when `type: AssigneeID`.

## Moving cards

`DealSetStage` (`contactSetSalesStage(id, salesStageV2)`). For optimistic drag & drop: remove the edge from the source column, prepend to the target column (dedupe by contact id), reconcile with the mutation response — `lastSalesStageUpdateTime` changes, which affects ordering.

## Live updates

Subscription `DealsUpdates` (`contactsDealUpdates(botID, assigneeFilter)`) — same union protocol as the chat list:

- `ContactsDealUpdatesBatch { updates { action edge } }`, `action: Add | Update | Remove`. Route each edge to its column by `node.salesStageV2`; an `Update` may mean a stage change, so remove the contact from any other column it occupied first. Re-sort the column by `lastSalesStageUpdateTime` desc. `Remove` = drop from ALL columns.
- `ContactListUpdateStopped { willResumeAt }` — updates throttled; refetch columns and totals at `willResumeAt`.
- After applying a batch, refresh `DealsTotals` (debounced).
- The subscription's `assigneeFilter` must match the queries' filter.
- On WS reconnect: refetch all columns + totals.

## Deal fields — money and dates

There is no Deal entity, so there are no deal fields either. What exists is
**custom contact attributes**: `contactAttributeUpdate(id, attrName, attrValue)`
is documented *"Create or update custom contact attribute"* — writing one is
what defines it. This module writes seven, names configurable in one file
(`lib/dealFields.ts`):

```
deal amount · deal currency · deal close date · deal company
deal probability · deal source · deal lost reason
```

**Canonical wire forms.** `attrValue` is always a String, and the canonical form
is the contract, because it is the form that feeds the typed
interpretations its own date filters run on:

| Field | Written as | Example |
|---|---|---|
| money | plain decimal, no symbol, no separators | `1500.50` |
| date | **millisecond** timestamp | `1790121600000` |
| percent | bare integer | `40` |
| currency | ISO-4217, upper case | `EUR` |

Clearing a field is `contactAttributeDelete`, never a write of `""` — an empty
string is a value, and it keeps the attribute alive and counted.

### How it behaves

1. **The names are not reserved.** A name with a space in it — `deal amount` —
   is accepted.
2. **A written attribute is in `bot.botAttributes` immediately** — `type: custom`,
   `dataType: string`, `usersCount: 1`, with no propagation delay to wait out.
3. **Unknown names are silently omitted** from `contact.attributes(names: [...])`
   — not an error, not a null entry. So a client can ask for every configured
   name from its first render and simply get back the ones that exist. (Passing
   `names: null` means *all* attributes, which is not the same thing and is
   almost never what you want.)
4. **There is no typed branch to read for a custom attribute.**
   `ContactAttribute.value` is a single object and `"1500.50"` arrives as
   `BotAttributeValueString`, never `BotAttributeValueDouble`. The other
   interpretations the SDL names — long, float, double, boolean, datetime — are
   what server-side filters are built on, and they do not surface here.
   **Parse the string.**
5. **Deleting the last contact value removes the attribute from the bot
   catalog** — `botAttributes` stops returning it. Custom attributes are
   derived from contacts that carry a value, not a separate registry.

### Traps

- **`botAttributeCreateDefaultVal` is not the creation API.** It sets a
  **bot-wide default value**, so every contact would read back a non-empty
  `deal amount` and every `IS_NOT_EMPTY` heuristic would break. Create by
  writing a value on one contact.
- **There is no rename mutation.** Changing a configured name after data exists
  orphans that data. Add the old name as a read-only alias instead.
- **Anything can write into the same bucket.** A flow or a CSV import can put
  `"about 5k"` in `deal amount`. Render `—` plus a hint; never `NaN`, and never
  count it as zero in a sum.
- **`assigneeID` for `contactSetAssignee` is `member.user.id`** (a
  `UserAccountID`), not `member.id` (a `BotTeamMemberID`).

## Column money

`contactDealsByStages` is a server-truthful **count**. There is **no aggregation
API for attribute values at all**, so any money figure is a client-side sum over
the rows actually loaded. Always render the coverage with it —
`€96,400 · 12 of 21` — and refuse to sum across currencies rather than printing
a wrong number.

## Detail panel

`DealGet` plus a `contactUpdated(botID, contactID)` subscription: unlike the
board's list subscription this one carries the whole contact, so an edit made in
Live Chat or by a flow lands without a refetch. Every write mutation
(`contactAttributeUpdate`, `contactSetNote`, `contactSetAssignee`, …) also
answers with the contact, so there is nothing optimistic to reconcile.

## Beyond the board — the three engines

There is no one query behind this module. There are three, they are mutually
exclusive in what they can express, and the whole data design is about routing
between them honestly. `lib/queryPlan.ts` is where that routing lives, and every
caveat string it emits is a test assertion.

| | A — the board | B — the deal list | C — attribute search |
|---|---|---|---|
| Operation | `contactDealsConnection` | `contactChatsConnection` + `contactChatsCountV2` | `contactsConnection` + `contactsCount` |
| Isolates "is a deal" | yes, one stage per query | yes — the stage filter is a **list** | **no** — `SegmentInput` cannot reach `salesStageV2` |
| Filters | assignee only | assignee, unread, stage subset, server-side text over name + phone | arbitrary attribute predicates, tags |
| Sort | fixed `lastSalesStageUpdateTime` desc | fixed `lastConversationMessageTime` desc | any attribute name, either direction |
| Live | `contactsDealUpdates` | `contactsChatUpdates` | **none** |

The board is engine A, which is why its only filter is assignee: everything else
in the shared `DealsFilter` is something `contactDealsConnection` cannot express,
and a filter bar offering it here would be a control that silently does nothing.

- **`table.md`** — engines B and C, the routing between them, and the count gap
  the table measures at runtime rather than asserting.
- **`forecast.md`** — windowed per-stage totals and win rate (both exact), money
  rollups (loaded rows only, always with coverage), CSV export, and saved views
  in per-user storage. Also the four analytics features this API genuinely
  cannot support, and why faking them would be worse than omitting them.

## Dragging a card

Pointer Events, hand-rolled, in `src/vendor/ui/dnd/`. Native HTML5 drag was
not an option: it does not fire on touch at all. A DnD library was not either —
the one thing a library sells you is sortable order, and **within-column order
cannot be persisted here**: the board's sort is fixed to
`lastSalesStageUpdateTime` desc and `contactDealsConnection` has no `orderBy`.
Six static drop targets and one axis of hit-testing is a geometry problem, not a
dependency.

Three consequences the UI has to be honest about:

- **The drop placeholder is always at the top of the target column,** because
  that is where the card really lands — the server re-stamps the sort key. Any
  drop-index affordance would be a lie the next render corrects.
- **A same-column drop is a cancel,** not a reorder. `movesFor` returns an empty
  list for it, and an empty list is what makes it a no-op.
- **A multi-card drag is N sequential `contactSetSalesStage` calls.** There is no
  bulk mutation anywhere in this API. Optimism is batched so the whole selection
  jumps at once, but the network is serial, and a **partial failure is an
  ordinary outcome**: the cards that failed flash and return alone, and the
  announcement says "2 of 3 moved to Won; Lena returned". Past 25 cards the drag
  is refused rather than firing sixty requests at a rate-limited bot.

**A collapsed column is a 44px rail that is still a drop target, and it does not
spring open on hover.** `useDragSession` measures every target rect once at
activation and re-measures only while auto-scrolling, so expanding a rail
mid-drag would shift every column to its right out from under the pointer
against a stale cache. The design-system gallery demo keeps its spring-load; the
board deliberately does not, and being a drop target already removes the dead
end. For the same reason the drop placeholder lives inside the column's inner
scroller: **the column's outer box must never resize during a drag.**

**Click-after-drag.** The browser fires `click` on pointerup, so without a guard
the detail panel opens after every drag. `onDrop` and `onCancel` both run
synchronously inside the pointerup dispatch, so stamping a timestamp there and
ignoring clicks for 250ms is enough. Worth lifting into `useDragSession` the
next time `content/ui` is open.

## Keyboard

**Every binding in the module lives in `lib/shortcuts.ts` and nowhere else.**
Three things read that one list: the window-level handler (`useHotkeys`), the
board's element-level handler (which resolves the same specs with the same
`resolveHotkey`), and the `?` cheat sheet. `shortcuts.test.ts` fails if any of
them grows an entry the others do not have.

That rule exists because this file broke it. It documented "`Escape` clears the
selection" for two stages while nothing implemented it — no test failed, no type
broke, the sentence was simply wrong. Do not restate a key here. Change the list.

`1`–`6` sets the stage of the focused card, `[` and `]` step one column. This is
strictly better than emulating a drag with arrow keys: one keystroke, and it
applies to a multi-selection for free. It is also what let the per-card stage
`<Select>` be deleted — that control did not fit a 32px compact card, and a
pointerdown on a native `<select>` inside a drag target bubbles up and starts a
drag with the dropdown open. `[` and `]` do **not** wrap: stepping off New
straight into Lost on one keypress is a destructive surprise.

**One tab stop, not one per card.** Arrows move between cards, and the rules are
in `lib/boardFocus.ts` with tests: vertical clamps rather than wrapping;
horizontal keeps your row and clamps into a shorter column; empty and collapsed
columns are skipped, because a rail shows no cards even though it is still a
drop target. `⌘A` selects the focused card's **column** — six columns of twenty
is not a selection anyone acts on, and `MAX_MULTI_MOVE` would refuse it anyway.
`Shift`+`↑`/`↓` extends a range inside one column only; a range spanning two
columns would select cards the user never passed over.

**Focus is keyed by id, and that is load-bearing.** A stage change unmounts the
card from one column and remounts it in another, so the browser drops focus to
`<body>` and the next keystroke goes nowhere. `useBoardKeyboard` re-focuses the
same id after the DOM settles, guarded so it only ever acts when the board
already owned focus and focus has fallen to `<body>` — never when the user has
deliberately clicked somewhere else.

**`Escape` belongs to whatever is on top.** While a drag is live it cancels the
drag (`useDragSession` owns it on `window`); otherwise it clears the selection.
The workspace's own hotkeys stand down entirely while a dialog, drawer or the
palette holds focus, because those are portalled outside the module root — which
is the same rule that stops ⌘K being stolen from a host app in embed mode.

## Undo

`⌘Z`, and the action button on the toast that follows a move. Both run the same
thing, and both are cleared the moment either fires.

**Undo is a compensating forward mutation, not a revert.**
`contactSetSalesStage(id, salesStageV2: SalesStageV2!)` is the only write and it
is non-null; there is no history to roll back to. Two consequences, stated in
the toast itself rather than discovered later:

- The server re-stamps `lastSalesStageUpdateTime`, which is the board's sort key.
  Cards return to their old column but to the **top** of it, not to where they
  were.
- The rot clock reads the same field, so an undone move **resets the ageing bar**.
  A deal that had sat in Sorting for nine days comes back looking fresh.

One entry deep, deliberately: a second undo would not restore an earlier
arrangement, it would just move cards again. The entry expires after
`UNDO_TTL_MS`, because a ⌘Z five minutes later would move deals the user has
stopped thinking about. Undoing an undo is not offered — that is why `runMoves`
takes an `offerUndo` flag.

## Right-click

Cards and column headers both carry menus, built by `BoardView` because their
items act on the selection. **Right-clicking a card that is part of the
selection acts on the whole selection**; right-clicking an unselected card acts
on that card alone — the same rule `payloadFor` applies to a drag, so the two
can never disagree about what "this card" means.

There is **no touch long-press**. Drag activation is a 180ms hold, so a card
cannot resolve both gestures; touch reaches the same actions through selection
and the bulk bar.

## Motion

Live batches FLIP: `useBoardFlip` measures every card's rect before and after an
ordering change and animates the delta. Only cards present in *both* frames
animate — one that left is already unmounted, and one that arrived has no
previous position to slide from. It stands down entirely during a drag, because
`useDragSession` writes transforms straight to the dragged node in a rAF loop and
the two would fight over the same property.

The Won column keeps its one 600ms sweep. Still no confetti: a rep moves forty
deals a day, and a full-screen celebration is noise by lunch and unprofessional
inside a client's app.

## Restricted contacts

`UnavailableContact` cards render as a locked placeholder and are **counted in
the column total but excluded from the value rollup, from selection and from
every drag payload**. Showing an amount for a contact the viewer is not allowed
to see would contradict the rollup that deliberately skips it.

## Ageing

`rotOf` gives days-since-last-move and a level, over per-stage thresholds (New 2,
Sorting 3, Ready 5, Working on 14; Won and Lost never rot). It is **days since
the card last moved**, not time-in-stage — the API keeps only the last
transition — and the UI must not imply otherwise. A date that will not parse
paints nothing: that is a data problem, not a sales problem.

## Layout

Breakpoints come from a `ResizeObserver` on the module root, not from media
queries: an embed can be 700px wide inside a 2560px viewport. The band model
lives in `~ui` (`Band`, `bandFor`, `useContainerBand`); `lib/layout.ts` re-exports
it and adds the deals-specific parts. Four bands — compact below 600, narrow
below 900, wide, and inline at 1280 where the detail panel becomes a column
beside the canvas instead of a drawer.

Below 900 (`isNarrow`, which covers compact and narrow both) density is forced to
compact, the density control is hidden because it would be a lie, and the table
adds five columns to the hidden set. **The board does not become a single-stage
pager** — it renders the same fixed-width columns in a horizontal scroller at
every band. A real pager is future work.

**The observer must sit on the module root, never on the canvas**: the inline
panel narrows the canvas, so an observer there would flip the band, close the
panel, widen the canvas and oscillate. `ModuleRoot` exists so that is
structurally impossible; this module still wires the hook by hand.

Columns page with an `IntersectionObserver` sentinel capped at three automatic
pages, then a button. The cap is why an unbounded scroll cannot turn into a
full-column download.
