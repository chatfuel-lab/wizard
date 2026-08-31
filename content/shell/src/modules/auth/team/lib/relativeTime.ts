/**
 * "3 days ago" / "in 2 hours" for the Joined / Expires column. The exact
 * instant rides along as the cell's `title` — this is the glanceable half.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

let rtf: Intl.RelativeTimeFormat | null = null;
const format = (value: number, unit: Intl.RelativeTimeFormatUnit): string => {
  rtf ??= new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  return rtf.format(value, unit);
};

/** Relative phrase for `iso` seen from `now`. Invalid input → the raw string. */
export function relativeTime(iso: string, now: Date | number = Date.now()): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  const nowMs = typeof now === 'number' ? now : now.getTime();
  const diff = t - nowMs;
  const abs = Math.abs(diff);
  if (abs < MINUTE) return diff <= 0 ? 'just now' : 'in a moment';
  if (abs < HOUR) return format(Math.round(diff / MINUTE), 'minute');
  if (abs < DAY) return format(Math.round(diff / HOUR), 'hour');
  if (abs < 30 * DAY) return format(Math.round(diff / DAY), 'day');
  if (abs < 365 * DAY) return format(Math.round(diff / (30 * DAY)), 'month');
  return format(Math.round(diff / (365 * DAY)), 'year');
}

/** For a `title` attribute: the instant in the reader's locale, or the raw string. */
export function absoluteTime(iso: string): string {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleString() : iso;
}
