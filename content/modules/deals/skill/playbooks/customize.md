# Customizing this module

Shared ground rules (tokens, design system, adding operations) live in
`../chatfuel-core/playbooks/customize.md`. Module-specific ideas:

- Stage columns come from `salesStageV2` — rename, recolour or reorder them in
  `lib/stages.ts`. `STAGE_META[stage].dot` is the column's identity colour, from
  the design system's pipeline ramp; `OPEN_STAGES` is what the pipeline rollup
  covers.
- Drag-and-drop is Pointer Events from `src/vendor/ui/dnd/`. It is
  dependency-free and works on touch. Swapping in a library buys you nothing
  here: sortable order is the one thing a library sells and the API cannot
  persist it.

## Deal fields

`lib/dealFields.ts` is the whole convention: seven custom contact attributes,
each with the `attributeName` written to the API, a `kind` that decides parsing
and the input control, and read-only `aliases` so an attribute someone created
by hand in the dashboard still resolves.

- **To rename a field**, change its `attributeName` *and add the old name to
  `aliases`*. There is no rename mutation in the API — without the alias the
  existing data is orphaned.
- **To add a field**, add a spec and, if it should show on the card, add its key
  to `CARD_FIELDS`. Nothing else needs touching: the panel renders from
  `DEAL_FIELDS`, and the query asks for whatever `requestedNames` returns.
- **To remove one**, delete the spec. Its data stays on the contacts —
  `contactAttributeDelete` is per contact, not per bot.
- `DEFAULT_CURRENCY` is what a deal with an amount but no currency of its own is
  assumed to be in. Deals in more than one currency are not summed; the column
  header says "Mixed currencies" instead of printing a wrong number.

`lib/dealFieldValue.ts` owns parsing and the canonical write forms (money
`1500.50`, dates as millisecond timestamps). Change behaviour there — it is pure
and unit-tested — rather than in the components.

## The board

Everything below is a constant or a pure function, so a change is one edit and a
test rather than a hunt through components.

- **Densities** — `lib/layout.ts`. `CARD_HEIGHT` drives both the card and the
  drop placeholder, so they cannot disagree. `effectiveDensity` forces compact
  below 900; delete that if your host is never narrow.
- **Breakpoints** — the bands live in the design system now, as the
  `--container-compact/-wide/-inline` tokens *and* the matching constants in
  `~ui`'s `lib/layout.ts`. They are the same three numbers and a test asserts
  it, so retune them in `styles/tokens.css` and the constants together — never
  one alone. `lib/layout.ts` here re-exports them and adds `isNarrow`,
  `effectiveDensity` and `panelHost`, which are the deals-specific policies.
  They measure the **module**, not the viewport: `useContainerBand` from `~ui`
  observes the module root. Attach it anywhere else and the inline detail panel
  will make it oscillate.
- **Ageing** — `ROT_THRESHOLD_DAYS` in `lib/rot.ts`. A stage with no entry never
  rots, which is why Won and Lost are absent. `warn` is the threshold, `stale` is
  twice it.
- **Paging** — `PAGE_SIZE` and `AUTO_PAGE_CAP` in `lib/constants.ts`. The cap is
  what stops one scroll becoming a full-column download; past it the column
  shows a button.
- **Batch size** — `MAX_MULTI_MOVE`. Every move is its own request, so this is a
  rate-limit guard, not a UI preference.
- **Stage keys** — `lib/stageKeys.ts`. Both the digit map and the deliberate
  refusal to wrap at the ends live there. The *bindings* themselves are not
  here; see "The keyboard" below.

## The table

- **Columns** — `lib/tableColumns.ts`. Each spec carries its label, its
  `<colgroup>` width and the attribute it reads. The deal-field columns are
  derived from `lib/dealFields.ts` through the catalog binding, so renaming a
  field renames its column, its sort key and its predicate name together.
- **What can be sorted is not a choice.** Only attribute-backed columns are
  sortable, because engine B has no `orderBy` at all and engine C's takes an
  `AttributeName`. There is no attribute name for "stage" or "last message", so
  a sortable header there would be a control that cannot work. If you add a
  built-in column, leave `attributeName` null.
- **Paging** — `TABLE_PAGE_SIZE` (25) and `AUTO_PAGE_CAP` (6) in
  `lib/dealsTableStore.ts`. Note this is a *second* cap: the board's is in
  `lib/constants.ts` and they are independent, because a row is far cheaper to
  render than a card. Past the cap the table stops auto-paging and offers a
  button — raise it and a long scroll becomes a full-table download.
- **Which engine answers a query** is decided in `lib/queryPlan.ts`, and the
  caveats the table has to admit to are rendered by `TableCaveatBar`. Read
  `references/table.md` before touching either.

## The forecast

- **Reporting windows** — `WINDOW_PRESETS` and `WINDOW_LABELS` in
  `lib/forecast.ts`. Adding one means adding a case to `resolveWindow`, which
  is pure and tested; nothing in the view knows what a preset means.
- **CSV columns** — `lib/csvColumns.ts`. One trap governs the whole file: an
  **empty** `attributes` list tells the API to export *every* attribute, so
  "all" and "every box ticked" are different requests and "nothing ticked"
  cannot be sent at all.
- **Saved views** — `lib/savedViews.ts`. `SAVED_VIEWS_KEY` is versioned on
  purpose (`…v1`): change the stored shape and bump the key, and every older
  value reads back as "no views" instead of as garbage. `MAX_SAVED_VIEWS` and
  `MAX_NAME_LENGTH` bound what one user-storage item can hold. Everything read
  back is untrusted — the parser degrades, never throws.
- **Motion timings** — `STAGGER_STEP_MS` and `STAGGER_MAX_MS` in
  `lib/forecast.ts`. What is allowed to animate at all is a data question
  rather than a taste one; `references/forecast.md` says which figures and
  why.

## Toasts

`DealsApp` mounts its own `ToastProvider` above everything, and it is not
optional decoration: a failed stage move is optimistic-then-rolled-back, and
the toast is the **only** signal that the card the user just dragged went back.
Saved views use the same provider to confirm a write. A host that strips the
provider gets a module that fails silently, so if you are hoisting toasts to an
app-level provider, hoist them — do not delete this one.

## The keyboard

`lib/shortcuts.ts` is the single source of every binding in the module, and
three things read it rather than restate it:

- `WORKSPACE_BINDINGS` goes straight into `useHotkeys` at the module root —
  one window listener for the whole module, ⌘K, ⌘Z, `?`, `/`, `r` and the `g`
  sequences.
- `BOARD_BINDINGS` is resolved against the **focused card** instead, because a
  digit pressed on a card belongs to that card. Same specs, same resolver.
- `SHORTCUT_ROWS` renders the `?` sheet.

`shortcuts.test.ts` asserts the bindings and the sheet cover each other
exactly, which is what makes "the cheat sheet cannot drift" a gate rather than
a good intention. Add a binding and the test fails until it is documented.

Two rules to keep if you edit that file. Only `mod+k` carries
`scope: 'always'`, so it still opens the palette from inside the table's search
box; everything else stands down while typing, which is the only reason `/` and
`?` are usable at all. And the listener stands down entirely while focus is
outside the module root — see `embed.md`.

## Undo

`UNDO_TTL_MS` in `lib/undo.ts` is how long a stage change stays undoable
(60s). It is not a timeout on a request — undo here is a *compensating forward
mutation*, because `contactSetSalesStage` is the only write and there is no
revert. Two consequences you cannot tune away: the server re-stamps
`lastSalesStageUpdateTime`, so an undone card returns to the **top** of its old
column rather than to where it was, and the same field drives the ageing bar in
`lib/rot.ts`, so undoing also resets the rot clock. Raising the TTL only widens
the window in which a user is offered an undo they have stopped thinking about.

## Motion

Durations and easings are tokens (`duration-*`, `ease-*`), so reduced motion is
handled centrally — the token block collapses every duration to 1ms. **The Web
Animations API never sees that block.** Anything driven by `element.animate()`
must call `prefersReducedMotion()` from `~ui` itself and bail; the board's win
sweep and FLIP pass, the forecast's card stagger and roll-up, and the deal
panel's entrance all do.

The one numeric knob is `FLIP_MIN_PX` in `lib/constants.ts`: how far a card has
to have actually moved before the board animates it. Sub-pixel rect noise from
a scrollbar appearing or a font settling would otherwise animate the whole
board on every live batch.
