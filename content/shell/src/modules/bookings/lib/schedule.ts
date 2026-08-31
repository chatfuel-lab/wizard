/**
 * A specialist's weekly schedule: the API shape (seven named fields, one
 * optional break each, `HH:mm` in the bot zone) turned into things the grid,
 * the insights and the editor can use, and back into the full-replace input.
 *
 * `SpecialistInfoInput` has no partial form: to change one day you re-send
 * profile + schedule + services. `specialistInputOf` builds that from a
 * record, so every editor edits a copy of the record and sends the whole
 * thing. `enabled: true` with no enabled day is `SpecialistScheduleIsEmpty`
 * on the server; `validateSchedule` says so before the round trip.
 */
import type { SpecialistInfoInput, SpecialistScheduleInput } from '~api/generated/bookings/graphql';
import type { SpecialistDayHours, SpecialistRecord, SpecialistSchedule } from '../types';
import { formatHHmm, parseHHmm } from './slots';

export type Weekday = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
/** Index = `Date#getDay` / `WallClock.weekday`. */
export const WEEKDAYS: readonly Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  sun: 'Sun',
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
};

export interface MinuteRange {
  start: number;
  end: number;
}

export const DEFAULT_DAY: SpecialistDayHours = { enabled: true, start: '09:00', end: '18:00', break: null };
export const CLOSED_DAY: SpecialistDayHours = { enabled: false, start: '09:00', end: '18:00', break: null };

/** A fresh Mon–Fri 09–18 schedule (what "Add hours" starts from). */
export function defaultSchedule(): SpecialistSchedule {
  return {
    enabled: true,
    sun: { ...CLOSED_DAY },
    mon: { ...DEFAULT_DAY },
    tue: { ...DEFAULT_DAY },
    wed: { ...DEFAULT_DAY },
    thu: { ...DEFAULT_DAY },
    fri: { ...DEFAULT_DAY },
    sat: { ...CLOSED_DAY },
  };
}

export function dayHours(schedule: SpecialistSchedule | null | undefined, day: Weekday): SpecialistDayHours | null {
  if (!schedule || !schedule.enabled) return null;
  const hours = schedule[day];
  return hours && hours.enabled ? hours : null;
}

/** Working minutes of a weekday, break subtracted; empty when the day is off. */
export function workingRanges(schedule: SpecialistSchedule | null | undefined, day: Weekday): MinuteRange[] {
  const hours = dayHours(schedule, day);
  if (!hours) return [];
  const start = parseHHmm(hours.start);
  const end = parseHHmm(hours.end);
  if (start === null || end === null || end <= start) return [];
  const brk = hours.break;
  const bs = brk ? parseHHmm(brk.start) : null;
  const be = brk ? parseHHmm(brk.end) : null;
  if (bs === null || be === null || be <= bs || bs >= end || be <= start) return [{ start, end }];
  const out: MinuteRange[] = [];
  if (bs > start) out.push({ start, end: Math.min(bs, end) });
  if (be < end) out.push({ start: Math.max(be, start), end });
  return out;
}

/** The break as a range, when the day is on and has one. */
export function breakRange(schedule: SpecialistSchedule | null | undefined, day: Weekday): MinuteRange | null {
  const hours = dayHours(schedule, day);
  if (!hours?.break) return null;
  const s = parseHHmm(hours.break.start);
  const e = parseHHmm(hours.break.end);
  return s !== null && e !== null && e > s ? { start: s, end: e } : null;
}

export function workingMinutes(schedule: SpecialistSchedule | null | undefined, day: Weekday): number {
  return workingRanges(schedule, day).reduce((sum, r) => sum + (r.end - r.start), 0);
}

export function weeklyMinutes(schedule: SpecialistSchedule | null | undefined): number {
  return WEEKDAYS.reduce((sum, day) => sum + workingMinutes(schedule, day), 0);
}

export interface ScheduleProblem {
  day: Weekday | null;
  message: string;
}

/** What the server would reject, said before the round trip. */
export function validateSchedule(schedule: SpecialistSchedule): ScheduleProblem[] {
  const problems: ScheduleProblem[] = [];
  if (!schedule.enabled) return problems;
  let anyDay = false;
  for (const day of WEEKDAYS) {
    const hours = schedule[day];
    if (!hours?.enabled) continue;
    anyDay = true;
    const start = parseHHmm(hours.start);
    const end = parseHHmm(hours.end);
    if (start === null || end === null) {
      problems.push({ day, message: 'Times must be HH:mm' });
      continue;
    }
    if (end <= start) problems.push({ day, message: 'End must be after start' });
    if (hours.break) {
      const bs = parseHHmm(hours.break.start);
      const be = parseHHmm(hours.break.end);
      if (bs === null || be === null) problems.push({ day, message: 'Break times must be HH:mm' });
      else if (be <= bs) problems.push({ day, message: 'Break end must be after its start' });
      else if (bs < start || be > end) problems.push({ day, message: 'The break must fall inside the working hours' });
    }
  }
  if (!anyDay) problems.push({ day: null, message: 'Enable at least one day, or turn the schedule off' });
  return problems;
}

/** The API input for a schedule; a null schedule writes `enabled: false`. */
export function scheduleInputOf(schedule: SpecialistSchedule | null | undefined): SpecialistScheduleInput {
  const day = (hours: SpecialistDayHours | null | undefined) =>
    hours
      ? {
          enabled: hours.enabled,
          start: hours.start,
          end: hours.end,
          break: hours.break ? { start: hours.break.start, end: hours.break.end } : null,
        }
      : null;
  if (!schedule) return { enabled: false };
  return {
    enabled: schedule.enabled,
    sun: day(schedule.sun),
    mon: day(schedule.mon),
    tue: day(schedule.tue),
    wed: day(schedule.wed),
    thu: day(schedule.thu),
    fri: day(schedule.fri),
    sat: day(schedule.sat),
  };
}

/** The full-replace input for a specialist, from the record (edit a copy, send it all). */
export function specialistInputOf(record: SpecialistRecord): SpecialistInfoInput {
  return {
    profile: {
      firstName: record.profile.firstName,
      lastName: record.profile.lastName ?? null,
      aboutInfo: record.profile.aboutInfo ?? null,
      logo: record.profile.logo?.id ?? null,
    },
    schedule: scheduleInputOf(record.schedule),
    goodsServices: record.services.map((s) => s.id),
  };
}

/** Same day-hours on two records (for "copy to all days" and change detection). */
export function sameDayHours(
  a: SpecialistDayHours | null | undefined,
  b: SpecialistDayHours | null | undefined,
): boolean {
  if (!a || !b) return !a && !b;
  return (
    a.enabled === b.enabled &&
    a.start === b.start &&
    a.end === b.end &&
    (a.break?.start ?? null) === (b.break?.start ?? null) &&
    (a.break?.end ?? null) === (b.break?.end ?? null)
  );
}

/**
 * "Mon–Fri 09:00–18:00", "Mon, Wed, Fri 08:00–14:00", "Mon–Fri 09:00–18:00 · Sat 10:00–14:00",
 * "No working hours". Days with identical hours group together (in week order,
 * a run of three or more prints as a range); a break is spelled out.
 */
export function scheduleSummary(schedule: SpecialistSchedule | null | undefined, weekStartsOn: number = 1): string {
  if (!schedule?.enabled) return 'No working hours';
  const order: Weekday[] = [];
  for (let i = 0; i < 7; i += 1) order.push(WEEKDAYS[(weekStartsOn + i) % 7]!);
  const groups: { days: Weekday[]; hours: SpecialistDayHours }[] = [];
  for (const day of order) {
    const hours = dayHours(schedule, day);
    if (!hours) continue;
    const group = groups.find((g) => sameDayHours(g.hours, hours));
    if (group) group.days.push(day);
    else groups.push({ days: [day], hours });
  }
  if (groups.length === 0) return 'No working hours';
  const consecutive = (days: Weekday[]) =>
    days.every((d, i) => i === 0 || order.indexOf(d) === order.indexOf(days[i - 1]!) + 1);
  const dayLabel = (days: Weekday[]) =>
    days.length >= 3 && consecutive(days)
      ? `${WEEKDAY_LABELS[days[0]!]}–${WEEKDAY_LABELS[days[days.length - 1]!]}`
      : days.map((d) => WEEKDAY_LABELS[d]).join(', ');
  const time = (text: string) => {
    const m = parseHHmm(text);
    return m === null ? text : formatHHmm(m);
  };
  const hoursLabel = (h: SpecialistDayHours) =>
    `${time(h.start)}–${time(h.end)}${h.break ? `, break ${time(h.break.start)}–${time(h.break.end)}` : ''}`;
  return groups.map((g) => `${dayLabel(g.days)} ${hoursLabel(g.hours)}`).join(' · ');
}
