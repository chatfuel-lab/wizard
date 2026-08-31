import type { BookingStatus } from '~api/generated/bookings/graphql';
import { ContextMenu, IconExternal, IconTrash, type ContextMenuPoint, type MenuItem } from '~ui';
import { displayCustomerName } from '../../lib/appointmentsColumns';
import { STATUS_META, TARGET_STATUSES } from '../../lib/status';
import type { BookingRecord } from '../../types';

export interface AppointmentsRowMenuProps {
  point: ContextMenuPoint | null;
  onPointChange: (point: ContextMenuPoint | null) => void;
  /** The whole selection when the right-clicked row was part of it, that row alone otherwise. */
  targets: readonly BookingRecord[];
  canEdit: boolean;
  onOpen: (id: string) => void;
  onStatus: (targets: readonly BookingRecord[], status: BookingStatus) => void;
  onDelete: (targets: readonly BookingRecord[]) => void;
}

/**
 * One menu for the whole table, in controlled mode (deals' `TableRowMenu`
 * pattern): the table reports a point, this renders once. "Open" is
 * single-target only — one panel exists — and is omitted, not disabled, for
 * a multi-selection. Status entries follow `STATUS_META` minus Pending
 * (`TARGET_STATUSES`): the API refuses any transition INTO Pending, so it is
 * never offered. The digit hints are the calendar's `1`–`5`, shown here for
 * recognition; the list itself binds nothing (the workspace owns the keys).
 */
export function AppointmentsRowMenu({
  point,
  onPointChange,
  targets,
  canEdit,
  onOpen,
  onStatus,
  onDelete,
}: AppointmentsRowMenuProps) {
  const count = targets.length;
  const single = count === 1 ? targets[0] : undefined;
  const items: MenuItem[] = [];

  if (single) {
    items.push({ kind: 'label', id: 'target', label: displayCustomerName(single) });
    items.push({
      id: 'open',
      label: 'Open the booking',
      icon: <IconExternal size={14} />,
      shortcut: ['enter'],
      onSelect: () => onOpen(single.id),
    });
  } else if (count > 1) {
    items.push({ kind: 'label', id: 'target', label: `${count} bookings selected` });
  }

  if (canEdit && count > 0) {
    items.push({ kind: 'separator', id: 'status' });
    for (const status of TARGET_STATUSES) {
      const meta = STATUS_META.find((m) => m.status === status)!;
      items.push({
        id: `status-${status}`,
        label: `Mark ${meta.label}`,
        checked: single ? single.status === status : undefined,
        shortcut: meta.key ? [meta.key] : undefined,
        onSelect: () => onStatus(targets, status),
      });
    }
    items.push({ kind: 'separator', id: 'danger' });
    items.push({
      id: 'delete',
      label: count === 1 ? 'Delete booking…' : `Delete ${count} bookings…`,
      icon: <IconTrash size={14} />,
      tone: 'danger',
      onSelect: () => onDelete(targets),
    });
  }

  return <ContextMenu point={point} onPointChange={onPointChange} items={items} aria-label="Booking actions" />;
}
