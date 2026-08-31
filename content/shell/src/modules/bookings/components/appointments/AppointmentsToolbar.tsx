import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  DatePickerPopover,
  IconDownload,
  IconSearch,
  Input,
  SegmentedControl,
  Tabs,
  Tag,
  Toolbar,
  Tooltip,
} from '~ui';
import { formatDayLabel } from '../../lib/appointmentsColumns';
import { isFilterEmpty, type BookingsFilter } from '../../lib/bookingsFilter';
import type { AppointmentsRange } from '../../lib/bookingsParams';
import type { WeekStartsOn } from '../../lib/calendarRange';
import { DENSITIES, isNarrow, type Band, type Density } from '../../lib/layout';
import { BookingsFilterMenus } from './BookingsFilterMenus';

/** Long enough that a typed word is one URL write, short enough to feel immediate. */
const SEARCH_DEBOUNCE_MS = 250;

const TABS: { id: AppointmentsRange; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'custom', label: 'Custom' },
];

const DENSITY_LABELS: Record<Density, string> = { comfortable: 'Comfortable', compact: 'Compact' };

export interface AppointmentsToolbarProps {
  range: AppointmentsRange;
  onRange: (next: AppointmentsRange) => void;
  from: string | null;
  to: string | null;
  onDates: (from: string | null, to: string | null) => void;
  /** `params.q` — the URL's copy; the box keeps its own text and debounces into this. */
  query: string;
  onQueryChange: (next: string) => void;
  filter: BookingsFilter;
  onFilterChange: (next: BookingsFilter) => void;
  density: Density;
  onDensityChange: (next: Density) => void;
  band: Band;
  todayKey: string;
  weekStartsOn: WeekStartsOn;
  /** How many rows a CSV would hold right now (the shown rows). */
  exportCount: number;
  onExport: () => void;
  onClear: () => void;
}

/**
 * Two rows: the tabs (Upcoming · Past · Custom), then everything that narrows
 * or arranges the list. The search box holds its own text and debounces into
 * `?q=` — pushing every keystroke straight to the URL would write a history
 * entry per letter, and `onQueryChange` is a fresh closure on every shell
 * render, so the timer is keyed on the text alone and reads the latest
 * callback from a ref (deals' `DealsFilterBar` lesson).
 *
 * `data-bookings-search` is the contract the workspace's `/` shortcut and the
 * palette's "Search appointments" reach through the DOM; the view's frozen
 * props have no slot for a focus call, on purpose.
 */
export function AppointmentsToolbar({
  range,
  onRange,
  from,
  to,
  onDates,
  query,
  onQueryChange,
  filter,
  onFilterChange,
  density,
  onDensityChange,
  band,
  todayKey,
  weekStartsOn,
  exportCount,
  onExport,
  onClear,
}: AppointmentsToolbarProps) {
  const [text, setText] = useState(query);
  const latest = useRef({ query, onQueryChange });
  useEffect(() => {
    latest.current = { query, onQueryChange };
  });

  // An outside change (a cleared filter, a deep link) wins over the local text.
  useEffect(() => setText(query), [query]);

  useEffect(() => {
    if (text === latest.current.query) return;
    const timer = window.setTimeout(() => {
      const { query: current, onQueryChange: push } = latest.current;
      if (text !== current) push(text);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [text]);

  const narrowed = !isFilterEmpty(filter) || query.trim() !== '';
  const compact = band === 'compact';
  // The pickers print the year when it is not this one — a range into 2027 has to say so.
  const formatDay = useCallback((day: string) => formatDayLabel(day, { todayKey }), [todayKey]);

  return (
    <>
      <div className="px-gutter pt-1">
        <Tabs tabs={TABS} active={range} onSelect={(id) => onRange(id as AppointmentsRange)} />
      </div>
      <Toolbar>
        <div className="relative min-w-40 flex-1 @wide:max-w-64">
          <IconSearch
            size={14}
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint"
          />
          <Input
            data-bookings-search
            aria-label="Search loaded appointments by customer, phone, service or specialist"
            placeholder="Search loaded rows…"
            className="pl-8"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && text !== '') {
                event.stopPropagation();
                setText('');
              }
            }}
          />
        </div>

        {range === 'custom' ? (
          <span className="flex items-center gap-1 text-xs text-text-muted" role="group" aria-label="Custom range">
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

        <div className="ml-auto flex items-center gap-2">
          {narrowed ? (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear
            </Button>
          ) : null}

          <Tooltip
            label={
              exportCount === 0
                ? 'Nothing to export'
                : `Download the ${exportCount.toLocaleString()} shown ${exportCount === 1 ? 'row' : 'rows'} as CSV`
            }
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={onExport}
              disabled={exportCount === 0}
              aria-label="Export the shown rows as CSV"
            >
              <IconDownload size={14} />
              <span className="hidden @compact:inline">CSV</span>
            </Button>
          </Tooltip>
          {compact ? null : <Tag>Loaded rows only</Tag>}

          {isNarrow(band) ? null : (
            <SegmentedControl
              aria-label="Row density"
              size="sm"
              value={density}
              onChange={onDensityChange}
              options={DENSITIES.map((value) => ({ value, label: DENSITY_LABELS[value] }))}
            />
          )}
        </div>
      </Toolbar>
    </>
  );
}
