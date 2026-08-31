/**
 * Wall-clock ↔ instant maths for one IANA zone, on nothing but `Intl`.
 *
 * Why the module carries this at all: the booking API is zone-sensitive in a
 * way the SDL does not say.
 *
 * - `Time` inputs with a **zero offset** (`Z`, `+00:00`) are read as the bot's
 *   wall clock rather than as an instant. Any non-zero offset is honoured as
 *   an instant.
 * - Specialist schedules and availability periods are `HH:mm` in the bot's
 *   zone, and availability subtracts bookings by the wall clock of the stored
 *   string.
 *
 * So the module formats every instant it SENDS with the bot zone's real offset
 * (`toZoneIso`) — the one framing under which storage, echo, schedules and
 * availability agree — and converts what it RENDERS with `wallClock`.
 *
 * What is exact and what is not: `Intl.DateTimeFormat` with a `timeZone` is a
 * tz database, so instant → wall clock is exact for any zone at any instant,
 * DST included. The one inexact direction is wall clock → instant across a
 * DST gap or fold; `zonedInstant` resolves a gap the way `Date` does locally
 * (the instant the zone actually shows) and a fold to the earlier instant.
 *
 * Every function is pure; the tests pin Mexico City (no DST since 2022),
 * Berlin (DST) and New York's 2026 gap/fold.
 */

/**
 * How often "now" moves everywhere it is read — the now-line, "today", the
 * upcoming/past split, the wizard's past-slot cutoff. A booking crossing from
 * upcoming to past a minute late is fine; a re-render per second is not.
 */
export const NOW_TICK_MS = 60_000;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(tz: string): Intl.DateTimeFormat {
  let f = formatterCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    });
    formatterCache.set(tz, f);
  }
  return f;
}

export function isValidZone(tz: string | null | undefined): tz is string {
  if (!tz) return false;
  try {
    partsFormatter(tz);
    return true;
  } catch {
    return false;
  }
}

export function localZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export interface WallClock {
  year: number;
  month: number; // 1..12
  day: number; // 1..31
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday … 6 = Saturday, in the zone. */
  weekday: number;
  /** `YYYY-MM-DD` in the zone. */
  dayKey: string;
  /** Minutes since the zone's midnight (0..1439). */
  minuteOfDay: number;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n: number) => String(n).padStart(2, '0');

/** The zone's wall clock at an instant. Exact. */
export function wallClock(at: number, tz: string): WallClock {
  const parts = partsFormatter(tz).formatToParts(new Date(at));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = Number(get('day'));
  // Some engines print "24" for midnight under h23 on very old ICU; normalise.
  const hour = Number(get('hour')) % 24;
  const minute = Number(get('minute'));
  const second = Number(get('second'));
  const weekday = Math.max(0, WEEKDAYS.indexOf(get('weekday')));
  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    weekday,
    dayKey: `${year}-${pad(month)}-${pad(day)}`,
    minuteOfDay: hour * 60 + minute,
  };
}

/** The zone's UTC offset in minutes at an instant (east positive). Exact. */
export function zoneOffsetMinutes(tz: string, at: number): number {
  const w = wallClock(at, tz);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  // `at` may carry sub-second millis the wall clock dropped; round to the minute.
  return Math.round((asUtc - Math.floor(at / 1000) * 1000) / 60_000);
}

export function offsetLabel(tz: string, at: number): string {
  const total = zoneOffsetMinutes(tz, at);
  const sign = total < 0 ? '−' : '+';
  const abs = Math.abs(total);
  return `GMT${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/**
 * RFC3339 with the ZONE's real offset, second precision, never `Z`.
 * The API reads a zero offset as bot wall clock and any other offset as an
 * instant; formatting in the bot zone makes the two readings coincide even for
 * a UTC bot (`+00:00` = bot wall clock there).
 */
export function toZoneIso(at: number, tz: string): string {
  const w = wallClock(at, tz);
  const total = zoneOffsetMinutes(tz, at);
  const sign = total < 0 ? '-' : '+';
  const abs = Math.abs(total);
  return `${w.dayKey}T${pad(w.hour)}:${pad(w.minute)}:${pad(w.second)}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Strict `YYYY-MM-DD` → [year, month, day] or null (round-trips only real dates). */
export function parseDayKey(key: string | null | undefined): [number, number, number] | null {
  if (!key) return null;
  const m = DAY_KEY.exec(key);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) return null;
  return [y, mo, d];
}

/** Calendar arithmetic on a day key, zone-free (a key is a date, not an instant). */
export function shiftDayKey(key: string, days: number): string {
  const p = parseDayKey(key);
  if (!p) return key;
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + days));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** 0 = Sunday … 6 = Saturday for a day key. */
export function weekdayOfKey(key: string): number {
  const p = parseDayKey(key);
  if (!p) return 0;
  return new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
}

/**
 * The instant at which the zone shows `dayKey` at `minuteOfDay`.
 * Two passes: guess UTC, subtract the offset at the guess, re-resolve. Across
 * a DST gap the wall clock does not exist and the result is what the zone
 * actually shows (like `new Date(y,m,d,h)` locally); across a fold the earlier.
 */
export function zonedInstant(dayKey: string, minuteOfDay: number, tz: string): number {
  const p = parseDayKey(dayKey);
  if (!p) return NaN;
  const guess = Date.UTC(p[0], p[1] - 1, p[2], 0, minuteOfDay, 0);
  const first = guess - zoneOffsetMinutes(tz, guess) * 60_000;
  const second = guess - zoneOffsetMinutes(tz, first) * 60_000;
  const wanted = `${dayKey}:${minuteOfDay}`;
  const shows = (at: number) => {
    const w = wallClock(at, tz);
    return `${w.dayKey}:${w.minuteOfDay}` === wanted;
  };
  // A fold: both candidates show the wall clock — take the earlier. A gap:
  // neither does — take the later, which is what the zone jumped forward to.
  const matches = [first, second].filter(shows);
  if (matches.length > 0) return Math.min(...matches);
  return Math.max(first, second);
}

export function dayKeyInZone(at: number, tz: string): string {
  return wallClock(at, tz).dayKey;
}

/** The zone's midnight starting `dayKey`, as an instant. */
export function startOfDayInZone(dayKey: string, tz: string): number {
  return zonedInstant(dayKey, 0, tz);
}

/** True when the two zones show the same wall clock right now (offset equal). */
export function sameWallClock(a: string, b: string, at: number): boolean {
  return zoneOffsetMinutes(a, at) === zoneOffsetMinutes(b, at);
}

/**
 * The bot's `Intl.DateTimeFormat`-valid zone or null. `bot.timezone` is a free
 * scalar; a bot that never set one, or set an alias `Intl` rejects, renders in
 * the operator's zone with a caption saying so.
 */
export function usableBotZone(botZone: string | null | undefined): string | null {
  return isValidZone(botZone) ? botZone : null;
}
