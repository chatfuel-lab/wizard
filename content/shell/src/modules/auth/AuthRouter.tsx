/**
 * Which of the two worlds the person is in — the auth screens, or the app.
 *
 * The rule set is small and the ORDER is the whole design:
 *
 *   1. Nothing is known yet (no INITIAL_SESSION) → spinner. Deciding anything
 *      here would flash a sign-in form at somebody who is signed in.
 *   2. A screen route (`sign-in`, `invite`, `reset-password`, …) → the screen.
 *      Screens run even mid-membership-fetch, because signing up is TWO server
 *      round trips — create the account, then attach it to the tenant — and
 *      unmounting between them loses the second one's error. Standing ahead of
 *      (3) is what keeps a form somebody is typing into from being swapped out
 *      underneath them because the provider re-checked their membership.
 *   3. The app while the membership is still loading AND we do not already
 *      know the person is a member → spinner. The only case where we genuinely
 *      do not know where to send them yet: a member whose role is being
 *      re-checked (Team, after a transfer) keeps the app they are looking at.
 *   4. Redirects, in an effect and never during render. The table lives in
 *      lib/authRedirect.ts, where it can be tested.
 *   5. Otherwise: a member on an app route → the shell.
 *
 * `/team` deliberately falls through to `children`: the shell renders the
 * host's Page inside its own chrome, so Team keeps the rail and the topbar.
 */
import { useEffect, type ReactNode } from 'react';
import type { AppRoute } from '../types';
import { useAuth } from './AuthContext';
import { isMember } from './lib/authState';
import { authRouteOf, isInShellRoute, redirectFor } from './lib/authRedirect';
import type { AuthRouteName } from './lib/authRoutes';
import { AuthCallbackPage } from './screens/AuthCallbackPage';
import { ForgotPasswordPage } from './screens/ForgotPasswordPage';
import { InvitePage } from './screens/InvitePage';
import { NoAccessPage } from './screens/NoAccessPage';
import { ResetPasswordPage } from './screens/ResetPasswordPage';
import { SignInPage } from './screens/SignInPage';
import { SignUpPage } from './screens/SignUpPage';
import { FullPageSpinner } from './screens/parts';

/**
 * Every auth route except the one that renders inside the shell. Spelled out
 * rather than derived from `IN_SHELL_ROUTES`, which is declared as
 * `readonly AuthRouteName[]` and so would Exclude everything.
 */
type ScreenRoute = Exclude<AuthRouteName, 'team'>;

const screenOf = (route: ScreenRoute) => {
  switch (route) {
    case 'sign-in':
      return SignInPage;
    case 'sign-up':
      return SignUpPage;
    case 'invite':
      return InvitePage;
    case 'forgot-password':
      return ForgotPasswordPage;
    case 'reset-password':
      return ResetPasswordPage;
    case 'no-access':
      return NoAccessPage;
    case 'auth':
      return AuthCallbackPage;
    default:
      return null;
  }
};

export function AuthRouter({ route, children }: { route: AppRoute; children: ReactNode }) {
  const { state, navigate } = useAuth();

  const authRoute = authRouteOf(route);
  const screenRoute = authRoute !== null && !isInShellRoute(authRoute) ? (authRoute as ScreenRoute) : null;

  const member = isMember(state);
  /* `provisioning` counts too: the server is making this account's bot, which
     is neither "member" nor "settled stranger". Without it the gap between
     asking and the bot landing sends people to /no-access and straight back. */
  const membershipPending =
    state.kind === 'signedIn' && (state.membershipStatus === 'loading' || state.membershipStatus === 'provisioning');
  /* Signed in, the membership question is settled, and the answer is no. */
  const knownStranger =
    state.kind === 'signedIn' && (state.membershipStatus === 'none' || state.membershipStatus === 'error');

  const target = redirectFor({ kind: state.kind, member, knownStranger, membershipPending, route });

  useEffect(() => {
    if (target !== null) navigate(target, { replace: true });
  }, [navigate, target]);

  if (state.kind === 'loading') return <FullPageSpinner label="Starting…" />;

  if (screenRoute !== null && target === null) {
    const Screen = screenOf(screenRoute);
    if (Screen !== null) return <Screen route={route} />;
  }

  /* Wait for a FIRST answer only: the shell of somebody already known to be a
     member stays put, so Team's "refresh my role after a transfer" does not
     flash a spinner over the app they are using. */
  if (target !== null || (membershipPending && !member)) return <FullPageSpinner label="Checking your access…" />;
  if (member) return <>{children}</>;
  /* Unreachable in practice — `target` covers every non-member case — but a
     spinner beats handing the shell to somebody with no membership. */
  return <FullPageSpinner label="Checking your access…" />;
}
