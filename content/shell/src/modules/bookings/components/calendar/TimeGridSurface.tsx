import { useCallback, useMemo, type ReactNode } from 'react';
import { TimeGrid, type TimeGridAnnouncement, type TimeGridColumn } from '~ui';
import { MIN_DURATION_MIN, SNAP_MIN, type CalendarActions } from '../../hooks/useCalendarActions';
import { gestureAnnouncement } from '../../lib/announce';
import type { CalendarColor, CalendarMode, NewBookingPrefill } from '../../lib/bookingsParams';
import {
  countsByColumn,
  dayColumnHeading,
  eventSubtitle,
  eventTitle,
  zoneShiftMinutes,
  type CalendarEvent,
  type GridLayout,
} from '../../lib/calendarLayout';
import { createPrefill, moveEdit, resizeEdit, slotPrefill } from '../../lib/gridSpan';
import { statusMeta } from '../../lib/status';
import type { BookingRecord, DisplayZone } from '../../types';
import { DayHeader, SpecialistHeader } from './ColumnHeaders';

export interface TimeGridSurfaceProps {
  actions: CalendarActions;
  layout: GridLayout;
  empty: boolean;
  emptyTitle: string;
  emptyAction: ReactNode;
  /** Whether the loaded window holds anything at all (unfiltered). */
  hasRecords: boolean;
  canEdit: boolean;
  mode: CalendarMode;
  bySpecialist: boolean;
  gridDensity: 'compact' | 'cozy';
  zone: DisplayZone;
  hour12: boolean;
  now: { minute: number; columnId?: string } | null;
  todayKey: string;
  catalogOrder: readonly string[];
  color: CalendarColor;
  openDay: (day: string) => void;
  onNewBooking: (prefill?: Partial<NewBookingPrefill>) => void;
  timeLabelOf: (record: BookingRecord) => string;
  renderBlock: (
    record: BookingRecord,
    variant: 'block' | 'chip' | 'row',
    heightPx?: number,
    label?: string,
  ) => ReactNode;
  onBlockClick: (record: BookingRecord, dom: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }) => void;
  'aria-label': string;
}

/**
 * The day/week surface: `~ui`'s `TimeGrid` over the computed layout — drag to
 * move, drag an edge to resize, drag on empty grid to create — plus the
 * column headers (this is why the columns are built here and not in a hook:
 * they hold JSX) and the thin banner an empty-but-loaded window shows above
 * the grid, which stays usable for booking a slot.
 */
export function TimeGridSurface({
  actions,
  layout,
  empty,
  emptyTitle,
  emptyAction,
  hasRecords,
  canEdit,
  mode,
  bySpecialist,
  gridDensity,
  zone,
  hour12,
  now,
  todayKey,
  catalogOrder,
  color,
  openDay,
  onNewBooking,
  timeLabelOf,
  renderBlock,
  onBlockClick,
  'aria-label': ariaLabel,
}: TimeGridSurfaceProps) {
  const counts = useMemo(() => countsByColumn(layout.events), [layout]);

  const columns = useMemo<TimeGridColumn[]>(() => {
    return layout.columns.map((column) => {
      if (column.kind === 'day') {
        return {
          id: column.id,
          label: dayColumnHeading(column.dayKey),
          header: (
            <DayHeader
              dayKey={column.dayKey}
              today={column.dayKey === todayKey}
              count={counts.get(column.id) ?? 0}
              onClick={mode === 'week' ? () => openDay(column.dayKey) : undefined}
            />
          ),
        };
      }
      return {
        id: column.id,
        label: column.label,
        header: (
          <SpecialistHeader
            column={column}
            catalogOrder={catalogOrder}
            showTone={color === 'specialist'}
            count={counts.get(column.id) ?? 0}
            shift={zoneShiftMinutes(column.dayKey, zone)}
          />
        ),
      };
    });
  }, [layout, todayKey, counts, mode, openDay, catalogOrder, color, zone]);

  const businessHours = useMemo(() => {
    const hours = layout.businessHours;
    if (!hours) return undefined;
    return (columnId: string) => hours[columnId] ?? null;
  }, [layout]);

  const announce = useCallback(
    (a: TimeGridAnnouncement<CalendarEvent>) => gestureAnnouncement(a, { bySpecialist, snapMin: SNAP_MIN }),
    [bySpecialist],
  );

  return (
    <>
      {empty ? (
        <div className="flex items-center gap-3 border-b border-border px-gutter py-1.5 text-label text-text-muted">
          <span>{emptyTitle}.</span>
          {canEdit && !hasRecords ? (
            <span className="hidden @wide:inline">Drag on the grid to book a slot.</span>
          ) : null}
          {emptyAction}
        </div>
      ) : null}
      <TimeGrid<CalendarEvent>
        /* Remount on a mode, density or display-zone change so the grid
           re-scrolls to the working hours (it keeps the user's scroll
           otherwise; the first band measurement can flip the density right
           after mount, and a zone switch moves the hours). */
        key={`${mode}-${bySpecialist ? 'sp' : 'time'}-${gridDensity}-${zone.zone}`}
        columns={columns}
        events={layout.events}
        density={gridDensity}
        snap={SNAP_MIN}
        minDuration={MIN_DURATION_MIN}
        hour12={hour12}
        businessHours={businessHours}
        blockedPeriods={layout.blocked}
        now={now}
        initialScrollMinute={layout.initialScrollMinute}
        eventLabel={(e) =>
          `${eventTitle(e.record)}, ${eventSubtitle(e.record)?.text ?? 'no service'}, ${timeLabelOf(e.record)}, ${statusMeta(e.record.status).label}`
        }
        renderEvent={(e, ctx) => renderBlock(e.record, 'block', ctx.heightPx)}
        onEventClick={(e, dom) => onBlockClick(e.record, dom)}
        onSlotClick={
          canEdit
            ? (columnId, minute) => onNewBooking(slotPrefill(columnId, minute, SNAP_MIN, actions.spanCtx) ?? {})
            : undefined
        }
        onEventMove={
          canEdit
            ? (change) => {
                const event = actions.eventsById.get(change.id);
                if (event) actions.applyEdit(event.record, moveEdit(event, change, actions.spanCtx), true);
              }
            : undefined
        }
        onEventResize={
          canEdit
            ? (change) => {
                const event = actions.eventsById.get(change.id);
                if (event) actions.applyEdit(event.record, resizeEdit(event, change, actions.spanCtx), true);
              }
            : undefined
        }
        onCreate={
          canEdit
            ? (create) => {
                const prefill = createPrefill(create, actions.spanCtx);
                if (prefill) onNewBooking(prefill);
              }
            : undefined
        }
        getAnnouncement={announce}
        aria-label={ariaLabel}
        className="min-h-0 flex-1 rounded-none border-0"
      />
    </>
  );
}
