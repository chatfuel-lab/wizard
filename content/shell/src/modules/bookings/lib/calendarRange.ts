/**
 * Which days a view shows, and the instants those days become on the wire.
 *
 * `bookingsV2` has no pagination, filter or sort — it answers with every
 * booking overlapping `[startTime, endTime)`. So the honest strategy is to ask
 * for exactly the window a view renders and to grow it in bounded chunks when
 * a list wants more:
 *
 *   calendar   day  → [d, d+1)         week → [weekStart, +7)
 *              month → the 6-week grid the month view draws, [gridStart, +42)
 *   appointments upcoming → [today, +90d) growing by 90-day chunks
 *                past     → [today−30d, today+1) growing backwards by 30 days
 *                custom   → [from, to] capped at MAX_RANGE_DAYS
 *   insights   its period, same cap
 *
 * Days are keys (`YYYY-MM-DD`) — a date, not an instant — and only become
 * instants at the edge, in the DISPLAY zone's midnight, formatted with the
 * BOT zone's offset (see `zone.ts` for why the offset matters).
 */
import type { CalendarMode, InsightsPeriod } from './bookingsParams';
import { parseDayKey, shiftDayKey, startOfDayInZone, toZoneIso, weekdayOfKey } from './zone';

/** 0 = Sunday … 6 = Saturday, like `Date#getDay`. */
export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const DEFAULT_WEEK_STARTS_ON: WeekStartsOn = 1;

/** Half-open day range: `endKey` is the first day NOT shown. */
export interface DayRange {
  startKey: string;
  endKey: string;
}

export const UPCOMING_CHUNK_DAYS = 90;
export const PAST_CHUNK_DAYS = 30;
export const MAX_RANGE_DAYS = 366;

export function startOfWeekKey(dayKey: string, weekStartsOn: WeekStartsOn): string {
  const back = (weekdayOfKey(dayKey) - weekStartsOn + 7) % 7;
  return shiftDayKey(dayKey, -back);
}

export function firstOfMonthKey(dayKey: string): string {
  const p = parseDayKey(dayKey);
  if (!p) return dayKey;
  return `${p[0]}-${String(p[1]).padStart(2, '0')}-01`;
}

/** The first cell of the 6×7 grid that shows the month containing `dayKey`. */
export function monthGridStart(dayKey: string, weekStartsOn: WeekStartsOn): string {
  return startOfWeekKey(firstOfMonthKey(dayKey), weekStartsOn);
}

export function rangeForMode(mode: CalendarMode, anchorKey: string, weekStartsOn: WeekStartsOn): DayRange {
  switch (mode) {
    case 'day':
      return { startKey: anchorKey, endKey: shiftDayKey(anchorKey, 1) };
    case 'week': {
      const start = startOfWeekKey(anchorKey, weekStartsOn);
      return { startKey: start, endKey: shiftDayKey(start, 7) };
    }
    case 'month': {
      const start = monthGridStart(anchorKey, weekStartsOn);
      return { startKey: start, endKey: shiftDayKey(start, 42) };
    }
  }
}

export function daysOf(range: DayRange): string[] {
  const out: string[] = [];
  for (let key = range.startKey; key < range.endKey && out.length < 400; key = shiftDayKey(key, 1)) out.push(key);
  return out;
}

export function rangeLength(range: DayRange): number {
  return daysOf(range).length;
}

/** Number of days in `month` (1-based) of `year`. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Same day next/previous month, clamped to that month's length. */
export function shiftMonthKey(dayKey: string, months: number): string {
  const p = parseDayKey(dayKey);
  if (!p) return dayKey;
  const total = p[1] - 1 + months;
  const year = p[0] + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12; // 0..11
  const day = Math.min(p[2], daysInMonth(year, month + 1));
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Prev/next for the calendar toolbar and the `[` `]` keys. */
export function stepAnchor(mode: CalendarMode, anchorKey: string, delta: -1 | 1): string {
  switch (mode) {
    case 'day':
      return shiftDayKey(anchorKey, delta);
    case 'week':
      return shiftDayKey(anchorKey, 7 * delta);
    case 'month':
      return shiftMonthKey(anchorKey, delta);
  }
}

export interface RangeVars {
  startTime: string;
  endTime: string;
}

/**
 * The instants a day range spans in the display zone, formatted with the bot
 * zone's offset. Query key = these two strings, so identical ranges compare
 * equal by value.
 */
export function rangeVars(range: DayRange, displayZone: string, botZone: string): RangeVars {
  return {
    startTime: toZoneIso(startOfDayInZone(range.startKey, displayZone), botZone),
    endTime: toZoneIso(startOfDayInZone(range.endKey, displayZone), botZone),
  };
}

export function sameRangeVars(a: RangeVars | null, b: RangeVars | null): boolean {
  return a?.startTime === b?.startTime && a?.endTime === b?.endTime;
}

/** Appointments "upcoming": today forwards, `chunks` × 90 days. */
export function upcomingRange(todayKey: string, chunks: number): DayRange {
  return { startKey: todayKey, endKey: shiftDayKey(todayKey, UPCOMING_CHUNK_DAYS * Math.max(1, chunks)) };
}

/** Appointments "past": `chunks` × 30 days back, through the end of today (the view hides what has not happened yet). */
export function pastRange(todayKey: string, chunks: number): DayRange {
  return { startKey: shiftDayKey(todayKey, -PAST_CHUNK_DAYS * Math.max(1, chunks)), endKey: shiftDayKey(todayKey, 1) };
}

/** `[from, to]` inclusive of both days, capped at MAX_RANGE_DAYS; a missing or inverted pair falls back to the month of `todayKey`. */
export function customRange(
  from: string | null,
  to: string | null,
  todayKey: string,
): { range: DayRange; capped: boolean } {
  let start = from && parseDayKey(from) ? from : null;
  let end = to && parseDayKey(to) ? to : null;
  if (!start && !end) {
    start = firstOfMonthKey(todayKey);
    end = shiftDayKey(shiftMonthKey(start, 1), -1);
  } else if (!start) start = shiftDayKey(end!, -29);
  else if (!end) end = shiftDayKey(start, 29);
  if (end! < start!) [start, end] = [end, start];
  const endExclusive = shiftDayKey(end!, 1);
  const length = rangeLength({ startKey: start!, endKey: endExclusive });
  if (length > MAX_RANGE_DAYS)
    return { range: { startKey: start!, endKey: shiftDayKey(start!, MAX_RANGE_DAYS) }, capped: true };
  return { range: { startKey: start!, endKey: endExclusive }, capped: false };
}

/** The insights window for a period. `week`/`month` are the current ones; `30d`/`90d` end today. */
export function periodRange(
  period: InsightsPeriod,
  todayKey: string,
  weekStartsOn: WeekStartsOn,
  from: string | null,
  to: string | null,
): DayRange {
  switch (period) {
    case 'week':
      return rangeForMode('week', todayKey, weekStartsOn);
    case 'month': {
      const start = firstOfMonthKey(todayKey);
      return { startKey: start, endKey: shiftMonthKey(start, 1) };
    }
    case '30d':
      return { startKey: shiftDayKey(todayKey, -29), endKey: shiftDayKey(todayKey, 1) };
    case '90d':
      return { startKey: shiftDayKey(todayKey, -89), endKey: shiftDayKey(todayKey, 1) };
    case 'custom':
      return customRange(from, to, todayKey).range;
  }
}

/** True when a `[startTime, endTime)` booking overlaps the range's instants. */
export function overlapsInstants(
  bookingStart: number,
  bookingEnd: number,
  rangeStart: number,
  rangeEnd: number,
): boolean {
  return bookingStart < rangeEnd && bookingEnd > rangeStart;
}

/**
 * The locale's first day of the week via `Intl.Locale` weekInfo (Chrome/Safari
 * ship it; Firefox behind a flag), falling back to Monday. A preference in
 * `lib/prefs.ts` overrides it.
 */
export function weekStartsOnFor(locale?: string, fallback: WeekStartsOn = DEFAULT_WEEK_STARTS_ON): WeekStartsOn {
  try {
    const tag = locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en');
    const loc = new Intl.Locale(tag) as Intl.Locale & {
      getWeekInfo?: () => { firstDay?: number };
      weekInfo?: { firstDay?: number };
    };
    const info = loc.getWeekInfo?.() ?? loc.weekInfo;
    const first = info?.firstDay;
    if (typeof first === 'number' && first >= 1 && first <= 7) return (first % 7) as WeekStartsOn; // 7 (Sunday) → 0
  } catch {
    /* fall through */
  }
  return fallback;
}
