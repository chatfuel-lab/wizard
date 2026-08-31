import { describe, expect, it } from 'vitest';
import { authReducer, canManageTeam, INITIAL_AUTH_STATE, isMember, type AuthState } from './authState';
import type { AuthUser, Membership } from '../types';

const user: AuthUser = { id: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null };
const membership: Membership = {
  role: 'admin',
  joinedAt: '2026-01-01T00:00:00Z',
  tenant: { id: 't', name: 'T', bots: [{ id: 'b-row', botId: 'bot-1', name: 'Bot' }] },
};

describe('authReducer', () => {
  it('null initial session → signedOut(initial); later null → signedOut(signedOut)', () => {
    const s1 = authReducer(INITIAL_AUTH_STATE, { type: 'session', user: null, epoch: 1 });
    expect(s1).toEqual({ kind: 'signedOut', reason: 'initial' });
    const s2 = authReducer(
      { kind: 'signedIn', user, epoch: 1, membership: null, membershipStatus: 'loading' },
      { type: 'session', user: null, epoch: 2 },
    );
    expect(s2).toEqual({ kind: 'signedOut', reason: 'signedOut' });
  });
  it('session → signedIn loading; membership with the same epoch → ready', () => {
    const s1 = authReducer(INITIAL_AUTH_STATE, { type: 'session', user, epoch: 1 }) as Extract<
      AuthState,
      { kind: 'signedIn' }
    >;
    expect(s1.membershipStatus).toBe('loading');
    const s2 = authReducer(s1, { type: 'membership', epoch: 1, membership });
    expect(isMember(s2)).toBe(true);
    expect(canManageTeam(s2)).toBe(true);
  });
  it('drops a stale membership reply', () => {
    const s1 = authReducer(INITIAL_AUTH_STATE, { type: 'session', user, epoch: 2 });
    const s2 = authReducer(s1, { type: 'membership', epoch: 1, membership });
    expect(s2).toBe(s1);
  });
  it('same user re-emitted keeps membership', () => {
    let s = authReducer(INITIAL_AUTH_STATE, { type: 'session', user, epoch: 1 });
    s = authReducer(s, { type: 'membership', epoch: 1, membership });
    s = authReducer(s, { type: 'session', user: { ...user, name: 'B' }, epoch: 3 });
    expect(isMember(s)).toBe(true);
    expect(s.kind === 'signedIn' && s.user.name).toBe('B');
  });
  it('a different user resets membership', () => {
    let s = authReducer(INITIAL_AUTH_STATE, { type: 'session', user, epoch: 1 });
    s = authReducer(s, { type: 'membership', epoch: 1, membership });
    s = authReducer(s, { type: 'session', user: { ...user, id: 'u2' }, epoch: 2 });
    expect(isMember(s)).toBe(false);
    expect(s.kind === 'signedIn' && s.membershipStatus).toBe('loading');
  });
  it('none / error / refetch', () => {
    let s = authReducer(INITIAL_AUTH_STATE, { type: 'session', user, epoch: 1 });
    s = authReducer(s, { type: 'membership', epoch: 1, membership: null });
    expect(s.kind === 'signedIn' && s.membershipStatus).toBe('none');
    s = authReducer(s, { type: 'refetchMembership', epoch: 2 });
    expect(s.kind === 'signedIn' && s.membershipStatus).toBe('loading');
    s = authReducer(s, { type: 'membershipFailed', epoch: 2, message: 'The workspace is full' });
    expect(s.kind === 'signedIn' && s.membershipStatus).toBe('error');
    // The server's sentence survives to the screen; a retry clears it again.
    expect(s.kind === 'signedIn' && s.membershipError).toBe('The workspace is full');
    s = authReducer(s, { type: 'refetchMembership', epoch: 3 });
    expect(s.kind === 'signedIn' && s.membershipError).toBeUndefined();
    expect(authReducer(s, { type: 'signedOut', reason: 'expired' })).toEqual({ kind: 'signedOut', reason: 'expired' });
  });

  /* The regression: a provisioning run that fails must reach the screen. It
     only does while nothing bumped the epoch under it — the sign-up path used
     to, through refetchMembership, and the reducer then dropped the failure. */
  it('keeps a provisioning failure raised under the current epoch', () => {
    let s = authReducer(INITIAL_AUTH_STATE, { type: 'session', user, epoch: 1 });
    s = authReducer(s, { type: 'provisioning', epoch: 1 });
    expect(s.kind === 'signedIn' && s.membershipStatus).toBe('provisioning');
    s = authReducer(s, { type: 'membershipFailed', epoch: 1, message: 'This app cannot take another bot.' });
    expect(s.kind === 'signedIn' && s.membershipStatus).toBe('error');
    expect(s.kind === 'signedIn' && s.membershipError).toBe('This app cannot take another bot.');
    expect(isMember(s)).toBe(false);
  });
});
