import { useEffect, useMemo, useState } from 'react';
import { usesHour12 } from '~ui';
import { useCatalog } from '../BookingsCatalogContext';
import type { BookingsFilter } from '../lib/bookingsFilter';
import { matchesFilter } from '../lib/bookingsFilter';
import type { CalendarBy, CalendarMode } from '../lib/bookingsParams';
import { layoutGrid, nowLine, type GridLayout } from '../lib/calendarLayout';
import { rangeForMode, rangeVars, type DayRange, type WeekStartsOn } from '../lib/calendarRange';
import { effectiveMode, type Band } from '../lib/layout';
import { isInitialLoad, selectVisible } from '../lib/rangeStore';
import { NOW_TICK_MS } from '../lib/zone';
import type { BookingRecord, DisplayZone, SpecialistRecord } from '../types';
import { useRangeStore, type RangeStore } from './useRangeStore';

export interface CalendarGridInput {
  band: Band;
  requestedMode: CalendarMode;
  by: CalendarBy;
  /** `params.date ?? todayKey`. */
  anchor: string;
  weekStartsOn: WeekStartsOn;
  filter: BookingsFilter;
  zone: DisplayZone;
  refreshToken: number;
  onCount: (count: number | null) => void;
  onBusy: (busy: boolean) => void;
}

export interface CalendarGrid {
  /** The mode rendered (compact renders a day whatever the URL asks). */
  mode: CalendarMode;
  /** True only in day mode with `by=specialist`. */
  bySpecialist: boolean;
  anchor: string;
  range: DayRange;
  store: RangeStore;
  /** Everything in the window, unfiltered. */
  records: BookingRecord[];
  /** What the view shows. */
  filtered: BookingRecord[];
  /** Day/week grid layout; null in month mode. */
  layout: GridLayout | null;
  now: { minute: number; columnId?: string } | null;
  nowMs: number;
  catalog: SpecialistRecord[];
  catalogOrder: string[];
  hour12: boolean;
  initial: boolean;
}

/**
 * The calendar's data and geometry in one place: which window to ask for,
 * the range store over it, the shared filter applied, and the pure layout
 * over the result. Reports the count and the busy state upward, and refetches
 * on the header's token.
 */
export function useCalendarGrid(input: CalendarGridInput): CalendarGrid {
  const { band, requestedMode, by, anchor, weekStartsOn, filter, zone, refreshToken, onCount, onBusy } = input;
  const catalog = useCatalog();
  const mode = effectiveMode(band, requestedMode);
  const bySpecialist = mode === 'day' && by === 'specialist';

  const range = useMemo(() => rangeForMode(mode, anchor, weekStartsOn), [mode, anchor, weekStartsOn]);
  const vars = useMemo(() => rangeVars(range, zone.zone, zone.botZone ?? 'UTC'), [range, zone.zone, zone.botZone]);
  const store = useRangeStore(vars);
  const { state, refetch } = store;

  const records = useMemo(() => selectVisible(state), [state]);
  const filtered = useMemo(() => records.filter((r) => matchesFilter(r, filter)), [records, filter]);

  const specialists = catalog.state.specialists;
  const catalogOrder = useMemo(() => specialists.map((sp) => sp.id), [specialists]);

  const layout = useMemo(
    () =>
      mode === 'month'
        ? null
        : layoutGrid({
            mode,
            by,
            range,
            records: filtered,
            catalog: specialists,
            filterSpecialists: filter.specialists,
            zone,
          }),
    [mode, by, range, filtered, specialists, filter.specialists, zone],
  );

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), NOW_TICK_MS);
    return () => window.clearInterval(timer);
  }, []);
  const now = useMemo(
    () => (layout ? nowLine(layout, bySpecialist, nowMs, zone.zone) : null),
    [layout, bySpecialist, nowMs, zone.zone],
  );

  const initial = isInitialLoad(state);
  useEffect(() => onCount(state.loaded === null ? null : filtered.length), [onCount, state.loaded, filtered.length]);
  useEffect(() => onBusy(state.loading), [onBusy, state.loading]);
  useEffect(() => {
    if (refreshToken > 0) refetch();
  }, [refreshToken, refetch]);

  const hour12 = useMemo(() => usesHour12(), []);

  return {
    mode,
    bySpecialist,
    anchor,
    range,
    store,
    records,
    filtered,
    layout,
    now,
    nowMs,
    catalog: specialists,
    catalogOrder,
    hour12,
    initial,
  };
}
