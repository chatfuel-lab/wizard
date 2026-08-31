/**
 * The avatar in the topbar, and what is under it.
 *
 * It answers "who am I signed in as, and into which workspace" before it
 * offers anything — which is the point of the header block in `~ui UserMenu`
 * and the reason this is not a bare Sign-out button. One person, several
 * deployments of the same app, one browser: the workspace chip is how they
 * notice they are about to change the wrong one.
 *
 * A non-member gets the menu too. They are on the no-access screen, they are
 * signed in as SOMEBODY, and signing out is the only thing they can do — a
 * page with no way off it is the worst version of that screen.
 */
import { IconLogOut, IconUsers, UserMenu, type MenuItem } from '~ui';
import type { AppRoute, Navigate } from '../types';
import { useAuth } from './AuthContext';
import { signOutConfirmed } from './lib/signOut';
import { canManageTeam } from './lib/authState';

export function UserMenuItem({ navigate }: { route: AppRoute; navigate: Navigate }) {
  const { state, actions } = useAuth();
  if (state.kind !== 'signedIn') return null;

  const signOut = () => {
    void (async () => {
      /* This screen goes away, so the sentence cannot live on it: /sign-in
         reads `reason` and says it there, the same way it does for a session
         that expired. */
      const confirmed = await signOutConfirmed(actions.signOut);
      navigate(confirmed ? '/sign-in' : '/sign-in?reason=signout-failed', { replace: true });
    })();
  };

  const items: MenuItem[] = [];
  if (canManageTeam(state)) {
    items.push({ id: 'team', label: 'Team', icon: <IconUsers />, onSelect: () => navigate('/team') });
    items.push({ kind: 'separator', id: 'sep' });
  }
  /* Neutral, not danger: signing out destroys nothing, and a red item in a
     three-line menu reads as "careful" where "ordinary" is the truth. */
  items.push({ id: 'sign-out', label: 'Sign out', icon: <IconLogOut />, onSelect: signOut });

  return (
    <UserMenu
      name={state.user.name ?? state.user.email}
      email={state.user.email}
      avatarUrl={state.user.avatarUrl}
      workspace={state.membership?.tenant.name}
      items={items}
    />
  );
}
