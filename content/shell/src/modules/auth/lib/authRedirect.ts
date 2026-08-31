/**
 * Where the current (route, auth state) pair has to go, if anywhere.
 *
 * Pulled out of AuthRouter as a pure function for two reasons. It is the part
 * with the rules in it — "a stranger on sign-in goes to no-access, a member on
 * sign-in goes back where they came from, everyone else on an app route needs
 * a session" — and a table of rules is a table of test cases. And it returns a
 * string, so the effect that performs the navigation can depend on it without
 * a fresh object re-firing the redirect on every render.
 */
import type { AppRoute } from '../../types';
import { IN_SHELL_ROUTES, decodeReturnTo, encodeReturnTo, isAuthRoute, type AuthRouteName } from './authRoutes';

export type AuthStateKind = 'loading' | 'signedOut' | 'signedIn';

interface RedirectInput {
  kind: AuthStateKind;
  /** Signed in AND a member of this tenant. */
  member: boolean;
  /** Signed in, the membership fetch has settled, and there is no membership. */
  knownStranger: boolean;
  /** Signed in and the membership fetch is still in flight — nothing is decided yet. */
  membershipPending: boolean;
  route: AppRoute;
}

export const authRouteOf = (route: AppRoute): AuthRouteName | null =>
  isAuthRoute(route.moduleId) ? route.moduleId : null;

/** Renders inside the shell chrome rather than replacing it ('team'). */
export const isInShellRoute = (route: AuthRouteName): boolean => (IN_SHELL_ROUTES as readonly string[]).includes(route);

/**
 * True for the routes that ARE the app: everything that is not a standalone
 * auth screen, plus `/team`, which lives inside the shell and therefore
 * needs a session and a membership exactly as much as the app does.
 */
export const requiresMembership = (route: AppRoute): boolean => {
  const authRoute = authRouteOf(route);
  return authRoute === null || isInShellRoute(authRoute);
};

export function redirectFor({ kind, member, knownStranger, membershipPending, route }: RedirectInput): string | null {
  if (kind === 'loading') return null;
  /*
   * A signed-in person whose membership has not come back yet is not a
   * stranger — they are unknown. Deciding here sent every cold deep link
   * through /no-access and then, once the membership landed, to / — so
   * `/team` opened the inbox and `/livechat?c=42` lost its conversation.
   * The router shows a spinner for this exact window.
   */
  if (membershipPending) return null;
  const authRoute = authRouteOf(route);

  if (requiresMembership(route)) {
    if (kind === 'signedOut') {
      /* Keep where they were going. `encodeReturnTo` only ever produces a path
         on this app and `decodeReturnTo` refuses to bounce back into an auth
         screen — an open redirect through a sign-in page is a phishing
         primitive, not a convenience. */
      return `/sign-in?returnTo=${encodeURIComponent(encodeReturnTo(route.path, route.params))}`;
    }
    return member ? null : '/no-access';
  }

  /* A member has no business on the way-in screens. `auth` (the PKCE callback)
     is exempt: it navigates itself once the session lands, and stealing the
     redirect would drop the `returnTo` it is carrying. */
  if (member && (authRoute === 'sign-in' || authRoute === 'sign-up' || authRoute === 'no-access')) {
    return decodeReturnTo(route.params.get('returnTo')) ?? '/';
  }

  /* Sign-in's whole job is to hand off, and it has nothing left to say to a
     session it already has. Without this the stranger who signs in correctly
     watches the button spin for ever: the credentials were fine, it is the
     membership that is missing, and only no-access can explain that.
     `sign-up` and `invite` are exempt — for them a signed-in non-member is
     mid-flow (finish joining the workspace, or accept an invite). */
  if (knownStranger && authRoute === 'sign-in') return '/no-access';

  return null;
}
