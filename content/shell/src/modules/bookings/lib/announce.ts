/**
 * What a screen reader hears, and what one toast says, after a batch settles.
 *
 * There is no bulk mutation: a five-booking status change is five sequential
 * round trips, so partial failure is a normal outcome and the sentence must
 * be able to say so. Tested pure functions, not template literals in a
 * component (deals' `announce.ts`, adapted).
 */
import type { TimeGridAnnouncement } from '~ui';
import type { BookingStatus } from '~api/generated/bookings/graphql';
import type { BookingRecord } from '../types';
import { eventTitle, type CalendarEvent } from './calendarLayout';
import { statusMeta } from './status';

const MAX_NAMES = 3;

/** "Dana Ray", "Dana and Jonas", "Dana, Jonas and 4 more". Empty in, empty out. */
export function nameList(names: readonly string[]): string {
  const cleaned = names.map((name) => name.trim() || 'Unnamed');
  if (cleaned.length === 0) return '';
  if (cleaned.length === 1) return cleaned[0]!;
  if (cleaned.length <= MAX_NAMES) return `${cleaned.slice(0, -1).join(', ')} and ${cleaned.at(-1)}`;
  return `${cleaned.slice(0, MAX_NAMES).join(', ')} and ${cleaned.length - MAX_NAMES} more`;
}

/** The customer's name, or what stands in for it. */
export function customerName(booking: Pick<BookingRecord, 'contact' | 'inlineContact'>): string {
  return booking.contact?.name?.trim() || booking.inlineContact?.name?.trim() || 'Walk-in';
}

/**
 * Spoken once after a status batch settles. An empty result says nothing —
 * "0 bookings changed" is noise.
 */
export function statusResultPhrase(moved: readonly string[], failed: readonly string[], to: BookingStatus): string {
  const total = moved.length + failed.length;
  if (total === 0) return '';
  const label = statusMeta(to).label;
  if (failed.length === 0) {
    return moved.length === 1 ? `${nameList(moved)} marked ${label}.` : `${moved.length} bookings marked ${label}.`;
  }
  if (moved.length === 0) {
    return failed.length === 1
      ? `${nameList(failed)} could not be changed.`
      : `${failed.length} bookings could not be changed.`;
  }
  return `${moved.length} of ${total} marked ${label}; ${nameList(failed)} unchanged.`;
}

/** After a move / resize / reassign settles (one booking at a time on the grid). */
export function editResultPhrase(
  name: string,
  what: 'move' | 'resize' | 'reassign' | 'edit',
  ok: boolean,
  detail?: string,
): string {
  const verb =
    what === 'move' ? 'moved' : what === 'resize' ? 'resized' : what === 'reassign' ? 'reassigned' : 'updated';
  if (ok) return detail ? `${name} ${verb} to ${detail}.` : `${name} ${verb}.`;
  return `${name} could not be ${verb} and stayed put.`;
}

/**
 * What a grid gesture says as it happens — grab, move, drop, cancel — for the
 * time grid's live region. `snapMin` arrives as an argument so the sentence
 * and the grid can never disagree about the step.
 */
export function gestureAnnouncement(
  a: TimeGridAnnouncement<CalendarEvent>,
  { bySpecialist, snapMin }: { bySpecialist: boolean; snapMin: number },
): string {
  const who = a.event ? eventTitle(a.event.record) : null;
  switch (a.phase) {
    case 'grab':
      return a.state.kind === 'create'
        ? `Creating a booking in ${a.columnLabel} from ${a.range}. Arrows adjust, Enter opens the wizard, Escape cancels.`
        : `Grabbed ${who}, ${a.range}, ${a.columnLabel}. Arrows move ${snapMin} minutes, Shift ${snapMin * 4}; Left and Right change ${bySpecialist ? 'specialist' : 'day'}; Alt with Up or Down resizes; Enter drops; Escape cancels.`;
    case 'move':
      return `${a.range}, ${a.columnLabel}.`;
    case 'drop':
      return a.state.kind === 'create'
        ? `New booking ${a.range}, ${a.columnLabel}.`
        : `${who} ${a.state.kind === 'move' ? 'moved' : 'resized'} to ${a.range}, ${a.columnLabel}.`;
    case 'cancel':
      return 'Cancelled.';
  }
}

/** After a delete batch settles. */
export function deleteResultPhrase(deleted: readonly string[], failed: readonly string[]): string {
  const total = deleted.length + failed.length;
  if (total === 0) return '';
  if (failed.length === 0)
    return deleted.length === 1 ? `${nameList(deleted)} deleted.` : `${deleted.length} bookings deleted.`;
  if (deleted.length === 0)
    return failed.length === 1
      ? `${nameList(failed)} could not be deleted.`
      : `${failed.length} bookings could not be deleted.`;
  return `${deleted.length} of ${total} deleted; ${nameList(failed)} kept.`;
}
