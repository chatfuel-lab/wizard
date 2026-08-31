/**
 * '/team' — the host route the shell renders inside its own chrome.
 *
 * Three answers: nothing while the session or the membership is still being
 * decided (the gate is already showing a spinner over the whole shell), a
 * closed door for a plain member, and the page for an admin or the owner. The
 * server enforces the same rule — every `cf_*` team RPC calls
 * `cf_require_admin` — so this is the polite half, not the security.
 */
import { Button, EmptyState, IconShield, ModuleRoot } from '~ui';
import type { AppRoute, Navigate } from '../../types';
import { useAuth } from '../AuthContext';
import { canManageTeam } from '../lib/roles';
import { TeamPage } from './TeamPage';

export function TeamRoutePage({ navigate }: { route: AppRoute; navigate: Navigate }) {
  const { state, adapter, actions } = useAuth();
  if (state.kind !== 'signedIn' || state.membership === null) return null;

  if (!canManageTeam(state.membership.role)) {
    return (
      <ModuleRoot>
        <div className="flex h-full items-center justify-center">
          <EmptyState
            icon={<IconShield />}
            title="Only admins can manage the team"
            description="Ask an admin of this workspace if you need someone added, removed or promoted."
            action={
              <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
                Back to the app
              </Button>
            }
          />
        </div>
      </ModuleRoot>
    );
  }

  return (
    <TeamPage
      adapter={adapter}
      membership={state.membership}
      me={state.user}
      navigate={navigate}
      refetchMembership={actions.refetchMembership}
    />
  );
}
