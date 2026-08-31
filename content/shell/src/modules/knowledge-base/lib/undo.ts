/**
 * What "undo" can mean here.
 *
 * Undo is a COMPENSATING FORWARD MUTATION, never a revert. The knowledge base
 * has no history on the server, so every entry carries the whole previous
 * value and the runner writes it back:
 *
 *   field    the previous string, written again through the same setter
 *   faqs     the previous WHOLE list, written again (the API is replace-all)
 *   item     a deleted catalog item re-created — a NEW id, and the toast says so
 *   items    the same for a bulk delete
 *   hours    the previous schedule
 *
 * One entry, not a stack: a deeper history would promise an ordering the server
 * does not keep. Pure; the caller supplies the clock.
 */
export type UndoEntry =
  | { kind: 'field'; field: string; label: string; at: number }
  | { kind: 'faqs'; what: 'edit' | 'add' | 'delete' | 'reorder' | 'import'; count: number; at: number }
  | { kind: 'hours'; at: number }
  | { kind: 'item'; title: string; what: 'delete' | 'edit' | 'availability'; at: number }
  | { kind: 'items'; count: number; what: 'delete' | 'availability'; at: number };

/** How long an entry stays offered. Past this the toast is gone anyway. */
export const UNDO_TTL_MS = 60_000;

export function undoLabel(entry: UndoEntry | null): string | null {
  if (!entry) return null;
  switch (entry.kind) {
    case 'field':
      return `Undo ${entry.label.toLocaleLowerCase()}`;
    case 'hours':
      return 'Undo opening hours';
    case 'faqs':
      switch (entry.what) {
        case 'add':
          return 'Undo add';
        case 'delete':
          return entry.count === 1 ? 'Restore FAQ' : `Restore ${entry.count} FAQs`;
        case 'reorder':
          return 'Undo reorder';
        case 'import':
          return entry.count === 1 ? 'Undo import' : `Undo import of ${entry.count}`;
        case 'edit':
          return 'Undo edit';
      }
      break;
    case 'item':
      return entry.what === 'delete'
        ? 'Restore item'
        : entry.what === 'availability'
          ? 'Undo availability'
          : 'Undo edit';
    case 'items':
      return entry.what === 'delete' ? `Restore ${entry.count} items` : `Undo availability for ${entry.count}`;
  }
  return null;
}

/**
 * A restored catalog item comes back with a new id, and a person who does not
 * know that will look for the old one. Say it once, in the toast.
 */
export const undoCaveat = (entry: UndoEntry | null): string | null =>
  entry && ((entry.kind === 'item' && entry.what === 'delete') || (entry.kind === 'items' && entry.what === 'delete'))
    ? 'Restoring re-creates the item, so it gets a new id.'
    : null;

export const isExpired = (entry: UndoEntry, now: number): boolean => now - entry.at >= UNDO_TTL_MS;
