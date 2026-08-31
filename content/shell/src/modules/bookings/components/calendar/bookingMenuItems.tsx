import type { BookingStatus } from '~api/generated/bookings/graphql';
import { IconCheck, IconCopy, IconExternal, IconTrash, IconUser, type MenuItem } from '~ui';
import { UNASSIGNED, specialistKeyOf } from '../../lib/bookingsFilter';
import { specialistName } from '../../lib/catalogStore';
import { STATUS_META, TARGET_STATUSES, statusMeta } from '../../lib/status';
import type { BookingRecord, SpecialistRecord } from '../../types';

export interface BookingMenuContext {
  canEdit: boolean;
  /** Booking ids currently selected — a right-click on one of them acts on all. */
  selection: readonly string[];
  specialists: readonly SpecialistRecord[];
  onOpen: (id: string) => void;
  onToggleSelect: (id: string) => void;
  /** Applies to `ids` — the selection when the record is in it, else the record. */
  onStatus: (ids: readonly string[], status: BookingStatus) => void;
  onReassign: (record: BookingRecord, specialistKey: string) => void;
  onDuplicate: (record: BookingRecord) => void;
  onDelete: (ids: readonly string[]) => void;
}

/** `1`–`5` as the sheet documents them, for the menu's Kbd hints. */
const STATUS_SHORTCUT = new Map(STATUS_META.filter((m) => m.key).map((m) => [m.status, [m.key!]]));

/**
 * The right-click menu of a booking, wherever it is drawn (grid block, month
 * chip, agenda row). A booking that is part of the selection acts on the
 * whole selection — the file-manager rule, and the same one the keyboard
 * digits follow — so the two never disagree about what "this booking" means.
 * Menus have no submenus in this system: status and reassign are labelled
 * groups.
 */
export function bookingMenuItems(record: BookingRecord, ctx: BookingMenuContext): MenuItem[] {
  const inSelection = ctx.selection.includes(record.id);
  const count = inSelection ? ctx.selection.length : 1;
  const ids = inSelection ? ctx.selection : [record.id];
  const suffix = count > 1 ? ` (${count})` : '';
  const items: MenuItem[] = [
    {
      id: 'open',
      label: 'Open',
      icon: <IconExternal size={14} />,
      shortcut: ['enter'],
      onSelect: () => ctx.onOpen(record.id),
    },
  ];
  if (!ctx.canEdit) return items;

  items.push({
    id: 'select',
    label: inSelection ? 'Deselect' : 'Select',
    icon: <IconCheck size={14} />,
    shortcut: ['x'],
    onSelect: () => ctx.onToggleSelect(record.id),
  });
  items.push({ kind: 'separator', id: 's-status' });
  items.push({ kind: 'label', id: 'status', label: `Mark as${suffix}` });
  for (const status of TARGET_STATUSES) {
    if (count === 1 && status === record.status) continue;
    items.push({
      id: `status-${status}`,
      label: statusMeta(status).label,
      shortcut: STATUS_SHORTCUT.get(status),
      onSelect: () => ctx.onStatus(ids, status),
    });
  }

  if (count === 1) {
    const currentKey = specialistKeyOf(record);
    items.push({ kind: 'separator', id: 's-reassign' });
    items.push({ kind: 'label', id: 'reassign', label: 'Reassign to' });
    for (const sp of ctx.specialists) {
      items.push({
        id: `reassign-${sp.id}`,
        label: specialistName(sp.profile),
        checked: sp.id === currentKey,
        disabled: sp.id === currentKey,
        onSelect: () => ctx.onReassign(record, sp.id),
      });
    }
    items.push({
      id: 'reassign-none',
      label: 'Unassigned',
      icon: <IconUser size={14} />,
      checked: currentKey === UNASSIGNED,
      disabled: currentKey === UNASSIGNED,
      onSelect: () => ctx.onReassign(record, UNASSIGNED),
    });
    items.push({ kind: 'separator', id: 's-more' });
    items.push({
      id: 'duplicate',
      label: 'Duplicate',
      icon: <IconCopy size={14} />,
      onSelect: () => ctx.onDuplicate(record),
    });
  } else {
    items.push({ kind: 'separator', id: 's-more' });
  }
  items.push({
    id: 'delete',
    label: count > 1 ? `Delete ${count} bookings` : 'Delete',
    icon: <IconTrash size={14} />,
    tone: 'danger',
    shortcut: ['delete'],
    onSelect: () => ctx.onDelete(ids),
  });
  return items;
}

export interface CalendarBulkContext {
  /** The whole selection — the bar acts on all of it. */
  selection: readonly string[];
  onStatus: (ids: readonly string[], status: BookingStatus) => void;
  onDelete: (ids: readonly string[]) => void;
}

/**
 * The `ActionBar`'s menu over the selection: the same status targets and the
 * same delete the per-booking menu offers, with the same digit shortcuts, so
 * the bar and a right-click never disagree.
 */
export function calendarBulkActions(ctx: CalendarBulkContext): MenuItem[] {
  return [
    { kind: 'label', id: 'mark', label: 'Mark as' },
    ...TARGET_STATUSES.map((status) => {
      const meta = statusMeta(status);
      return {
        id: `bulk-${status}`,
        label: meta.label,
        shortcut: meta.key ? [meta.key] : undefined,
        onSelect: () => ctx.onStatus(ctx.selection, status),
      };
    }),
    { kind: 'separator', id: 's' },
    {
      id: 'bulk-delete',
      label: 'Delete',
      icon: <IconTrash size={14} />,
      tone: 'danger',
      shortcut: ['delete'],
      onSelect: () => ctx.onDelete(ctx.selection),
    },
  ];
}
