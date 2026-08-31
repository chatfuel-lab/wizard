import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AppRoute } from '../types';
import { AuthRouter } from './AuthRouter';
import { AuthContext, type AuthContextValue } from './AuthContext';
import type { AuthState } from './lib/authState';
import type { AuthAdapter, AuthUser, Membership } from './types';

/**
 * The order of the rules in AuthRouter, which its own header calls the whole
 * design: a screen route runs even mid-membership-fetch, and the spinner is
 * for the app, for somebody we do not yet know to be a member.
 *
 * The order had been inverted, and the case it cost was password recovery: the
 * link is always a cold load, so the membership fetch is always in flight when
 * /reset-password first renders, and the form was replaced by "Checking your
 * access…" until a provisioning round trip nobody asked for came back.
 *
 * Rendered to a string: effects do not run, so what each screen shows here is
 * its first frame, which is exactly what the ordering decides.
 */

const SPINNER = 'Checking your access…';

const never = (): Promise<never> => Promise.reject(new Error('the adapter is not called in a server render'));
/* Every method is the same refusal; the screens reach for the adapter only in
   effects, which a string render does not run. */
const adapter = new Proxy({} as AuthAdapter, {
  get: (_target, prop) => (prop === 'onAuthStateChange' ? () => () => undefined : never),
});

const user: AuthUser = { id: 'u1', email: 'someone@example.com', name: null, avatarUrl: null };

const membership: Membership = {
  role: 'owner',
  joinedAt: '2026-01-01T00:00:00.000Z',
  tenant: { id: 't1', name: 'Acme', bots: [] },
};

const signedIn = (membershipStatus: 'loading' | 'provisioning' | 'ready', member = false): AuthState => ({
  kind: 'signedIn',
  user,
  epoch: 1,
  membership: member ? membership : null,
  membershipStatus,
});

function routeOf(path: string, query = ''): AppRoute {
  const segments = path.split('/').filter(Boolean);
  return { moduleId: segments[0] ?? null, path, segments, params: new URLSearchParams(query) };
}

function render(state: AuthState, route: AppRoute): string {
  const value: AuthContextValue = {
    state,
    adapter,
    actions: new Proxy({} as AuthContextValue['actions'], { get: () => never }),
    navigate: () => undefined,
    appName: 'Test',
  };
  return renderToStaticMarkup(
    <AuthContext.Provider value={value}>
      <AuthRouter route={route}>
        <div>THE APP</div>
      </AuthRouter>
    </AuthContext.Provider>,
  );
}

describe('AuthRouter runs its rules in the order it declares', () => {
  it('shows the reset-password form on a cold load, not the membership spinner', () => {
    const markup = render(signedIn('loading'), routeOf('/reset-password', 'token_hash=abc&type=recovery'));
    expect(markup).toContain('Checking your link');
    expect(markup).not.toContain(SPINNER);
  });

  it('shows sign-in and invite mid-membership-fetch too', () => {
    const signIn = render(signedIn('loading'), routeOf('/sign-in'));
    expect(signIn).toContain('Sign in');
    expect(signIn).not.toContain(SPINNER);

    const invite = render(signedIn('provisioning'), routeOf('/invite', 'token=xyz'));
    expect(invite).toContain('Invitation');
    expect(invite).not.toContain(SPINNER);
  });

  it('still spins on an app route while the membership is unknown', () => {
    const markup = render(signedIn('loading'), routeOf('/livechat'));
    expect(markup).toContain(SPINNER);
    expect(markup).not.toContain('THE APP');
  });

  it('leaves the app alone while a member’s role is re-checked', () => {
    const markup = render(signedIn('loading', true), routeOf('/team'));
    expect(markup).toContain('THE APP');
    expect(markup).not.toContain(SPINNER);
  });
});
