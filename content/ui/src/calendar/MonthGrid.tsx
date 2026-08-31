import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { DragLayer } from '../dnd/DragLayer';
import { useDragSession } from '../dnd/useDragSession';
import { useElementSize } from '../hooks/useElementSize';
import {
  dateOfDayKey,
  monthKeyOf,
  monthMatrix,
  shiftDayKey,
  weekdayOrder,
  type DayKey,
  type MonthKey,
  type Weekday,
} from '../lib/time/calendarDate';

export interface MonthGridEvent {
  id: string;
}

export interface MonthGridEventContext {
  dayKey: DayKey;
  dragging: boolean;
}

export interface MonthGridProps<T extends MonthGridEvent> {
  month: MonthKey;
  weekStartsOn?: Weekday;
  events: readonly T[];
  dayOf: (event: T) => DayKey;
  /** Sort inside a day. Default: the order given. */
  compare?: (a: T, b: T) => number;
  renderEvent: (event: T, context: MonthGridEventContext) => ReactNode;
  /**
   * Chips shown per day before "+N more" — an UPPER bound. The grid also
   * measures its rows and never shows more than fit, so a short container
   * degrades to one chip and "+N more" rather than clipping the third.
   */
  maxPerDay?: number;
  todayKey?: DayKey | null;
  selectedDayKey?: DayKey | null;
  locale?: string;
  onDayClick?: (day: DayKey) => void;
  onMoreClick?: (day: DayKey, hidden: readonly T[]) => void;
  onEventClick?: (event: T, domEvent: ReactMouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => void;
  /** Presence enables drag-and-drop between days. */
  onEventDrop?: (event: T, day: DayKey) => void;
  canDrag?: (event: T) => boolean;
  'aria-label': string;
  className?: string;
}

/** Padding + day number + the "+N more" line, px. */
const CELL_CHROME_PX = 46;
/** One chip row: EventChip's h-5 plus the gap. */
const CHIP_ROW_PX = 22;

/**
 * The month view: always 6×7, chips per day, "+N more", drag a chip to
 * another day.
 *
 * DnD is the EXISTING discrete `useDragSession` — a chip lands on one of 42
 * targets, which is exactly the board's problem, and the board's primitive
 * already does touch, auto-scroll, the ghost and the live region. The time
 * of day is not this component's to change: `onEventDrop` says which day,
 * and the module keeps the booking's own hour.
 *
 * Keyboard: the days are one roving Tab stop; ←/→ ±1, ↑/↓ ±7, Home/End the
 * week, Enter opens the day. Chips inside a day are ordinary buttons reached
 * with Tab from the day.
 */
export function MonthGrid<T extends MonthGridEvent>({
  month,
  weekStartsOn = 1,
  events,
  dayOf,
  compare,
  renderEvent,
  maxPerDay = 3,
  todayKey = null,
  selectedDayKey = null,
  locale,
  onDayClick,
  onMoreClick,
  onEventClick,
  onEventDrop,
  canDrag,
  className = '',
  ...aria
}: MonthGridProps<T>) {
  const days = useMemo(() => monthMatrix(month, weekStartsOn), [month, weekStartsOn]);
  const [focusedKey, setFocusedKey] = useState<DayKey | null>(null);
  const pendingFocus = useRef<DayKey | null>(null);
  const cellRefs = useRef(new Map<DayKey, HTMLDivElement>());
  const bodyRef = useRef<HTMLDivElement>(null);
  const { height: bodyHeight } = useElementSize(bodyRef);
  /* How many chips a row has room for: the row minus the day number and the
     "+N more" line, over one chip's height. Measured, so the same grid is
     right at 400px and at 900px without a prop. */
  const fit =
    bodyHeight > 0
      ? Math.max(1, Math.floor((bodyHeight / 6 - CELL_CHROME_PX) / CHIP_ROW_PX))
      : Number.POSITIVE_INFINITY;
  const limit = Math.min(maxPerDay, fit);
  /* One stable ref callback per day. An inline arrow would be a new function
     every render, and React answers a changed ref callback by calling the old
     one with null — de-registering the drop target under a drag in progress. */
  const refCallbacks = useRef(new Map<DayKey, (node: HTMLDivElement | null) => void>());
  const refFor = (day: DayKey, register: (node: HTMLElement | null) => void) => {
    let callback = refCallbacks.current.get(day);
    if (!callback) {
      callback = (node) => {
        register(node);
        if (node) cellRefs.current.set(day, node);
        else cellRefs.current.delete(day);
      };
      refCallbacks.current.set(day, callback);
    }
    return callback;
  };

  const byDay = useMemo(() => {
    const map = new Map<DayKey, T[]>();
    for (const event of events) {
      const key = dayOf(event);
      const list = map.get(key);
      if (list) list.push(event);
      else map.set(key, [event]);
    }
    if (compare) for (const list of map.values()) list.sort(compare);
    return map;
  }, [compare, dayOf, events]);

  const weekdayLabels = useMemo(() => {
    const short = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    return weekdayOrder(weekStartsOn).map((weekday) => short.format(dateOfDayKey(shiftDayKey('2026-08-16', weekday))!));
  }, [locale, weekStartsOn]);

  const session = useDragSession<T>({
    onDrop: (event, dayKey) => onEventDrop?.(event, dayKey),
    disabled: onEventDrop === undefined,
    getAnnouncement: (announcement) => {
      const dayLabel = (key: string | null) =>
        key
          ? (dateOfDayKey(key)?.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }) ?? key)
          : 'nothing';
      switch (announcement.phase) {
        case 'start':
          return 'Picked up. Drag to a day, or press Escape to cancel.';
        case 'over':
          return `Over ${dayLabel(announcement.targetId)}.`;
        case 'drop':
          return `Moved to ${dayLabel(announcement.targetId)}.`;
        case 'cancel':
          return 'Cancelled.';
      }
    },
  });

  useEffect(() => {
    const key = pendingFocus.current;
    if (!key) return;
    const node = cellRefs.current.get(key);
    if (node) {
      pendingFocus.current = null;
      node.focus();
    }
  });

  const onCellKeyDown = (event: KeyboardEvent<HTMLElement>, day: DayKey) => {
    if (event.target !== event.currentTarget) return; // a chip's own keys
    const index = days.indexOf(day);
    let next: DayKey | null;
    switch (event.key) {
      case 'ArrowLeft':
        next = days[index - 1] ?? null;
        break;
      case 'ArrowRight':
        next = days[index + 1] ?? null;
        break;
      case 'ArrowUp':
        next = days[index - 7] ?? null;
        break;
      case 'ArrowDown':
        next = days[index + 7] ?? null;
        break;
      case 'Home':
        next = days[index - (index % 7)] ?? null;
        break;
      case 'End':
        next = days[index - (index % 7) + 6] ?? null;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onDayClick?.(day);
        return;
      default:
        return;
    }
    event.preventDefault();
    if (next) {
      setFocusedKey(next);
      pendingFocus.current = next;
    }
  };

  const tabStop =
    focusedKey && days.includes(focusedKey)
      ? focusedKey
      : selectedDayKey && days.includes(selectedDayKey)
        ? selectedDayKey
        : todayKey && days.includes(todayKey)
          ? todayKey
          : days.find((day) => monthKeyOf(day) === month);

  return (
    <div
      role="grid"
      aria-label={aria['aria-label']}
      className={`flex min-h-0 flex-col overflow-hidden rounded-card border border-border bg-surface-raised ${className}`}
    >
      <div role="row" className="grid grid-cols-7 border-b border-border">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            role="columnheader"
            className="px-2 py-1.5 text-center text-micro font-medium text-text-muted"
          >
            {label}
          </div>
        ))}
      </div>
      <div ref={bodyRef} className="grid min-h-0 flex-1 auto-rows-fr grid-cols-7">
        {days.map((day, index) => {
          const list = byDay.get(day) ?? [];
          const shown = list.slice(0, limit);
          const hidden = list.slice(limit);
          const outside = monthKeyOf(day) !== month;
          const today = todayKey === day;
          const selected = selectedDayKey === day;
          const target = session.dropTargetProps(day);
          const over = target['data-over'] === true;
          const number = Number(day.slice(8));
          return (
            <div
              key={day}
              ref={refFor(day, target.ref)}
              role="gridcell"
              tabIndex={tabStop === day ? 0 : -1}
              aria-selected={selected || undefined}
              aria-label={`${dateOfDayKey(day)?.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }) ?? day}${today ? ', today' : ''}, ${list.length} ${list.length === 1 ? 'event' : 'events'}`}
              data-over={target['data-over']}
              onClick={() => {
                if (session.isDragging) return;
                onDayClick?.(day);
              }}
              onKeyDown={(event) => onCellKeyDown(event, day)}
              onFocus={(event) => {
                if (event.target === event.currentTarget) setFocusedKey(day);
              }}
              className={`flex min-h-0 min-w-0 flex-col gap-0.5 overflow-hidden border-b border-border p-1 outline-none transition-colors duration-fast ease-standard focus-visible:focus-ring ${
                index % 7 === 0 ? '' : 'border-l'
              } ${index >= 35 ? 'border-b-0' : ''} ${
                over ? 'bg-accent-soft' : selected ? 'bg-row-selected' : outside ? 'bg-surface' : 'bg-surface-raised'
              } ${onDayClick ? 'cursor-pointer hover:bg-row-hover' : ''}`}
            >
              <div className="flex items-center justify-between px-0.5">
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-micro tabular-nums ${
                    today ? 'bg-accent font-semibold text-accent-fg' : outside ? 'text-text-faint' : 'text-text-muted'
                  }`}
                >
                  {number === 1 && !today
                    ? new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(dateOfDayKey(day)!)
                    : number}
                </span>
              </div>
              {shown.map((event) => {
                const draggable = onEventDrop !== undefined && (canDrag?.(event) ?? true);
                const dragProps = draggable ? session.draggableProps(event.id, event) : null;
                return (
                  <div
                    key={event.id}
                    role="button"
                    tabIndex={0}
                    data-event-id={event.id}
                    {...(dragProps ?? {})}
                    onClick={(domEvent) => {
                      domEvent.stopPropagation();
                      if (session.activeId === event.id) return;
                      onEventClick?.(event, domEvent);
                    }}
                    onKeyDown={(domEvent) => {
                      if (domEvent.key === 'Enter' || domEvent.key === ' ') {
                        domEvent.preventDefault();
                        domEvent.stopPropagation();
                        onEventClick?.(event, domEvent);
                      }
                    }}
                    className={`min-w-0 rounded-chip outline-none transition-opacity duration-fast ease-standard focus-visible:focus-ring data-[dragging]:opacity-40 ${
                      draggable ? 'cursor-grab' : 'cursor-pointer'
                    }`}
                  >
                    {renderEvent(event, { dayKey: day, dragging: dragProps?.['data-dragging'] === true })}
                  </div>
                );
              })}
              {hidden.length > 0 ? (
                <button
                  type="button"
                  onClick={(domEvent) => {
                    domEvent.stopPropagation();
                    onMoreClick?.(day, hidden);
                  }}
                  className="self-start rounded-chip px-1.5 text-micro font-medium text-text-muted hover:bg-surface-hover hover:text-text focus-visible:focus-ring"
                >
                  +{hidden.length} more
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <DragLayer session={session} className="rounded-chip bg-surface-raised">
        {(event) => renderEvent(event, { dayKey: dayOf(event), dragging: true })}
      </DragLayer>
    </div>
  );
}
