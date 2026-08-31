/**
 * What the appointments list asks for, and how it says what it has.
 *
 * `bookingsV2(startTime, endTime)` has no pagination — the only way to "load
 * more" is to ask for a bigger window. So the list grows in bounded CHUNKS
 * (`lib/calendarRange.ts`: 90 days forward for upcoming, 30 days back for
 * past, a 366-day cap for a custom pair) and prints its coverage next to the
 * button that widens it: "120 loaded · Aug 17 – Nov 14 · Load 90 more days".
 * Nothing here pretends to be a page of an infinite list.
 *
 * Upcoming and past split ON `now`, not on today's key: a booking that ended
 * an hour ago is past even though it is today, and one that starts tonight is
 * upcoming. Both tabs' windows overlap on today for that reason. Pure; the
 * view supplies `now` from a minute tick.
 */
import { formatShortDay, type FormatOptions } from './appointmentsColumns';
import type { AppointmentsRange } from './bookingsParams';
import {
  customRange,
  MAX_RANGE_DAYS,
  PAST_CHUNK_DAYS,
  pastRange,
  rangeLength,
  UPCOMING_CHUNK_DAYS,
  upcomingRange,
  type DayRange,
} from './calendarRange';
import { parseDayKey, shiftDayKey } from './zone';

export interface ListWindow {
  range: DayRange;
  /** True when a custom pair was longer than `MAX_RANGE_DAYS` and got cut. */
  capped: boolean;
}

/** The window one tab asks for at `chunks` (≥ 1). */
export function listWindow(
  tab: AppointmentsRange,
  todayKey: string,
  chunks: number,
  from: string | null,
  to: string | null,
): ListWindow {
  switch (tab) {
    case 'upcoming':
      return { range: upcomingRange(todayKey, chunks), capped: false };
    case 'past':
      return { range: pastRange(todayKey, chunks), capped: false };
    case 'custom':
      return customRange(from, to, todayKey);
  }
}

/** Which side of `now` a tab shows. Custom shows the whole window. */
export function inTab<T extends { endTime: string }>(records: readonly T[], tab: AppointmentsRange, now: number): T[] {
  if (tab === 'custom') return [...records];
  return records.filter((r) => {
    const end = new Date(r.endTime).getTime();
    return tab === 'upcoming' ? end >= now : end < now;
  });
}

/** `Aug 17 – Nov 14`, or `Aug 1 – 31` inside one month — the loaded window as people read it (inclusive last day). */
export function rangeLabel(range: DayRange, options: FormatOptions = {}): string {
  const last = shiftDayKey(range.endKey, -1);
  if (last === range.startKey) return formatShortDay(range.startKey, options);
  const a = parseDayKey(range.startKey);
  const b = parseDayKey(last);
  if (a && b && a[0] === b[0] && a[1] === b[1]) return `${formatShortDay(range.startKey, options)} – ${b[2]}`;
  return `${formatShortDay(range.startKey, options)} – ${formatShortDay(last, options)}`;
}

/** `120 loaded · Aug 17 – Nov 14`. */
export function coverageLabel(loaded: number, range: DayRange, options: FormatOptions = {}): string {
  return `${loaded.toLocaleString(options.locale)} loaded · ${rangeLabel(range, options)}`;
}

/** The widen button's label, or null when the tab cannot grow (custom is what it is). */
export function loadMoreLabel(tab: AppointmentsRange): string | null {
  switch (tab) {
    case 'upcoming':
      return `Load ${UPCOMING_CHUNK_DAYS} more days`;
    case 'past':
      return `Load ${PAST_CHUNK_DAYS} earlier days`;
    case 'custom':
      return null;
  }
}

/** The days a widened window would cover; the button hides past the cap. */
export function canLoadMore(tab: AppointmentsRange, chunks: number): boolean {
  if (tab === 'custom') return false;
  const per = tab === 'upcoming' ? UPCOMING_CHUNK_DAYS : PAST_CHUNK_DAYS;
  return per * (chunks + 1) <= MAX_RANGE_DAYS;
}

/** What the caveat bar says when a custom pair was cut. */
export function capCaveat(range: DayRange, options: FormatOptions = {}): string {
  return `A custom range is limited to ${MAX_RANGE_DAYS} days — showing ${rangeLabel(range, options)} (${rangeLength(range)} days). Narrow the dates to see a later stretch.`;
}

/** The empty state's words for a tab, narrowed or not. */
export function emptyCopy(tab: AppointmentsRange, narrowed: boolean): { title: string; description: string } {
  if (narrowed)
    return {
      title: 'No appointments match',
      description: 'Widen the filter or clear the search to see every loaded appointment again.',
    };
  switch (tab) {
    case 'upcoming':
      return {
        title: 'Nothing coming up',
        description: 'No appointments in the loaded days. Load more days, or book one with New booking.',
      };
    case 'past':
      return {
        title: 'Nothing in the loaded days',
        description: 'No past appointments in this stretch. Load earlier days to look further back.',
      };
    case 'custom':
      return { title: 'No appointments in this range', description: 'Pick other dates, or clear the filter.' };
  }
}
