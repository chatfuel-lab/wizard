import type { InboxFlowsListQuery, Platform } from '~api/generated/livechat/graphql';

/**
 * What the close-to-flow picker offers.
 *
 * There is no plain "close" in the API. `conversationFinishSendToFlow` closes
 * the live chat AND hands the contact to a flow, in one call, so closing is a
 * choice of flow — and the choice has to be made from the flows that can run
 * on this conversation's channel. `Flow.platform` is the field that says so,
 * and a picker that ignored it would offer an Instagram flow for a WhatsApp
 * chat and let the server refuse it after the confirmation was already given.
 *
 * `InboxFlowsList` answers with two buckets — the flows in no group, then each
 * group with its flows — and this flattens both into one list the palette can
 * search, keeping the group name as the item's description so two flows called
 * "Welcome" in different groups stay tellable apart.
 */
export interface FlowOption {
  id: string;
  name: string;
  /** The group's name, or null for a flow outside every group. */
  group: string | null;
}

export function flowOptions(data: InboxFlowsListQuery | null, platform: Platform): FlowOption[] {
  const bot = data?.bot;
  if (!bot) return [];
  const options: FlowOption[] = [];
  for (const flow of bot.flowsWithoutGroup) {
    if (flow.platform === platform) options.push({ id: flow.id, name: flow.name, group: null });
  }
  for (const group of bot.flowGroups) {
    for (const flow of group.flows) {
      if (flow.platform === platform) {
        options.push({ id: flow.id, name: flow.name, group: group.name });
      }
    }
  }
  return options;
}
