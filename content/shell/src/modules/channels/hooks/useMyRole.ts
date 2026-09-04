import { useCallback } from 'react';
import { closedGates, fetchRoleGates, type RoleGateSpec } from '~api';
import { PermissionAllowedAction, PermissionObject } from '~api/generated/core/graphql';
import { useGates } from '~ui';
import { useChannels } from '../ChannelsContext';

export interface MyRole {
  loading: boolean;
  /**
   * Configure: Edit — what the four link mutations, the two active-link
   * fields on `Bot` and `botDisconnectContactScope` all require. Reading
   * `contactScopes` needs only access to the bot, so the page never gates on
   * this for the connection state itself.
   */
  canManage: boolean;
}

const GATES: RoleGateSpec<'canManage'> = {
  canManage: [{ object: PermissionObject.Configure, action: PermissionAllowedAction.Edit }],
};

/**
 * Permission gate via MyBotRole (core skill op). Closed unless the answer says
 * otherwise — an error closes the gate, because the proxy talks upstream under
 * one master token, so the API enforces the token owner's role and would
 * accept a write this gate had hidden. What is offered is decided here; what
 * is allowed is the server's. See `fetchRoleGates` in the api-client.
 */
export function useMyRole(): MyRole {
  const { client, botId } = useChannels();
  const fetch = useCallback(() => fetchRoleGates(client, botId, GATES), [client, botId]);
  const { loading, gates } = useGates(fetch, closedGates(GATES));
  return { loading, ...gates };
}
