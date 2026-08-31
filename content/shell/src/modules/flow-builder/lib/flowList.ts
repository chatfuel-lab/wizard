import { Platform, type FlowsListQuery } from '~api/generated/flow-builder/graphql';

/**
 * The channels a new flow can be made for, in the order the picker reads.
 *
 * The enum's own order is alphabetical, which puts TikTok above WhatsApp and
 * says nothing about how often either is picked.
 */
export const NEW_FLOW_PLATFORMS: readonly Platform[] = [
  Platform.Whatsapp,
  Platform.Instagram,
  Platform.Facebook,
  Platform.Tiktok,
  Platform.Widget,
];

/**
 * Which flow the create just made.
 *
 * `createFlow` answers with the Bot, not with the flow — there is no id in the
 * response to read. So the new one is the id that was not in the list before,
 * and the LAST such id: the server appends, and two people creating at the same
 * moment would otherwise hand this reader the other one's flow.
 *
 * Null when nothing new came back, which is a refusal the caller has to treat
 * as one rather than opening whatever happened to be first.
 */
export function pickNewFlowId(before: readonly { id: string }[], after: readonly { id: string }[]): string | null {
  const seen = new Set(before.map((flow) => flow.id));
  let found: string | null = null;
  for (const flow of after) if (!seen.has(flow.id)) found = flow.id;
  return found;
}

/**
 * The three buckets the rail reads, and the only state a rename or a delete has
 * to keep straight.
 *
 * `flowGroups` nests, so both helpers below have to reach INSIDE a group as
 * well as across the two flat lists — a rename that only walked the flat ones
 * would leave a grouped flow showing its old name until the next reload, which
 * is exactly the kind of miss no type catches.
 */
export interface FlowBuckets {
  groups: FlowsListQuery['bot']['flowGroups'];
  ungrouped: FlowsListQuery['bot']['flowsWithoutGroup'];
  defaultReply: FlowsListQuery['bot']['defaultReplyFlows'];
  loading: boolean;
  error: string | null;
}

/** The flow's new name, wherever in the three buckets it sits. */
export function patchName<T extends FlowBuckets>(state: T, flowId: string, name: string): T {
  const rename = <F extends { id: string; name: string }>(flow: F): F =>
    flow.id === flowId ? { ...flow, name } : flow;
  return {
    ...state,
    groups: state.groups.map((group) => ({ ...group, flows: group.flows.map(rename) })),
    ungrouped: state.ungrouped.map(rename),
    defaultReply: state.defaultReply.map(rename),
  };
}

/** The flow, gone from wherever in the three buckets it sat. */
export function dropFlow<T extends FlowBuckets>(state: T, flowId: string): T {
  const keep = <F extends { id: string }>(flow: F): boolean => flow.id !== flowId;
  return {
    ...state,
    groups: state.groups.map((group) => ({ ...group, flows: group.flows.filter(keep) })),
    ungrouped: state.ungrouped.filter(keep),
    defaultReply: state.defaultReply.filter(keep),
  };
}
