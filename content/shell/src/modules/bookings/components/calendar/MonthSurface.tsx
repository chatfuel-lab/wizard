import type { ReactNode } from 'react';
import { EmptyState, IconCalendar, MonthGrid, formatMinuteOfDay } from '~ui';
import type { CalendarActions } from '../../hooks/useCalendarActions';
import { startDayKey } from '../../lib/calendarLayout';
import type { WeekStartsOn } from '../../lib/calendarRange';
import { monthDropEdit } from '../../lib/gridSpan';
import { byStart } from '../../lib/rangeStore';
import { wallClock } from '../../lib/zone';
import type { BookingRecord } from '../../types';

export interface MonthSurfaceProps {
  actions: CalendarActions;
  empty: boolean;
  emptyTitle: string;
  emptyAction: ReactNode;
  canEdit: boolean;
  monthKey: string;
  weekStartsOn: WeekStartsOn;
  filtered: BookingRecord[];
  /** The display zone's IANA name. */
  zone: string;
  density: 'compact' | 'comfortable';
  todayKey: string;
  /** `params.date` — the anchored day wears the ring. */
  selectedDayKey: string | null;
  hour12: boolean;
  openDay: (day: string) => void;
  renderBlock: (
    record: BookingRecord,
    variant: 'block' | 'chip' | 'row',
    heightPx?: number,
    label?: string,
  ) => ReactNode;
  onBlockClick: (record: BookingRecord, dom: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }) => void;
  'aria-label': string;
}

/** The month surface: chips per day, a drop on another day is a move. */
export function MonthSurface({
  actions,
  empty,
  emptyTitle,
  emptyAction,
  canEdit,
  monthKey,
  weekStartsOn,
  filtered,
  zone,
  density,
  todayKey,
  selectedDayKey,
  hour12,
  openDay,
  renderBlock,
  onBlockClick,
  'aria-label': ariaLabel,
}: MonthSurfaceProps) {
  if (empty) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <EmptyState
          icon={<IconCalendar />}
          title={emptyTitle}
          description={canEdit ? 'Click a day to open it, or drag on the day grid to book.' : undefined}
          action={emptyAction}
        />
      </div>
    );
  }
  return (
    <MonthGrid<BookingRecord>
      month={monthKey}
      weekStartsOn={weekStartsOn}
      events={filtered}
      dayOf={(r) => startDayKey(r, zone)}
      compare={byStart}
      maxPerDay={density === 'compact' ? 5 : 4}
      todayKey={todayKey}
      selectedDayKey={selectedDayKey}
      renderEvent={(record) =>
        renderBlock(
          record,
          'chip',
          undefined,
          formatMinuteOfDay(wallClock(new Date(record.startTime).getTime(), zone).minuteOfDay, {
            hour12,
            short: true,
          }),
        )
      }
      onDayClick={openDay}
      onMoreClick={(day) => openDay(day)}
      onEventClick={(record, dom) => onBlockClick(record, dom)}
      onEventDrop={
        canEdit
          ? (record, day) => actions.applyEdit(record, monthDropEdit(record, day, actions.spanCtx), true)
          : undefined
      }
      aria-label={ariaLabel}
      className="min-h-0 flex-1"
    />
  );
}
