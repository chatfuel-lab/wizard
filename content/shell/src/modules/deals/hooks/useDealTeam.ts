import { useEffect, useState } from 'react';
import { DealsTeamDocument } from '~api/generated/deals/graphql';
import { useDeals } from '../DealsContext';
import type { DealTeamMember } from '../types';

export interface DealTeamState {
  loading: boolean;
  members: DealTeamMember[];
}

/**
 * The bot's team, for the owner picker. Note the id trap: `contactSetAssignee`
 * wants `member.user.id` (a UserAccountID). `member.id` is a BotTeamMemberID
 * and the mutation will reject it.
 */
export function useDealTeam(): DealTeamState {
  const { client, botId } = useDeals();
  const [members, setMembers] = useState<DealTeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    client
      .query(DealsTeamDocument, { botID: botId })
      .then((data) => {
        if (cancelled) return;
        setMembers((data.bot?.members ?? []).filter((member) => !member.user.isUnknown));
        setLoading(false);
      })
      .catch(() => {
        // Without the list the panel still offers Fuely AI and Unassign.
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId]);

  return { loading, members };
}
