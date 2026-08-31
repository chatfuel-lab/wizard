import { useCallback } from 'react';
import { closedGates, fetchRoleGates, type RoleGateSpec } from '~api';
import { PermissionAllowedAction, PermissionObject } from '~api/generated/core/graphql';
import { useGates } from '~ui';
import { useDeals } from '../DealsContext';

export interface MyRole {
  loading: boolean;
  /** People: View — can read the contacts table. */
  canView: boolean;
  /** People: Edit — moving cards between stages. */
  canEdit: boolean;
}

/* Edit implies View by listing both pairs under the view gate — the API keeps
 * the two actions independent, so nothing infers one from the other. */
const GATES: RoleGateSpec<'canView' | 'canEdit'> = {
  canView: [
    { object: PermissionObject.People, action: PermissionAllowedAction.Edit },
    { object: PermissionObject.People, action: PermissionAllowedAction.View },
  ],
  canEdit: [{ object: PermissionObject.People, action: PermissionAllowedAction.Edit }],
};

/** Permission gate via MyBotRole (core skill op). */
export function useMyRole(): MyRole {
  const { client, botId } = useDeals();
  /* useCallback-stable so useGates asks once per client/bot. `fetchRoleGates`
   * never rejects: it answers closed unless the request never reached the
   * server, and API errors will surface anyway. */
  const fetch = useCallback(() => fetchRoleGates(client, botId, GATES), [client, botId]);
  const { loading, gates } = useGates(fetch, closedGates(GATES));
  return { loading, ...gates };
}
