import { useEffect, useState } from 'react';
import { ContactsTeamDocument } from '~api/generated/contacts/graphql';
import { useContacts } from '../ContactsContext';
import type { TeamMember } from '../types';

/**
 * The bot's people, for the owner picker and the assignee filter.
 *
 * The id trap is worth stating once: `contactSetAssignee` wants
 * `member.user.id` (a `UserAccountID`). `member.id` is a different id and the
 * mutation rejects it.
 *
 * Best-effort: on failure the picker offers Fuely AI and Unassigned only,
 * which is still every option a bot without a team has.
 */
export function useContactsTeam(): { team: TeamMember[]; loading: boolean } {
  const { client, botId } = useContacts();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    client
      .query(ContactsTeamDocument, { botID: botId })
      .then((data) => {
        if (!cancelled) setTeam(data.bot.members.filter((member) => !member.user.isUnknown));
      })
      .catch(() => {
        if (!cancelled) setTeam([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId]);

  return { team, loading };
}
