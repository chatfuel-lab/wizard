/**
 * The list of flows the module holds, and which write is in flight.
 *
 * Pure. The same epoch + token discipline as every store in this app: the
 * epoch says which load owns the screen, the token says whether a write
 * landed while a read was out — a mutation's answer is the newest truth by
 * construction, so it replaces what is held and moves the token, and a read
 * that left before it is dropped on the way back.
 *
 * What is held is the raw flow, not the campaign record: a record depends on
 * "now" (a scheduled campaign becomes "sending" by the clock alone), so it is
 * derived at render time by `campaignOf` and this store never goes stale by
 * the minute.
 */
import type { CampaignFlow } from '../types';
import { isCampaignFlow } from './campaign';

export interface FlowGroupRef {
  id: string;
  name: string;
}

export type ListState =
  { state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; loadedAt: number };

export interface BroadcastsState {
  epoch: number;
  token: number;
  refreshing: boolean;
  list: ListState;
  /** Every campaign-shaped flow on the bot, by id. Chatbot flows are dropped at the door. */
  flows: Record<string, CampaignFlow>;
  /** The bot's flow groups, for finding (or making) the one campaigns live in. */
  groups: FlowGroupRef[];
  /** flow id → group id, for flows that sit in one. */
  groupOf: Record<string, string>;
  /** `send:<flowId>`, `enable:<flowId>`, `delete:<flowId>`, `write:<elementId>` … */
  pending: readonly string[];
}

export interface ListAnswer {
  groups: { id: string; name: string; flows: CampaignFlow[] }[];
  ungrouped: CampaignFlow[];
}

export type BroadcastsAction =
  | { type: 'reset' }
  | { type: 'listLoaded'; epoch: number; token: number; answer: ListAnswer; at: number }
  | { type: 'listFailed'; epoch: number; token: number; message: string }
  | { type: 'flowReplaced'; flow: CampaignFlow }
  /** A read's answer: kept only while nothing else has moved the token since it left. */
  | { type: 'flowRead'; token: number; flow: CampaignFlow }
  /** A setter's answer, put into the flow the reducer holds NOW — not the one the caller saw. */
  | { type: 'blockReplaced'; flowId: string; block: CampaignFlow['blocks'][number] }
  | { type: 'flowRemoved'; flowId: string }
  | { type: 'groupsReplaced'; groups: FlowGroupRef[]; groupOf: Record<string, string> }
  | { type: 'opStarted'; key: string }
  | { type: 'opFinished'; key: string };

export function initialBroadcastsState(): BroadcastsState {
  return {
    epoch: 0,
    token: 0,
    refreshing: false,
    list: { state: 'loading' },
    flows: {},
    groups: [],
    groupOf: {},
    pending: [],
  };
}

/** The list answer, reduced to what the store keeps. */
export function indexAnswer(answer: ListAnswer): Pick<BroadcastsState, 'flows' | 'groups' | 'groupOf'> {
  const flows: Record<string, CampaignFlow> = {};
  const groupOf: Record<string, string> = {};
  const keep = (flow: CampaignFlow, groupId: string | null) => {
    if (!isCampaignFlow(flow)) return;
    flows[flow.id] = flow;
    if (groupId) groupOf[flow.id] = groupId;
  };
  for (const group of answer.groups) for (const flow of group.flows) keep(flow, group.id);
  for (const flow of answer.ungrouped) keep(flow, null);
  return { flows, groups: answer.groups.map(({ id, name }) => ({ id, name })), groupOf };
}

export function broadcastsReducer(state: BroadcastsState, action: BroadcastsAction): BroadcastsState {
  switch (action.type) {
    case 'reset':
      return { ...state, epoch: state.epoch + 1, token: state.token + 1, refreshing: true };
    case 'listLoaded': {
      if (action.epoch !== state.epoch) return state;
      if (action.token !== state.token) return { ...state, refreshing: false };
      return {
        ...state,
        refreshing: false,
        list: { state: 'ready', loadedAt: action.at },
        ...indexAnswer(action.answer),
      };
    }
    case 'listFailed':
      if (action.epoch !== state.epoch) return state;
      if (action.token !== state.token) return { ...state, refreshing: false };
      return { ...state, refreshing: false, list: { state: 'error', message: action.message } };
    case 'flowReplaced': {
      const flows = { ...state.flows };
      if (isCampaignFlow(action.flow)) flows[action.flow.id] = action.flow;
      else delete flows[action.flow.id];
      return { ...state, token: state.token + 1, flows };
    }
    case 'flowRead': {
      if (action.token !== state.token) return state;
      return broadcastsReducer(state, { type: 'flowReplaced', flow: action.flow });
    }
    case 'blockReplaced': {
      const flow = state.flows[action.flowId];
      if (!flow) return state;
      return {
        ...state,
        token: state.token + 1,
        flows: { ...state.flows, [action.flowId]: withBlock(flow, action.block) },
      };
    }
    case 'flowRemoved': {
      if (!(action.flowId in state.flows)) return { ...state, token: state.token + 1 };
      const flows = { ...state.flows };
      delete flows[action.flowId];
      const groupOf = { ...state.groupOf };
      delete groupOf[action.flowId];
      return { ...state, token: state.token + 1, flows, groupOf };
    }
    case 'groupsReplaced':
      return {
        ...state,
        token: state.token + 1,
        groups: action.groups,
        groupOf: { ...state.groupOf, ...action.groupOf },
      };
    case 'opStarted':
      return state.pending.includes(action.key) ? state : { ...state, pending: [...state.pending, action.key] };
    case 'opFinished':
      return { ...state, pending: state.pending.filter((key) => key !== action.key) };
  }
}

export const isPending = (state: BroadcastsState, key: string): boolean => state.pending.includes(key);

/**
 * A block answered by a setter, put back into the flow it belongs to. Every
 * setter answers the whole block, so the block replaces its twin wholesale.
 */
export function withBlock(flow: CampaignFlow, block: CampaignFlow['blocks'][number]): CampaignFlow {
  const blocks = flow.blocks.some((candidate) => candidate.id === block.id)
    ? flow.blocks.map((candidate) => (candidate.id === block.id ? block : candidate))
    : [...flow.blocks, block];
  return { ...flow, blocks };
}
