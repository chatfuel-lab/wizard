/**
 * Everything the Team page's children share: the store, and the two escape
 * hatches back to the shell (navigate, the auth provider's membership
 * refetch).
 *
 * `TeamPage` renders the provider and calls NOTHING from here — it builds the
 * value from props and from hooks that take props (validator pass 10b).
 */
import { createContext, useContext } from 'react';
import type { Navigate } from '../../types';
import type { TeamStoreValue } from './hooks/useTeamStore';

export interface TeamValue extends TeamStoreValue {
  navigate: Navigate;
  /** Re-run the auth provider's membership fetch (after leaving / transferring). */
  refetchMembership(): void;
}

export const TeamContext = createContext<TeamValue | null>(null);

export function useTeam(): TeamValue {
  const value = useContext(TeamContext);
  if (!value) throw new Error('useTeam must be used inside <TeamPage>');
  return value;
}
