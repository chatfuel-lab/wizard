/**
 * Local sort for the appointments list.
 *
 * `bookingsV2` returns a window in the server's own order and takes no sort
 * argument, so every column sorts CLIENT-SIDE over the rows the list has
 * loaded — which is honest here because the list holds the whole window it
 * asked for (a chunked range, not a page of a longer list). The default is
 * chronological: soonest first for what is coming, most recent first for what
 * has passed; `?sort=` overrides it and `DataTable`'s header cycle writes it.
 *
 * Ties break on start, then id, so a sort is stable across renders and a live
 * echo cannot shuffle two equal rows.
 */
import type { BookingRecord } from '../types';
import { customerCell, durationCell, priceCell, serviceCell, specialistCell } from './appointmentsColumns';
import type { AppointmentsRange, AppointmentsSort, AppointmentsSortKey } from './bookingsParams';
import { STATUSES } from './status';

/** Chronological, and the way a person reads each tab. */
export function defaultSort(range: AppointmentsRange): AppointmentsSort {
  return { key: 'start', direction: range === 'past' ? 'desc' : 'asc' };
}

/** `params.sort` when set, else the tab's default. */
export function effectiveSort(range: AppointmentsRange, override: AppointmentsSort | null): AppointmentsSort {
  return override ?? defaultSort(range);
}

const startMs = (b: BookingRecord) => new Date(b.startTime).getTime();

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

function compareText(a: string, b: string): number {
  return collator.compare(a, b);
}

/** Nulls sort LAST regardless of direction — "no price" is not "the cheapest". */
function compareNullable<T>(
  a: T | null,
  b: T | null,
  direction: 'asc' | 'desc',
  compare: (x: T, y: T) => number,
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const d = compare(a, b);
  return direction === 'desc' ? -d : d;
}

function keyCompare(
  key: AppointmentsSortKey,
  direction: 'asc' | 'desc',
): (a: BookingRecord, b: BookingRecord) => number {
  const sign = direction === 'desc' ? -1 : 1;
  switch (key) {
    case 'start':
      return (a, b) => sign * (startMs(a) - startMs(b));
    case 'customer':
      return (a, b) => {
        const ca = customerCell(a);
        const cb = customerCell(b);
        // Walk-ins last: they have no name to sort by.
        return compareNullable(
          ca.kind === 'walkin' ? null : ca.name,
          cb.kind === 'walkin' ? null : cb.name,
          direction,
          compareText,
        );
      };
    case 'service':
      return (a, b) =>
        compareNullable(serviceCell(a)?.title ?? null, serviceCell(b)?.title ?? null, direction, compareText);
    case 'specialist':
      return (a, b) =>
        compareNullable(specialistCell(a)?.name ?? null, specialistCell(b)?.name ?? null, direction, compareText);
    case 'status':
      return (a, b) => sign * (STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status));
    case 'duration':
      return (a, b) => sign * (durationCell(a).minutes - durationCell(b).minutes);
    case 'price':
      return (a, b) => {
        const pa = priceCell(a);
        const pb = priceCell(b);
        // Amounts compare within a currency; across currencies the code orders (no conversion is honest).
        return compareNullable(pa, pb, direction, (x, y) =>
          x.currency === y.currency ? x.amount - y.amount : compareText(x.currency, y.currency),
        );
      };
  }
}

/** A new array, sorted; the input is untouched. */
export function sortAppointments(records: readonly BookingRecord[], sort: AppointmentsSort): BookingRecord[] {
  const primary = keyCompare(sort.key, sort.direction);
  return [...records].sort((a, b) => {
    const d = primary(a, b);
    if (d !== 0) return d;
    const s = startMs(a) - startMs(b);
    if (s !== 0) return s;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** `DataTable`'s `{key, dir}` from the module's `{key, direction}`. */
export function toSortState(sort: AppointmentsSort): { key: string; dir: 'asc' | 'desc' } {
  return { key: sort.key, dir: sort.direction };
}

/**
 * The header cycle hands back `null` on the third click ("unsorted"); the
 * module's answer is "back to the tab's default", written as no `?sort=`.
 */
export function fromSortState(
  state: { key: string; dir: 'asc' | 'desc' } | null,
  keys: readonly AppointmentsSortKey[],
): AppointmentsSort | null {
  if (!state) return null;
  if (!keys.includes(state.key as AppointmentsSortKey)) return null;
  return { key: state.key as AppointmentsSortKey, direction: state.dir };
}

/** True when the sort is the tab's own default (so the URL can drop it). */
export function isDefaultSort(range: AppointmentsRange, sort: AppointmentsSort): boolean {
  const d = defaultSort(range);
  return d.key === sort.key && d.direction === sort.direction;
}
