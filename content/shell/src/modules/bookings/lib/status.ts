/**
 * The six booking statuses, in the one order the whole module uses (menus,
 * filters, the status-mix chart), with their labels and tones — and the one
 * rule the API imposes that the SDL does not say.
 *
 * Five of the six carry a digit key, `1`–`5`; `Pending` carries none.
 *
 * `Pending` is the state a booking is born in and can never return to, so it
 * is never offered as a transition target. Same-status re-sets are otherwise
 * accepted.
 */
import { BookingStatus } from '~api/generated/bookings/graphql';

export type StatusTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export interface StatusMeta {
  status: BookingStatus;
  label: string;
  /** Short verb for a button ("Confirm"), or null when the state is not an action. */
  verb: string | null;
  tone: StatusTone;
  /** The digit that sets it from the keyboard, or null. */
  key: string | null;
  /** How the block on the grid draws it, beyond colour. */
  look: 'default' | 'tentative' | 'muted';
  /** Counts as booked time (utilisation, availability) — Canceled does not. */
  occupies: boolean;
}

export const STATUS_META: readonly StatusMeta[] = [
  {
    status: BookingStatus.Pending,
    label: 'Pending',
    verb: null,
    tone: 'warning',
    key: null,
    look: 'tentative',
    occupies: true,
  },
  {
    status: BookingStatus.Confirmed,
    label: 'Confirmed',
    verb: 'Confirm',
    tone: 'accent',
    key: '1',
    look: 'default',
    occupies: true,
  },
  {
    status: BookingStatus.Attended,
    label: 'Attended',
    verb: 'Attended',
    tone: 'success',
    key: '2',
    look: 'default',
    occupies: true,
  },
  {
    status: BookingStatus.NoShow,
    label: 'No-show',
    verb: 'No-show',
    tone: 'danger',
    key: '3',
    look: 'default',
    occupies: true,
  },
  {
    status: BookingStatus.Reschedule,
    label: 'Reschedule',
    verb: 'Needs reschedule',
    tone: 'warning',
    key: '4',
    look: 'tentative',
    occupies: true,
  },
  {
    status: BookingStatus.Canceled,
    label: 'Canceled',
    verb: 'Cancel',
    tone: 'neutral',
    key: '5',
    look: 'muted',
    occupies: false,
  },
];

const BY_STATUS = new Map(STATUS_META.map((m) => [m.status, m]));

export function statusMeta(status: BookingStatus): StatusMeta {
  return BY_STATUS.get(status) ?? STATUS_META[0]!;
}

/** Every status, in display order. */
export const STATUSES: readonly BookingStatus[] = STATUS_META.map((m) => m.status);

/** The statuses a booking can be moved INTO — everything but Pending. */
export const TARGET_STATUSES: readonly BookingStatus[] = STATUS_META.filter(
  (m) => m.status !== BookingStatus.Pending,
).map((m) => m.status);

export function isTargetStatus(status: BookingStatus): boolean {
  return status !== BookingStatus.Pending;
}

/** The status a digit key sets, or null. */
export function statusForKey(key: string): BookingStatus | null {
  return STATUS_META.find((m) => m.key === key)?.status ?? null;
}

/**
 * The two or three "next steps" a panel or a context menu leads with, given
 * where the booking is now. Everything else stays reachable in the overflow.
 */
export function primaryActions(current: BookingStatus, isPast: boolean): BookingStatus[] {
  switch (current) {
    case BookingStatus.Pending:
    case BookingStatus.Reschedule:
      return isPast
        ? [BookingStatus.Attended, BookingStatus.NoShow]
        : [BookingStatus.Confirmed, BookingStatus.Canceled];
    case BookingStatus.Confirmed:
      return isPast ? [BookingStatus.Attended, BookingStatus.NoShow] : [BookingStatus.Attended, BookingStatus.Canceled];
    case BookingStatus.Attended:
      return [BookingStatus.NoShow];
    case BookingStatus.NoShow:
      return [BookingStatus.Attended];
    case BookingStatus.Canceled:
      return [BookingStatus.Confirmed];
  }
}

/** Parses a comma list of statuses from a URL, in canonical order, silently dropping junk. */
export function parseStatusList(raw: string | null | undefined): BookingStatus[] {
  if (!raw) return [];
  const wanted = new Set(raw.split(',').map((s) => s.trim()));
  return STATUSES.filter((s) => wanted.has(s));
}
