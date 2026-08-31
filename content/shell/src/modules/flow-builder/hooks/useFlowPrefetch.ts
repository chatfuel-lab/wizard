import { useCallback } from 'react';
import { FlowStructureDocument } from '~api/generated/flow-builder/graphql';
import { useFlowBuilder } from '../FlowBuilderContext';
import { flowScope } from '../lib/flowPrefetch';
import { snapshotKey } from '../lib/flowSnapshot';

/**
 * Start loading a flow before it is asked for.
 *
 * Fire-and-forget by design: the returned promise is the cache's, and the
 * cache handles the rejection — a hover that fails must be silent, because
 * nothing on screen asked for it. The click that follows takes the request
 * out of the cache in `useFlowStore`; a click that never comes leaves an
 * entry the cache expires on its own.
 */
export function useFlowPrefetch(): (flowId: string) => void {
  const { client, botId, flowCache } = useFlowBuilder();
  return useCallback(
    (flowId: string) => {
      const key = snapshotKey(flowScope(botId, flowId));
      void flowCache.prefetch(key, () => client.query(FlowStructureDocument, { botID: botId, flowID: flowId }));
    },
    [client, botId, flowCache],
  );
}
