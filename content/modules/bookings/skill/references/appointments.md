# The appointments list and the insights — a window, not a page

`bookingsV2(startTime, endTime)` is the only way to read bookings in bulk, and it
takes nothing else: no cursor, no filter, no sort, no search, no count. It answers
with every booking overlapping the window. Everything the appointments list and
the insights section do is built on that one fact, and both say so on screen.

## The window (`lib/appointmentsRange.ts`, `lib/calendarRange.ts`)

There is no "page 2". To see more, the list asks for a **bigger window**, in
bounded chunks, and prints what it holds:

| Tab | Window | Grows by | Cap |
|---|---|---|---|
| Upcoming | `[today, today + 90 d)` | "Load 90 more days" | 366 d |
| Past | `[today − 30 d, today + 1 d)` | "Load 30 earlier days" (backwards) | 366 d |
| Custom | `[from, to]` inclusive | — | 366 d, cut from `from`; a caveat bar says so |

Days are `YYYY-MM-DD` keys in the **display** zone (`useDisplayZone`); they become
instants at the display zone's midnight, formatted with the **bot** zone's offset
(`rangeVars` → `toZoneIso`), because a zero offset is read by the API as bot wall
clock — see the guide's zone section. The coverage line under the toolbar is the
honest replacement for a paging footer: `27 loaded · Aug 17 – Nov 14 · Load 90
more days`. When the shown count is narrower than the loaded one (filter or
search) it adds `· 12 shown`.

**Upcoming and past split on `now`, not on today.** A booking that ended an hour
ago is past even though it is today; one that starts tonight is upcoming. So both
tabs' windows overlap on today, `inTab` filters by `endTime` against a minute
tick (`hooks/useAppointmentsNow.ts`), and the header count is the tab's, not the
window's.

`chunks` is view state, not a URL key: how far someone widened a list is not a
link worth sending. Switching tabs resets it to 1, and the store's `reset` clears
the selection with it.

## Filter, search, sort — all client-side (`lib/bookingsFilter.ts`, `lib/appointmentsSearch.ts`, `lib/appointmentsSort.ts`)

- **Filter** (specialists incl. "Unassigned", services, statuses) is the shared
  one the calendar and the insights use; it is `?specialist=`, `?service=`,
  `?status=` and it narrows the loaded rows. An empty selection means "all", so
  unticking one entry from the all-ticked state means "everything but this".
- **Search** (`/`, `?q=`, debounced 250 ms) looks at the customer's name, their
  phone (digits only — `202 555` finds `+1 202 555 0120`), the service, the
  specialist and the Google Calendar summary of an imported event; every
  whitespace token must match somewhere; case- and accent-insensitive
  (`Sørensen` matches `sorensen`). The box says "Search loaded rows…" and the
  palette entry says the same, because there is no bookings search in the API.
- **Sort** is every column, locally, over the loaded rows (`?sort=key:dir`).
  Default is chronological — soonest first for Upcoming and Custom, most recent
  first for Past — and the default is not written to the URL. Nulls (no price, no
  service, walk-ins) sort last in either direction; prices compare within a
  currency and order currencies by code across (no conversion is honest);
  status follows `STATUS_META` order.

## Rows and cells (`lib/appointmentsColumns.ts`)

Columns are data: `APPOINTMENT_COLUMNS` in display order, every key sortable,
`hiddenColumnsFor(band)` deciding what a narrower module gives up so the table
never scrolls sideways at a band's floor — `inline` shows all seven, `wide`
drops duration, `narrow` (600–899 px) drops specialist, duration and price, and
the compact band renders **cards** from the same four cells (when · customer ·
service · status) with the checkbox kept, because the bulk bar and the CSV run
on the selection and that is the only one of those paths a phone has.

What a cell contains is a tested pure function:

- **When** — day + range in the display zone (`wallClock`), never `Date#getHours`;
  a booking crossing midnight in that zone prints its end weekday (`23:00 – Wed
  00:30`); a start in another year prints its year.
- **Customer** — four identities: a real contact (name, avatar, phone when it is
  a WhatsApp contact), an inline contact (name, phone), a Google Calendar import
  ("Google Calendar event" with the event summary underneath), or "Walk-in"
  (neither). Both real identities exist on a WhatsApp bot because inline input
  is turned into a real `WhatsappContact` there (guide, Traps).
- **Service** — `Deleted · Old Facial` in muted ink for a `DeletedGoodsService`;
  the deleted ref still carries its price, so **Price** still prints.
- **Specialist** — avatar + name; `Deleted · Jo Former`; "Unassigned".
- **Status** — a `Tag` toned by `statusMeta`.

## Selection, bulk actions, keyboard

Selection lives in the range store's reducer (`selectionSet`,
`selectionCleared`) — the only place that can prune it when a live `remove`
retires a row or a `rangeLoaded` drops one. The view prunes it a second time
against the SHOWN rows: a row the filter or the search hides cannot stay
selected, or the bar would count something nobody can see.

- **ActionBar** (not portalled — bounded by the module): Confirmed · Attended ·
  No-show · Reschedule · Canceled, Export CSV, Delete… Never Pending: the API
  refuses every transition INTO Pending.
- **Context menu**: one controlled `ContextMenu` for the whole table (a `<tr>`
  cannot be wrapped). Right-click inside the selection acts on all of it; outside
  it acts on that row alone and leaves the selection untouched. "Open" is
  single-target only and is omitted, not disabled, for a multi-selection.
- **Keys** while something is selected: `1`–`5` set the status (the calendar's
  `CALENDAR_BINDINGS`, so the `?` sheet documents both at once), `esc` clears,
  `delete` opens the confirm dialog. `↑/↓/Enter/Space` are `DataTable`'s row
  navigation.
- **Writes** go through `useRangeMutations`: status is optimistic per row, N
  sequential round trips (no bulk mutation), one report → one toast with an
  Undo (`statusUndoEntry` — a row that WAS Pending cannot be undone back into it,
  and the label says how many can: "Undo 2 status changes" after marking three);
  a failure rolls back exactly that row and flashes it. **Delete is not undoable**
  (no restore mutation) — it asks first, naming who is affected, and suggests
  Canceled as the way to keep the record.
- A live region (`role="status"`) reads the batch phrase (`lib/announce.ts`).

## CSV export (`lib/appointmentsCsv.ts`)

Client-side, over the rows **currently shown** (tab, filter and search applied) —
the toolbar tag says "Loaded rows only" and the toast repeats it, because the API
has no bookings export (the contact CSV export knows nothing about bookings).
The bar's "Export CSV" exports the selection instead.

RFC 4180: comma-quote-newline-edge-space fields are quoted with doubled quotes,
CRLF rows, a UTF-8 BOM prefixed by the view so Excel opens accented names. Cells
starting with `=`, `+`, `-`, `@`, tab or CR are prefixed with `'` so a spreadsheet
never executes them — except a cell that is nothing but digits and phone
punctuation (`/^[+-]?[\d\s().-]+$/`, so `+12025550100` stays as typed), which is
what a phone column is for. Columns: Date · Start · End · Time zone · Customer ·
Customer type (Contact / Inline contact / Google Calendar / Walk-in) · Phone ·
Service · Service state (Active / Deleted) · Specialist (`(deleted)` suffixed) ·
Status · Duration (min) · Price · Currency · Booking ID (`bk-… (gcal:evt-…)` for
imports). Times are printed in the display zone with the zone beside them; an end
on another day carries its date. File name:
`appointments-<tab>-<from>--<to>.csv` over the loaded window.

The download is a Blob URL on an `<a download>` clicked programmatically and
revoked a second later — no server round trip.

## Insights (`lib/insights.ts`)

Its own range-store instance, keyed on the period (`?period=week|month|30d|90d|
custom` + `from`/`to`), the shared filter applied before anything is counted,
and **every card prints its coverage** ("over 143 bookings · Aug 1 – 31") because
that is what each number is a number OF. There is no aggregation anywhere in the
booking API — every figure is a fold over the loaded rows:

| Card | Definition | When it says nothing |
|---|---|---|
| Bookings | count of the window's rows | — |
| Status mix | counts per status in `STATUS_META` order, as a stacked bar + legend with counts and shares | empty window |
| No-show rate | `NoShow / (Attended + NoShow)` | `—` when nobody has been resolved either way (`0%` would claim a perfect record) |
| Cancel rate | `Canceled / total` | `—` on an empty window |
| Attended revenue | **per currency**: Σ `service.price.amount` over Attended rows; a Deleted service still prices; rows with no price are counted as "unpriced" beside the totals | never summed across currencies — `$90.00` and `€80.00` are two lines |
| Utilisation | per catalog specialist: occupied minutes (statuses with `occupies` — everything but Canceled, clipped to the window) / scheduled minutes (`workingMinutes` per weekday × occurrences of that weekday in the window; breaks subtracted) | "No schedule" (no denominator), "No hours in range"; unassigned bookings count for nobody |
| Busiest weekdays / hours | counts by weekday (week order from `weekStartsOn`) and start hour, both in the **display** zone; the hour axis is the busy span padded an hour each side, never narrower than 08–18 | bars at zero |

Colour follows the dataviz rules: status tones on the status bar (they ARE
status colours; Reschedule takes a lighter step of the warning hue it shares
with Pending, and the legend carries every identity with its count), one
categorical hue (`--color-event-1`) for the single-series weekday and hour bars,
accent-on-accent-soft meters for utilisation, text in text tokens never in a
series colour, a title on every mark, thin marks with a surface gap. On a
refetch the numbers hold at reduced opacity instead of flashing to skeletons.

**Absent by API, and said in the footer:** lead time (bookings carry no
`createdAt`), trends across more than one loaded window, anything server-
aggregated, revenue in one number across currencies.

## Where it lives

- `src/modules/bookings/views/AppointmentsView.tsx` — wiring: URL ↔
  view state, the chunk count, menu/dialog targets, the actions.
- `src/modules/bookings/components/appointments/` — `AppointmentsToolbar`
  (tabs, search, dates, filter menus, CSV, density), `CoverageBar`,
  `AppointmentsTable` (whose `AppointmentCards` export renders the compact
  band), `AppointmentsRowMenu`, `BookingsFilterMenus` (shared with Insights);
  the delete dialog is shared with the calendar at
  `components/DeleteBookingsDialog.tsx`.
- `src/modules/bookings/lib/appointmentsRange.ts`, `appointmentsColumns.ts`,
  `appointmentsSort.ts`, `appointmentsSearch.ts`, `appointmentsCsv.ts` — pure,
  each with a colocated test.
- `src/modules/bookings/hooks/useAppointmentsNow.ts` — the minute tick.
- `src/modules/bookings/views/InsightsView.tsx`,
  `components/insights/` (`InsightsToolbar`, `StatusMixCard`,
  `UtilisationCard`, `BusiestCards`; the stat tile itself is `~ui`'s `StatTile`), `lib/insights.ts` (+ test).

## Operations

`BookingsRange` (both views), `BookingStatusResolve`, `BookingDelete` (through
`useRangeMutations`) — all in `examples/operations.graphql`. Nothing else: the
list and the insights are read-mostly consumers of the one range query.

## Traps

- **Do not add a "total" that is not the window's.** There is no count query;
  the header number is the shown rows, and the coverage line says which days.
- **Upcoming/past is a split on `now`**, so a booking can be in the past tab at
  10:31 that was upcoming at 10:29 — without a reload; the tick is a minute.
- **The custom cap cuts from `from`**, not around today: `2020-01-01 →
  2026-12-31` shows 2020. The caveat bar says so; do not "helpfully" recentre.
- **Sorting by price across currencies orders by code**; there is no rate table
  and pretending otherwise would be worse than the visible seam.
- **`+` at the start of a CSV cell is a phone, not a formula** — the exception is
  the whole cell matching `/^[+-]?[\d\s().-]+$/`, and nothing wider: one letter in
  the cell and the `'` prefix goes back on. See `csvEscape` in
  `~ui/lib/data/csvExport`.
- **Utilisation over a future window is "booked share of hours"**, not
  attendance; the description says "booked minutes" for that reason.
- **Rates with a zero denominator print `—`**, never `0%`.
- **The `1`–`5` keys act only while something is selected** in the list; a
  stray digit over an empty table does nothing and is not swallowed.
