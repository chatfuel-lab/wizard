import { useCallback } from 'react';
import { closedGates, fetchRoleGates, type RoleGateSpec } from '~api';
import { PermissionAllowedAction, PermissionObject } from '~api/generated/core/graphql';
import { useGates } from '~ui';
import { useBookings } from '../BookingsContext';

export interface MyRole {
  loading: boolean;
  /** People: View — can read the calendar. */
  canView: boolean;
  /** People: Edit — create, move, resolve, delete bookings. */
  canEdit: boolean;
  /** Ai: Edit — specialists, services, AI booking settings, the bot time zone. */
  canManage: boolean;
}

/* The SDL documents no permission object for `booking*V2`; People View/Edit is
   the verified-live guess for bookings, and the catalog / fuelyConfig setters
   sit under Ai. Edit implies View by listing both pairs under the view gate —
   the API keeps the two actions independent. */
const GATES: RoleGateSpec<'canView' | 'canEdit' | 'canManage'> = {
  canView: [
    { object: PermissionObject.People, action: PermissionAllowedAction.Edit },
    { object: PermissionObject.People, action: PermissionAllowedAction.View },
  ],
  canEdit: [{ object: PermissionObject.People, action: PermissionAllowedAction.Edit }],
  canManage: [{ object: PermissionObject.Ai, action: PermissionAllowedAction.Edit }],
};

/**
 * Permission gate via MyBotRole (core skill op). Closed unless the answer says
 * otherwise — an error closes every gate, because the proxy talks upstream
 * under one master token, so the API enforces the token owner's role and would
 * accept a write this gate had hidden. What is offered is decided here; what is
 * allowed is the server's. See `fetchRoleGates` in the api-client.
 */
export function useMyRole(): MyRole {
  const { client, botId } = useBookings();
  const fetch = useCallback(() => fetchRoleGates(client, botId, GATES), [client, botId]);
  const { loading, gates } = useGates(fetch, closedGates(GATES));
  return { loading, ...gates };
}
