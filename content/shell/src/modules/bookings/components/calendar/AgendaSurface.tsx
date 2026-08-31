import type { ReactNode } from 'react';
import { AgendaList, EmptyState, IconCalendar } from '~ui';
import { eventSubtitle, eventTitle, startDayKey } from '../../lib/calendarLayout';
import { byStart } from '../../lib/rangeStore';
import type { BookingRecord } from '../../types';

export interface AgendaSurfaceProps {
  filtered: BookingRecord[];
  /** The display zone's IANA name. */
  zone: string;
  todayKey: string;
  selectedSet: ReadonlySet<string>;
  emptyTitle: string;
  emptyAction: ReactNode;
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
 * The compact band's surface: the day's bookings as a list — a one-column
 * grid on a phone reads worse than a list. Rows carry `data-event-id` so the
 * shared keyboard flow can walk them.
 */
export function AgendaSurface({
  filtered,
  zone,
  todayKey,
  selectedSet,
  emptyTitle,
  emptyAction,
  timeLabelOf,
  renderBlock,
  onBlockClick,
  'aria-label': ariaLabel,
}: AgendaSurfaceProps) {
  return (
    <AgendaList<BookingRecord>
      items={filtered}
      dayOf={(r) => startDayKey(r, zone)}
      keyOf={(r) => r.id}
      compare={byStart}
      todayKey={todayKey}
      renderItem={(record) => (
        <div
          role="button"
          tabIndex={0}
          data-event-id={record.id}
          aria-label={`${eventTitle(record)}, ${eventSubtitle(record)?.text ?? 'no service'}, ${timeLabelOf(record)}`}
          aria-pressed={selectedSet.has(record.id) || undefined}
          onClick={(dom) => onBlockClick(record, dom)}
          className="outline-none focus-visible:focus-ring"
        >
          {renderBlock(record, 'row')}
        </div>
      )}
      emptyState={<EmptyState icon={<IconCalendar />} title={emptyTitle} action={emptyAction} />}
      aria-label={ariaLabel}
      className="min-h-0 flex-1"
    />
  );
}
