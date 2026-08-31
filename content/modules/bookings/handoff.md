### Bookings (bookings)

A booking workspace over `bot.bookingsV2` in six sections. **Calendar**: day /
week / month, columns by day or by specialist, drag to move, drag the edge to
resize, drag on empty grid to create, 15-minute snap, business hours and breaks
shaded from each specialist's schedule, a now-line, colours by specialist or by
status. **Appointments**: upcoming / past / custom range as a table with search,
filters, bulk status changes and CSV export. **Staff**: specialists with weekly
working hours (one break a day), the services they offer, avatars, and a
per-specialist Google Calendar connection with a progress-tracked sync.
**Services**: the catalog with duration, price, availability and images.
**Settings**: the AI booking configuration (confirmation, the 2 h / 24 h notices,
channel, locale; the AI autonomy is read here and changed in AI Automations) and the bot time zone. **Insights**: status mix,
no-show and cancel rates, attended revenue per currency, utilisation per
specialist, busiest hours — every number over the loaded window, and it says so.
Route: `/bookings`, the next segment picks the section (`/bookings/staff`),
`?b=<bookingID>` opens a booking
beside it (a drawer below 1280 px, an inline column above), `?new=1` opens the
wizard.

The workspace also owns one window key listener (`lib/shortcuts.ts` is the single
source of every binding), a ⌘K palette, a `?` cheat sheet the test suite keeps
honest, a 60-second undo for moves and status changes, one live channel fanned
out to every open window, and the New-booking wizard: service → specialist (or
anyone) → day → a free slot from `bookingAvailableStartTime` → customer (a
WhatsApp contact from search, or a new one by phone) → done.

Read `skill/references/guide.md` before changing anything — the **time-zone
rule** (the API reads a zero-offset instant as the bot's wall clock), the
inclusive-end availability periods and the "nothing goes back to Pending" rule
are none of them visible in the schema. `references/calendar.md`,
`references/booking-flow.md`, `references/appointments.md` and `references/staff.md` go
section by section; `skill/playbooks/customize.md` is the index of knobs.

First-task ideas:

1. Make a booking with the wizard, then drag it to another hour with a second
   browser tab open — the tab follows through the subscription. Press ⌘Z.
   Then drag the same booking onto a specialist with no working hours and watch
   nothing stop you: the API accepts anything on the calendar; only the wizard
   is opinionated.
2. Open `/bookings?new=1&contact=<a WhatsApp contact id>` from your Live Chat —
   the wizard opens on the customer step with the contact chosen. Wire a "Book"
   button there.
3. Add a status colour legend to the calendar toolbar when `color=status` is on
   (`lib/status.ts` has every tone; the toolbar is `components/calendar/`).
4. Extend insights with "bookings per service" — `lib/insights.ts` is pure and
   already groups by specialist; the shape is the same.
5. Give a specialist a second break: the API allows one per day, so this needs a
   schedule convention (two enabled ranges) — document it in `references/staff.md`
   if you go there.

Deliberately not built, and why:

- **A public booking page.** `calendarLandingURL` is hosted upstream; an app in
  a browser cannot hold the dashboard token safely, so a customer-facing page
  needs a server of its own. The wizard is the operator's version.
- **Recurring bookings and reminders per booking.** No API for either — the only
  "reminders" are the bot-wide 2 h / 24 h notices in Settings.
- **Finishing the Google Calendar OAuth here.** The consent flow lands on
  Chatfuel's page (`googleCalendarOauthFinishBySpecialistLink` runs there); this
  app creates the link, shows who created it, starts the sync and follows the
  task.
- **Server-side search or pagination over bookings, and undo for delete.**
  `bookingsV2` has neither; there is no restore mutation.

Things that look like bugs and are not: filters and search run over the LOADED
window (there is no server filter), and the header count says "12 of 40" for
that reason; availability slots are in the bot's zone even when you view in your
own; a booking cannot be set back to Pending (the API refuses); the same phone
number booked twice on a WhatsApp-connected bot yields ONE real contact, not an
inline one.
