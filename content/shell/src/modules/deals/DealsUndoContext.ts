import { createContext, useContext } from 'react';
import type { StageUndoEntry } from './lib/undo';

export interface DealsUndoValue {
  /** The last undoable move, or null. One deep: this is a toast, not a history. */
  entry: StageUndoEntry | null;
  /** `undoLabel(entry)`, or null. Handed to the palette, which is pure. */
  label: string | null;
  /**
   * Offer an undo. The **view** supplies the runner, because the view is what
   * holds the mutation hook — the workspace only needs to know that something
   * is undoable and how to say so. Passing a null entry clears.
   */
  push: (entry: StageUndoEntry | null, run: () => void | Promise<void>) => void;
  /** Run and clear. Safe to call twice; the second does nothing. */
  run: () => void;
  clear: () => void;
}

/**
 * Where an undo entry lives, and the only genuinely cross-view state here.
 *
 * A move happens inside a view — the board batches up to 25, the table does one
 * row — but `⌘Z` is bound once at the workspace, above all three. Without a
 * shared home the hotkey would have to reach into whichever view happens to be
 * mounted, which is the exact coupling that keeps the three views independent.
 *
 * **One entry, not a stack.** Undo is a compensating forward mutation that
 * re-stamps the sort key (see `lib/undo.ts`), so a second undo would not
 * restore an earlier arrangement — it would just move cards again. A deep
 * history would promise something this API cannot do.
 *
 * The provider goes in `DealsApp`; `useDealsUndo()` is consumed in
 * `DealsWorkspace` and below. Never in the component that renders the provider
 * — that throws, `tsc` cannot see it, and validate pass 10b is what catches it.
 */
export const DealsUndoContext = createContext<DealsUndoValue | null>(null);

export function useDealsUndo(): DealsUndoValue {
  const value = useContext(DealsUndoContext);
  if (!value) throw new Error('useDealsUndo must be used inside <DealsApp>');
  return value;
}
