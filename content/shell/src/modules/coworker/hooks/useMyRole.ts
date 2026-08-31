import { useCallback } from 'react';
import { closedGates, fetchRoleGates, type RoleGateSpec } from '~api';
import { PermissionAllowedAction, PermissionObject } from '~api/generated/core/graphql';
import { useGates } from '~ui';
import { useCoworker } from '../CoworkerContext';

export interface MyRole {
  loading: boolean;
  /** Bot: View — everything coworker-side needs just this (guide.md auth). */
  canUse: boolean;
}

/* Either action opens the gate: an editor is never less able than a viewer,
   and the API keeps the two actions independent. */
const GATES: RoleGateSpec<'canUse'> = {
  canUse: [
    { object: PermissionObject.Bot, action: PermissionAllowedAction.View },
    { object: PermissionObject.Bot, action: PermissionAllowedAction.Edit },
  ],
};

/**
 * Permission gate via MyBotRole (core skill op). Closed unless the answer says
 * otherwise — an error closes every gate, because the proxy talks upstream
 * under one master token, so the API enforces the token owner's role and would
 * accept a write this gate had hidden. What is offered is decided here; what is
 * allowed is the server's. See `fetchRoleGates` in the api-client.
 */
export function useMyRole(): MyRole {
  const { client, botId } = useCoworker();
  const fetch = useCallback(() => fetchRoleGates(client, botId, GATES), [client, botId]);
  const { loading, gates } = useGates(fetch, closedGates(GATES));
  return { loading, ...gates };
}
