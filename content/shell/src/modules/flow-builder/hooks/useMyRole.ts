import { useCallback } from 'react';
import { closedGates, fetchRoleGates, type RoleGateSpec } from '~api';
import { PermissionAllowedAction, PermissionObject } from '~api/generated/core/graphql';
import { useGates } from '~ui';
import { useFlowBuilder } from '../FlowBuilderContext';

export interface MyRole {
  loading: boolean;
  /** Flows: View — the same permission the canvas already needs; starts a session. */
  canStart: boolean;
  /** Inbox: Edit — sends texts and clicks. A token with only Flows can start a test and not talk to it. */
  canSend: boolean;
}

/* Edit implies View on the dashboard side, but the API keeps the two actions
   independent — so both pairs are listed under the start gate. */
const GATES: RoleGateSpec<'canStart' | 'canSend'> = {
  canStart: [
    { object: PermissionObject.Flows, action: PermissionAllowedAction.View },
    { object: PermissionObject.Flows, action: PermissionAllowedAction.Edit },
  ],
  canSend: [{ object: PermissionObject.Inbox, action: PermissionAllowedAction.Edit }],
};

/**
 * The auth asymmetry the preview API has: starting a session is a Flows
 * permission, talking to it is an Inbox one. So the dock can be perfectly
 * usable for reading and have a closed composer, and it says which.
 *
 * Closed on error: a role query that fails leaves both gates shut. The proxy
 * talks upstream under one master token, so the API enforces the token owner's
 * role — a mutation this gate had left open is one the server accepts, which is
 * why an unreachable answer is not a reason to offer more.
 */
export function useMyRole(): MyRole {
  const { client, botId } = useFlowBuilder();
  const fetch = useCallback(() => fetchRoleGates(client, botId, GATES), [client, botId]);
  const { loading, gates } = useGates(fetch, closedGates(GATES));
  return { loading, ...gates };
}
