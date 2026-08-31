import { createContext, useContext } from 'react';
import type { ModuleClient } from '~api';

export interface KnowledgeBaseContextValue {
  client: ModuleClient;
  botId: string;
  /** Module ids installed in this deployment — the Services and Team mirrors read it. */
  installedModules: readonly string[];
}

export const KnowledgeBaseContext = createContext<KnowledgeBaseContextValue | null>(null);

export function useKnowledgeBase(): KnowledgeBaseContextValue {
  const value = useContext(KnowledgeBaseContext);
  if (!value) throw new Error('useKnowledgeBase must be used inside <KnowledgeBaseApp>');
  return value;
}
