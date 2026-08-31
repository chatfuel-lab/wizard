import { createContext, useContext } from 'react';
import type { UndoEntry } from './lib/undo';

/**
 * One undo offer, above every source. A toast, not a history: a second
 * undoable action replaces the first, and the offer expires (see
 * `lib/undo.ts`). The SOURCE supplies the compensating runner — it is the one
 * holding the mutation hook — and the workspace only knows that something is
 * undoable and what to call it.
 */
export interface KnowledgeUndoValue {
  entry: UndoEntry | null;
  label: string | null;
  push: (entry: UndoEntry | null, run: () => void | Promise<void>) => void;
  run: () => void;
  clear: () => void;
}

export const KnowledgeBaseUndoContext = createContext<KnowledgeUndoValue | null>(null);

export function useKnowledgeUndo(): KnowledgeUndoValue {
  const value = useContext(KnowledgeBaseUndoContext);
  if (!value) throw new Error('useKnowledgeUndo must be used inside <KnowledgeBaseApp>');
  return value;
}
