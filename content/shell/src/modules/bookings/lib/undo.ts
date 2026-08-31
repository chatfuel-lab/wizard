/**
 * What "undo" can mean here, and what it cannot.
 *
 * Undo is a COMPENSATING FORWARD MUTATION, not a revert: `bookingUpdateV2`
 * with the input the booking had before, or `bookingStatusResolveV2` back to
 * the status it had. Two consequences the UI owns:
 *
 * - The compensating update is a full replace of the PRIOR record's input
 *   (`bookingInputOf(prev)`), so it also restores customer/service/specialist
 *   as they were then — which is what a person means by "undo the move".
 * - **Deletion is not undoable.** There is no restore mutation, and re-creating
 *   would mint a new id that no link, no chat message and no Google Calendar
 *   event points at. Delete asks first instead.
 * - Nothing can be undone INTO Pending (the API rejects that transition), so
 *   an entry whose `from` was Pending has nothing to do and is not offered.
 *
 * One entry, not a stack — a deep history would promise ordering the server
 * does not keep. Pure; the caller supplies the clock.
 */
import type { BookingStatus, BookingUpdateInput } from '~api/generated/bookings/graphql';
import { isTargetStatus, statusMeta } from './status';

export type UndoEntry =
  | {
      kind: 'update';
      /** One booking; the input to send back. */
      id: string;
      before: BookingUpdateInput;
      /** What the edit was, for the label: "Undo move", "Undo duration change", "Undo reassign", "Undo edit". */
      what: 'move' | 'resize' | 'reassign' | 'edit';
      at: number;
    }
  | {
      kind: 'status';
      /** Ids in the order they were changed. */
      ids: string[];
      /** Where each came from. Entries whose `from` is Pending cannot be undone (see header). */
      from: Record<string, BookingStatus>;
      to: BookingStatus;
      at: number;
    };

/** How long an entry stays offered. Past this the toast is gone anyway. */
export const UNDO_TTL_MS = 60_000;

export function statusUndoEntry(
  changed: readonly { id: string; from: BookingStatus }[],
  to: BookingStatus,
  at: number,
): UndoEntry | null {
  const from: Record<string, BookingStatus> = {};
  const ids: string[] = [];
  for (const item of changed) {
    if (item.id in from) continue;
    from[item.id] = item.from;
    ids.push(item.id);
  }
  const entry: UndoEntry = { kind: 'status', ids, from, to, at };
  return isUndoable(entry) ? entry : null;
}

export function updateUndoEntry(
  id: string,
  before: BookingUpdateInput,
  what: 'move' | 'resize' | 'reassign' | 'edit',
  at: number,
): Extract<UndoEntry, { kind: 'update' }> {
  return { kind: 'update', id, before, what, at };
}

/** The status compensations an entry still has to do — nothing back into Pending, nothing that never changed. */
export function statusUndoMoves(entry: Extract<UndoEntry, { kind: 'status' }>): { id: string; to: BookingStatus }[] {
  return entry.ids
    .filter((id) => entry.from[id] !== undefined && entry.from[id] !== entry.to && isTargetStatus(entry.from[id]!))
    .map((id) => ({ id, to: entry.from[id]! }));
}

export function isUndoable(entry: UndoEntry): boolean {
  return entry.kind === 'update' ? true : statusUndoMoves(entry).length > 0;
}

export function isUndoExpired(entry: UndoEntry, now: number, ttl = UNDO_TTL_MS): boolean {
  return now - entry.at > ttl;
}

/** The toast's action label and the palette's command label. */
export function undoLabel(entry: UndoEntry): string {
  if (entry.kind === 'update') {
    switch (entry.what) {
      case 'move':
        return 'Undo move';
      case 'resize':
        return 'Undo duration change';
      case 'reassign':
        return 'Undo reassign';
      case 'edit':
        return 'Undo edit';
    }
  }
  const moves = statusUndoMoves(entry);
  if (moves.length === 0) return 'Undo';
  if (moves.length === 1) return `Undo ${statusMeta(entry.to).label}`;
  return `Undo ${moves.length} status changes`;
}
