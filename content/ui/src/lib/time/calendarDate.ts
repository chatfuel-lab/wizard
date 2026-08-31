/**
 * Civil-calendar arithmetic on day keys.
 *
 * A DayKey is `YYYY-MM-DD` — a date with no zone, no time and no `Date`
 * object behind it. Every function here is integer arithmetic on the proleptic
 * Gregorian calendar (the days-from-civil algorithm), which is the point:
 * a `Date` is an instant, and stepping an instant by 86_400_000 ms crosses a
 * DST change 23 or 25 hours later and lands on the wrong day twice a year.
 * `setDate()` avoids that trap in local time but only in local time; a
 * calendar that shows the BOT's days (Berlin) to a user in Mexico City cannot
 * ask the local clock which day comes next. Keys can.
 *
 * Where a `Date` genuinely enters — "which key is today", "what does the user's
 * locale think the week starts on" — the function says so in its signature and
 * takes the zone or locale as an argument rather than reading a global.
 *
 * `monthMatrix` is ALWAYS 6×7 = 42 keys. A month grid that is five rows one
 * month and six the next moves every row below it when the user pages, and
 * the day cell under the pointer changes identity mid-click. Fixed height is
 * the price of a stable grid, and every calendar worth copying pays it.
 */

import { wallClockIn } from './timezone';
import type { DayKey, Weekday } from './types';

export type { DayKey, Weekday } from './types';

/** `YYYY-MM`. */
export type MonthKey = string;

export interface CivilDate {
  year: number;
  /** 1–12. */
  month: number;
  /** 1–31. */
  day: number;
}

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_KEY = /^(\d{4})-(\d{2})$/;

const pad2 = (n: number): string => `${n}`.padStart(2, '0');

/** Days since 1970-01-01 for a civil date. Howard Hinnant's algorithm. */
function daysFromCivil(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = (month + 9) % 12;
  const doy = Math.floor((153 * mp + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

function civilFromDays(days: number): CivilDate {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  return { year: month <= 2 ? y + 1 : y, month, day };
}

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** Strict: the shape AND the calendar have to agree — `2026-02-30` is null. */
export function parseDayKey(key: string): CivilDate | null {
  const match = DAY_KEY.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

export function isDayKey(value: string): boolean {
  return parseDayKey(value) !== null;
}

export function formatDayKey(date: CivilDate): DayKey {
  return `${date.year}-${pad2(date.month)}-${pad2(date.day)}`;
}

/**
 * The key of a `Date`. LOCAL by default; pass a zone to ask "which day is it
 * in Berlin right now" — the question a bot-zone calendar asks for `today`.
 */
export function dayKeyOf(date: Date | number, timeZone?: string): DayKey {
  const at = typeof date === 'number' ? date : date.getTime();
  if (!Number.isFinite(at)) return '';
  if (timeZone) return wallClockIn(at, timeZone).dayKey;
  const d = new Date(at);
  return formatDayKey({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() });
}

/** Local midnight of a key — for handing to `Intl` formatters and nothing else. */
export function dateOfDayKey(key: DayKey): Date | null {
  const civil = parseDayKey(key);
  return civil ? new Date(civil.year, civil.month - 1, civil.day) : null;
}

/** Days since the epoch — the integer every comparison below is done in. */
export function dayNumberOf(key: DayKey): number {
  const civil = parseDayKey(key);
  if (!civil) return Number.NaN;
  return daysFromCivil(civil.year, civil.month, civil.day);
}

export function dayKeyOfNumber(days: number): DayKey {
  return formatDayKey(civilFromDays(days));
}

/** `shiftDayKey('2026-02-28', 1)` → `2026-03-01`. Bad key → ''. */
export function shiftDayKey(key: DayKey, days: number): DayKey {
  const n = dayNumberOf(key);
  return Number.isNaN(n) ? '' : dayKeyOfNumber(n + days);
}

/** Signed distance in days, `to − from`. */
export function diffDays(from: DayKey, to: DayKey): number {
  return dayNumberOf(to) - dayNumberOf(from);
}

export function compareDayKeys(a: DayKey, b: DayKey): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * The `Date` version, for the few call sites that hold a Date: local
 * calendar stepping via setDate — the DST-safe way to step a local Date.
 * Returns a NEW Date; the argument is not touched.
 */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(key: DayKey): Weekday {
  const n = dayNumberOf(key);
  /* 1970-01-01 was a Thursday (4). */
  return ((((n + 4) % 7) + 7) % 7) as Weekday;
}

/** The key of the first day of the week containing `key`. */
export function startOfWeek(key: DayKey, weekStartsOn: Weekday = 1): DayKey {
  const back = (weekdayOf(key) - weekStartsOn + 7) % 7;
  return shiftDayKey(key, -back);
}

/** Seven keys starting at `startKey` — call it on `startOfWeek(...)`. */
export function weekDays(startKey: DayKey): DayKey[] {
  const keys: DayKey[] = [];
  for (let i = 0; i < 7; i += 1) keys.push(shiftDayKey(startKey, i));
  return keys;
}

/** The seven weekdays in display order for a given first day. */
export function weekdayOrder(weekStartsOn: Weekday): Weekday[] {
  const order: Weekday[] = [];
  for (let i = 0; i < 7; i += 1) order.push(((weekStartsOn + i) % 7) as Weekday);
  return order;
}

export function monthKeyOf(key: DayKey): MonthKey {
  return key.slice(0, 7);
}

export function parseMonthKey(key: MonthKey): { year: number; month: number } | null {
  const match = MONTH_KEY.exec(key);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year: Number(match[1]), month };
}

export function formatMonthKey(year: number, month: number): MonthKey {
  return `${year}-${pad2(month)}`;
}

/** `addMonths('2026-12', 1)` → `2027-01`. Bad key → ''. */
export function addMonths(key: MonthKey, months: number): MonthKey {
  const parsed = parseMonthKey(key);
  if (!parsed) return '';
  const index = parsed.year * 12 + (parsed.month - 1) + months;
  return formatMonthKey(Math.floor(index / 12), (((index % 12) + 12) % 12) + 1);
}

/** First and last day keys of a month. */
export function monthBounds(key: MonthKey): { first: DayKey; last: DayKey } | null {
  const parsed = parseMonthKey(key);
  if (!parsed) return null;
  return {
    first: formatDayKey({ year: parsed.year, month: parsed.month, day: 1 }),
    last: formatDayKey({ year: parsed.year, month: parsed.month, day: daysInMonth(parsed.year, parsed.month) }),
  };
}

/**
 * The 42 keys of a month grid — six rows of seven, always, starting on the
 * `weekStartsOn` at or before the 1st. Days outside the month are real keys
 * of the neighbouring months (a click on them is a click on that day); the
 * caller greys them with `monthKeyOf(key) !== monthKey`.
 */
export function monthMatrix(key: MonthKey, weekStartsOn: Weekday = 1): DayKey[] {
  const bounds = monthBounds(key);
  if (!bounds) return [];
  const start = startOfWeek(bounds.first, weekStartsOn);
  const keys: DayKey[] = [];
  for (let i = 0; i < 42; i += 1) keys.push(shiftDayKey(start, i));
  return keys;
}

/**
 * The locale's first day of the week, via `Intl.Locale.prototype.weekInfo`
 * (`getWeekInfo()` in newer engines). Falls back to Monday — the ISO week —
 * where the engine has neither, rather than to Sunday: the fallback is
 * reached in old runtimes and tests, and the product's bots are overwhelmingly
 * outside the US.
 */
export function weekStartsOnFor(locale?: string): Weekday {
  try {
    const tag = locale ?? (typeof navigator === 'undefined' ? 'en-US' : navigator.language);
    const info = new Intl.Locale(tag) as Intl.Locale & {
      weekInfo?: { firstDay?: number };
      getWeekInfo?: () => { firstDay?: number };
    };
    const firstDay = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay;
    if (typeof firstDay !== 'number' || firstDay < 1 || firstDay > 7) return 1;
    /* Intl counts Monday=1 … Sunday=7; Date counts Sunday=0 … Saturday=6. */
    return (firstDay % 7) as Weekday;
  } catch {
    return 1;
  }
}

/**
 * Bucket items by the key their `keyOf` returns, preserving item order inside
 * each bucket and returning buckets in ascending key order — the shape a
 * day-grouped agenda renders straight from. Items whose key is '' are
 * dropped: an unplaceable item has no row to be in.
 */
export function groupByDayKey<T>(items: readonly T[], keyOf: (item: T) => DayKey): { key: DayKey; items: T[] }[] {
  const buckets = new Map<DayKey, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    if (!key) continue;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => compareDayKeys(a, b))
    .map(([key, bucketItems]) => ({ key, items: bucketItems }));
}
