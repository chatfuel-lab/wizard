# Scheduling

## Times are instants

`firstSendTime` and every date in `repeatOnCertainDates` are `Time` scalars. The server stores
UTC and answers `Z` strings: `"2030-01-06T01:00:00+03:00"` sent came back as
`"2030-01-05T22:00:00Z"`. Send `Date#toISOString()` and read `Date.parse`. There is no zone on
the campaign and none on the bot's flows; the bot's `timezone` (an IANA name on `Bot`) is what
the module SHOWS times in, and what a wall-clock pick is resolved in (`lib/zone.ts`
`zonedInstant(dayKey, minuteOfDay, zone)`). A bot with no usable zone falls back to the
operator's (`usableBotZone`, `localZone`).

```graphql
fragment Scheduled on WhatsAppScheduledMessageBlockElement {
  status
  firstSendTime
  repeatType
  repeatOnWeekdays
  repeatEveryNDays
  repeatOnCertainDates
}
```

## Corrected weekdays

`repeatOnWeekdays` is stored in UTC terms. When the first send's calendar day in the bot zone
differs from its UTC day, the weekdays a person ticked must move with the conversion before
they are sent, and move back to be shown:

- bot zone a day AHEAD of UTC at the first send (an evening pick east of Greenwich that is
  still the previous day in UTC): shift left — Mon → Sun;
- bot zone a day BEHIND: shift right — Sun → Mon;
- same day: no shift.

Worked: a bot in a zone three hours ahead of UTC, first send Monday 6 January 2030 at 01:00,
repeating on Monday and Tuesday. The instant is `2030-01-05T22:00:00Z` — a Sunday in UTC —
so the zone is a day ahead and the list to send is `[Sun, Mon]`. Read back, `[Sun, Mon]`
shifts right to `[Mon, Tue]`, which is what was ticked. The same picks at 09:00 are
`2030-01-06T06:00:00Z`, same day, sent as `[Mon, Tue]` unchanged.

`lib/schedule.ts` carries `toCorrectedWeekdays(picked, firstSendAt, zone)` and
`toDisplayWeekdays(stored, firstSendAt, zone)`; `dayShift(at, zone)` is the −1 / 0 / +1 they
share. `whatsAppScheduledMessageSetFirstSendTime` takes `correctedWeekdays` and must be given
the corrected list on EVERY call while the stored list is non-empty, whatever the repeat type
— the time moved, so the days may have. `whatsAppScheduledMessageSetWeekdays` takes the same
corrected list. The core skill states the same rule from the API's side in
`../chatfuel-core/references/misc.md`.

Order of writes on the schedule step (`hooks/useSchedule.ts`), on Continue and on the blur of
each control: `SetRepeatType` → `SetWeekdays` / `SetRepeatEveryNDays` / `SetOnCertainDates`
→ `SetFirstSendTime` last, with the corrected list. Each answers the block and goes through
`writeBlock` in `hooks/useCampaignsStore.ts`. A draft that is somehow still armed is
disarmed before the first write (`disable`), because of the refusal below.

## Recurrence

- `Weekdays`: an empty list is `weekdays_are_empty` on the element until one is set. The
  composer draws the seven days as toggles in `WEEK_ORDER` (Monday first; display only — the
  wire order is the schema's Sun..Sat).
- `EveryNDays`: `every_n_days_is_empty` until set. Above 1000 the server answers a bare error
  rather than a code; the composer's control (`components/composer/RecurrenceFields.tsx`)
  accepts 1–365.
- `OnCertainDates`: up to 500 instants — each picked day at the first send's time of day,
  resolved in the bot zone (`datesAtTime(dayKeys, minuteOfDay, zone)`). Empty is
  `certain_dates_are_empty`. The composer caps the list at 500.
- The next run is client arithmetic (`nextRun`): the first send if it is ahead; else the next
  UTC weekday in the stored list at the first send's UTC time of day; else first send plus a
  whole number of N-day steps; else the first listed date at or after now. `describeRepeat`
  is the sentence the list and the panel print.

## Arming

`blockEnableEntryPoint(flowID, blockID)` re-validates first. With anything incomplete — a past
time, an empty template parameter — it answers the flow UNCHANGED, `isEntryPointEnabled` still
false, and throws nothing. Read the bit back. With nothing wrong it flips the bit and the
element's status to Live. Launch has up to ten seconds of jitter.

The five time setters refuse while the entry point is enabled, with a bare server error. Disarm
(`blockDisableEntryPoint` — status goes back to Draft), write, arm again. The segment setter
does not refuse while armed, and the next run uses the new audience.

A past `firstSendTime` is accepted and stored; the verdict `start_time_cannot_be_in_past`
rides on the element until the time is moved. A campaign left armed past its one-shot time
goes out at that time; one disarmed and re-armed later needs a new time first. The composer
treats a past `once` time as an invalid schedule step (`lib/composerSteps.ts`) before the
server says so, and a one-time draft has no schedule step to fill.
