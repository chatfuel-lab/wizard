# The calendar — day / week / month over `bookingsV2`, and what a drag becomes

`bookingsV2(startTime, endTime)` answers with every booking overlapping the
window and takes nothing else — no filter, no sort, no page. So the calendar
asks for exactly the days it draws (`lib/calendarRange.ts`: a day, seven days,
or the 6-week grid of a month), filters CLIENT-SIDE, and puts one instance of
the range store (`lib/rangeStore.ts`) under the view. The header count says
"12" for the filtered set — with everything else in the window still cached,
so a filter change never refetches. Every rule below is a pure function with a
colocated test; the components hold JSX and wiring only.

## Modes, columns, and what a column key means

`?mode=day|week|month`, `?date=YYYY-MM-DD` (the anchor; today when absent),
`?by=time|specialist` (day only), `?color=specialist|status`; the filter keys
`specialist=`, `service=`, `status=` are shared with the appointments and
insights sections. The compact band (< 600 px) renders a DAY as an agenda
list whatever the URL asks — a one-column time grid on a phone reads worse
than a list — and the URL keeps the request, so widening the container brings
the week back.

`~ui`'s `TimeGrid` is zone-agnostic: it knows columns and minutes of the day.
`lib/calendarLayout.ts` `layoutGrid` maps records onto it:

- **By time** (day, week): one column per day, id = the day key. A booking
  becomes `(dayKey, startMinute, endMinute)` in the DISPLAY zone through
  `~ui` `splitAtMidnight`; one that crosses midnight is two events — the
  first keeps the booking id (that is what focus, FLIP, selection and the
  `[data-event-id]` hook key on), the tail is `<id>~1`. Segments outside the
  visible days are dropped.
- **By specialist** (day only): one column per in-scope specialist — the
  filter's ids in catalog order, or the whole catalog — then a column per
  DELETED specialist a booking that day still points at ("Jo Former
  (deleted)"), then **Unassigned** last. Unassigned appears when a booking
  needs it OR the filter names `none`, so a drag can unassign into an empty
  column. A booking whose specialist is filtered out has no column and is not
  drawn (the header count still says so).
- **Month**: `MonthGrid` buckets by the display-zone start day (`monthBuckets`
  / `startDayKey`); the range is the 42-day grid, so the faint days of the
  neighbouring months are real and populated.

Events are sorted by start; the grid packs overlaps into lanes itself.

## Business hours, breaks, the now-line

Schedules are `HH:mm` in the BOT zone (`lib/schedule.ts` `workingRanges`,
`breakRange`). The layout turns them into per-column shading:

- Day column: **business hours = union** of the in-scope specialists' working
  ranges that weekday (their breaks already subtracted); a **break is hatched
  where every specialist working that day is on break** — the intersection.
  With one specialist in scope that is simply their break; with everyone it is
  usually nothing, which is right. A day nobody works is closed (fully shaded).
- Specialist column: their own hours and their own break; a day off or no
  schedule at all is closed; Unassigned takes the union.
- No in-scope specialist has any schedule → no shading at all rather than a
  wall of grey; the grid then opens at 08:00 instead of the earliest working
  minute (`initialScrollMinute`).

When the operator views in another zone (`zone.zone !== zone.botZone`) the
schedule minutes are shifted by the offset difference AT THAT DAY
(`zoneShiftMinutes`, so DST on either side is honoured), and the parts that
spill past midnight are picked up from the neighbouring weekday
(`displayRanges`): a Berlin 09–18 seen from Tokyo shows as 16–01 across two
columns rather than being clipped.

The now-line (`nowLine`) is one column by time (today's, only when today is
visible) and every column by specialist on today's day; a minute tick in
`hooks/useCalendarGrid.ts` moves it.

## The DnD protocol — `lib/gridSpan.ts`

`TimeGrid` reports a change as `(id, columnId, start, end)` in minutes; the
module turns it into a `BookingPatch` for `useRangeMutations.editBooking`
(optimistic → `bookingUpdateV2` full replace → `editSucceeded` + own echo on
the live bus, or `editFailed` → rollback + flash + danger toast; success
offers one undo). The rules, each pinned by a test:

- **A move keeps the booking's duration in milliseconds** and re-resolves the
  start from the display zone's wall clock (`zonedInstant`). Dragged onto a
  DST changeover day a 60-minute booking stays 60 minutes; the end wall clock
  is whatever that means there (FullCalendar's and Cal.com's rule).
- **Dragging the tail of a midnight-crossing booking moves the whole
  booking**: the tail's offset from the real start is carried over.
- **A resize sets exactly one edge** to the instant under the pointer and
  refuses to invert (null → nothing happens). The other edge is untouched.
- **A column change in the by-specialist day is a `reassign`** (specialist
  patch from the catalog, `null` for Unassigned, the record's own reference
  for a deleted-specialist column); a drop that changes time AND column is one
  `move` carrying the specialist patch — one mutation, one undo entry.
- **A month drop keeps the wall-clock time of day** in the display zone.
- **Drag-to-create and a click on empty grid open the wizard prefilled**
  (`onNewBooking({start, end, specialist?})`, one snap step for a click; a
  specialist column names its specialist). The wizard is the only place a
  booking is created — the grid never writes a booking without a customer.
- **Every instant SENT is `toZoneIso(instant, botZone ?? 'UTC')`** — never
  `Z`, never the operator's offset. The API reads a zero offset as bot wall
  clock (`lib/zone.ts` header).

Snap and the keyboard nudge are one number, `SNAP_MIN` = 15 (the grid's
default); a resize or a create is never shorter than `MIN_DURATION_MIN` = 15.

## Keyboard

`~ui`'s grid owns the block's own keys and `preventDefault`s them: **Space
grabs** (then arrows move by one snap, Shift by four, Left/Right change
column, Alt+↑/↓ resize the end, Enter drops, Escape cancels); plain arrows
walk between events; **Enter opens**. `hooks/useCalendarKeyboard.ts` listens
on the CONTAINER, skips anything already prevented, and resolves the rest
against `CALENDAR_BINDINGS` (`lib/shortcuts.ts` — the same list the `?` sheet
renders): `x` select/deselect, `⌘A` every visible booking, `Esc` clears a
selection, `1`–`5` Confirmed · Attended · No-show · Reschedule · Canceled
(the selection when the focused booking is in it, else the focused one; there
is no key for Pending — nothing can go back to it), Shift+↑/↓ ±15 min,
Shift+←/→ ±1 column (a day, or a specialist), Alt+Shift+↑/↓ the end ±15,
Delete → the confirm dialog. Digits, `x`, nudges and Delete stand down
without edit rights.

The pure part is `lib/calendarFocus.ts`: `grid` flow (↑/↓ inside a column,
←/→ to the nearest-in-time event of the adjacent non-empty column, Home/End
the column's ends) and `list` flow for the agenda (↑/↓ run on across days).
Focus is by id, not position: after a nudge remounts a block in another
column the hook puts focus back on the same booking.

Click opens; ⌘/Ctrl/Shift-click toggles selection. Right-click opens the
booking's menu — Open · Select · Mark as (5) · Reassign to (specialists +
Unassigned) · Duplicate (the wizard prefilled with the same service,
specialist and time) · Delete — and a right-click on a selected booking acts
on the whole selection, the file-manager rule the digits follow too. The
`ActionBar` (bulk bar) offers the five statuses and Delete; there is no bulk
mutation, so N bookings are N sequential round trips and one report — a
partial failure is an ordinary outcome with its own toast. Delete always asks
first: it cannot be undone (`lib/undo.ts`).

## Colour, status, states

`?color=specialist` (default): the specialist's position in the catalog picks
one of the eight event tones (`lib/colors.ts`), so Alex stays blue when Maria
is added after him; Unassigned and deleted specialists are neutral. Status is
drawn STRUCTURALLY on top so it survives the swap: dashed outline for Pending
and Reschedule, muted + struck-through for Canceled, a check for Attended and
a warning glyph for No-show. `?color=status` swaps the fill to fixed status
tones (`STATUS_EVENT_TONE`: Confirmed blue, Attended lime, No-show pink,
Pending/Reschedule orange, Canceled neutral). Deleted service or specialist
references say so in the text ("Old Facial (deleted)", italic) and in a
tooltip. A rollback flashes a danger ring for `FLASH_MS`.

Blocks slide to their new place (`hooks/useEventFlip.ts`, FLIP over
`[data-booking-id]`) on live updates and keyboard nudges; not after an own
pointer drop (the preview already sat there — sliding would show the move
twice), not during a drag, not under reduced motion. Nothing animates out.

States: a skeleton with the gutter and columns already in place while the
first window loads; a danger `Alert` with Retry when the first load fails and
a dismissible one above the grid when a refresh fails (the last loaded window
stays); "No bookings this week — New booking" as a slim row above an empty
time grid (the grid stays so a drag can still create) and as an `EmptyState`
in month and agenda; "Add a service and a specialist to start booking" with
links to the Services and Staff sections when the catalog is empty.

## Time zone

The grid renders in the DISPLAY zone — the bot's by default, so schedules,
availability slots and what the AI tells the customer line up with the
shading; the operator's on request — a per-user preference in
`src/modules/bookings/lib/prefs.ts`, not a URL key, because a zone
is not something you send in a link. The toolbar's caption ("Bot time · Europe/Berlin
(GMT+02:00)" / "Your time · …") and its switch appear only when the two zones
show a different wall clock right now (`sameWallClock` in `lib/zone.ts`);
when they agree the question does not exist. Sending never depends on the
display zone.

## Layout

Compact (< 600): a day, as `AgendaList`; the toolbar keeps prev / today /
next and the date, and folds specialists, services, status, colour and the
zone switch into one menu. Narrow (< 900): the week still renders and the
grid scrolls horizontally (`--width-time-column` per column); density is
forced compact. Wide / inline: everything inline. Density `compact` →
`TimeGrid` compact (48 px/h), `comfortable` → cozy (64 px/h).

## Traps

- **`by=specialist` only means something in day mode.** In week/month the
  URL keeps it and the toolbar hides the toggle; a ⌘K "Columns by specialist"
  from the week does not switch the mode.
- **The week starts on the locale's day** (`weekStartsOnFor`, Sunday in
  en-US) unless the prefs say otherwise — so a Sunday-first week shows last
  Sunday's history in the first column.
- **A drag-create in a specialist column prefills the specialist, but the
  URL model does not carry it**: `writeBookingsParams` writes `new`'s
  `start/end/contact` and reads `specialist`/`service` back from the shared
  filter keys, so the wizard opens on the filter's specialist, not the
  column's. Filtering to that specialist first is the workaround until
  `lib/bookingsParams.ts` grows a prefill key.
- **`TimeGrid` scrolls to the working hours once, on mount**; `TimeGridSurface`
  keys it on mode + density so a change re-scrolls, and a change of anchor
  keeps the user's scroll.
- **A midnight-crossing booking's tail resizes as a normal edge**: dragging
  the tail's start edge sets the booking's start to that instant on the next
  day, shrinking it. Refused only if it would invert.

## Operations

`BookingsRange`, `BookingUpdate`, `BookingStatusResolve`, `BookingDelete`
(through `useRangeMutations`); the live channel's `BookingAdded` /
`BookingUpdated` / `BookingDeleted` reach the view through the shared bus —
all in `examples/operations.graphql`.

## Where it lives

Pure and tested: `src/modules/bookings/lib/calendarLayout.ts`
(columns, segments, shading, now-line, month buckets, look, labels, empty
copy), `lib/gridSpan.ts` (span → instants + specialist, create/slot/duplicate
prefills, month drop, nudges), `lib/calendarFocus.ts` (arrow keys), the
gesture announcements in `lib/announce.ts`. Hooks: `hooks/useCalendarGrid.ts`
(window → store → filter → layout, count/busy/refresh),
`hooks/useCalendarActions.ts` (every pointer, keyboard and menu gesture as a
callback over the mutations, plus `SNAP_MIN` / `MIN_DURATION_MIN`),
`hooks/useCalendarKeyboard.ts`, `hooks/useEventFlip.ts`. Components under
`components/calendar/`: the three surfaces — `TimeGridSurface` (grid, column
headers, drag), `MonthSurface`, `AgendaSurface` (compact band) — plus
`CalendarToolbar` (+ `SpecialistChips`, `FilterPopover`), `EventBlock`
(+ `bookingMenuItems` and `calendarBulkActions`), `ColumnHeaders`,
`CalendarSkeleton`, `CalendarAlerts`; the delete dialog is shared with
appointments at `components/DeleteBookingsDialog.tsx`; the view —
`views/CalendarView.tsx` — keeps the ladder, the navigation and the
cross-surface contract (`renderBlock`, `onBlockClick`, the keyboard). The
grids themselves are `~ui` (`TimeGrid`, `MonthGrid`, `AgendaList`,
`EventChip`, `ResourceHeader`, `MiniCalendar`).
