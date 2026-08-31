# Customizing this module

Shared ground rules (tokens, design system, adding operations) live in
`../chatfuel-core/playbooks/customize.md`. Everything below is a knob this
module deliberately keeps in one named place.

## The sources

`lib/sources.ts` is the rail, the deep links, the budget breakdown, the command
palette and the readiness checklist, all from one table. Adding a source is a row
there plus a view file plus one line in the `VIEWS` map in
`components/SourcesView.tsx`; the rail, the palette and `[` / `]` pick it up for
free.

Two fields on a row carry policy rather than presentation:

- `ownedBy` — the module that owns EDITING this source. Services and staff are
  `ownedBy: 'bookings'`, so this module shows them read-only with a link when
  bookings is installed, and edits them itself when it is not. `editsHere()` is
  the whole rule.
- `spendsBudget` — whether the source appears in the character breakdown.

## The lint

`lib/lint.ts` holds every finding and three thresholds, each a named constant:

| Constant | Default | What it means |
|---|---|---|
| `FAQ_ANSWER_MAX` | 600 | Past this an answer is a page |
| `INSTRUCTIONS_MAX` | 4000 | Past this the prompt crowds out everything else |
| `FAQ_THIN_BELOW` | 5 | Under this it is not a knowledge base yet |

Severity weights for the readiness score are `WEIGHT` in the same file: a blocker
costs 6, a warning 2, a tip 1, out of 100. It is a nudge, not a metric anyone
should optimise, and the list of findings under it is the part that helps. Change
the weights and the number moves; change what counts as a blocker and the
meaning moves, which matters more.

## The budget

`lib/budget.ts`. The server reports `usage.total` and `usage.catalog` and **no
ceiling**, so this file deliberately renders a composition rather than a gauge —
see the comment at the top before adding a `max`. The catalog's two halves are
apportioned from the server's own number by estimated share, and anything the
model cannot explain lands in an `other` slice rather than being hidden. If you
teach it a new source, add the slice to `BUDGET_SLICES` and give it a tone in
`components/rail/BudgetMeter.tsx`.

## The keyboard and the palette

`lib/shortcuts.ts` is the single list; `lib/commands.ts` decides which commands
exist in which state and has tests for it. The `?` sheet renders from the first,
the palette from the second, and `shortcuts.test.ts` fails if a binding and its
documentation drift apart.

## Undo

`lib/undo.ts`. One entry, sixty seconds, and every undo is a **compensating
forward write** — the previous string, the previous whole FAQ list, a re-created
catalog item. A restored item comes back with a NEW id and `undoCaveat` says so
in the toast; if you add an undoable action, decide what its compensating write
is before you add the button.

## Drafts and the save model

`lib/drafts.ts`. Switches and pickers save on change; long text and lists are
drafts with a save bar, so ⌘S, the unsaved badge and the leave-guard all work
from one registry. `reconcileDraft` is the rule for what a refetch means for
something a person is holding: adopt, keep, or raise a conflict.

## The gap sweep

Its caps live next to the hook that uses them. They exist because a scan reads a
real inbox: raise them knowing what that costs, and keep the scan behind an
explicit button.
