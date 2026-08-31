import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useElementSize } from '../hooks/useElementSize';
import { dateOfDayKey, groupByDayKey, type DayKey } from '../lib/time/calendarDate';
import { BAND_NARROW } from '../lib/interaction/layout';

export interface AgendaListProps<T> {
  items: readonly T[];
  dayOf: (item: T) => DayKey;
  /** Sort inside a day. Default: the order given. */
  compare?: (a: T, b: T) => number;
  keyOf: (item: T) => string;
  renderItem: (item: T, context: { dayKey: DayKey }) => ReactNode;
  /** Replace the day header. Default: "Today · Mon, Aug 17". */
  renderDayHeader?: (dayKey: DayKey, items: readonly T[]) => ReactNode;
  todayKey?: DayKey | null;
  locale?: string;
  /**
   * In a narrow container each day collapses to this many rows plus "+N
   * more", which expands the day in place — the phone shape of the same
   * list. Omit for never collapsing.
   */
  compactMaxPerDay?: number;
  /** A day header click — "drill down" into the day view. */
  onDayClick?: (dayKey: DayKey) => void;
  emptyState?: ReactNode;
  'aria-label': string;
  className?: string;
}

/**
 * Bookings as a day-grouped list with sticky day headers — the mobile shape of
 * a calendar and the shape of "what is next".
 *
 * The header sticks INSIDE this component's own scroll box, so it works the
 * same in a panel, a drawer or a page. Grouping is `groupByDayKey`, so a
 * booking whose day the caller cannot place (empty key) is dropped rather
 * than filed under a wrong day.
 *
 * Compact is decided by the container's width (`useElementSize`), not the
 * viewport — an agenda in a 360px panel next to a wide calendar is compact,
 * one on a phone in landscape may not be.
 */
export function AgendaList<T>({
  items,
  dayOf,
  compare,
  keyOf,
  renderItem,
  renderDayHeader,
  todayKey = null,
  locale,
  compactMaxPerDay,
  onDayClick,
  emptyState,
  className = '',
  ...aria
}: AgendaListProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { width } = useElementSize(rootRef);
  const compact = compactMaxPerDay !== undefined && width > 0 && width < BAND_NARROW;
  const [expanded, setExpanded] = useState<Set<DayKey>>(() => new Set());

  const groups = useMemo(() => {
    const grouped = groupByDayKey(items, dayOf);
    if (compare) for (const group of grouped) group.items.sort(compare);
    return grouped;
  }, [compare, dayOf, items]);

  const headerLabel = (dayKey: DayKey) => {
    const date = dateOfDayKey(dayKey);
    const text = date
      ? new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(date)
      : dayKey;
    return dayKey === todayKey ? `Today · ${text}` : text;
  };

  return (
    <div
      ref={rootRef}
      role="list"
      aria-label={aria['aria-label']}
      className={`relative min-h-0 overflow-y-auto overscroll-contain ${className}`}
    >
      {groups.length === 0 ? (
        <div className="p-6 text-center text-body text-text-muted">{emptyState ?? 'Nothing scheduled'}</div>
      ) : null}
      {groups.map((group) => {
        const limit = compact && !expanded.has(group.key) ? compactMaxPerDay! : group.items.length;
        const shown = group.items.slice(0, limit);
        const hidden = group.items.length - shown.length;
        const isToday = group.key === todayKey;
        return (
          <section
            key={group.key}
            role="listitem"
            aria-label={headerLabel(group.key)}
            className="border-b border-border-subtle last:border-b-0"
          >
            <header
              className={`sticky top-0 z-sticky flex items-center gap-2 border-b border-border-subtle bg-surface-raised px-3 py-1.5 text-label font-medium ${
                isToday ? 'text-accent' : 'text-text-muted'
              }`}
            >
              {onDayClick ? (
                <button
                  type="button"
                  onClick={() => onDayClick(group.key)}
                  className="rounded-chip px-1 -mx-1 hover:bg-surface-hover hover:text-text focus-visible:focus-ring"
                >
                  {renderDayHeader ? renderDayHeader(group.key, group.items) : headerLabel(group.key)}
                </button>
              ) : (
                <span>{renderDayHeader ? renderDayHeader(group.key, group.items) : headerLabel(group.key)}</span>
              )}
              <span className="ml-auto text-micro tabular-nums text-text-faint">{group.items.length}</span>
            </header>
            <div className="flex flex-col">
              {shown.map((item) => (
                <div key={keyOf(item)}>{renderItem(item, { dayKey: group.key })}</div>
              ))}
              {hidden > 0 ? (
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => new Set(prev).add(group.key))}
                  className="self-start px-3 py-1.5 text-label font-medium text-accent hover:underline focus-visible:focus-ring"
                >
                  +{hidden} more
                </button>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
