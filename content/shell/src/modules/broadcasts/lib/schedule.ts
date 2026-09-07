/**
 * When a campaign goes out — read from the server's fields and written back
 * to them — and the one piece of arithmetic the API leaves to the client.
 *
 * The API stores every time as a UTC instant and knows no zone. A person
 * schedules on the bot's wall clock (`lib/zone.ts`), so:
 *
 * - the instant SENT is the wall-clock pick resolved in the bot zone, as an
 *   ISO string — the server answers with the same instant as a `Z` string;
 * - the weekday list a repeating campaign stores is in UTC terms. When the
 *   pick's wall-clock day and its UTC day differ, the days a person ticked
 *   have to move with the conversion before they are sent
 *   (`toCorrectedWeekdays`) and move back to be shown (`toDisplayWeekdays`).
 *   `correctedWeekdays` must ride along on EVERY first-send-time write while
 *   the stored list is non-empty, whatever the repeat type, or the server
 *   keeps a list that no longer matches the time.
 *
 * The flow-builder module carries the same rule against the browser's zone;
 * this copy takes the zone as an argument, because a campaign is the bot's.
 */
import { BroadcastRepeatType, Weekday } from '~api/generated/broadcasts/graphql';
import type { ScheduledElement } from '../types';
import { wallClock, zonedInstant } from './zone';

/** Schema enum order Sun..Sat — the index maths below relies on it. */
export const ALL_WEEKDAYS: readonly Weekday[] = [
  Weekday.Sun,
  Weekday.Mon,
  Weekday.Tue,
  Weekday.Wed,
  Weekday.Thu,
  Weekday.Fri,
  Weekday.Sat,
];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  [Weekday.Sun]: 'Sun',
  [Weekday.Mon]: 'Mon',
  [Weekday.Tue]: 'Tue',
  [Weekday.Wed]: 'Wed',
  [Weekday.Thu]: 'Thu',
  [Weekday.Fri]: 'Fri',
  [Weekday.Sat]: 'Sat',
};

/** Monday-first, the way a week is drawn. */
export const WEEK_ORDER: readonly Weekday[] = [
  Weekday.Mon,
  Weekday.Tue,
  Weekday.Wed,
  Weekday.Thu,
  Weekday.Fri,
  Weekday.Sat,
  Weekday.Sun,
];

const DAY_MS = 86_400_000;

/**
 * Day-of-week delta between the zone's calendar day and the UTC calendar day
 * of one instant: +1 when the zone is a day ahead of UTC, -1 when behind.
 */
export function dayShift(at: number, zone: string): -1 | 0 | 1 {
  const zoneDay = wallClock(at, zone).weekday;
  const utcDay = new Date(at).getUTCDay();
  if (zoneDay === utcDay) return 0;
  return (zoneDay - utcDay + 7) % 7 === 1 ? 1 : -1;
}

function shiftWeekday(day: Weekday, by: number): Weekday {
  const index = ALL_WEEKDAYS.indexOf(day);
  return ALL_WEEKDAYS[(index + by + 14) % 7] as Weekday;
}

/**
 * The days a person ticked (in the bot zone) → the list to SEND. The zone a
 * day ahead of UTC means the UTC instant falls on the previous day, so the
 * list shifts left (Mon → Sun); the zone behind, right.
 */
export function toCorrectedWeekdays(picked: readonly Weekday[], firstSendAt: number, zone: string): Weekday[] {
  const shift = dayShift(firstSendAt, zone);
  return picked.map((day) => shiftWeekday(day, -shift));
}

/** The stored (UTC) list → the days to SHOW as the person's picks. */
export function toDisplayWeekdays(stored: readonly Weekday[], firstSendAt: number, zone: string): Weekday[] {
  const shift = dayShift(firstSendAt, zone);
  return stored.map((day) => shiftWeekday(day, shift));
}

/**
 * The instants for "on these dates": every picked day at the first send's
 * time of day, resolved in the bot zone.
 */
export function datesAtTime(dayKeys: readonly string[], minuteOfDay: number, zone: string): number[] {
  return dayKeys.map((key) => zonedInstant(key, minuteOfDay, zone)).filter((at) => !Number.isNaN(at));
}

// ---------------------------------------------------------------------------
// What the server holds, decoded
// ---------------------------------------------------------------------------

export type CampaignSchedule =
  | { repeat: 'once'; at: number }
  | { repeat: 'weekdays'; at: number; weekdays: Weekday[] }
  | { repeat: 'everyNDays'; at: number; everyNDays: number | null }
  | { repeat: 'dates'; at: number; dates: number[] };

const instant = (iso: string): number => {
  const at = Date.parse(iso);
  return Number.isNaN(at) ? 0 : at;
};

/** The scheduled element's fields as one value. `weekdays` are the STORED (UTC) days. */
export function decodeSchedule(element: ScheduledElement): CampaignSchedule {
  const at = instant(element.firstSendTime);
  switch (element.repeatType) {
    case BroadcastRepeatType.Weekdays:
      return { repeat: 'weekdays', at, weekdays: [...element.repeatOnWeekdays] };
    case BroadcastRepeatType.EveryNDays:
      return { repeat: 'everyNDays', at, everyNDays: element.repeatEveryNDays ?? null };
    case BroadcastRepeatType.OnCertainDates:
      return { repeat: 'dates', at, dates: element.repeatOnCertainDates.map(instant).sort((a, b) => a - b) };
    case BroadcastRepeatType.Never:
      return { repeat: 'once', at };
  }
}

/**
 * The next instant the campaign goes out at or after `now`, or null when it
 * never will. Zone-free on purpose: the stored weekdays are UTC weekdays and
 * the time of day is the first send's UTC time of day, so the answer is the
 * same instant whoever asks. Only the display converts.
 */
export function nextRun(schedule: CampaignSchedule, now: number): number | null {
  const { at } = schedule;
  switch (schedule.repeat) {
    case 'once':
      return at >= now ? at : null;
    case 'everyNDays': {
      const step = schedule.everyNDays;
      if (!step || step <= 0) return at >= now ? at : null;
      if (at >= now) return at;
      const runs = Math.ceil((now - at) / (step * DAY_MS));
      return at + runs * step * DAY_MS;
    }
    case 'weekdays': {
      if (schedule.weekdays.length === 0) return at >= now ? at : null;
      const wanted = new Set(schedule.weekdays.map((day) => ALL_WEEKDAYS.indexOf(day)));
      const start = Math.max(at, now);
      // Same UTC time of day as the first send, on the first wanted UTC weekday
      // at or after `start` — at most a week of candidates.
      const timeOfDay =
        at - Date.UTC(new Date(at).getUTCFullYear(), new Date(at).getUTCMonth(), new Date(at).getUTCDate());
      const startDay = Date.UTC(
        new Date(start).getUTCFullYear(),
        new Date(start).getUTCMonth(),
        new Date(start).getUTCDate(),
      );
      for (let offset = 0; offset < 8; offset += 1) {
        const candidate = startDay + offset * DAY_MS + timeOfDay;
        if (candidate < start) continue;
        if (wanted.has(new Date(candidate).getUTCDay())) return candidate;
      }
      return null;
    }
    case 'dates': {
      const upcoming = schedule.dates.find((date) => date >= now);
      return upcoming ?? null;
    }
  }
}

/** What the audience will see from the list: every run, or just the one. */
export function describeRepeat(schedule: CampaignSchedule, zone: string): string {
  switch (schedule.repeat) {
    case 'once':
      return 'Once';
    case 'everyNDays':
      return schedule.everyNDays === 1 ? 'Every day' : `Every ${schedule.everyNDays ?? '…'} days`;
    case 'weekdays': {
      const shown = toDisplayWeekdays(schedule.weekdays, schedule.at, zone);
      const ordered = WEEK_ORDER.filter((day) => shown.includes(day));
      return ordered.length === 7 ? 'Every day' : ordered.map((day) => WEEKDAY_LABELS[day]).join(', ');
    }
    case 'dates':
      return `${schedule.dates.length} ${schedule.dates.length === 1 ? 'date' : 'dates'}`;
  }
}
