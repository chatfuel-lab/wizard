import { useMemo } from 'react';
import { ModuleRoot, ToastProvider } from '~ui';
import type { Navigate } from '../../types';
import type { AuthAdapter, AuthUser, Membership } from '../types';
import { TeamContext, type TeamValue } from './TeamContext';
import { TeamBody } from './components/TeamBody';
import { TeamHeader } from './components/TeamHeader';
import { useTeamStore } from './hooks/useTeamStore';

export interface TeamPageProps {
  adapter: AuthAdapter;
  membership: Membership;
  me: AuthUser;
  navigate: Navigate;
  refetchMembership: () => void;
}

/**
 * The Team page's root: providers and nothing else.
 *
 * `useTeamStore` is called here and takes props, never context — this is the
 * component that RENDERS `<TeamContext.Provider>` and `<ToastProvider>`, so a
 * hook of its own that consumed either would run while both are still just
 * return values (validator pass 10b; it has white-screened a module before).
 * The header and the body are children, and they consume.
 */
export function TeamPage({ adapter, membership, me, navigate, refetchMembership }: TeamPageProps) {
  const store = useTeamStore({ adapter, membership, me, onBotsChanged: refetchMembership });

  const value = useMemo<TeamValue>(
    () => ({ ...store, navigate, refetchMembership }),
    [store, navigate, refetchMembership],
  );

  return (
    <ModuleRoot>
      <ToastProvider>
        <TeamContext.Provider value={value}>
          <TeamHeader />
          <TeamBody />
        </TeamContext.Provider>
      </ToastProvider>
    </ModuleRoot>
  );
}
