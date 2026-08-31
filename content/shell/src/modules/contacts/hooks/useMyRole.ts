import { useCallback } from 'react';
import { closedGates, fetchRoleGates, type RoleGateSpec } from '~api';
import { PermissionAllowedAction, PermissionObject } from '~api/generated/core/graphql';
import { useGates } from '~ui';
import { useContacts } from '../ContactsContext';

export interface MyRole {
  loading: boolean;
  /** People: View — can read the contacts table. */
  canView: boolean;
  /** People: Edit — attribute/name/note edits and assignment. */
  canEdit: boolean;
}

/* Edit implies View by listing both pairs under the view gate — the API keeps
   the two actions independent, so nothing infers one from the other. */
const GATES: RoleGateSpec<'canView' | 'canEdit'> = {
  canView: [
    { object: PermissionObject.People, action: PermissionAllowedAction.Edit },
    { object: PermissionObject.People, action: PermissionAllowedAction.View },
  ],
  canEdit: [{ object: PermissionObject.People, action: PermissionAllowedAction.Edit }],
};

/**
 * Permission gate via MyBotRole (core skill op). Closed unless the answer says
 * otherwise — an error closes every gate, because the proxy talks upstream
 * under one master token, so the API enforces the token owner's role and would
 * accept a write this gate had hidden. What is offered is decided here; what is
 * allowed is the server's. See `fetchRoleGates` in the api-client.
 */
export function useMyRole(): MyRole {
  const { client, botId } = useContacts();
  const fetch = useCallback(() => fetchRoleGates(client, botId, GATES), [client, botId]);
  const { loading, gates } = useGates(fetch, closedGates(GATES));
  return { loading, ...gates };
}
