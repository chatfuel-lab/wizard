/**
 * Instants and counts as the list prints them, in one zone.
 */
import { wallClock } from './zone';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

/** `7 Sep, 09:00` — the year only when it is not this one. */
export function formatInstant(at: number, zone: string, now: number = Date.now()): string {
  const w = wallClock(at, zone);
  const thisYear = wallClock(now, zone).year === w.year;
  const day = `${w.day} ${MONTHS[w.month - 1]}${thisYear ? '' : ` ${w.year}`}`;
  return `${day}, ${pad(w.hour)}:${pad(w.minute)}`;
}

export function formatDay(at: number, zone: string, now: number = Date.now()): string {
  const w = wallClock(at, zone);
  const thisYear = wallClock(now, zone).year === w.year;
  return `${w.day} ${MONTHS[w.month - 1]}${thisYear ? '' : ` ${w.year}`}`;
}

export const formatCount = (n: number | null | undefined): string =>
  n === null || n === undefined ? '—' : new Intl.NumberFormat('en-US').format(n);
