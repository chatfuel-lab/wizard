import { createContext, useContext } from 'react';
import type { UndoEntry } from './lib/undo';

export interface AutomationsUndoValue {
  /** The last undoable change, or null. One deep: this is a toast, not a history. */
  entry: UndoEntry | null;
  /** `undoLabel(entry)`, or null. Handed to the palette, which is pure. */
  label: string | null;
  /**
   * Offer an undo. The mutation hook supplies the runner; the workspace only
   * knows something is undoable and how to say so. A null entry clears.
   */
  push: (entry: UndoEntry | null, run: () => void | Promise<void>) => void;
  /** Run and clear. Safe to call twice; the second does nothing. */
  run: () => void;
  clear: () => void;
}

/**
 * Where an undo entry lives (bookings' `BookingsUndoContext`, verbatim in
 * spirit). `⌘Z` is bound once at the workspace; the hook that made the change
 * supplies the compensating runner. Provided in `AutomationsApp`; consumed
 * from the workspace down — never in the component that renders the provider
 * (validate 10b).
 */
export const AutomationsUndoContext = createContext<AutomationsUndoValue | null>(null);

export function useAutomationsUndo(): AutomationsUndoValue {
  const value = useContext(AutomationsUndoContext);
  if (!value) throw new Error('useAutomationsUndo must be used inside <AutomationsApp>');
  return value;
}
