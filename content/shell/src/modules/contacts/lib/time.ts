/** Time words the whole module agrees on. */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
/** One day in milliseconds — the unit every window and "days ago" sum uses. */
export const DAY = 24 * HOUR;

/** `HH:MM` today, `MMM D` this year, `MMM D, YYYY` before that. */
export function shortTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '—';
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return '—';
  const date = new Date(time);
  const today = new Date(now);
  if (date.toDateString() === today.toDateString()) {
    return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date);
  }
  if (date.getFullYear() === today.getFullYear()) {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

/**
 * "3 days ago". Coarse on purpose: the API's timestamps are the only history
 * this module has, and a precise-looking "2 h 14 m" would suggest a resolution
 * the data does not carry.
 */
export function ago(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'never';
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return 'never';
  const delta = Math.max(0, now - time);
  if (delta < MINUTE) return 'just now';
  if (delta < HOUR) return `${Math.floor(delta / MINUTE)} min ago`;
  if (delta < DAY) return `${Math.floor(delta / HOUR)} h ago`;
  const days = Math.floor(delta / DAY);
  if (days < 30) return `${days} d ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months} mo ago` : `${Math.floor(months / 12)} y ago`;
}

/** An ISO instant as a `<input type="date">` value, in local time. */
export function toDateInput(iso: string | null): string {
  if (!iso) return '';
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return '';
  const date = new Date(time);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
