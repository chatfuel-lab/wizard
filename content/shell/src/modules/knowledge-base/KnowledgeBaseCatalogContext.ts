import { createContext, useContext } from 'react';
import type { CatalogStore } from './hooks/useCatalogStore';

/** The goods catalog and the specialists — one load, shared by four sources. */
export const KnowledgeBaseCatalogContext = createContext<CatalogStore | null>(null);

export function useCatalog(): CatalogStore {
  const value = useContext(KnowledgeBaseCatalogContext);
  if (!value) throw new Error('useCatalog must be used inside <KnowledgeBaseApp>');
  return value;
}
