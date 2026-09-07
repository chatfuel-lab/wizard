import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  BroadcastCreateFlowDocument,
  BroadcastCreateGroupDocument,
  BroadcastCreateOneTimeDocument,
  BroadcastCreateScheduledDocument,
  BroadcastDeleteFlowDocument,
  BroadcastDisableDocument,
  BroadcastEnableDocument,
  BroadcastFlowGetDocument,
  BroadcastFlowsListDocument,
  BroadcastMoveToGroupDocument,
  BroadcastRenameFlowDocument,
  BroadcastRenameGroupDocument,
  BroadcastSendNowDocument,
  BroadcastSetTemplateDocument,
} from '~api/generated/broadcasts/graphql';
import { campaignOf, findPayloadBlock, findSettingsBlock, sortCampaigns, type CampaignRecord } from '../lib/campaign';
import { broadcastsReducer, initialBroadcastsState, isPending, type BroadcastsState } from '../lib/broadcastsStore';
import { errorMessage, isAlreadySent } from '../lib/errors';
import type { ApiClient, CampaignBlock, CampaignFlow } from '../types';

/** How long a tab may have been away before coming back re-reads the list. */
export const REFETCH_THROTTLE_MS = 60_000;
/** How often a campaign that is sending is re-read until it is not. */
export const SENDING_POLL_MS = 10_000;
/** How long past its time a one-shot is still polled; after that, Refresh is the read. */
export const SENDING_POLL_WINDOW_MS = 60 * 60_000;
/** The flow group campaigns are created in, found by name. */
export const CAMPAIGNS_GROUP_NAME = 'Broadcasts';

export interface CampaignsStore {
  state: BroadcastsState;
  /** Every campaign, newest first, derived against `now`. */
  campaigns: CampaignRecord[];
  /** The flow behind a campaign, or undefined when the list does not hold it. */
  flowOf(flowId: string): CampaignFlow | undefined;
  /** Re-read the whole list. */
  refresh(): void;
  /** Re-read one flow — after a write that answered a block rather than the flow, or on a poll. */
  refetchFlow(flowId: string): Promise<CampaignFlow | null>;
  /**
   * A new draft: the flow, its name, its place in the campaigns group and the
   * block pair — and the template, when one is named, so "use in a campaign"
   * lands on a draft that already carries it. Resolves with the flow id.
   * Partial failure leaves what was made; the list shows it as a draft with
   * problems rather than hiding it.
   */
  createDraft(name: string, kind: 'now' | 'scheduled', templateId?: string | null): Promise<string>;
  rename(flowId: string, name: string): Promise<void>;
  remove(flowId: string): Promise<void>;
  /** LIVE FIRE for a one-time campaign. Already-sent resolves too — the read afterwards is the truth. */
  sendNow(record: CampaignRecord): Promise<void>;
  /** Arm a scheduled campaign. Resolves with whether the server actually armed it. */
  enable(record: CampaignRecord): Promise<boolean>;
  disable(record: CampaignRecord): Promise<void>;
  /** Run a mutation that answers a whole flow, and hold the answer. */
  writeFlow(key: string, work: () => Promise<CampaignFlow>): Promise<CampaignFlow>;
  /** Run a mutation that answers one block, and put it back into its flow. */
  writeBlock(key: string, flowId: string, work: () => Promise<CampaignBlock>): Promise<CampaignBlock>;
  isPending(key: string): boolean;
}

/**
 * The list and every write over one reducer.
 *
 * Reads are epoch-guarded; writes replace what they answer and bump the token
 * so a read that left earlier is dropped on return. Nothing on the server
 * pushes a campaign finishing, so the store polls the ones that are sending
 * and re-reads the list when the tab comes back after a while.
 */
export function useCampaignsStore(client: ApiClient, botId: string, now: number): CampaignsStore {
  const [state, dispatch] = useReducer(broadcastsReducer, undefined, initialBroadcastsState);
  /* The state as it is NOW, for work that started under an earlier render:
     a setter's answer goes into the flow the reducer holds, and a read's
     answer is stamped with the token it left with. */
  const stateRef = useRef(state);
  stateRef.current = state;
  const loadedAtRef = useRef<number | null>(null);
  useEffect(() => {
    loadedAtRef.current = state.list.state === 'ready' ? state.list.loadedAt : null;
  }, [state.list]);

  const token = state.token;
  useEffect(() => {
    if (state.epoch === 0) return;
    let cancelled = false;
    const epoch = state.epoch;
    client
      .query(BroadcastFlowsListDocument, { botID: botId })
      .then((data) => {
        if (cancelled) return;
        dispatch({
          type: 'listLoaded',
          epoch,
          token,
          at: Date.now(),
          answer: {
            groups: data.bot.flowGroups.map((group) => ({ id: group.id, name: group.name, flows: group.flows })),
            ungrouped: data.bot.flowsWithoutGroup,
          },
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) dispatch({ type: 'listFailed', epoch, token, message: errorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
    // The token is the stamp this read leaves with, not a reason to read again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, botId, state.epoch]);

  useEffect(() => {
    dispatch({ type: 'reset' });
  }, [client, botId]);

  useEffect(() => {
    const offReconnect = client.onReconnect(() => dispatch({ type: 'reset' }));
    const onVisible = () => {
      if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
      const at = loadedAtRef.current;
      if (at === null || Date.now() - at > REFETCH_THROTTLE_MS) dispatch({ type: 'reset' });
    };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
    return () => {
      offReconnect();
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
    };
  }, [client]);

  const campaigns = useMemo(
    () =>
      sortCampaigns(
        Object.values(state.flows).flatMap((flow) => {
          const record = campaignOf(flow, now);
          return record ? [record] : [];
        }),
      ),
    [state.flows, now],
  );

  const flowOf = useCallback((flowId: string) => state.flows[flowId], [state.flows]);
  const refresh = useCallback(() => dispatch({ type: 'reset' }), []);

  const run = useCallback(async <T>(key: string, work: () => Promise<T>): Promise<T> => {
    dispatch({ type: 'opStarted', key });
    try {
      return await work();
    } finally {
      dispatch({ type: 'opFinished', key });
    }
  }, []);

  const refetchFlow = useCallback<CampaignsStore['refetchFlow']>(
    async (flowId) => {
      const token = stateRef.current.token;
      try {
        const data = await client.query(BroadcastFlowGetDocument, { botID: botId, flowID: flowId });
        // A write that landed while this read was out is newer than the answer.
        dispatch({ type: 'flowRead', token, flow: data.bot.flow });
        return data.bot.flow;
      } catch {
        // A flow that is gone answers a bare server error rather than a code;
        // the list re-reads so a row deleted elsewhere does not linger.
        dispatch({ type: 'reset' });
        return null;
      }
    },
    [client, botId],
  );

  const writeFlow = useCallback<CampaignsStore['writeFlow']>(
    (key, work) =>
      run(key, async () => {
        const flow = await work();
        dispatch({ type: 'flowReplaced', flow });
        return flow;
      }),
    [run],
  );

  const writeBlock = useCallback<CampaignsStore['writeBlock']>(
    (key, flowId, work) =>
      run(key, async () => {
        const block = await work();
        if (stateRef.current.flows[flowId]) dispatch({ type: 'blockReplaced', flowId, block });
        else void refetchFlow(flowId);
        return block;
      }),
    [run, refetchFlow],
  );

  /* The group is a convention, not a fact the API keeps: a flow group named
     "Broadcasts" is where campaigns go, found on every create and made when
     missing. `createFlowGroup` answers the bot, so the new group is the id
     that was not there before. */
  const ensureGroup = useCallback(
    async (groups: readonly { id: string; name: string }[]): Promise<string | null> => {
      const known = groups.find((group) => group.name === CAMPAIGNS_GROUP_NAME);
      if (known) return known.id;
      const before = new Set(groups.map((group) => group.id));
      const created = await client.mutate(BroadcastCreateGroupDocument, { botID: botId });
      const fresh = created.createFlowGroup.flowGroups.find((group) => !before.has(group.id));
      if (!fresh) return null;
      await client.mutate(BroadcastRenameGroupDocument, { groupID: fresh.id, name: CAMPAIGNS_GROUP_NAME });
      dispatch({
        type: 'groupsReplaced',
        groups: created.createFlowGroup.flowGroups.map((group) =>
          group.id === fresh.id ? { id: group.id, name: CAMPAIGNS_GROUP_NAME } : { id: group.id, name: group.name },
        ),
        groupOf: {},
      });
      return fresh.id;
    },
    [client, botId],
  );

  const createDraft = useCallback<CampaignsStore['createDraft']>(
    (name, kind, templateId = null) =>
      run('create', async () => {
        const before = new Set(Object.keys(stateRef.current.flows));
        /* The list as the server holds it this second — the groups too, so
           the campaigns group is found even before the first list read has
           answered, and never made twice. */
        const listBefore = await client.query(BroadcastFlowsListDocument, { botID: botId });
        for (const flow of listBefore.bot.flowsWithoutGroup) before.add(flow.id);
        const created = await client.mutate(BroadcastCreateFlowDocument, { botID: botId });
        const fresh = created.createFlow.flowsWithoutGroup.find((flow) => !before.has(flow.id));
        if (!fresh) throw new Error('Chatfuel created the campaign but did not say which flow it is.');
        const flowId = fresh.id;
        const trimmed = name.trim();
        if (trimmed) await client.mutate(BroadcastRenameFlowDocument, { flowID: flowId, name: trimmed });
        const groupId = await ensureGroup(listBefore.bot.flowGroups);
        if (groupId) {
          await client.mutate(BroadcastMoveToGroupDocument, { flowID: flowId, groupID: groupId });
          dispatch({ type: 'groupsReplaced', groups: stateRef.current.groups, groupOf: { [flowId]: groupId } });
        }
        const pair =
          kind === 'now'
            ? (await client.mutate(BroadcastCreateOneTimeDocument, { flowID: flowId }))
                .whatsAppOneTimeNotificationCreateWithBlockAndWATemplate
            : (await client.mutate(BroadcastCreateScheduledDocument, { flowID: flowId }))
                .whatsAppScheduledMessageCreateWithBlockAndWATemplate;
        dispatch({ type: 'flowReplaced', flow: pair });
        const settings = templateId ? findSettingsBlock(pair) : null;
        const payload = settings ? findPayloadBlock(pair, settings.block.id) : null;
        if (templateId && payload) {
          const data = await client.mutate(BroadcastSetTemplateDocument, {
            elementID: payload.element.id,
            templateID: templateId,
          });
          dispatch({ type: 'blockReplaced', flowId, block: data.whatsAppTemplateSetTemplate });
        }
        return flowId;
      }),
    [run, client, botId, ensureGroup],
  );

  const rename = useCallback<CampaignsStore['rename']>(
    async (flowId, name) => {
      await writeFlow(`rename:${flowId}`, async () => {
        const data = await client.mutate(BroadcastRenameFlowDocument, { flowID: flowId, name });
        return data.updateFlowName;
      });
    },
    [client, writeFlow],
  );

  const remove = useCallback<CampaignsStore['remove']>(
    (flowId) =>
      run(`delete:${flowId}`, async () => {
        try {
          await client.mutate(BroadcastDeleteFlowDocument, { flowID: flowId });
        } catch (err) {
          // Refused, or already gone: the list re-reads to show whatever is
          // true, and the caller hears why.
          dispatch({ type: 'reset' });
          throw err;
        }
        dispatch({ type: 'flowRemoved', flowId });
      }),
    [run, client],
  );

  const sendNow = useCallback<CampaignsStore['sendNow']>(
    async (record) => {
      try {
        await writeBlock(`send:${record.flowId}`, record.flowId, async () => {
          const data = await client.mutate(BroadcastSendNowDocument, { elementID: record.settings.elementId });
          return data.whatsAppOneTimeNotificationSend;
        });
      } catch (err) {
        if (!isAlreadySent(err)) throw err;
      }
      await refetchFlow(record.flowId);
    },
    [client, writeBlock, refetchFlow],
  );

  const enable = useCallback<CampaignsStore['enable']>(
    async (record) => {
      const flow = await writeFlow(`enable:${record.flowId}`, async () => {
        const data = await client.mutate(BroadcastEnableDocument, {
          flowID: record.flowId,
          blockID: record.settings.blockId,
        });
        return data.blockEnableEntryPoint;
      });
      return flow.entryPoints.some((point) => point.id === record.settings.blockId && point.isEntryPointEnabled);
    },
    [client, writeFlow],
  );

  const disable = useCallback<CampaignsStore['disable']>(
    async (record) => {
      await writeFlow(`disable:${record.flowId}`, async () => {
        const data = await client.mutate(BroadcastDisableDocument, {
          flowID: record.flowId,
          blockID: record.settings.blockId,
        });
        return data.blockDisableEntryPoint;
      });
    },
    [client, writeFlow],
  );

  // A one-time send is over in seconds; nothing announces it, so the rows
  // that are sending are asked again until they are not. A one-shot that is
  // "sending" by the clock alone is asked for an hour past its time, not
  // forever — after that, Refresh is the read.
  const sendingIds = useMemo(
    () =>
      campaigns
        .filter(
          (record) =>
            record.status === 'sending' &&
            (record.schedule === null || now - record.schedule.at < SENDING_POLL_WINDOW_MS),
        )
        .map((record) => record.flowId),
    [campaigns, now],
  );
  const sendingKey = sendingIds.join(',');
  useEffect(() => {
    if (!sendingKey) return;
    const timer = setInterval(() => {
      for (const flowId of sendingKey.split(',')) void refetchFlow(flowId);
    }, SENDING_POLL_MS);
    return () => clearInterval(timer);
  }, [sendingKey, refetchFlow]);

  const pending = useCallback((key: string) => isPending(state, key), [state]);

  return useMemo(
    () => ({
      state,
      campaigns,
      flowOf,
      refresh,
      refetchFlow,
      createDraft,
      rename,
      remove,
      sendNow,
      enable,
      disable,
      writeFlow,
      writeBlock,
      isPending: pending,
    }),
    [
      state,
      campaigns,
      flowOf,
      refresh,
      refetchFlow,
      createDraft,
      rename,
      remove,
      sendNow,
      enable,
      disable,
      writeFlow,
      writeBlock,
      pending,
    ],
  );
}
