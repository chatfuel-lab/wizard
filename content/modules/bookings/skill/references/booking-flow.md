# The booking flow — the detail panel and the New-booking wizard

Two surfaces write a single booking: the **panel** (one existing booking, edited
in place) and the **wizard** (a new one, six steps, availability-driven). They
share the customer picker, the zone rules and the undo model, and they hit the
same eleven operations. What follows is what the API lets them do, what it does
not, and the decisions that fell out of that.

## Two customer identities, one section

A booking's customer is one of three things, and the panel renders all three:

- **A real contact** (`contact`, any `Contact` typename — only WhatsApp ones can
  be *booked*, but a booking may carry any). Avatar, name, phone (WhatsApp),
  the contact's own note via `BookingContactSetNote`, and a Live Chat link:
  `/livechat?c=<conversation.id>` when the contact has a conversation,
  `/livechat?contact=<contact.id>` when not (the inbox starts one).
- **An inline contact** (`inlineContact`: `{id, name, phoneNumber, note}`), the
  identity space for customers with no chat. Its note goes through
  `BookingInlineContactSetNote` and is shared by every booking with that phone.
- **None** — "Attach a customer" opens the wizard's own `CustomerPicker` inline
  and writes it with a full-replace `BookingUpdate`.

**Trap.** On a WhatsApp-connected bot the API turns an *inline* input into a
*real* `WhatsappContact` on the way in: the record comes back
with `contact` set and `inlineContact: null`, `bot.inlineContact(phoneNumber)`
then errors `BookingInlineContactDoesNotExist`, and the note landed on
`Contact.note`. So the panel branches on what the record HAS, never on what
was sent, and the wizard's phone lookup treats any error as "not known".

## Full replace, and what the panel sends

`bookingUpdateV2` has no partial form. A move that changes only the start time
re-sends customer, service, specialist and both instants — built from the
record the API last returned (`bookingInputOf` in
`src/modules/bookings/lib/bookingInput.ts`). Sending
`inlineContact: null` on an inline booking clears the customer, so the panel
never hand-builds an input: it patches the record (`applyPatch`) and lets
`bookingInputOf` say the rest. Deleted references keep their id
(`DeletedGoodsService.id`, `DeletedSpecialist.id`) and the API accepts them
back, which is why a past appointment on a deleted service can still be moved;
the selects show the deleted value disabled ("Deleted service — Old Facial")
beside the live catalog.

The panel is **not optimistic**: it shows `saving`, takes the server's record
(`written`), and publishes it on the module's live bus with `origin: 'own'` so
the calendar, the appointments list and the availability cache reconcile
through the same path a teammate's change would. Failures toast; the detail
store never carries a write error.

## Statuses

Every transition works EXCEPT into `Pending`, from any state, including
Pending → Pending (`InternalServerError`). Pending is where a
booking is born and can never return to. So:

- the primary buttons come from `primaryActions(status, isPast)` (Confirm /
  Cancel before the appointment, Attended / No-show after);
- the overflow lists `TARGET_STATUSES` — five, never Pending — with the current
  one checked and disabled;
- undo of a status change is `BookingStatusResolve` back to the previous
  status, and an entry whose `from` was Pending is simply not offered.

## Undo

A compensating forward mutation, one entry deep, 60 s (`lib/undo.ts`): the
previous `BookingUpdateInput` sent back for a time / service / specialist /
customer edit, the previous status for a status change. **Delete is not
undoable** — no restore mutation, and a re-created booking would have a new id
that no link, no chat message and no Google Calendar event points at — so the
panel asks first and says so.

The toast's Undo button holds the runner directly and clears the entry first;
going through the context's `run` would call the previous render's version
(rebuilt from the pending entry) and do nothing. Same trap the deals board
documents.

## Zones — what the panel and the wizard show, and what they send

- Everything RENDERED comes from the display zone (`wallClock(at, zone.zone)`):
  the header's "Mon, Aug 17 · 10:00 – 10:30", the When form's day / start /
  duration, the slot chips, the confirm summary. When the display zone is not
  the bot's, a second line says the same span "in bot time (Europe/Berlin)"
  — that is the clock the schedule, the availability and the customer share.
- Everything SENT is formatted with the bot zone's offset (`toZoneIso(instant,
  bot.timezone)`), never `Z` — a zero offset is read as bot wall clock — and
  never the operator's offset. The When form builds its instants
  from day + minute in the display zone and formats them in the bot zone
  (`whenInstants` in `src/modules/bookings/lib/panelForm.ts`).
- The wizard keeps time as INSTANTS plus the bot-zone `dayKey` availability
  was asked for. A slot is bot-zone `HH:mm` on that day; a custom time is typed
  in the display zone on that day; a grid-drag prefill already is instants.

## The wizard, step by step

`service → specialist → day → time → customer → confirm`, one pure reducer
(`src/modules/bookings/lib/wizardStore.ts`); a step is valid or it
names why, and the Stepper reaches any step whose predecessors are valid.

1. **Service** — cards from `bookableServices` (available only; the count of
   hidden unavailable ones is said). "Book without a service" is allowed by the
   API and turns the time step into custom-only, since availability needs a
   service to slice for.
2. **Specialist** — "Anyone" + those offering the service
   (`Specialist.services` is the truth). "Anyone" is a real choice: the first
   specialist free at the slot picked, printed as "with Maria" on the chip and
   "first free" on the summary. A specialist with no working hours wears a
   badge; the time step will have nothing for them and links to Staff.
3. **Day** — `MiniCalendar`, past days disabled, working days marked from the
   schedules the module already holds. On purpose NOT from availability: thirty
   `BookingAvailability` calls per month turned, for a dot.
4. **Time** — `BookingAvailability` for the service × the day (one call, cached
   per key while the wizard is mounted, invalidated by day from the live bus).
   Periods are START-TIME ranges with an INCLUSIVE end (09:00–17:30 for a
   30-min service ending 18:00), sliced every 15 min by `slotsFor`; past starts
   hidden for today (the API has no "now"). Grouped morning / afternoon /
   evening. Empty states name the reason: no working hours (→ Staff), a day off,
   fully booked, nobody offering the service. **Custom time** is the operator's
   escape hatch — a typed start and duration, warned when outside the schedule
   or in the past; the API allows both.
5. **Customer** — Existing (server search over `contactChatsConnection`, only
   WhatsApp rows selectable; the picker says how many matches it hid and why)
   or New (name, phone, country — default `bot.countryCode` — note; phone blur
   asks `BookingInlineContactSearch` and a known name fills an empty one or is
   offered over a typed one; "Also create a WhatsApp contact" runs
   `BookingWhatsappContactCreate(source: CalendarBooking)` first and books with
   the new `contactID`), or "Continue without a customer" (the API allows a
   booking with neither; it shows as "Walk-in"). Both drafts survive flipping
   the segmented control.
6. **Confirm** — the summary in the display zone (+ bot time when different)
   and Create: `BookingCreate`, the record published on the bus, the panel
   opened on it. Errors land inline (`errorMessage`), including the phone
   gotcha (a pattern-invalid number fails with a generic error).

Prefill (`?new=1&start=&end=&contact=` + the shared `service=` / `specialist=`
filter keys, or a grid drag): a span lands on Customer with the time editable
and no service required; a service alone lands on Time for today; a specialist
alone lands on Service with them pre-picked. Concretely the wizard opens on the
first step that is not yet valid. A deep link opens before the catalog has
answered, so an untouched wizard is re-opened from the same prefill when the
catalog lands.

Keyboard: Enter advances when the step is valid (controls that own Enter —
buttons, comboboxes, time fields — keep it), Escape closes through the
overlay, the Stepper goes back. In the compact band the wizard is a
full-viewport sheet on the same overlay.

## What the API cannot do (and the flow does not pretend to)

- No partial update, no reschedule / cancel mutations — status is an enum,
  time is a full replace.
- No "restore" — delete is final.
- No back-to-Pending.
- No availability without a service, no availability for a range of days.
- No `createdAt` on a booking — the panel cannot say when it was made.
- No contact fetch by id — a `?new=1&contact=<id>` prefill shows "Selected
  contact" until the created record brings the name.
- Overlaps, out-of-hours and past-dated bookings are all allowed; the wizard
  warns and the panel does not stop you.

## Operations

`BookingGet`, `BookingUpdate`, `BookingStatusResolve`, `BookingDelete`,
`BookingContactSetNote`, `BookingInlineContactSetNote` (panel);
`BookingAvailability`, `BookingContactsSearch`, `BookingInlineContactSearch`,
`BookingWhatsappContactCreate`, `BookingCreate` (wizard) — all in
`examples/operations.graphql`. Contacts themselves: `../chatfuel-contacts/references/guide.md`
(if installed).

## Where it lives

- Panel: `src/modules/bookings/components/panel/` (`BookingPanel`,
  `StatusActions`, `WhenForm`, `CustomerSection`), `hooks/useDetailStore.ts`,
  `hooks/useBookingWrite.ts`, `lib/detailStore.ts`, `lib/panelForm.ts` (+ tests).
- Wizard: `src/modules/bookings/components/wizard/`
  (`NewBookingWizard`, `WizardFrame`, one file per step, `CustomerPicker`),
  `hooks/useWizardStore.ts` (the open/reset/touched lifecycle over the
  reducer), `hooks/useWizardCreate.ts` (the create chain),
  `hooks/useWizardFocus.ts` (each step lands on its first control),
  `hooks/useAvailability.ts`, `hooks/useContactSearch.ts`, `lib/wizardStore.ts`,
  `lib/availabilityStore.ts`, `lib/slots.ts`, `lib/countries.ts` (+ tests).

### Traps

- **Zero offset = bot wall clock.** Send every instant with the bot's offset;
  parse every answer with `new Date()`.
- **Inclusive-end start periods.** Slice `s ≤ end`, not `s + duration ≤ end`,
  or the last slot of every period silently disappears.
- **Inline in, contact out** on WhatsApp bots — render what the record has.
- **`inlineContact: null` on update clears the customer.** Always send
  `bookingInputOf(record)` with the patch applied, never a hand-built input.
- **Never Pending as a target**, not even to "reset".
- **The toast's Undo must not go through the context's `run`** — it is stale
  by the time the toast is shown.
- **The design-system `Combobox` hides disabled options**, so a non-WhatsApp
  hit is not shown greyed — the line under the box says how many were hidden.
