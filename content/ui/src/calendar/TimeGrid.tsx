import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ForwardedRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useGridDragSession, type GridDragAnnouncement } from '../dnd/useGridDragSession';
import type { GridDragState } from '../lib/time/gridDrag';
import { normalize, subtract, type Interval } from '../lib/time/intervals';
import { packLanes } from '../lib/time/lanes';
import {
  FULL_DAY,
  HOUR_PX,
  RESIZE_EDGE_PX,
  columnAt,
  eventBox,
  laneBox,
  minuteToPx,
  nextEventFocus,
  nowOffset,
  pxToMinute,
  rangeHeightPx,
  scrollTopFor,
  type FocusKey,
  type GridDensity,
  type MinuteRange,
} from '../lib/time/timeGrid';
import { formatDuration, snapMinute, timeRangeLabel, usesHour12 } from '../lib/time/timeOfDay';
import { TimeGutter } from './internal/TimeGutter';

export interface TimeGridColumn {
  id: string;
  header: ReactNode;
  /** Plain-text name for the live region and event labels; defaults to `id`. */
  label?: string;
  /** Closed: shaded end to end, nothing can be created or dropped in it. */
  disabled?: boolean;
}

export interface TimeGridEvent {
  id: string;
  columnId: string;
  /** Minutes of the day, half-open `[start, end)`. `end` may be 1440. */
  start: number;
  end: number;
}

export interface TimeGridEventContext {
  lane: number;
  lanes: number;
  heightPx: number;
  selected: boolean;
  dragging: boolean;
  focused: boolean;
}

export interface TimeGridPeriod {
  columnId: string;
  start: number;
  end: number;
}

export interface TimeGridSpanChange {
  id: string;
  columnId: string;
  start: number;
  end: number;
}

export interface TimeGridCreate {
  columnId: string;
  start: number;
  end: number;
}

export interface TimeGridAnnouncement<T extends TimeGridEvent> extends GridDragAnnouncement {
  event: T | null;
  columnLabel: string;
  range: string;
}

export interface TimeGridHandle {
  scrollToMinute: (minute: number, options?: { align?: 'start' | 'center'; behavior?: ScrollBehavior }) => void;
}

export interface TimeGridProps<T extends TimeGridEvent> {
  columns: readonly TimeGridColumn[];
  events: readonly T[];
  renderEvent: (event: T, context: TimeGridEventContext) => ReactNode;
  /** Plain-text name for an event's button; defaults to its time range and column. */
  eventLabel?: (event: T) => string;
  /** Minutes shown. Default the whole day. */
  range?: MinuteRange;
  density?: GridDensity;
  /** Minutes. Drag, resize and create land on this grid. */
  snap?: number;
  /** Minutes. A resize or create is never shorter. Defaults to `snap`. */
  minDuration?: number;
  /**
   * Working hours per column; the rest is shaded off-hours. Return `null`
   * for a closed day (fully shaded). Omit for no shading at all.
   */
  businessHours?: (columnId: string) => readonly Interval[] | null;
  /** Hatched "nobody may book this" — breaks, closures. */
  blockedPeriods?: readonly TimeGridPeriod[];
  /** Hatched "someone else has this" — other bookings, synced calendars. */
  busyPeriods?: readonly TimeGridPeriod[];
  /** The now-line. `columnId` limits it to one column (the week's today); omit it for every column (a resource day). */
  now?: { minute: number; columnId?: string | null } | null;
  /** Where the grid is scrolled on mount. Default 08:00, or the range start. */
  initialScrollMinute?: number;
  /**
   * Minutes between the gutter's labels. 60 — every hour — is the default and
   * what a booking grid wants, where the question is which hour a slot is in.
   * A larger step (180: one label every three hours) suits a grid whose blocks
   * carry their own time and only need the gutter for rough bearings. It
   * changes the LABELS only: the hour rules behind the columns are a CSS tile
   * and stay where they are.
   */
  hourLabelStep?: number;
  hour12?: boolean;
  locale?: string;
  selectedId?: string | null;
  onEventClick?: (event: T, domEvent: PointerEvent | ReactKeyboardEvent<HTMLElement>) => void;
  onEventContextMenu?: (event: T, domEvent: ReactMouseEvent<HTMLElement>) => void;
  /** A press on empty grid; `minute` is snapped down to the slot. */
  onSlotClick?: (columnId: string, minute: number) => void;
  /** Presence enables moving. */
  onEventMove?: (change: TimeGridSpanChange) => void;
  /** Presence enables resizing. */
  onEventResize?: (change: TimeGridSpanChange) => void;
  /** Presence enables drag-to-create. */
  onCreate?: (create: TimeGridCreate) => void;
  /** Per-event permission; `false` freezes it, an object picks. Defaults to what the handlers allow. */
  canDrag?: (event: T) => boolean | { move?: boolean; resize?: boolean };
  /** A move keeps its column — the day view by time. */
  lockColumn?: boolean;
  getAnnouncement?: (event: TimeGridAnnouncement<T>) => string;
  'aria-label': string;
  className?: string;
}

const KEYBOARD_HINT =
  'Arrow keys move between events. Space grabs an event; then arrows move it by one step, Shift by four, Left and Right change column, Alt with Up or Down resizes the end, Enter drops it, Escape cancels. Enter opens the event.';

const FOCUS_KEYS = new Set<string>(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']);

function offHours(range: MinuteRange, hours: readonly Interval[] | null): Interval[] {
  if (hours === null) return [{ start: range.start, end: range.end }];
  return subtract([{ start: range.start, end: range.end }], normalize(hours));
}

/**
 * The time grid — a week, a day, a day per specialist. Zone-agnostic: it
 * knows columns and minutes, and the module maps instants to them.
 *
 * ## One scroll container, sticky chrome, painted in DOM order
 *
 * Header and gutter are `position: sticky` inside the ONE element that
 * scrolls, so both axes scroll together and there is no second scroller to
 * keep in sync. The corner where they meet is the classic two-axis problem;
 * it is solved by DOM ORDER rather than a z-index for each piece: the
 * columns container is `isolate` and comes BEFORE the gutter in the DOM (the
 * row is `flex-row-reverse` to put the gutter on the left), so the gutter
 * (sticky, `z-index: auto`) paints over the events by tree order, and only
 * the header row carries `z-sticky`, which puts it over both. One token, no
 * ladder-climbing, and the corner is right because the header is the last
 * thing painted.
 *
 * ## Layers, bottom to top
 *
 * off-hours shading → hour rules (CSS, an overlay so the rules show through
 * the shading) → blocked → busy → events → drag preview → now-line. Each is
 * its own set of absolutely positioned elements inside the column, in that
 * DOM order, so no layer needs a z-index either.
 *
 * ## The drag preview never touches React
 *
 * `useGridDragSession` runs `onPreview` inside the animation frame; this
 * component writes `top`/`height`/`left`/`width` and the time label to one
 * preview node by ref. The dragged block dims via `data-dragging` (set once
 * at grab), and the commit maps the session's final span back to a column id
 * and calls the matching prop.
 *
 * ## No all-day row
 *
 * The booking API has no all-day bookings — every booking is an instant
 * range — so there is no all-day lane and no prop for one. Adding it would
 * be markup for a thing the data cannot express.
 */
function TimeGridInner<T extends TimeGridEvent>(
  {
    columns,
    events,
    renderEvent,
    eventLabel,
    range = FULL_DAY,
    density = 'cozy',
    snap = 15,
    minDuration,
    businessHours,
    blockedPeriods,
    busyPeriods,
    now = null,
    initialScrollMinute,
    hourLabelStep,
    hour12: hour12Prop,
    locale,
    selectedId = null,
    onEventClick,
    onEventContextMenu,
    onSlotClick,
    onEventMove,
    onEventResize,
    onCreate,
    canDrag,
    lockColumn = false,
    getAnnouncement,
    className = '',
    ...aria
  }: TimeGridProps<T>,
  ref: ForwardedRef<TimeGridHandle>,
) {
  const hour12 = hour12Prop ?? usesHour12(locale);
  const hourPx = HOUR_PX[density];
  const heightPx = rangeHeightPx(range, hourPx);
  const minLength = minDuration ?? snap;
  const columnCount = columns.length;
  const columnIds = useMemo(() => columns.map((column) => column.id), [columns]);
  const columnIndex = useMemo(() => new Map(columnIds.map((id, index) => [id, index])), [columnIds]);
  const timeLabel = useCallback(
    (start: number, end: number) => timeRangeLabel(start, end, { hour12, locale }),
    [hour12, locale],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewLabelRef = useRef<HTMLSpanElement>(null);
  const eventNodes = useRef(new Map<string, HTMLElement>());
  const [focusedId, setFocusedId] = useState<string | null>(null);

  /* Events per column, lane-packed. Recomputed only when the events change. */
  const laid = useMemo(() => {
    const byColumn = new Map<string, T[]>();
    for (const event of events) {
      const list = byColumn.get(event.columnId);
      if (list) list.push(event);
      else byColumn.set(event.columnId, [event]);
    }
    const lanes = new Map<string, { lane: number; lanes: number }>();
    for (const list of byColumn.values()) {
      for (const [id, placement] of packLanes(list)) lanes.set(id, placement);
    }
    return { byColumn, lanes };
  }, [events]);

  const eventById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);

  const permission = useCallback(
    (event: T): { move: boolean; resize: boolean } => {
      const base = { move: onEventMove !== undefined, resize: onEventResize !== undefined };
      const answer = canDrag?.(event);
      if (answer === undefined) return base;
      if (typeof answer === 'boolean') return { move: base.move && answer, resize: base.resize && answer };
      return { move: base.move && (answer.move ?? true), resize: base.resize && (answer.resize ?? true) };
    },
    [canDrag, onEventMove, onEventResize],
  );

  const locate = useCallback(
    (point: { x: number; y: number }) => {
      const grid = gridRef.current;
      if (!grid || columnCount === 0) return null;
      const rect = grid.getBoundingClientRect();
      const column = columnAt(point.x - rect.left, rect.width, columnCount);
      if (column < 0) return null;
      return { column, minute: pxToMinute(point.y - rect.top, hourPx, range) };
    },
    [columnCount, hourPx, range],
  );

  const columnStyle = useCallback(
    (column: number) => ({
      left: `calc(${column} * 100% / ${Math.max(1, columnCount)} + 1px)`,
      width: `calc(100% / ${Math.max(1, columnCount)} - 2px)`,
    }),
    [columnCount],
  );

  const onPreview = useCallback(
    (state: GridDragState | null) => {
      const node = previewRef.current;
      if (!node) return;
      if (state === null) {
        node.style.display = 'none';
        return;
      }
      const box = eventBox(state.current, hourPx, range);
      if (!box) {
        node.style.display = 'none';
        return;
      }
      const style = columnStyle(state.current.column);
      node.style.display = 'block';
      node.style.top = `${box.top}px`;
      node.style.height = `${box.height}px`;
      node.style.left = style.left;
      node.style.width = style.width;
      const invalid = columns[state.current.column]?.disabled === true;
      node.dataset.invalid = invalid ? 'true' : 'false';
      if (previewLabelRef.current) {
        previewLabelRef.current.textContent = `${timeLabel(state.current.start, state.current.end)} · ${formatDuration(
          state.current.end - state.current.start,
        )}`;
      }
    },
    [columnStyle, columns, hourPx, range, timeLabel],
  );

  const onCommit = useCallback(
    (state: GridDragState) => {
      const column = columns[state.current.column];
      if (!column || column.disabled) return;
      const span = { columnId: column.id, start: state.current.start, end: state.current.end };
      if (state.kind === 'create') {
        onCreate?.(span);
        return;
      }
      if (state.id === null) return;
      if (state.kind === 'move') onEventMove?.({ id: state.id, ...span });
      else onEventResize?.({ id: state.id, ...span });
    },
    [columns, onCreate, onEventMove, onEventResize],
  );

  const onPress = useCallback(
    (id: string | null, at: { column: number; minute: number }, domEvent: PointerEvent) => {
      if (id !== null) {
        const event = eventById.get(id);
        if (event) {
          setFocusedId(id);
          onEventClick?.(event, domEvent);
        }
        return;
      }
      const column = columns[at.column];
      if (!column || column.disabled) return;
      onSlotClick?.(column.id, Math.max(range.start, snapMinute(at.minute, snap, 'floor')));
    },
    [columns, eventById, onEventClick, onSlotClick, range.start, snap],
  );

  const announce = useCallback(
    (event: GridDragAnnouncement): string => {
      const column = columns[event.state.current.column];
      const columnLabel = column?.label ?? column?.id ?? '';
      const rangeText = timeLabel(event.state.current.start, event.state.current.end);
      const model = event.state.id === null ? null : (eventById.get(event.state.id) ?? null);
      if (getAnnouncement) return getAnnouncement({ ...event, event: model, columnLabel, range: rangeText });
      switch (event.phase) {
        case 'grab':
          return event.state.kind === 'create'
            ? `Creating in ${columnLabel} from ${rangeText}.`
            : `Grabbed ${rangeText}, ${columnLabel}. Arrows move ${snap} minutes, Shift ${snap * 4}; Left and Right change column; Alt with Up or Down resizes; Enter drops; Escape cancels.`;
        case 'move':
          return `${rangeText}, ${columnLabel}.`;
        case 'drop':
          return event.state.kind === 'create'
            ? `Created ${rangeText}, ${columnLabel}.`
            : `${event.state.kind === 'move' ? 'Moved' : 'Resized'} to ${rangeText}, ${columnLabel}.`;
        case 'cancel':
          return 'Cancelled.';
      }
    },
    [columns, eventById, getAnnouncement, snap, timeLabel],
  );

  const session = useGridDragSession({
    rules: { snap, minDuration: minLength, range, columnCount, lockColumn },
    locate,
    scrollRef,
    onPreview,
    onCommit,
    onPress,
    getAnnouncement: announce,
    disabled: columnCount === 0,
  });

  /* Initial scroll: once, on mount. Later range/density changes keep the
     user's scroll position — snapping back to 08:00 on a density switch is
     the kind of thing that feels like a reload. */
  const initialRef = useRef(initialScrollMinute);
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const minute = initialRef.current ?? Math.max(range.start, Math.min(480, range.end));
    scroller.scrollTop = scrollTopFor(minute, hourPx, range, scroller.clientHeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      scrollToMinute: (minute, options) => {
        const scroller = scrollRef.current;
        if (!scroller) return;
        scroller.scrollTo({
          top: scrollTopFor(minute, hourPx, range, scroller.clientHeight, options?.align ?? 'start'),
          behavior: options?.behavior ?? 'smooth',
        });
      },
    }),
    [hourPx, range],
  );

  const focusEvent = useCallback((id: string) => {
    setFocusedId(id);
    eventNodes.current.get(id)?.focus({ preventScroll: false });
  }, []);

  const onEventKeyDown = useCallback(
    (event: T, domEvent: ReactKeyboardEvent<HTMLElement>) => {
      /* The drag session saw it first (its handler is spread before ours);
         a grabbed block's arrows are its own. */
      if (domEvent.defaultPrevented) return;
      if (
        FOCUS_KEYS.has(domEvent.key) &&
        !domEvent.altKey &&
        !domEvent.shiftKey &&
        !domEvent.metaKey &&
        !domEvent.ctrlKey
      ) {
        const next = nextEventFocus(events, columnIds, event.id, domEvent.key as FocusKey);
        if (next !== null && next !== event.id) {
          domEvent.preventDefault();
          focusEvent(next);
        }
        return;
      }
      if (domEvent.key === 'Enter') {
        domEvent.preventDefault();
        onEventClick?.(event, domEvent);
      }
    },
    [columnIds, events, focusEvent, onEventClick],
  );

  const firstEventId = useMemo(() => nextEventFocus(events, columnIds, null, 'ArrowDown'), [events, columnIds]);
  const tabStopId = focusedId !== null && eventById.has(focusedId) ? focusedId : firstEventId;

  const nowTop =
    now && (now.columnId === undefined || now.columnId === null || columnIndex.has(now.columnId))
      ? nowOffset(now.minute, hourPx, range)
      : null;

  const gridTemplateColumns = `repeat(${Math.max(1, columnCount)}, minmax(var(--width-time-column), 1fr))`;
  const surface = session.surfaceProps({ create: onCreate !== undefined });

  return (
    <div
      role="region"
      aria-label={aria['aria-label']}
      aria-describedby={session.hintId}
      className={`relative flex min-h-0 flex-col overflow-hidden rounded-card border border-border bg-surface-raised ${className}`}
    >
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto" style={{ scrollbarGutter: 'stable' }}>
        <div className="flex w-max min-w-full flex-col">
          {/* Header row: sticky top, over everything else (the one z-index). */}
          <div className="sticky top-0 z-sticky flex border-b border-border bg-surface-raised">
            <div className="sticky left-0 w-time-gutter shrink-0 border-r border-border bg-surface-raised" />
            <div className="grid min-w-0 flex-1" style={{ gridTemplateColumns }}>
              {columns.map((column) => (
                <div
                  key={column.id}
                  className={`min-w-0 border-l border-border px-2 py-1.5 text-label first:border-l-0 ${
                    column.disabled ? 'text-text-faint' : 'text-text'
                  }`}
                >
                  {column.header}
                </div>
              ))}
            </div>
          </div>

          {/* Body row. The columns come first in the DOM and the gutter last —
              see the header comment for why that is the corner's whole fix.
              `flex-row-reverse`, NOT `order-first`, puts the gutter on the
              left: `order` changes the painting order along with the layout
              order (Flexbox §5.4, "order-modified document order"), which
              would put the gutter straight back under the events; a reversed
              direction changes only where things sit. */}
          <div
            className="relative flex flex-row-reverse"
            style={{ '--time-grid-hour': `${hourPx}px` } as CSSProperties}
          >
            <div
              ref={gridRef}
              onPointerDown={surface.onPointerDown}
              className="relative isolate grid min-w-0 flex-1"
              style={{ gridTemplateColumns, height: heightPx, ...surface.style }}
            >
              {columns.map((column, index) => {
                const list = laid.byColumn.get(column.id) ?? [];
                const shading = businessHours
                  ? offHours(range, column.disabled ? null : businessHours(column.id))
                  : column.disabled
                    ? [{ start: range.start, end: range.end }]
                    : [];
                return (
                  <div
                    key={column.id}
                    data-column-id={column.id}
                    className="relative min-w-0 border-l border-border first:border-l-0"
                  >
                    {shading.map((interval) => {
                      const box = eventBox(interval, hourPx, range, 0);
                      return box ? (
                        <div
                          key={`off-${interval.start}`}
                          aria-hidden
                          className="hatch-off-hours absolute inset-x-0"
                          style={{ top: box.top, height: box.height }}
                        />
                      ) : null;
                    })}
                    {/* The rules sit OVER the shading so an off-hours block still
                        shows its half-hours; a range starting off the hour shifts
                        the tile so the rules stay on the hour. */}
                    <div
                      aria-hidden
                      className="time-grid-rules pointer-events-none absolute inset-0"
                      style={{ backgroundPositionY: -minuteToPx(range.start % 60, hourPx, { start: 0, end: 60 }) }}
                    />
                    {blockedPeriods
                      ?.filter((period) => period.columnId === column.id)
                      .map((period) => {
                        const box = eventBox(period, hourPx, range, 0);
                        return box ? (
                          <div
                            key={`blocked-${period.start}-${period.end}`}
                            aria-hidden
                            className="hatch-blocked absolute inset-x-0"
                            style={{ top: box.top, height: box.height }}
                          />
                        ) : null;
                      })}
                    {busyPeriods
                      ?.filter((period) => period.columnId === column.id)
                      .map((period) => {
                        const box = eventBox(period, hourPx, range, 0);
                        return box ? (
                          <div
                            key={`busy-${period.start}-${period.end}`}
                            aria-hidden
                            className="hatch-busy absolute inset-x-0.5 rounded-control"
                            style={{ top: box.top, height: box.height }}
                          />
                        ) : null;
                      })}

                    {list.map((event) => {
                      const box = eventBox(event, hourPx, range);
                      if (!box) return null;
                      const placement = laid.lanes.get(event.id) ?? { lane: 0, lanes: 1 };
                      const lane = laneBox(placement.lane, placement.lanes);
                      const allowed = permission(event);
                      const span = { column: index, start: event.start, end: event.end };
                      const dragProps = session.eventProps(event.id, span, {
                        movable: allowed.move,
                        resizable: allowed.resize,
                      });
                      const startHandle = allowed.resize ? session.resizeHandleProps(event.id, span, 'start') : null;
                      const endHandle = allowed.resize ? session.resizeHandleProps(event.id, span, 'end') : null;
                      const dragging = dragProps['data-dragging'] === true;
                      const focused = focusedId === event.id;
                      const selected = selectedId === event.id;
                      const label = eventLabel
                        ? eventLabel(event)
                        : `${timeLabel(event.start, event.end)}, ${column.label ?? column.id}`;
                      return (
                        <div
                          key={event.id}
                          ref={(node) => {
                            if (node) eventNodes.current.set(event.id, node);
                            else eventNodes.current.delete(event.id);
                          }}
                          role="button"
                          tabIndex={tabStopId === event.id ? 0 : -1}
                          aria-label={label}
                          aria-pressed={selected || undefined}
                          data-event-id={event.id}
                          data-selected={selected || undefined}
                          {...dragProps}
                          onKeyDown={(domEvent) => {
                            dragProps.onKeyDown(domEvent);
                            onEventKeyDown(event, domEvent);
                          }}
                          onFocus={() => setFocusedId(event.id)}
                          onContextMenu={
                            onEventContextMenu ? (domEvent) => onEventContextMenu(event, domEvent) : undefined
                          }
                          className={`absolute rounded-control outline-none transition-opacity duration-fast ease-standard focus-visible:focus-ring data-[dragging]:opacity-40 data-[grabbed]:opacity-70 ${
                            allowed.move ? 'cursor-grab' : 'cursor-pointer'
                          } ${box.clippedStart ? 'rounded-t-none' : ''} ${box.clippedEnd ? 'rounded-b-none' : ''}`}
                          style={{
                            ...dragProps.style,
                            top: box.top,
                            height: box.height,
                            left: `calc(${lane.leftPct}% + 1px)`,
                            width: `calc(${lane.widthPct}% - 2px)`,
                          }}
                        >
                          {renderEvent(event, {
                            lane: placement.lane,
                            lanes: placement.lanes,
                            heightPx: box.height,
                            selected,
                            dragging,
                            focused,
                          })}
                          {startHandle && !box.clippedStart ? (
                            <span
                              aria-hidden
                              onPointerDown={startHandle.onPointerDown}
                              className="absolute inset-x-0 top-0"
                              style={{ ...startHandle.style, height: RESIZE_EDGE_PX }}
                            />
                          ) : null}
                          {endHandle && !box.clippedEnd ? (
                            <span
                              aria-hidden
                              onPointerDown={endHandle.onPointerDown}
                              className="absolute inset-x-0 bottom-0"
                              style={{ ...endHandle.style, height: RESIZE_EDGE_PX }}
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Drag preview: geometry written by ref inside the frame. */}
              <div
                ref={previewRef}
                aria-hidden
                className="pointer-events-none absolute rounded-control border-2 border-accent bg-accent-soft/80 px-1.5 py-0.5 text-micro font-medium text-accent shadow-drag data-[invalid=true]:border-danger data-[invalid=true]:bg-danger-soft data-[invalid=true]:text-danger"
                style={{ display: 'none' }}
              >
                <span ref={previewLabelRef} className="block truncate tabular-nums" />
              </div>

              {/* Now-line, over everything in the column. */}
              {nowTop !== null && now ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute h-px bg-now"
                  style={
                    now.columnId === undefined || now.columnId === null
                      ? { top: nowTop, left: 0, right: 0 }
                      : { top: nowTop, ...columnStyle(columnIndex.get(now.columnId) ?? 0) }
                  }
                >
                  <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-now" />
                </div>
              ) : null}
            </div>

            <div className="sticky left-0 shrink-0">
              <TimeGutter
                range={range}
                hourPx={hourPx}
                density={density}
                hour12={hour12}
                locale={locale}
                nowMinute={now ? now.minute : null}
                labelStep={hourLabelStep}
              />
            </div>
          </div>
        </div>
      </div>

      <div aria-live="polite" aria-atomic className="sr-only">
        {session.announcement}
      </div>
      <p id={session.hintId} className="sr-only">
        {KEYBOARD_HINT}
      </p>
    </div>
  );
}

/**
 * `forwardRef` erases the generic; this cast puts it back so
 * `<TimeGrid<Booking> renderEvent={(b) => …} />` types `b` as `Booking`.
 */
export const TimeGrid = forwardRef(TimeGridInner) as <T extends TimeGridEvent>(
  props: TimeGridProps<T> & { ref?: ForwardedRef<TimeGridHandle> },
) => ReactElement;
