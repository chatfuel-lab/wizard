/**
 * IANA time zones without a library: wall clock in a zone, zone → instant,
 * offsets, and the one ISO format the booking API needs.
 *
 * ## The API's reading of an offset — and why `toZoneIso` never writes `Z`
 *
 * The Chatfuel booking API reads a timestamp with a ZERO offset (`Z` or
 * `+00:00`) as a wall-clock time in the BOT's zone, and any NON-zero offset as
 * an instant. That is not this file's opinion; it is what the live probe
 * showed. So a module must always format in the bot's zone, with the zone's
 * REAL offset at that instant, and second precision:
 * `2026-03-08T09:30:00+01:00`. For a Berlin bot the two readings coincide (a
 * non-zero offset is an instant, and the instant's Berlin wall clock is what
 * we meant); for a UTC bot `+00:00` is read as bot wall clock — which is UTC
 * — so they coincide there too. `toISOString()` would print `Z` and lose the
 * offset the API needs to tell the two cases apart; that is the whole reason
 * this function exists.
 *
 * ## Honest limits
 *
 * - Everything is derived from `Intl.DateTimeFormat#formatToParts`, so the
 *   zone database is the engine's. `listTimeZones()` prefers
 *   `Intl.supportedValuesOf('timeZone')` and falls back to a fixed list of
 *   ~40 zones where that is missing (older Safari); the fallback is a picker
 *   list, not an authority — `isValidTimeZone` is.
 * - Offsets are exact to the SECOND (formatToParts gives seconds), which is
 *   the finest thing anyone can want; historic LMT offsets with sub-second
 *   parts do not exist in the range a booking calendar shows.
 * - `wallClockToInstant` is a two-pass resolver. A wall clock in a DST GAP
 *   (2026-03-08 02:30 in New York never happens) and one in a DST FOLD
 *   (2026-11-01 01:30 happens twice) are both decided explicitly, by option,
 *   and both are tested. The defaults — gap → move forward, fold → the
 *   earlier instant — are what Temporal calls `compatible`, and what every
 *   calendar app people have used does.
 * - `sameWallClock` compares OFFSETS at one instant, which is the question a
 *   caption is asking ("does the bot's clock read what mine reads right
 *   now?"), not zone identity. Berlin and Paris are the same wall clock;
 *   Berlin and London are not, even though a UTC bot and a London user agree
 *   all winter.
 */

import type { DayKey, Weekday } from './types';

export interface WallClock {
  year: number;
  /** 1–12. */
  month: number;
  /** 1–31. */
  day: number;
  /** 0–23. */
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday … 6 = Saturday. */
  weekday: Weekday;
  /** `YYYY-MM-DD` in the zone. */
  dayKey: DayKey;
  /** `hour * 60 + minute`. */
  minuteOfDay: number;
}

export interface WallClockInput {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
}

export interface ResolveOptions {
  /** A wall clock inside a spring-forward gap: shift to after it (default) or before. */
  gap?: 'forward' | 'backward';
  /** A wall clock inside a fall-back fold: the first occurrence (default) or the second. */
  fold?: 'earlier' | 'later';
}

const pad2 = (n: number): string => `${n}`.padStart(2, '0');
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

const WEEKDAY_INDEX: Record<string, Weekday> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/* One formatter per zone. Constructing an Intl.DateTimeFormat is the
   expensive step (hundreds of µs); formatting with one is cheap. A week view
   asks for a wall clock per event per render, so this matters. */
const PARTS_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = PARTS_FORMATTERS.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    });
    PARTS_FORMATTERS.set(timeZone, formatter);
  }
  return formatter;
}

export function isValidTimeZone(timeZone: string): boolean {
  if (typeof timeZone !== 'string' || timeZone === '') return false;
  try {
    partsFormatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** The runtime's zone — the USER's, in a browser. `UTC` when it cannot say. */
export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * The picker list where the engine has no `supportedValuesOf`. One or two
 * per major offset and every zone a Chatfuel bot has actually been seen in.
 */
export const FALLBACK_TIME_ZONES: readonly string[] = [
  'UTC',
  'Pacific/Honolulu',
  'America/Anchorage',
  'America/Los_Angeles',
  'America/Denver',
  'America/Phoenix',
  'America/Chicago',
  'America/Mexico_City',
  'America/Bogota',
  'America/Lima',
  'America/New_York',
  'America/Toronto',
  'America/Caracas',
  'America/Santiago',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'Atlantic/Azores',
  'Europe/London',
  'Europe/Lisbon',
  'Europe/Madrid',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Warsaw',
  'Europe/Athens',
  'Europe/Kyiv',
  'Europe/Istanbul',
  'Europe/Moscow',
  'Africa/Cairo',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'Africa/Nairobi',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Manila',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Perth',
  'Australia/Sydney',
  'Pacific/Auckland',
];

/** Every zone the engine knows, `Region/City` form, sorted; the fallback list otherwise. */
export function listTimeZones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  let zones: string[];
  try {
    zones = intl.supportedValuesOf ? intl.supportedValuesOf('timeZone') : [...FALLBACK_TIME_ZONES];
  } catch {
    zones = [...FALLBACK_TIME_ZONES];
  }
  /* `supportedValuesOf` omits plain UTC in some engines and includes it in
     others; a picker without UTC is missing the one zone every bot may be. */
  if (!zones.includes('UTC')) zones.push('UTC');
  return zones.filter((zone) => zone === 'UTC' || zone.includes('/')).sort();
}

/** `America/Argentina/Buenos_Aires` → `Buenos Aires`. */
export function zoneCityLabel(timeZone: string): string {
  const city = timeZone.split('/').pop() ?? timeZone;
  return city.replace(/_/g, ' ');
}

/** The wall clock reading in `timeZone` at the instant `at`. */
export function wallClockIn(at: number | Date, timeZone: string): WallClock {
  const ms = typeof at === 'number' ? at : at.getTime();
  const parts = partsFormatter(timeZone).formatToParts(new Date(ms));
  const read: Record<string, string> = {};
  for (const part of parts) read[part.type] = part.value;
  const year = Number(read.year);
  const month = Number(read.month);
  const day = Number(read.day);
  /* Some engines print midnight as "24" under h23 for a handful of zones. */
  const hour = Number(read.hour) % 24;
  const minute = Number(read.minute);
  const second = Number(read.second);
  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    weekday: WEEKDAY_INDEX[read.weekday ?? ''] ?? 0,
    dayKey: `${year}-${pad2(month)}-${pad2(day)}`,
    minuteOfDay: hour * 60 + minute,
  };
}

/**
 * The zone's UTC offset at `at`, in minutes, east positive: Berlin in summer
 * is +120, New York in winter is −300. Exact — derived from the wall clock,
 * not from a table.
 */
export function zoneOffsetMinutes(at: number | Date, timeZone: string): number {
  const ms = typeof at === 'number' ? at : at.getTime();
  const wall = wallClockIn(ms, timeZone);
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  /* Whole seconds: the wall clock has no milliseconds to compare against. */
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / MINUTE_MS);
}

/** `+02:00`, `-05:00`, `+05:30`; zero is `+00:00`, never `Z`. */
export function isoOffset(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? '-' : '+';
  const abs = Math.abs(offsetMinutes);
  return `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}

/** `UTC+2`, `UTC−5:30`, `UTC` — the human form for a picker row or a caption. */
export function offsetLabel(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'UTC';
  const sign = offsetMinutes < 0 ? '−' : '+';
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return `UTC${sign}${hours}${minutes === 0 ? '' : `:${pad2(minutes)}`}`;
}

/**
 * The instant at which `timeZone` reads `wall`.
 *
 * Two passes: guess the offset from the wall clock read as UTC, correct once,
 * then VERIFY by reading the candidates back — the verification is what turns
 * a gap and a fold from silent off-by-an-hour bugs into decided cases. The
 * offsets one day either side of the guess are sampled too, so both sides of
 * a transition are always among the candidates.
 */
export function wallClockToInstant(wall: WallClockInput, timeZone: string, options?: ResolveOptions): number {
  const hour = wall.hour ?? 0;
  const minute = wall.minute ?? 0;
  const second = wall.second ?? 0;
  const guess = Date.UTC(wall.year, wall.month - 1, wall.day, hour, minute, second);
  const offsets = new Set<number>([
    zoneOffsetMinutes(guess, timeZone),
    zoneOffsetMinutes(guess - DAY_MS, timeZone),
    zoneOffsetMinutes(guess + DAY_MS, timeZone),
  ]);
  const matches: number[] = [];
  const misses: number[] = [];
  for (const offset of offsets) {
    const candidate = guess - offset * MINUTE_MS;
    const read = wallClockIn(candidate, timeZone);
    const same =
      read.year === wall.year &&
      read.month === wall.month &&
      read.day === wall.day &&
      read.hour === hour &&
      read.minute === minute &&
      read.second === second;
    (same ? matches : misses).push(candidate);
  }
  if (matches.length === 1) return matches[0]!;
  if (matches.length > 1) {
    /* Fold: the same wall clock twice. Earlier = the smaller instant. */
    matches.sort((a, b) => a - b);
    return (options?.fold ?? 'earlier') === 'earlier' ? matches[0]! : matches[matches.length - 1]!;
  }
  /* Gap: no offset reproduces it. The candidate built with the PRE-transition
     offset lands after the jump (forward), the one built with the post-
     transition offset lands before it (backward). */
  misses.sort((a, b) => a - b);
  return (options?.gap ?? 'forward') === 'forward' ? misses[misses.length - 1]! : misses[0]!;
}

/**
 * `YYYY-MM-DDTHH:mm:ss±HH:MM` in `timeZone`, with the zone's real offset at
 * that instant. Second precision, never `Z` — see the file header for why
 * that is load-bearing and not a style choice.
 */
export function toZoneIso(at: number | Date, timeZone: string): string {
  const ms = typeof at === 'number' ? at : at.getTime();
  const wall = wallClockIn(ms, timeZone);
  const offset = zoneOffsetMinutes(ms, timeZone);
  return `${wall.year}-${pad2(wall.month)}-${pad2(wall.day)}T${pad2(wall.hour)}:${pad2(wall.minute)}:${pad2(
    wall.second,
  )}${isoOffset(offset)}`;
}

/** Do the two zones read the same time at `at`? Offsets, not identity. */
export function sameWallClock(zoneA: string, zoneB: string = localTimeZone(), at: number = Date.now()): boolean {
  if (zoneA === zoneB) return true;
  return zoneOffsetMinutes(at, zoneA) === zoneOffsetMinutes(at, zoneB);
}

const LABEL_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

/**
 * `Intl.DateTimeFormat` in a zone, with the formatter cached by its options.
 * The default is a short time (`09:30` / `9:30 AM` per locale).
 */
export function formatInZone(
  at: number | Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions & { locale?: string } = {},
): string {
  const { locale, ...rest } = options;
  const resolved: Intl.DateTimeFormatOptions =
    Object.keys(rest).length === 0 ? { hour: 'numeric', minute: '2-digit' } : rest;
  const key = `${locale ?? ''}|${timeZone}|${JSON.stringify(resolved)}`;
  let formatter = LABEL_FORMATTERS.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { ...resolved, timeZone });
    LABEL_FORMATTERS.set(key, formatter);
  }
  return formatter.format(typeof at === 'number' ? at : at.getTime());
}
