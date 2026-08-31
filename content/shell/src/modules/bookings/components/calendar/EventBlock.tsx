import { useEffect, type ReactNode } from 'react';
import { BookingStatus } from '~api/generated/bookings/graphql';
import { Avatar, ContextMenu, EVENT_TONE_CLASSES, EventChip, IconCheck, IconWarning, Tag, type MenuItem } from '~ui';
import { eventSubtitle, eventTitle, type BlockLook } from '../../lib/calendarLayout';
import { specialistName } from '../../lib/catalogStore';
import { FLASH_MS } from '../../lib/rangeStore';
import { statusMeta } from '../../lib/status';
import type { BookingRecord } from '../../types';

export type EventBlockVariant = 'block' | 'chip' | 'row';

export interface EventBlockProps {
  record: BookingRecord;
  variant: EventBlockVariant;
  look: BlockLook;
  /** "10:00 – 10:45" for a block, "10:00" for a chip, the range for a row. */
  timeLabel: string;
  heightPx?: number;
  selected: boolean;
  /** When the last rollback happened, or undefined. */
  flashAt?: number;
  onFlashDone: (id: string) => void;
  menuItems: readonly MenuItem[];
  className?: string;
}

/** A trailing glyph says what colour cannot: attended, no-show. */
function trailingFor(status: BookingStatus): ReactNode {
  if (status === BookingStatus.Attended) return <IconCheck size={12} aria-label="Attended" />;
  if (status === BookingStatus.NoShow) return <IconWarning size={12} aria-label="No-show" />;
  return undefined;
}

/**
 * One booking as the grid, the month or the agenda draws it: `EventChip`
 * with the customer, the service and the time, wrapped in the booking's
 * context menu and carrying `data-booking-id` for the FLIP.
 *
 * Status is expressed structurally (dashed tentative, muted + struck
 * canceled, a glyph for attended / no-show) so it survives the colour swap
 * between "by specialist" and "by status". A rollback flashes a danger ring
 * for `FLASH_MS` — a colour change rather than a keyframe, so reduced motion
 * needs no special case. Deleted references say so in the text and in a
 * native tooltip.
 */
export function EventBlock({
  record,
  variant,
  look,
  timeLabel,
  heightPx,
  selected,
  flashAt,
  onFlashDone,
  menuItems,
  className = '',
}: EventBlockProps) {
  useEffect(() => {
    if (flashAt === undefined) return;
    const timer = window.setTimeout(() => onFlashDone(record.id), FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [flashAt, record.id, onFlashDone]);

  const flashing = flashAt !== undefined;
  const title = eventTitle(record);
  const subtitle = eventSubtitle(record);
  const specialistLabel =
    record.specialist && 'profile' in record.specialist ? specialistName(record.specialist.profile) : null;
  const deletedSpecialist = record.specialist?.__typename === 'DeletedSpecialist';
  const hint = [
    subtitle?.deleted ? `Service was deleted — ${subtitle.text.replace(' (deleted)', '')}` : null,
    deletedSpecialist ? `Specialist was deleted — ${specialistLabel}` : null,
  ]
    .filter(Boolean)
    .join('\n');
  const meta = statusMeta(record.status);

  const body =
    variant === 'row' ? (
      <span
        className={`flex min-w-0 items-center gap-3 px-3 py-2 ${selected ? 'bg-row-selected' : 'hover:bg-row-hover'} ${
          look.status === 'muted' ? 'text-text-muted' : 'text-text'
        }`}
      >
        <span
          aria-hidden
          className={`h-8 w-1 shrink-0 rounded-full ${EVENT_TONE_CLASSES[look.status === 'muted' ? 'neutral' : look.tone].bar}`}
        />
        <span className="w-28 shrink-0 text-label tabular-nums text-text-muted">{timeLabel}</span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-body font-medium ${look.status === 'muted' ? 'line-through' : ''}`}>
            {title}
          </span>
          {subtitle ? (
            <span
              className={`block truncate text-label ${subtitle.deleted ? 'text-text-faint italic' : 'text-text-muted'}`}
            >
              {subtitle.text}
            </span>
          ) : null}
        </span>
        {specialistLabel ? (
          <span className="hidden shrink-0 items-center gap-1.5 text-label text-text-muted @wide:inline-flex">
            <Avatar
              name={specialistLabel}
              src={
                record.specialist && 'profile' in record.specialist && 'logo' in record.specialist.profile
                  ? record.specialist.profile.logo?.url
                  : null
              }
              size={18}
            />
            <span className={deletedSpecialist ? 'italic text-text-faint' : ''}>{specialistLabel}</span>
          </span>
        ) : null}
        <Tag tone={meta.tone}>{meta.label}</Tag>
      </span>
    ) : (
      <EventChip
        variant={variant}
        tone={look.tone}
        status={look.status}
        title={title}
        subtitle={subtitle ? <span className={subtitle.deleted ? 'italic' : ''}>{subtitle.text}</span> : undefined}
        meta={timeLabel}
        heightPx={heightPx}
        selected={selected}
        trailing={trailingFor(record.status)}
      />
    );

  return (
    <ContextMenu items={menuItems} aria-label={`${title} actions`}>
      {({ onContextMenu }) => (
        <span
          data-booking-id={record.id}
          data-flash={flashing || undefined}
          title={hint || undefined}
          onContextMenu={onContextMenu}
          className={`block h-full w-full min-w-0 transition-shadow duration-fast ease-standard ${
            variant === 'row' ? '' : 'rounded-control'
          } ${flashing ? 'ring-2 ring-danger ring-inset' : ''} ${className}`}
        >
          {body}
        </span>
      )}
    </ContextMenu>
  );
}
