import { describe, expect, it } from 'vitest';
import { authRouteOf, isInShellRoute, redirectFor, requiresMembership, type AuthStateKind } from './authRedirect';
import type { AppRoute } from '../../types';

/* The shell's parseLocation, restated — module code may not import outside its
   own subtree, and a short copy in a test beats loosening that boundary. */
const parseRoute = (url: string): AppRoute => {
  const [beforeHash = '', fragment = ''] = url.split('#');
  if (/^[A-Za-z_][\w-]*=/.test(fragment)) {
    const params = new URLSearchParams(fragment);
    return { moduleId: 'auth', path: 'auth/callback', segments: ['auth', 'callback'], params };
  }
  const [pathname = '', search = ''] = beforeHash.split('?');
  const segments = pathname.split('/').filter(Boolean);
  return { moduleId: segments[0] ?? null, path: segments.join('/'), segments, params: new URLSearchParams(search) };
};

type Who = 'signedOut' | 'member' | 'stranger' | 'loading' | 'pending';

const WHO: Record<Who, { kind: AuthStateKind; member: boolean; knownStranger: boolean; membershipPending: boolean }> = {
  loading: { kind: 'loading', member: false, knownStranger: false, membershipPending: false },
  signedOut: { kind: 'signedOut', member: false, knownStranger: false, membershipPending: false },
  member: { kind: 'signedIn', member: true, knownStranger: false, membershipPending: false },
  stranger: { kind: 'signedIn', member: false, knownStranger: true, membershipPending: false },
  /* Signed in, the membership answer still in flight — not yet a stranger. */
  pending: { kind: 'signedIn', member: false, knownStranger: false, membershipPending: true },
};

const at = (url: string, who: Who) => redirectFor({ ...WHO[who], route: parseRoute(url) });

describe('route classification', () => {
  it('separates the screens from the app', () => {
    expect(authRouteOf(parseRoute('/sign-in'))).toBe('sign-in');
    expect(authRouteOf(parseRoute('/invite/abc'))).toBe('invite');
    expect(authRouteOf(parseRoute('/livechat'))).toBeNull();
    expect(isInShellRoute('team')).toBe(true);
    expect(isInShellRoute('sign-in')).toBe(false);
  });
  it('makes team as protected as the app', () => {
    expect(requiresMembership(parseRoute('/team'))).toBe(true);
    expect(requiresMembership(parseRoute('/livechat'))).toBe(true);
    expect(requiresMembership(parseRoute('/'))).toBe(true);
    expect(requiresMembership(parseRoute('/sign-in'))).toBe(false);
    expect(requiresMembership(parseRoute('/invite/abc'))).toBe(false);
  });
});

describe('nothing is decided while the session is unknown', () => {
  it('never redirects during loading', () => {
    for (const path of ['/', '/livechat', '/sign-in', '/team', '/no-access']) {
      expect(at(path, 'loading'), path).toBeNull();
    }
  });
});

describe('app routes need a session and a membership', () => {
  it('sends the signed-out to sign-in, carrying where they were going', () => {
    expect(at('/livechat?c=42', 'signedOut')).toBe('/sign-in?returnTo=%2Flivechat%3Fc%3D42');
    expect(at('/team', 'signedOut')).toBe('/sign-in?returnTo=%2Fteam');
    expect(at('/', 'signedOut')).toBe('/sign-in?returnTo=%2F');
  });
  it('sends a signed-in non-member to no-access', () => {
    expect(at('/livechat', 'stranger')).toBe('/no-access');
    expect(at('/team', 'stranger')).toBe('/no-access');
  });
  it('lets a member through', () => {
    expect(at('/livechat', 'member')).toBeNull();
    expect(at('/team', 'member')).toBeNull();
  });
});

describe('the way-in screens', () => {
  it('bounce a member back to where they came from', () => {
    expect(at('/sign-in?returnTo=%2Fdeals%3Fview%3Dboard', 'member')).toBe('/deals?view=board');
    expect(at('/sign-in', 'member')).toBe('/');
    expect(at('/sign-up', 'member')).toBe('/');
    expect(at('/no-access', 'member')).toBe('/');
  });
  it('never bounce a member into another auth screen (an open redirect is a phishing primitive)', () => {
    expect(at('/sign-in?returnTo=%2Fsign-up', 'member')).toBe('/');
    expect(at('/sign-in?returnTo=%2F%2Fevil.example', 'member')).toBe('/');
    expect(at('/sign-in?returnTo=https%3A%2F%2Fevil.example', 'member')).toBe('/');
  });
  it('send a signed-in stranger off sign-in — the credentials worked, the membership is what is missing', () => {
    expect(at('/sign-in', 'stranger')).toBe('/no-access');
  });
  it('leave a signed-in stranger alone anywhere they are mid-flow', () => {
    // Claiming the workspace, joining it, accepting an invite: all of these
    // happen while signed in and not yet a member.
    expect(at('/sign-up', 'stranger')).toBeNull();
    expect(at('/invite/abc', 'stranger')).toBeNull();
    expect(at('/reset-password', 'stranger')).toBeNull();
    expect(at('/forgot-password', 'stranger')).toBeNull();
    expect(at('/no-access', 'stranger')).toBeNull();
  });
  it('leave the signed-out on every screen', () => {
    for (const path of ['/sign-in', '/sign-up', '/invite/abc', '/forgot-password', '/reset-password', '/no-access']) {
      expect(at(path, 'signedOut'), path).toBeNull();
    }
  });
});

describe('the PKCE callback', () => {
  it('is never redirected out from under — it navigates itself with its own returnTo', () => {
    expect(at('/auth/callback?returnTo=%2Fdeals', 'member')).toBeNull();
    expect(at('/auth/callback', 'stranger')).toBeNull();
    expect(at('/auth/callback', 'signedOut')).toBeNull();
  });
  it('covers the bare #error= fragment Supabase bounces back', () => {
    const route = parseRoute('#error=access_denied&error_code=otp_expired');
    expect(authRouteOf(route)).toBe('auth');
    expect(redirectFor({ ...WHO.member, route })).toBeNull();
  });
});

describe('while the membership answer is in flight', () => {
  /* The bug this pins: a cold load of a deep link redirected to /no-access
     before the membership arrived, and from there to / — so `/team` opened
     the inbox and `/livechat?c=42` lost its conversation. */
  it('sends a signed-in person nowhere, whatever the route', () => {
    for (const hash of ['/team', '/livechat?c=42', '/', '/sign-in', '/invite/tok', '/no-access']) {
      expect(at(hash, 'pending')).toBeNull();
    }
  });
  it('still redirects once the answer lands', () => {
    expect(at('/team', 'stranger')).toBe('/no-access');
    expect(at('/team', 'member')).toBeNull();
  });
});
