/**
 * Opening hours: the API's list of weekdays ⟷ the editor's week record.
 *
 * Two shapes that look alike and are not:
 *
 *   API    `[{ day: Weekday.Mon, enabled, start, end }, …]` — a LIST, and its
 *          `Weekday` is a string enum the SDL declares ALPHABETICALLY
 *          (Fri, Mon, Sat, Sun, Thu, Tue, Wed). Nothing may take a display or
 *          write order from it, which is why `WRITE_ORDER` is spelled out.
 *   `~ui`  `Record<0..6, DayHours>` keyed the way `Date.getDay()` counts
 *          (0 = Sunday), plus a `break` the Fuely schedule has no field for.
 *
 * Both directions cover all seven days on purpose. The server may answer with
 * a partial list, or with none at all, and a day that is not in the list is
 * CLOSED, not absent — an editor that showed six rows would be lying about the
 * seventh.
 */
import { DEFAULT_DAY_HOURS, type DayHours, type WeekHours, type Weekday as DayIndex } from '~ui';
import { Weekday } from '~api/generated/knowledge-base/graphql';
import type { WorkingHoursDay } from '../types';

/** `Date.getDay()` index per API weekday. The one place the two vocabularies meet. */
export const DAY_INDEX: Record<Weekday, DayIndex> = {
  [Weekday.Sun]: 0,
  [Weekday.Mon]: 1,
  [Weekday.Tue]: 2,
  [Weekday.Wed]: 3,
  [Weekday.Thu]: 4,
  [Weekday.Fri]: 5,
  [Weekday.Sat]: 6,
};

/** The order the schedule is written back in — Monday first, the way a person reads a week. */
export const WRITE_ORDER: readonly Weekday[] = [
  Weekday.Mon,
  Weekday.Tue,
  Weekday.Wed,
  Weekday.Thu,
  Weekday.Fri,
  Weekday.Sat,
  Weekday.Sun,
];

/** Seven closed days at sensible times, so enabling one does not also mean typing one. */
export function closedWeek(): WeekHours {
  return {
    0: { ...DEFAULT_DAY_HOURS },
    1: { ...DEFAULT_DAY_HOURS },
    2: { ...DEFAULT_DAY_HOURS },
    3: { ...DEFAULT_DAY_HOURS },
    4: { ...DEFAULT_DAY_HOURS },
    5: { ...DEFAULT_DAY_HOURS },
    6: { ...DEFAULT_DAY_HOURS },
  };
}

/**
 * The server's list as a week.
 *
 * An empty `start` or `end` falls back to the default rather than reaching the
 * editor as a blank time input — a blank one looks broken and cannot be fixed
 * by typing over it. `break` is always null: see `toWorkingHours`.
 */
export function toWeekHours(days: readonly WorkingHoursDay[] | null | undefined): WeekHours {
  const week = closedWeek();
  for (const day of days ?? []) {
    const index = DAY_INDEX[day.day];
    /* A weekday this build's enum does not know: skip it rather than write
       `week[undefined]`, which would survive tsc and corrupt the record. */
    if (index === undefined) continue;
    week[index] = {
      enabled: day.enabled,
      start: day.start || DEFAULT_DAY_HOURS.start,
      end: day.end || DEFAULT_DAY_HOURS.end,
      break: null,
    };
  }
  return week;
}

/**
 * The week as the schedule input, all seven days, Monday first.
 *
 * The break is dropped because `FuelyBusinessHoursDayScheduleInput` has no
 * field for one — which is exactly why the profile page renders the editor
 * with `breaks={false}`. Dropping one here silently would be the bug.
 */
export function toWorkingHours(week: WeekHours): WorkingHoursDay[] {
  return WRITE_ORDER.map((day) => {
    const hours = week[DAY_INDEX[day]];
    return { day, enabled: hours.enabled, start: hours.start, end: hours.end };
  });
}

/** Stable key for the draft comparison — same week, same string, whatever the object identity. */
export function weekHoursIdentity(week: WeekHours): string {
  return WRITE_ORDER.map((day) => {
    const hours = week[DAY_INDEX[day]];
    return `${day}:${hours.enabled ? `${hours.start}-${hours.end}` : 'off'}`;
  }).join('|');
}

export const anyDayOpen = (week: WeekHours): boolean => WRITE_ORDER.some((day) => week[DAY_INDEX[day]].enabled);

const dayKey = (hours: DayHours): string => (hours.enabled ? `${hours.start}–${hours.end}` : 'closed');

/**
 * "Mon–Fri 07:30–19:00 · Sat 09:00–18:00 · Sun closed".
 *
 * Consecutive days with the same times collapse into a range, because that is
 * how the answer reads out loud and how a person checks it at a glance. The
 * run is over `WRITE_ORDER`, so Sunday never joins a Monday run by wrapping.
 */
export function hoursSummary(week: WeekHours): string {
  if (!anyDayOpen(week)) return 'Closed every day';

  const parts: string[] = [];
  let runStart = 0;
  for (let index = 0; index <= WRITE_ORDER.length; index += 1) {
    const previous = dayKey(week[DAY_INDEX[WRITE_ORDER[runStart]!]]);
    const current = index < WRITE_ORDER.length ? dayKey(week[DAY_INDEX[WRITE_ORDER[index]!]]) : null;
    if (current === previous) continue;

    const from = WRITE_ORDER[runStart]!;
    const to = WRITE_ORDER[index - 1]!;
    const label = from === to ? String(from) : `${from}–${to}`;
    parts.push(`${label} ${previous}`);
    runStart = index;
  }
  return parts.join(' · ');
}
