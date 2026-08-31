import { useEffect, useState } from 'react';
import { InboxTeamDocument, type InboxTeamQuery } from '~api/generated/livechat/graphql';
import { useLivechat } from '../LivechatContext';

export type InboxTeamMember = NonNullable<InboxTeamQuery['bot']>['members'][number];

export interface InboxTeamState {
  loading: boolean;
  members: InboxTeamMember[];
}

/**
 * The bot's team, for the assignee filter.
 *
 * The id trap is worth restating at every call site that touches it:
 * `ContactAssigneeFilterType.AssigneeID` wants `member.user.id`, which is a
 * UserAccountID. `member.id` is a BotTeamMemberID and filtering by it silently
 * matches nobody — an empty inbox that looks exactly like a quiet one.
 *
 * Failure is not surfaced. Without the list the filter still offers Anyone,
 * Unassigned and Fuely AI, which is a narrower control rather than a broken
 * one, and an inbox is not the place to report that a picker is short.
 */
export function useInboxTeam(): InboxTeamState {
  const { client, botId } = useLivechat();
  const [members, setMembers] = useState<InboxTeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    client
      .query(InboxTeamDocument, { botID: botId })
      .then((data) => {
        if (cancelled) return;
        // `isUnknown` is the API's own placeholder for a user it cannot name.
        setMembers((data.bot?.members ?? []).filter((member) => !member.user.isUnknown));
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId]);

  return { loading, members };
}
