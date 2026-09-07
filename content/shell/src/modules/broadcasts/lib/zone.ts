/**
 * Wall-clock ↔ instant maths for one IANA zone, on nothing but `Intl`.
 *
 * A copy of the bookings module's `lib/zone.ts` — a module may not import
 * another module's source — kept byte-for-byte where the two agree.
 *
 * Why this module carries it: a campaign is scheduled in the BOT's zone. The
 * flow API stores every time as a UTC instant and says nothing about zones,
 * so the person picking "Tuesday at 9:00" is picking it on the bot's wall
 * clock, and the weekday list a repeating campaign stores is UTC-normalised —
 * the shift between the two is the bot zone's offset at that instant, which
 * is what `lib/schedule.ts` computes with `wallClock`.
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
 * How often "now" moves everywhere it is read — the next-send column, "today"
 * in the date picker, the past-time check. A campaign crossing from scheduled
 * to sending a minute late is fine; a re-render per second is not.
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

/**
 * The bot's `Intl.DateTimeFormat`-valid zone or null. `bot.timezone` is a free
 * scalar; a bot that never set one, or set an alias `Intl` rejects, schedules
 * in the operator's own zone instead.
 */
export function usableBotZone(botZone: string | null | undefined): string | null {
  return isValidZone(botZone) ? botZone : null;
}
