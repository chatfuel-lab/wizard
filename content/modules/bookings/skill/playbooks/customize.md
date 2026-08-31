# Customizing this module

Shared ground rules (tokens, design system, adding operations) live in
`../chatfuel-core/playbooks/customize.md`. This is the index of the module's own
knobs — every entry names the file and the constant. All paths are under
`src/modules/bookings/` unless said otherwise; every `lib/*.ts` is pure
and unit-tested, so change behaviour there rather than in a component.

## Time zone

- `lib/zone.ts` — `toZoneIso` is how EVERY instant leaves the app (the bot zone's
  real offset; the API reads a zero offset as bot wall clock). Do not replace it
  with `toISOString()`.
- `hooks/useDisplayZone.ts` — the default is the BOT's zone; the operator's zone is
  a per-user preference (`lib/prefs.ts`, key `chatfuel.bookings.prefs.v1`). To
  default to the operator's zone instead, flip `DEFAULT_PREFS.zoneSource`.
- Week start: `lib/calendarRange.ts` `weekStartsOnFor()` reads the locale's
  `Intl.Locale` weekInfo (fallback Monday); a preference overrides it.

## The calendar

- Snap / step: `NUDGE_MIN` in `hooks/useCalendarKeyboard.ts`, re-exported as
  `SNAP_MIN` by `hooks/useCalendarActions.ts` and fed to the grid's `snap` prop
  in `components/calendar/TimeGridSurface.tsx` — the drag snap and the keyboard
  nudge stay one number (15 min); the wizard's slot step is `lib/slots.ts`
  `SLOT_STEP_MIN` (15; Cal.com uses the service duration — set it to
  `null`-like behaviour by passing the duration).
- Ranges: `lib/calendarRange.ts` — `UPCOMING_CHUNK_DAYS` (90), `PAST_CHUNK_DAYS`
  (30), `MAX_RANGE_DAYS` (366) bound how much one `bookingsV2` call can ask for.
- Colours: `lib/colors.ts` — bookings are coloured by specialist (catalog position
  → the design system's eight `--color-event-*` tones, wrapping) or by status;
  the default is `params.color`'s default in `lib/bookingsParams.ts`.
- Statuses: `lib/status.ts` `STATUS_META` — labels, tones, digit keys, the "look"
  on the grid (tentative / muted), which statuses occupy time. Pending is never a
  target because the API refuses it; do not add a key for it.
- Density and bands: `lib/layout.ts` (`effectiveMode`, `effectiveDensity`,
  `panelHost`, `masterDetail`, `wizardHost`).

## Writes, undo, toasts

- `lib/bookingInput.ts` `bookingInputOf` — the full-replace input every write is
  built from. If the API ever grows a patch mutation, this is the one place.
- `lib/undo.ts` `UNDO_TTL_MS` (60 s); delete is deliberately not undoable.
- `hooks/useRangeMutations.ts` — optimistic edits, sequential batches, one toast
  per batch, the compensating runners. Every write publishes on the live bus
  (`lib/liveBus.ts`) so every open window reconciles.
- Error copy: `lib/errors.ts` `MESSAGES`, keyed by API code (nested codes handled).

## The keyboard and the palette

- `lib/shortcuts.ts` — one list; the `?` sheet and the handlers both read it and
  a test asserts they cover each other. Add a binding and a row together.
- `lib/commands.ts` — what ⌘K offers in which state; pure, tested.

## Data

- `lib/rangeStore.ts` — the reducer behind every window; `lib/catalogStore.ts`
  (services + specialists, refetch triggers in `hooks/useCatalogStore.ts`,
  `CATALOG_REFETCH_THROTTLE_MS`), `lib/availabilityStore.ts` (cache by
  `service|date`, invalidated by day), `lib/settingsStore.ts`,
  `lib/detailStore.ts` (the panel).
- `lib/schedule.ts` — schedule ↔ working ranges, weekly minutes, the full-replace
  specialist input, validation and the "Mon–Fri 09:00–18:00" summary.


