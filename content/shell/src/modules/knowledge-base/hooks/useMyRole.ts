import { useCallback } from 'react';
import { closedGates, fetchRoleGates, type RoleGateSpec } from '~api';
import { PermissionAllowedAction, PermissionObject } from '~api/generated/core/graphql';
import { useGates } from '~ui';
import { useKnowledgeBase } from '../KnowledgeBaseContext';
import type { KnowledgeRole } from '../types';

/* Two objects matter here: `Ai` gates every write on this page, and `Inbox`
   gates the Gaps source, which reads conversations. Edit implies View by
   listing both pairs under the read gate — the API keeps the two actions
   independent, so nothing infers one from the other. */
const GATES: RoleGateSpec<'canEdit' | 'canReadInbox'> = {
  canEdit: [{ object: PermissionObject.Ai, action: PermissionAllowedAction.Edit }],
  canReadInbox: [
    { object: PermissionObject.Inbox, action: PermissionAllowedAction.Edit },
    { object: PermissionObject.Inbox, action: PermissionAllowedAction.View },
  ],
};

/**
 * Permission gate via MyBotRole (core skill op). Closed unless the answer says
 * otherwise — an error closes every gate, because the proxy talks upstream
 * under one master token, so the API enforces the token owner's role and would
 * accept a write this gate had hidden. What is offered is decided here; what is
 * allowed is the server's. See `fetchRoleGates` in the api-client.
 */
export function useMyRole(): KnowledgeRole {
  const { client, botId } = useKnowledgeBase();
  const fetch = useCallback(() => fetchRoleGates(client, botId, GATES), [client, botId]);
  const { loading, gates } = useGates(fetch, closedGates(GATES));
  return { loading, ...gates };
}
