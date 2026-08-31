import { createContext, useContext } from 'react';
import type { FlowStructureQuery } from '~api/generated/flow-builder/graphql';
import type { PrefetchCache } from './lib/flowPrefetch';
import type { ApiClient } from './types';

export interface FlowBuilderContextValue {
  client: ApiClient;
  botId: string;
  /**
   * `FlowStructure` requests started by the picker on hover, for the editor
   * that mounts on the click. Lives here because it has to outlive the editor
   * — which is remounted per flow — and die with the app instance.
   */
  flowCache: PrefetchCache<FlowStructureQuery>;
}

export const FlowBuilderContext = createContext<FlowBuilderContextValue | null>(null);

export function useFlowBuilder(): FlowBuilderContextValue {
  const value = useContext(FlowBuilderContext);
  if (!value) throw new Error('useFlowBuilder must be used inside <FlowBuilderApp>');
  return value;
}
