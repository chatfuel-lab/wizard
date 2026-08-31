import { useCallback } from 'react';
import { closedGates, fetchRoleGates, type RoleGateSpec } from '~api';
import { PermissionAllowedAction, PermissionObject } from '~api/generated/core/graphql';
import { useGates } from '~ui';
import { useLivechat } from '../LivechatContext';

export interface MyRole {
  loading: boolean;
  /** Inbox: View — can read the inbox at all. */
  canView: boolean;
  /** Inbox: Edit — can send, mark read, take over. */
  canEdit: boolean;
  /**
   * People: View — can see the contact panel.
   *
   * A second object, because the contact card is a second thing: reading a
   * thread is Inbox, and reading the person behind it is People. An operator
   * with Inbox and no People is a real configuration, and showing them an empty
   * panel would read as the panel being broken.
   */
  canViewPeople: boolean;
  /** People: Edit — can write the note, the attributes and the assignee. */
  canEditPeople: boolean;
}

/* Edit implies View by listing both pairs under each view gate — the API keeps
   the two actions independent, so nothing infers one from the other. */
const GATES: RoleGateSpec<'canView' | 'canEdit' | 'canViewPeople' | 'canEditPeople'> = {
  canView: [
    { object: PermissionObject.Inbox, action: PermissionAllowedAction.Edit },
    { object: PermissionObject.Inbox, action: PermissionAllowedAction.View },
  ],
  canEdit: [{ object: PermissionObject.Inbox, action: PermissionAllowedAction.Edit }],
  canViewPeople: [
    { object: PermissionObject.People, action: PermissionAllowedAction.Edit },
    { object: PermissionObject.People, action: PermissionAllowedAction.View },
  ],
  canEditPeople: [{ object: PermissionObject.People, action: PermissionAllowedAction.Edit }],
};

/**
 * Permission gate via MyBotRole (core skill op). Closed unless the answer says
 * otherwise — an error closes every gate, because the proxy talks upstream
 * under one master token, so the API enforces the token owner's role and would
 * accept a write this gate had hidden. What is offered is decided here; what is
 * allowed is the server's. See `fetchRoleGates` in the api-client.
 */
export function useMyRole(): MyRole {
  const { client, botId } = useLivechat();
  const fetch = useCallback(() => fetchRoleGates(client, botId, GATES), [client, botId]);
  const { loading, gates } = useGates(fetch, closedGates(GATES));
  return { loading, ...gates };
}
