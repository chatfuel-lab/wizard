import { createContext, useContext } from 'react';

/**
 * The one undoable thing at a time.
 *
 * Deleting a set and clearing a set's events are both a paragraph of somebody's
 * work gone in one click, and neither is a mutation the API can reverse on its
 * own — the compensating write is composed here and offered on the toast for as
 * long as the toast lives.
 */
export interface AdsUndoValue {
  /** What the toast offers to undo, null when nothing is pending. */
  label: string | null;
  push: (label: string | null, run: () => void | Promise<void>) => void;
  run: () => void;
}

export const AdsUndoContext = createContext<AdsUndoValue | null>(null);

export function useAdsUndo(): AdsUndoValue {
  const value = useContext(AdsUndoContext);
  if (!value) throw new Error('useAdsUndo must be used inside <AdsOptimizationApp>');
  return value;
}
