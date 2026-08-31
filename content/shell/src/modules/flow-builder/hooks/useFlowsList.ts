import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessageFor } from '~api';
import {
  CreateFlowDocument,
  DeleteFlowDocument,
  FlowsListDocument,
  RenameFlowDocument,
  type FlowsListQuery,
  type Platform,
} from '~api/generated/flow-builder/graphql';
import { useFlowBuilder } from '../FlowBuilderContext';
import { dropFlow, patchName, pickNewFlowId, type FlowBuckets } from '../lib/flowList';

export interface FlowsListState {
  groups: FlowsListQuery['bot']['flowGroups'];
  ungrouped: FlowsListQuery['bot']['flowsWithoutGroup'];
  defaultReply: FlowsListQuery['bot']['defaultReplyFlows'];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  /**
   * Make a flow on that channel, name it, and answer its id.
   *
   * Two writes, because the API has no third: `createFlow` takes no name and
   * answers with the Bot rather than the flow, so the id is worked out from
   * what the list gained (`pickNewFlowId`) and the name is a `RenameFlow` on
   * top. A create that lands and a rename that does not still leaves a flow —
   * so the id comes back either way and the caller opens it.
   */
  create: (platform: Platform, name: string) => Promise<string | null>;
  /** Rename a flow wherever it sits — a group, the ungrouped bucket, a default reply. */
  rename: (flowId: string, name: string) => Promise<void>;
  /** Delete a flow. The caller closes it if it was the one open. */
  remove: (flowId: string) => Promise<void>;
}

/** Three flat buckets on Bot, no pagination (guide.md "Reading"). */
export function useFlowsList(): FlowsListState {
  const { client, botId } = useFlowBuilder();
  const [state, setState] = useState<FlowBuckets>({
    groups: [],
    ungrouped: [],
    defaultReply: [],
    loading: true,
    error: null,
  });
  const generation = useRef(0);
  /* What `create` diffs against: the state at the moment of the write, not the
     state this callback closed over when it was built. */
  const latest = useRef(state);
  latest.current = state;

  const refetch = useCallback(() => {
    const gen = ++generation.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    client
      .query(FlowsListDocument, { botID: botId })
      .then((data) => {
        if (gen !== generation.current) return;
        setState({
          groups: data.bot.flowGroups,
          ungrouped: data.bot.flowsWithoutGroup,
          defaultReply: data.bot.defaultReplyFlows,
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        if (gen !== generation.current) return;
        setState((prev) => ({ ...prev, loading: false, error: errorMessageFor(err, {}) }));
      });
  }, [client, botId]);

  const create = useCallback(
    async (platform: Platform, name: string): Promise<string | null> => {
      const before = latest.current.ungrouped;
      const created = await client.mutate(CreateFlowDocument, { botID: botId, platform });
      const after = created.createFlow.flowsWithoutGroup;
      const flowId = pickNewFlowId(before, after);
      setState((prev) => ({ ...prev, ungrouped: after }));
      if (!flowId) return null;

      const wanted = name.trim();
      if (!wanted) return flowId;
      try {
        const renamed = await client.mutate(RenameFlowDocument, { flowID: flowId, name: wanted });
        setState((prev) => ({
          ...prev,
          ungrouped: prev.ungrouped.map((flow) =>
            flow.id === flowId ? { ...flow, name: renamed.updateFlowName.name } : flow,
          ),
        }));
      } catch {
        /* The flow exists; only its name did not land. Throwing here would
           lose a flow that is already on the server, so the caller opens it
           and the name can be fixed from there. */
      }
      return flowId;
    },
    [client, botId],
  );

  const rename = useCallback(
    async (flowId: string, name: string): Promise<void> => {
      const renamed = await client.mutate(RenameFlowDocument, { flowID: flowId, name });
      setState((prev) => patchName(prev, flowId, renamed.updateFlowName.name));
    },
    [client],
  );

  const remove = useCallback(
    async (flowId: string): Promise<void> => {
      /* The response carries ids and nothing else — not enough to rebuild the
         rail from, and it does not have to be: one flow left, and which one is
         already known here. */
      await client.mutate(DeleteFlowDocument, { flowID: flowId });
      setState((prev) => dropFlow(prev, flowId));
    },
    [client],
  );

  useEffect(() => {
    refetch();
    return () => {
      generation.current += 1; // drop in-flight responses
    };
  }, [refetch]);

  return { ...state, refetch, create, rename, remove };
}
