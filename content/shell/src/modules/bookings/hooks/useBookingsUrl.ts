import { useCallback, useMemo } from 'react';
import type { ModuleAppProps } from '../../types';
import type { BookingsFilter } from '../lib/bookingsFilter';
import {
  parseBookingsParams,
  viewSegment,
  writeBookingsParams,
  type BookingsParams,
  type BookingsView,
  type CalendarMode,
  type NewBookingPrefill,
} from '../lib/bookingsParams';
import { stepAnchor } from '../lib/calendarRange';
import type { Density } from '../lib/layout';

export interface BookingsUrlArgs {
  params: URLSearchParams;
  /** The view segment of the address ('' at the module's root). */
  viewSeg: string;
  /** The shell's writer: view segment and params in one move. */
  setLocation: ModuleAppProps['setView'];
  /** `YYYY-MM-DD` of today in the display zone — the anchor `step` falls back to. */
  todayKey: string;
}

export interface BookingsUrlApi {
  parsed: BookingsParams;
  /** The serialized filter: the identity `filter` is keyed on. */
  filterKey: string;
  filter: BookingsFilter;
  patch: (next: Partial<BookingsParams>) => void;
  setView: (view: BookingsView) => void;
  setFilter: (next: BookingsFilter) => void;
  setDensity: (density: Density) => void;
  setMode: (mode: CalendarMode) => void;
  setOpenBooking: (b: string | null) => void;
  openWizard: (prefill?: Partial<NewBookingPrefill>) => void;
  closeWizard: () => void;
  goToday: () => void;
  step: (delta: -1 | 1) => void;
}

/**
 * The address bar and the filter, as one seam.
 *
 * The URL is the workspace's only writable state: everything here either reads
 * it (`parsed`, `filter`) or writes it through `patch`, the single place that
 * merges a patch over the current params and decides whether the move pushes
 * or replaces.
 */
export function useBookingsUrl({ params, viewSeg, setLocation, todayKey }: BookingsUrlArgs): BookingsUrlApi {
  // Keyed on the string, not the object: `params` is a fresh URLSearchParams on
  // every shell render, and re-parsing would hand every view a new filter.
  const query = params.toString();
  const parsed = useMemo(() => parseBookingsParams(new URLSearchParams(query), viewSeg), [query, viewSeg]);

  /* The filter's identity must not change unless the filter did (deals' lesson:
   * `?deal=` on every click handed the table a fresh-but-identical filter, and
   * it refetched, losing selection and scroll). */
  const filterKey = JSON.stringify(parsed.filter);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the serialized filter so an equal-but-fresh object keeps its identity
  const filter = useMemo(() => parsed.filter, [filterKey]);

  const patch = useCallback(
    (next: Partial<BookingsParams>) => {
      const merged = { ...parsed, ...next };
      /* A surface is a place and pushes; a filter, a day or an open booking
         replaces, so Back is not a list of keystrokes. */
      setLocation(viewSegment(merged.view), writeBookingsParams(params, merged), {
        replace: merged.view === parsed.view,
      });
    },
    [params, parsed, setLocation],
  );

  const setView = useCallback((view: BookingsView) => patch({ view }), [patch]);
  const setFilter = useCallback((next: BookingsFilter) => patch({ filter: next }), [patch]);
  const setDensity = useCallback((density: Density) => patch({ density }), [patch]);
  const setMode = useCallback((mode: CalendarMode) => patch({ mode, view: 'calendar' }), [patch]);
  const setOpenBooking = useCallback((b: string | null) => patch({ b }), [patch]);
  const openWizard = useCallback(
    (prefill?: Partial<NewBookingPrefill>) =>
      patch({ new: { start: null, end: null, contact: null, specialist: null, service: null, ...prefill } }),
    [patch],
  );
  const closeWizard = useCallback(() => patch({ new: null }), [patch]);

  const goToday = useCallback(() => patch({ view: 'calendar', date: null }), [patch]);
  const step = useCallback(
    (delta: -1 | 1) => patch({ view: 'calendar', date: stepAnchor(parsed.mode, parsed.date ?? todayKey, delta) }),
    [patch, parsed.mode, parsed.date, todayKey],
  );

  return {
    parsed,
    filterKey,
    filter,
    patch,
    setView,
    setFilter,
    setDensity,
    setMode,
    setOpenBooking,
    openWizard,
    closeWizard,
    goToday,
    step,
  };
}
