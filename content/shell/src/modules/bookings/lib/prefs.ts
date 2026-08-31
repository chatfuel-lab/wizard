/**
 * The handful of per-user preferences that are not a deep link:
 * which zone the calendar renders in, the week start, the last calendar
 * layout. Persisted as one JSON string in `currentUser.userStorageItem` (the
 * API's only persistence, per user); nothing here is shared with a teammate.
 *
 * Everything read back is untrusted: `parsePrefs` never throws, drops what it
 * cannot repair, and a shape change bumps the key so an old value reads as
 * "no prefs" rather than garbage. The URL, not this, carries the filter — a
 * filter is a link you send someone; a zone preference is not.
 */
import type { CalendarBy, CalendarColor, CalendarMode } from './bookingsParams';
import type { WeekStartsOn } from './calendarRange';

export const PREFS_KEY = 'chatfuel.bookings.prefs.v1';

export interface BookingsPrefs {
  /** Render times in the bot's zone (default) or the operator's. */
  zoneSource: 'bot' | 'local';
  weekStartsOn: WeekStartsOn | null;
  mode: CalendarMode | null;
  by: CalendarBy | null;
  color: CalendarColor | null;
}

export const DEFAULT_PREFS: BookingsPrefs = {
  zoneSource: 'bot',
  weekStartsOn: null,
  mode: null,
  by: null,
  color: null,
};

const oneOf = <T extends string>(raw: unknown, allowed: readonly T[]): T | null =>
  typeof raw === 'string' && allowed.includes(raw as T) ? (raw as T) : null;

export function parsePrefs(raw: string | null | undefined): BookingsPrefs {
  if (!raw) return DEFAULT_PREFS;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return DEFAULT_PREFS;
  }
  if (!value || typeof value !== 'object') return DEFAULT_PREFS;
  const v = value as Record<string, unknown>;
  const weekStartsOn =
    typeof v.weekStartsOn === 'number' && Number.isInteger(v.weekStartsOn) && v.weekStartsOn >= 0 && v.weekStartsOn <= 6
      ? (v.weekStartsOn as WeekStartsOn)
      : null;
  return {
    zoneSource: oneOf(v.zoneSource, ['bot', 'local'] as const) ?? 'bot',
    weekStartsOn,
    mode: oneOf(v.mode, ['day', 'week', 'month'] as const),
    by: oneOf(v.by, ['time', 'specialist'] as const),
    color: oneOf(v.color, ['specialist', 'status'] as const),
  };
}

export function serializePrefs(prefs: BookingsPrefs): string {
  return JSON.stringify(prefs);
}

export function samePrefs(a: BookingsPrefs, b: BookingsPrefs): boolean {
  return serializePrefs(a) === serializePrefs(b);
}
