import { useCallback } from 'react';
import { closedGates, fetchRoleGates, type RoleGateSpec } from '~api';
import { PermissionAllowedAction, PermissionObject } from '~api/generated/core/graphql';
import { useGates } from '~ui';
import { useBroadcasts } from '../BroadcastsContext';

export interface MyRole {
  loading: boolean;
  /**
   * Flows: Edit — what every write here needs. A campaign is a flow, and the
   * server checks each block mutation against the flows permission rather
   * than the Broadcasting one. Reading the list needs only Flows: View, which
   * any role that can open the bot has.
   */
  canEdit: boolean;
}

const GATES: RoleGateSpec<'canEdit'> = {
  canEdit: [{ object: PermissionObject.Flows, action: PermissionAllowedAction.Edit }],
};

/**
 * Permission gate via MyBotRole (core skill op). Closed unless the answer says
 * otherwise. What is offered is decided here; what is allowed is the server's.
 */
export function useMyRole(): MyRole {
  const { client, botId } = useBroadcasts();
  const fetch = useCallback(() => fetchRoleGates(client, botId, GATES), [client, botId]);
  const { loading, gates } = useGates(fetch, closedGates(GATES));
  return { loading, ...gates };
}
