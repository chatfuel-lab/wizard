# Bookings

Appointments of services with specialists, over `bot.bookingsV2`. Operations: `examples/operations.graphql`. The per-section references: `references/calendar.md` (the grid, drag-and-drop, keyboard), `references/booking-flow.md` (the detail panel and the availability-driven wizard), `references/appointments.md` (the list and the insights), `references/staff.md` (specialists, schedules, Google Calendar, services, settings).

## Model

```
BookingBase (interface): id, startTime, endTime, status, service, specialist
  Booking                     — + contact, inlineContact
  BookingWithGoogleCalendarRef — + contact, inlineContact, googleCalendarRefData { calendar, eventID, summary }
BookingStatus: Pending | Confirmed | Attended | NoShow | Reschedule | Canceled
```

- **Queries and mutations return the `BookingBase` interface; subscriptions return the concrete `Booking` type** — always select through `... on Booking` / `... on BookingWithGoogleCalendarRef` (the `BookingInfo` fragment does) and branch on `__typename`. Both concrete types carry `contact` and `inlineContact`.
- **Deleted references arrive as union branches**: `service: GoodsService | DeletedGoodsService`, `specialist: Specialist | DeletedSpecialist`. A `DeletedGoodsService` keeps `title`, `durationSeconds` and `price`; a `DeletedSpecialist` keeps its `profile`. Render them, greyed; never drop them. Their ids are still accepted by `bookingUpdateV2`, so a past appointment on a deleted service can be moved.
- **Two customer identities, two id spaces**: a real chat `Contact` (`ContactID`; only WhatsApp contacts can be booked — `BookingContactPlatformNotAllowed`) and a `BookingInlineContact` (`InlineContactID`, `{botID}_{phoneNumber}`, never listed on the Contacts tab). **On a WhatsApp-connected bot the API turns inline-contact input into a real `WhatsappContact`**: the `contact` comes back a `WhatsappContact`, `inlineContact` null, the note lands on `Contact.note`, and `bot.inlineContact(phoneNumber)` then misses. Handle both shapes on the way in and out; `lib/bookingInput.ts` does.
- **`bookingUpdateV2` is a FULL REPLACE** with the same shape as the create input: `inlineContact: null` clears the customer, `specialistID: null` unassigns. There is no patch. Every write in the app is `bookingInputOf(record)` with the change applied on top.
- **There is no status on the inputs**; status only moves through `bookingStatusResolveV2`. There is no dedicated cancel or reschedule mutation — `Canceled` and `Reschedule` are status values, and a reschedule is an update of the times.
- **Nothing may go back INTO `Pending`** — every other transition works, including same-status re-sets and `Canceled → Confirmed`; `→ Pending` answers `InternalServerError` from every state. The app never offers Pending as a target (`lib/status.ts` `TARGET_STATUSES`).
- **Anything goes on the calendar itself**: the API accepts overlapping bookings for one specialist, bookings outside working hours, in the past, 24 hours long, and with neither service nor specialist. Only the wizard, through availability, is opinionated.

## Time zone — read this before sending a single timestamp

Taking a bot whose zone is `-06:00` as the worked example:

- A `Time` input with a **zero offset** (`Z`, `+00:00`, `.000Z`) is read as the **bot's wall clock**: `2026-08-21T13:00:00Z` is stored and echoed as `13:00:00-06:00` (= 19:00Z). Any **non-zero offset is honoured** as an instant and echoed verbatim.
- Specialist schedules and availability periods are `HH:mm` in the bot's zone, and availability subtracts bookings by the **wall clock of the stored string** — a booking sent as `09:00+02:00` cuts the 09:00 slot.

So the one framing under which storage, echo, schedules and availability agree is: **format every instant you send with the bot zone's real offset** (`bot.timezone`, `botUpdateTimezone` to change it). `lib/zone.ts` (`toZoneIso`) does exactly that; never `toISOString()`, never the operator's local offset. Range bounds included. The module renders in the bot zone by default for the same reason (staff hours and the wizard's slots line up), and offers the operator's zone as a per-user preference only when the two disagree.

## Calendar

- `bookingsV2(startTime, endTime): [BookingBase!]!` — **no pagination, no filter, no sort**. It returns every booking overlapping the range. Ask for exactly the window you render (`lib/calendarRange.ts`): a day, a week, the 6-week month grid; the appointments list grows in 90-day chunks forward and 30-day chunks backward and prints what it has loaded; nothing is silently truncated.
- Filters (specialist, service, status) are therefore **client-side** over the loaded window, and the header count says how many of the loaded bookings pass. `lib/bookingsFilter.ts`.
- One store per window (`lib/rangeStore.ts`): `byId` is the one home of a record; a load **replaces everything cached inside the loaded window** (a booking the response no longer contains was deleted meanwhile); an optimistic edit keeps a per-booking inverse and a failure rolls back exactly that one and flashes it; a live event landing during a load is dropped because the load is the truth.

## Availability

`GoodsService.bookingAvailableStartTime(botID, date: "YYYY-MM-DD")` — **one service × one day per call**, answering per specialist:

```
{ specialistID, date, hasSchedule, isWorkingDay, availableStartTime: [{ start: "HH:mm", end: "HH:mm" }] }
```

- The periods are **START-TIME ranges with an INCLUSIVE end** = schedule end − duration: a 30-minute service on a 09:00–18:00 day answers `09:00–17:30`; a booking at 10:00–10:30 splits it into `09:00–09:30` and `10:30–17:30`. A start `s` is bookable iff `start ≤ s ≤ end`. Slicing with the classic `s + duration ≤ end` silently drops the last slot of every period. `lib/slots.ts`.
- `HH:mm` are the bot's wall clock. `hasSchedule: false` ⇒ always empty (the specialist has no working hours). Past dates still answer with periods — the client hides what already passed. Canceled and deleted bookings free the slot.
- Existing bookings are already subtracted; the client does not re-check overlaps.
- The wizard asks for the day it shows and caches by `service|date`; any live event touching a day (both days of a move) invalidates that day (`lib/availabilityStore.ts`).

## Staff — specialists and their schedules

- `bot.specialists` (unpaginated). `Specialist { profile { firstName lastName aboutInfo logo }, schedule, services, connectedGoogleCalendar, googleCalendarConnectionLink, latestGoogleCalendarSyncTask(botID) }`.
- `schedule: { enabled, sun…sat: { enabled, start, end, break: { start, end } | null } | null }` — seven named fields, ONE optional break per day, `HH:mm` in the bot zone. Availability is computed from THIS schedule (`isWorkingDay`), not from the knowledge base's business hours (a different, unrelated shape).
- `specialistCreate/Update(SpecialistInfoInput { profile!, schedule!, goodsServices! })` — a **full replace of all three**. `enabled: true` with no enabled day is `SpecialistScheduleIsEmpty`. `lib/schedule.ts` builds the input from a record and validates before the round trip.
- No specialist or catalog subscription exists: the app refetches on mount, on reconnect, when the tab becomes visible again (throttled), and reconciles from every own mutation's payload.

## Google Calendar

Per specialist: `specialistCreateGoogleCalendarConnectionLink` → a link the specialist opens **on a page the platform hosts** (`specialistGoogleCalendarLinkInfo(linkID)` describes it; `googleCalendarOauthFinishBySpecialistLink` runs there, not in this app) → `Specialist.connectedGoogleCalendar` → `specialistStartGoogleCalendarSync` → a `Task` followed through `taskUpdated(id)` (`BookingGoogleCalendarSync { syncedEventsCount, isFailed, finishedAt }`) → imported events land as `BookingWithGoogleCalendarRef`. Also `specialistDisconnectGoogleCalendar`, `specialistDeleteGoogleCalendarConnectionLink`. Errors: `GoogleCalendarNotConnected`, `GoogleCalendarSyncAlreadyInProgress`, `GoogleCalendarSyncRateLimited`.

## Services

The catalog is shared with the knowledge base (`bot.goodsCatalog`, unpaginated, mixes `GoodsProduct | GoodsService | DeletedGoodsService`; this module keeps only services). `goodsServiceCreate/Delete` answer with the WHOLE catalog, `goodsServiceUpdate` with the item; `GoodsServiceInput` is a full record (`title, description, price?, images, durationSeconds, isAvailable`). Deleting a service keeps its title and price on the bookings that reference it.

## Settings

`bot.fuelyConfig.booking` (`FuelyBookingConfig`): notification channel, confirmation + text, the 2-hour and 24-hour appointment notices + texts (the only "reminders" the API has), locale, an `aiAutonomyLevel` the AI does not read, and a read-only `calendarLandingURL` (usually null). Five setters (`BookingConfigSet*`, `BookingTimezoneSet`) each answer with the whole config — the settings store reconciles from the response, nothing is optimistic. **AI autonomy is not set here**: the AI obeys the Default automation's `FuelySettingBookingRules`, and this schema publishes no setter for it. The Settings card reads the Default value (`BookingAiAutonomy`) and links to the AI Automations module.

## Live updates

`bookingAdded` / `bookingUpdated` / `bookingDeleted(botID)` are **bot-wide** (no filter arguments) — subscribe ONCE per workspace and fan out (`lib/liveBus.ts`), do not open a socket per view. `bookingDeleted` carries only the id. Own-mutation echoes go through the same path as a teammate's event. On WS reconnect refetch every visible window (`client.onReconnect` → a `reconnect` bus event).

## Undo

A compensating forward mutation, one entry, 60 seconds: `bookingUpdateV2` with the input the booking had before (a full replace, so customer/service/specialist come back too), or `bookingStatusResolveV2` back to the previous status. **Delete is not undoable** (no restore mutation; recreation would mint a new id) — it asks first. Nothing can be undone into Pending. `lib/undo.ts`.

## Keyboard

`lib/shortcuts.ts` is the single source; the `?` sheet renders from it and a test keeps the two in step. Workspace: `⌘K`, `⌘Z`, `?`, `/`, `r`, `n`, `t`, `[` `]`, `d` `w` `m`, `g c/a/s/v/e/i`. On a focused booking block: arrows to move focus, `enter` open, `x` select, `⌘A`, `esc`, `1`–`5` set Confirmed / Attended / No-show / Reschedule / Canceled (no key for Pending), `space` grabs it for a keyboard move (the grid owns arrows / Enter / Escape while grabbed), `shift+arrows` nudge, `alt+shift+↑/↓` resize, `delete`.

## Layout

Bands are container-based (`useBand()` from the module root): compact < 600 forces day mode and an agenda list, the panel is a bottom drawer and the wizard is full-screen; narrow < 900 forces compact density and stacks staff/services master–detail; wide; inline ≥ 1280 renders the panel as a second column. No media queries.

## In practice

`latestGoogleCalendarSyncTask(botID)` answers null when never synced. A widened `BookingInfo` selection can be accepted over HTTP yet behave differently over the WebSocket — always validate a new selection both ways, since some errors surface only on the WS path.

### Traps

- **Pattern-invalid phones** (the fictional `+1 555…` range) fail `bookingCreateV2` with a generic error, not `WhatsappPhoneInvalid`. Use `+1 202 555 01xx` for synthetic data.
- **Booking error codes are nested**: the top-level message is the generic one and the real code sits at `errors[0].extensions.errors[0].extensions.code` (`BookingInlineContactDoesNotExist`, `InternalServerError`). `lib/errors.ts` looks in both places.
- **`bot.inlineContact(phoneNumber)` misses with an error, not null** — treat any error as "not found".
- **`Bot.timezone` is a free scalar** — validate it with `Intl` before formatting in it; a bot with no usable zone renders in the operator's zone and sends `+00:00` (which the API reads as bot wall clock — consistent).
- **`goodsCatalog` and `specialists` are unpaginated** and have no subscription.
- No `createdAt` on a booking — lead time and creation-order analytics are impossible; no server-side aggregation — every insight is over the loaded window and says so.
- The public booking page (`calendarLandingURL`) is hosted upstream; this app cannot host one — a browser cannot hold the dashboard token safely.

## Operations

`BookingsRange`, `BookingGet`, `BookingInlineContactSearch`, `BookingServices`, `BookingSpecialists`, `BookingAvailability`, `BookingContactsSearch`, `BookingConfig`, `BookingTask`, `BookingGoogleCalendarLinkInfo` · `BookingCreate`, `BookingUpdate`, `BookingStatusResolve`, `BookingDelete`, `BookingInlineContactSetNote`, `BookingContactSetNote`, `BookingWhatsappContactCreate` · `BookingService{Create,Update,Delete}` · `BookingSpecialist{Create,Update,Delete}` · `BookingGoogleCalendar{LinkCreate,LinkDelete,Disconnect,SyncStart}` · `BookingConfigSet{NotificationChannel,Confirmation,Appointments,Locale,Autonomy}`, `BookingTimezoneSet` · `BookingAdded`, `BookingUpdated`, `BookingDeleted`, `BookingTaskUpdated`. All in `examples/operations.graphql`; the specialist/service ones are `Booking`-prefixed because operation names are unique across skills and chatfuel-knowledge-base has its own over the same entities.

## Where it lives

`src/modules/bookings/` — `BookingsApp.tsx` (providers) / `BookingsWorkspace.tsx` (URL, band, zone, keyboard, panel, wizard, section switch), `views/*View.tsx` (one per section, frozen `views/types.ts` contract), `lib/*.ts` (every rule, tested), `hooks/*`, `components/<section>/*` (plus the shared `components/DeleteBookingsDialog.tsx`).
