/**
 * Scheduled-message time helpers — the UTC/weekday-shift contract from the
 * schema docstrings (see also chatfuel-core references/misc.md):
 *
 * - firstSendTime is stored in UTC. The user picks a LOCAL date+time.
 * - The weekdays list is stored in UTC terms too: when the local->UTC
 *   conversion moves the calendar day, the user's selected weekdays must be
 *   shifted the same way before sending (correctedWeekdays), and shifted
 *   back for display.
 * - correctedWeekdays must accompany EVERY SetFirstSendTime call while the
 *   stored list is non-empty, regardless of the current repeatType.
 */
import { Weekday } from '~api/generated/flow-builder/graphql';

/** Schema enum order Sun..Sat — index math below relies on it. */
const ORDER: readonly Weekday[] = [
  Weekday.Sun,
  Weekday.Mon,
  Weekday.Tue,
  Weekday.Wed,
  Weekday.Thu,
  Weekday.Fri,
  Weekday.Sat,
];

/**
 * Day-of-week delta between the LOCAL calendar day and the UTC calendar day
 * of the same instant: +1 when local is a day ahead of UTC, -1 when behind.
 */
export function localUtcDayShift(instant: Date): -1 | 0 | 1 {
  const localDay = instant.getDay();
  const utcDay = instant.getUTCDay();
  if (localDay === utcDay) return 0;
  // Wrap-aware: (local - utc) mod 7 is either 1 or 6 (i.e. -1).
  return (localDay - utcDay + 7) % 7 === 1 ? 1 : -1;
}

function shiftWeekday(day: Weekday, by: number): Weekday {
  const index = ORDER.indexOf(day);
  return ORDER[(index + by + 7 * 2) % 7] as Weekday;
}

/**
 * User-selected (local) weekdays -> the list to SEND. Local a day ahead of
 * UTC => the UTC instant falls on the previous day => shift LEFT (Mon->Sun);
 * local behind => shift RIGHT — literally the schema docstring, inverted to
 * the send direction.
 */
export function toCorrectedWeekdays(selected: readonly Weekday[], firstSendTime: Date): Weekday[] {
  const shift = localUtcDayShift(firstSendTime);
  return selected.map((day) => shiftWeekday(day, -shift));
}

/** Stored (UTC-corrected) weekdays -> what to DISPLAY as the user's picks. */
export function toDisplayWeekdays(stored: readonly Weekday[], firstSendTime: Date): Weekday[] {
  const shift = localUtcDayShift(firstSendTime);
  return stored.map((day) => shiftWeekday(day, shift));
}

/** `<input type="datetime-local">` value -> UTC ISO string for Time vars. */
export function localInputToUtcIso(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(value); // datetime-local parses in the local zone
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** UTC Time scalar -> `<input type="datetime-local">` value (local zone). */
export function utcIsoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}` +
    `T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
  );
}

export const ALL_WEEKDAYS = ORDER;
