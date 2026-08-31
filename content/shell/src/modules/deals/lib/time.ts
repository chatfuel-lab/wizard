const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * Compact age for a card: "now", "4h", "3d", "5w".
 *
 * `now` is a parameter so the board reads the clock once per render — every
 * card then agrees, and the function stays testable without faking timers.
 * Anything unreadable returns "", never "NaNd".
 */
export function ageLabel(iso: string | null | undefined, now: number): string {
  if (!iso) return '';
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return '';
  const delta = now - at;
  if (delta < MINUTE) return 'now';
  if (delta < HOUR) return `${Math.floor(delta / MINUTE)}m`;
  if (delta < DAY) return `${Math.floor(delta / HOUR)}h`;
  if (delta < WEEK) return `${Math.floor(delta / DAY)}d`;
  return `${Math.floor(delta / WEEK)}w`;
}
