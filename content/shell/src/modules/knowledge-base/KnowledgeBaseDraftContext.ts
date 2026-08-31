import { createContext, useContext } from 'react';
import type { DraftRegistry } from './lib/drafts';

/**
 * Which sources hold unsaved edits. The registry is a mutable object, not
 * state: a keystroke inside one editor must not re-render the whole workspace.
 * The header's badge subscribes through `hooks/useDraftCount`.
 */
export const KnowledgeBaseDraftContext = createContext<DraftRegistry | null>(null);

export function useDrafts(): DraftRegistry {
  const value = useContext(KnowledgeBaseDraftContext);
  if (!value) throw new Error('useDrafts must be used inside <KnowledgeBaseApp>');
  return value;
}
