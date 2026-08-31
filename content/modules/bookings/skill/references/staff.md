# Staff, services and settings — the catalog side of bookings

The calendar reads three things it does not own: who can be booked (specialists
and their weekly hours), what can be booked (services with a duration and a
price), and how the bot behaves around a booking (the AI booking configuration
and the bot's time zone). This reference is the three sections that edit them
and the Google Calendar flow that hangs off a specialist.

## Specialists are full-replace records

```
specialistCreate(botID, info: SpecialistInfoInput!)
specialistUpdate(botID, specialistID, info: SpecialistInfoInput!)
specialistDelete(botID, specialistID)
```

`SpecialistInfoInput` is `{ profile, schedule, goodsServices }` and there is no
partial form: to change one day of one specialist's hours you re-send their
first name, last name, description, avatar file id, all seven days and every
service id. So the section edits a **copy of the record** and saves once —
`SpecialistDetail` runs a reducer (`lib/staffFormStore.ts`, bound by
`hooks/useStaffFormStore.ts`) over a draft seeded from
the catalog record, tracks what is dirty, and on Save builds the whole input
with `specialistInputOfDraft(draft)`. The response (`Specialist` for update,
`Bot.specialists` for create and delete) is adopted by the catalog store
(`specialistWritten` / `specialistsReplaced`) and the form re-seeds from it.

The consequences worth knowing:

- **A failed save keeps the draft.** The API's code lands under the field it
  names — `SpecialistNameNotUnique` and `SpecialistFirstName*` under the first
  name, `SpecialistLastNameTooLong`, `SpecialistAboutInfoTooLong`,
  `SpecialistSchedule*` under the hours, anything else at the top of the form
  (`staffFieldForCode`). It clears when that field is edited again.
- **The form re-seeds from the record only while it is clean.** A catalog
  refresh or a Google Calendar task push arrives as a fresh record object;
  a dirty form ignores it (Reset adopts it), a clean one follows it.
- **The name must be unique per bot** — first + last name together; a clash
  comes back as `SpecialistNameNotUnique` and is shown inline on the field.
- **Delete is not undoable** and asks first. Bookings that reference a deleted
  specialist keep the name and come back as `DeletedSpecialist`; nothing on the
  calendar is removed. Filters, columns and the wizard drop them.

Avatars are `profile.logo`, a `FileID` from the REST upload
(`client.uploadFile(botId, file, 'Image')`); the control is hidden when the host
attaches no upload path. Bookings' `ImageInput` is its own small copy — modules
never import each other's components.

## Schedules — seven named days, in the bot's zone

```
SpecialistScheduleInput { enabled, sun, mon, tue, wed, thu, fri, sat }
SpecialistDayScheduleInput { enabled, start, end, break: { start, end } }
```

- Times are `HH:mm` **in the bot's zone** — the same clock availability
  answers in and the calendar shades with. The section says so under the
  editor; an operator in another zone is editing the bot's clock, not their
  own.
- `enabled: true` with no enabled day is `SpecialistScheduleIsEmpty` on the
  server. `validateSchedule` (`lib/schedule.ts`) says so before the round trip,
  along with end-before-start and a break outside the day
  (`SpecialistScheduleInvalidTimeRange`) and non-`HH:mm` text
  (`SpecialistScheduleInvalidTimeFormat`).
- Exactly one break per day. The editor offers one; the input has one.
- A specialist with `schedule.enabled: false` (or no schedule at all) cannot be
  booked through availability — `bookingAvailableStartTime` answers
  `hasSchedule: false` — but their bookings still show on the calendar and an
  operator can still book them by hand. The wizard names this ("Alex has no
  working hours yet") and links here.
- The editor is `~ui`'s `WeekHoursEditor`, whose `WeekHours` is keyed by
  **numeric** weekday (`Date#getDay`, 0 = Sunday); the API's days are named.
  `weekHoursOf` / `scheduleOf` in `lib/staffFormStore.ts` map between them through
  `WEEKDAYS[i]` in `lib/schedule.ts` — the one place the pairing lives. A day
  the API returns as `null` becomes an off day with default times; a schedule
  with no days at all starts from Mon–Fri 09:00–18:00 so flipping the switch on
  shows something sensible.
- The days ride along even when the schedule is off. It is a full replace, so
  the input keeps what it knows; turning the switch back on restores them.

The list's one-line summary — "Mon–Fri 09:00–18:00, break 13:00–14:00 · Sat
10:00–14:00" — is `scheduleSummary(schedule, weekStartsOn)`.

## Google Calendar — the flow this workspace can and cannot host

Per specialist. Three states, one card (`GoogleCalendarSection`):

1. **Nothing** — "Create connection link" →
   `specialistCreateGoogleCalendarConnectionLink(botID, specialistID)` returns
   `{ id, createdBy }`. The section patches it onto the record
   (`specialistWritten`) and shows it.
2. **Link out** (`googleCalendarConnectionLink` set, `connectedGoogleCalendar`
   null) — the link id with Copy, "Verify" →
   `specialistGoogleCalendarLinkInfo(linkID)` ("for Maria Barber at Demo Salon,
   created by Sam Owner"), and "Delete link" →
   `specialistDeleteGoogleCalendarConnectionLink` (answers with the whole
   specialist list). The note under it is the honest part: **Google's sign-in
   happens on Chatfuel's own page.** The specialist opens the link in the
   Chatfuel dashboard and grants access there. `specialistGoogleCalendarOauthMakeUrl`,
   `googleCalendarOauthFinishBySpecialistLink` and `availableGoogleCalendars`
   are deliberately not in `examples/operations.graphql` — hosting the OAuth
   round trip in an embed would need Google credentials the module does not
   have.
3. **Connected** — the calendar summary, the last sync line, "Sync now" and
   "Disconnect" (`specialistDisconnectGoogleCalendar(botID, specialistID,
   googleCalendarID)`, confirm first; answers with the specialist).

"Sync now" is `specialistStartGoogleCalendarSync(botID, specialistID)` and
returns a `Task`. `hooks/useGoogleCalendarSync.ts` writes the task onto the
record (`specialistTask`), subscribes to `taskUpdated(taskID)` while it runs,
and reads `getTask` once first when it finds a task already running at mount —
the subscription carries changes from now on, not the current state. Refusals
are mapped: `GoogleCalendarSyncAlreadyInProgress`,
`GoogleCalendarNotConnected`, `GoogleCalendarSyncRateLimited`.

Reading a task is `lib/taskState.ts`, pure: the current status is the newest
`statuses[]` entry **by `startedAt`**, not by array position; `Finished`,
`Failed` and `Cancelled` are terminal, `Paused` is not; the bar is
`completedPoints / totalPoints`; the finished line counts
`data.syncedEventsCount`; `data.isFailed` counts as failed even if the status
log lags. `canStartSync` is "no task, or a terminal one".

Imported Google events arrive as `BookingWithGoogleCalendarRef` bookings and
stay after a disconnect until deleted.

## Services

```
goodsServiceCreate(botID, service: GoodsServiceInput!)   → Bot { goodsCatalog }
goodsServiceUpdate(botID, serviceID, service: GoodsServiceInput!) → GoodsService
goodsServiceDelete(botID, serviceID)                    → Bot { goodsCatalog }
```

`GoodsServiceInput` is `{ title, description, durationSeconds, isAvailable,
price: { amount, currency } | null, images: [FileID] }` — again a full replace.
The card's availability switch re-sends the whole record with one flag flipped
(`serviceInputWithAvailability(record, on)` in `lib/serviceInput.ts`); the
dialog builds the input from its draft (`serviceInputOfDraft`).

- Money is a **string** (`"25.00"`), and a blank amount is `price: null` —
  which the API distinguishes from `"0.00"` (the card says "Free"). The dialog
  normalises `25`, `25.5`, `25,50` to two decimals; the currency is the
  `GoodsItemPriceCurrency` enum, offered as codes. A new service starts in the
  currency most existing services use.
- Duration is seconds on the wire, minutes in the UI (`DurationInput`).
- Titles must be unique (`GoodsItemTitleNotUnique`) and 2–120 characters. The
  server's `GoodsItem*` / `GoodsService*` codes land under their field
  (`serviceFieldForCode`).
- Products (`GoodsProduct`) are not shown here — Knowledge Base owns them. The
  catalog store keeps only `GoodsService` branches.
- Delete asks first and is not undoable. Bookings keep the deleted service as
  `DeletedGoodsService` with its title, duration and price, so history and
  revenue survive; specialists who offered it simply stop, and the wizard no
  longer lists it.
- Which specialists offer a service is `Specialist.services`, not the reverse:
  the card counts them from the specialists list, and a service nobody offers
  says so — it cannot be booked through availability.

## Settings

`useSettings()` holds `bot { timezone countryCode fuelyConfig { booking } }`
(`BookingConfig`) and six setters, each a mutation that answers with the whole
`FuelyBookingConfig` (or the bot's `timezone`), from which the store
reconciles — nothing here is optimistic. Rows save on change; each shows its
own saving state (`state.saving` lists the field ids in flight) and inline
error.

| Row | Mutation | Note |
| --- | --- | --- |
| Send through | `fuelyConfigBookingUpdateNotificationChannel(channel)` | `Chatfuel` or `ConnectedWhatsapp`; `BookingNotificationChannelNotAllowed` when the bot has no WhatsApp |
| Confirmation | `fuelyConfigBookingUpdateConfirmation(enabled, additionalInfo)` | the switch re-sends the current text; the text field re-sends `enabled: true` |
| 24 h / 2 h reminders | `fuelyConfigBookingUpdateAppointments(update)` | **one** input carrying both flags and both texts — every switch and text re-sends all four from the current config (`appointmentsInputOf`) |
| Language | `fuelyConfigBookingUpdateLocale(locale)` | `DashboardLocale`: En, Es, Pt, Id, Ms |
| AI autonomy | read-only here: `BookingAiAutonomy` reads the Default automation's `FuelySettingBookingRules.autonomyLevel`; the card links to `/automations?setting=bookingRules` | this schema publishes no setter for it; the five per-scope values are CollectIntents → BookWithTeammatesApproval → BookWithTeammatesReview → BookWithFullAutonomy, plus DontBook |
| Time zone | `botUpdateTimezone(timezone)` | `BotInvalidTimezone`; see below |
| Booking page | — | `calendarLandingURL` is read-only: shown with Copy and Open when set |

**Time zone** is the one setting that reaches every other section. Bookings are
stored as instants; schedules and availability are wall clock in this zone;
the module sends every instant formatted with this zone's offset (the API reads
a zero offset as bot wall clock — see the guide). Changing it moves no booking;
it changes the clock they are read on, and the calendar's caption follows.

`role.canManage` (Ai · Edit) gates every write in the three sections. Without
it the forms render read-only with a hint; the API would refuse anyway
(`NotEnoughPermissions`), and a hidden control is worse than a rejected click.

## Traps

- **`specialistUpdate` and `goodsServiceUpdate` are full replaces.** Never
  build the input from anything but the record the API last returned (or a
  draft seeded from it). Sending a partial silently blanks the rest.
- **The schedule's `HH:mm` are the bot's clock**, not the operator's, and not
  the display zone's when the operator flipped "Show in your time". The hours
  editor always says which zone it is in.
- **`enabled: true` needs at least one enabled day** — validate before the
  round trip; the server's `SpecialistScheduleIsEmpty` is the same message,
  later.
- **The name is unique per bot.** A rename that collides fails with
  `SpecialistNameNotUnique` after the round trip; keep the draft, show it
  under the name.
- **`taskUpdated` carries changes only.** A task found running at mount must be
  read once with `getTask`; the newest status is by `startedAt`, and a task
  whose `data.isFailed` is true is failed even if the log's last entry says
  `InProgress`.
- **A connection link is not a connection.** `googleCalendarConnectionLink`
  set with `connectedGoogleCalendar` null means the specialist has not
  finished on Chatfuel's page; "Sync now" answers
  `GoogleCalendarNotConnected` (mapped, inline). There is no specialist
  subscription, so that refusal — or its absence — is also how the section
  learns the connection landed: a start that succeeds on a record showing no
  calendar reloads the catalog.
- **`goodsServiceUpdate` answers with the fragment alone** (no `__typename`
  on the root); the catalog store's `ServiceRecord` requires it, so the hook
  stamps `'GoodsService'` on the response before dispatching.
- **Reminders share one mutation.** Flipping the 2-hour switch with a stale
  copy of the 24-hour text would overwrite it — always build the input from
  the current config.
- **A blank price is `null`, not `"0.00"`.** The two render differently
  ("No price" vs "Free") and mean different things to the AI.
## Operations

`BookingServices`, `BookingSpecialists`, `BookingServiceCreate`,
`BookingServiceUpdate`, `BookingServiceDelete`, `BookingSpecialistCreate`,
`BookingSpecialistUpdate`, `BookingSpecialistDelete`,
`BookingGoogleCalendarLinkCreate`, `BookingGoogleCalendarLinkDelete`,
`BookingGoogleCalendarLinkInfo`, `BookingGoogleCalendarDisconnect`,
`BookingGoogleCalendarSyncStart`, `BookingTask`, `BookingTaskUpdated`,
`BookingConfig`, `BookingConfigSetNotificationChannel`,
`BookingConfigSetConfirmation`, `BookingConfigSetAppointments`,
`BookingConfigSetLocale`, `BookingAiAutonomy`, `BookingTimezoneSet` —
all in `examples/operations.graphql`.

## Where it lives

The rules are pure and unit-tested, because the React files cannot be:
`src/modules/bookings/lib/staffFormStore.ts` (the draft, the reducer,
dirty tracking, client validation, server-code → field, the
`WeekHours` ↔ `SpecialistSchedule` conversion),
`src/modules/bookings/lib/schedule.ts` (`validateSchedule`,
`scheduleInputOf`, `specialistInputOf`, `scheduleSummary`),
`src/modules/bookings/lib/serviceInput.ts` (the service draft,
input builders, money normalisation, `formatPrice`),
`src/modules/bookings/lib/taskState.ts` (reading a `Task`).
`hooks/useStaffFormStore.ts` binds the form reducer to one record and owns the
re-seed rule; the other hooks — `useStaffMutations`, `useGoogleCalendarSync`,
`useServicesMutations`, and the settings setters in `useSettingsStore` — hold
only the requests and
the catalog dispatches. `views/StaffView.tsx`, `views/ServicesView.tsx` and
`views/SettingsView.tsx` hold the layout; their pieces are under
`components/staff/`, `components/services/` and `components/settings/`.
