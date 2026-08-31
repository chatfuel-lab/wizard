import { createContext, useContext } from 'react';
import type { UndoEntry } from './lib/undo';

export interface BookingsUndoValue {
  /** The last undoable change, or null. One deep: this is a toast, not a history. */
  entry: UndoEntry | null;
  /** `undoLabel(entry)`, or null. Handed to the palette, which is pure. */
  label: string | null;
  /**
   * Offer an undo. The VIEW supplies the runner (it holds the mutation hook);
   * the workspace only knows something is undoable and how to say so. A null
   * entry clears.
   */
  push: (entry: UndoEntry | null, run: () => void | Promise<void>) => void;
  /** Run and clear. Safe to call twice; the second does nothing. */
  run: () => void;
  clear: () => void;
}

/**
 * Where an undo entry lives (deals' `DealsUndoContext`, verbatim in spirit).
 * `⌘Z` is bound once at the workspace, above every section; the section that
 * made the change supplies the compensating runner. The provider goes in
 * `BookingsApp`; `useBookingsUndo()` is consumed in `BookingsWorkspace` and
 * below — never in the component that renders the provider (validate 10b).
 */
export const BookingsUndoContext = createContext<BookingsUndoValue | null>(null);

export function useBookingsUndo(): BookingsUndoValue {
  const value = useContext(BookingsUndoContext);
  if (!value) throw new Error('useBookingsUndo must be used inside <BookingsApp>');
  return value;
}
