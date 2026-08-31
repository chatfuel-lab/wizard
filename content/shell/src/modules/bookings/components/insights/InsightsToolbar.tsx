import { useCallback } from 'react';
import { DatePickerPopover, SegmentedControl, Spinner, Tag, Toolbar } from '~ui';
import { formatDayLabel } from '../../lib/appointmentsColumns';
import type { BookingsFilter } from '../../lib/bookingsFilter';
import { INSIGHTS_PERIODS, type InsightsPeriod } from '../../lib/bookingsParams';
import type { WeekStartsOn } from '../../lib/calendarRange';
import { PERIOD_LABELS } from '../../lib/insights';
import type { Band } from '../../lib/layout';
import { BookingsFilterMenus } from '../appointments/BookingsFilterMenus';

const SHORT_LABELS: Record<InsightsPeriod, string> = {
  week: 'Week',
  month: 'Month',
  '30d': '30 d',
  '90d': '90 d',
  custom: 'Custom',
};

export interface InsightsToolbarProps {
  period: InsightsPeriod;
  onPeriod: (next: InsightsPeriod) => void;
  from: string | null;
  to: string | null;
  onDates: (from: string | null, to: string | null) => void;
  filter: BookingsFilter;
  onFilterChange: (next: BookingsFilter) => void;
  band: Band;
  todayKey: string;
  weekStartsOn: WeekStartsOn;
  /** `over 143 bookings · Aug 1 – 31`, or null before the first load. */
  coverage: string | null;
  loading: boolean;
}

/**
 * One filter row above everything it scopes (the dataviz rule): the period,
 * the custom dates, the shared filter, and the coverage sentence every card
 * repeats. Nothing inside a card filters anything.
 */
export function InsightsToolbar({
  period,
  onPeriod,
  from,
  to,
  onDates,
  filter,
  onFilterChange,
  band,
  todayKey,
  weekStartsOn,
  coverage,
  loading,
}: InsightsToolbarProps) {
  const compact = band === 'compact';
  const formatDay = useCallback((day: string) => formatDayLabel(day, { todayKey }), [todayKey]);
  return (
    <Toolbar>
      <SegmentedControl
        aria-label="Period"
        size="sm"
        value={period}
        onChange={onPeriod}
        options={INSIGHTS_PERIODS.map((value) => ({
          value,
          label: compact ? SHORT_LABELS[value] : PERIOD_LABELS[value],
        }))}
      />
      {period === 'custom' ? (
        <span className="flex items-center gap-1 text-xs text-text-muted" role="group" aria-label="Custom period">
          <DatePickerPopover
            value={from}
            onChange={(next) => onDates(next, to)}
            todayKey={todayKey}
            weekStartsOn={weekStartsOn}
            format={formatDay}
            placeholder="From"
            aria-label="From date"
            clearable
          />
          <span aria-hidden>–</span>
          <DatePickerPopover
            value={to}
            onChange={(next) => onDates(from, next)}
            todayKey={todayKey}
            weekStartsOn={weekStartsOn}
            format={formatDay}
            placeholder="To"
            aria-label="To date"
            clearable
          />
        </span>
      ) : null}
      <BookingsFilterMenus filter={filter} onFilterChange={onFilterChange} combined={compact} />
      <div className="ml-auto flex items-center gap-2 text-xs text-text-muted">
        {loading ? <Spinner size={12} /> : null}
        {coverage ? <span className="tabular-nums">{coverage}</span> : null}
        <Tag>Loaded range only</Tag>
      </div>
    </Toolbar>
  );
}
