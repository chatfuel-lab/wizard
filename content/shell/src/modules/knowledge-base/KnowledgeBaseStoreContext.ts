import { createContext, useContext } from 'react';
import type { KnowledgeStore } from './hooks/useKnowledgeStore';

/** The Fuely record: business info, hours, instructions, FAQs, the usage budget. */
export const KnowledgeBaseStoreContext = createContext<KnowledgeStore | null>(null);

export function useKnowledge(): KnowledgeStore {
  const value = useContext(KnowledgeBaseStoreContext);
  if (!value) throw new Error('useKnowledge must be used inside <KnowledgeBaseApp>');
  return value;
}
