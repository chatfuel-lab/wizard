import { describe, expect, it } from 'vitest';
import {
  decodeReturnTo,
  encodeReturnTo,
  invitePath,
  invitePending,
  inviteUrl,
  isAuthRoute,
  recoveryUrl,
  setBasePath,
} from './authRoutes';

describe('authRoutes', () => {
  it('knows its routes', () => {
    expect(isAuthRoute('team')).toBe(true);
    expect(isAuthRoute('livechat')).toBe(false);
    expect(isAuthRoute(null)).toBe(false);
  });
  it('encodes and decodes returnTo safely', () => {
    const v = encodeReturnTo('livechat', new URLSearchParams({ c: '1' }));
    expect(v).toBe('/livechat?c=1');
    expect(decodeReturnTo(v)).toBe('/livechat?c=1');
    expect(decodeReturnTo('//evil.example')).toBeNull();
    expect(decodeReturnTo('/https://evil')).toBeNull();
    expect(decodeReturnTo('/\\evil.com')).toBeNull();
    expect(decodeReturnTo('/\\/evil.com')).toBeNull();
    expect(decodeReturnTo('livechat')).toBeNull();
    expect(decodeReturnTo('/sign-in')).toBeNull();
    expect(decodeReturnTo(null)).toBeNull();
  });
  it('builds invite and recovery urls', () => {
    expect(invitePath('a b')).toBe('/invite/a%20b');
    expect(inviteUrl('tok', 'https://app.test')).toBe('https://app.test/invite/tok');
    expect(recoveryUrl('h+1', 'https://app.test')).toBe(
      'https://app.test/reset-password?token_hash=h%2B1&type=recovery',
    );
  });
  it('sees an unspent invite token, and only that', () => {
    expect(invitePending('/invite/tok')).toBe(true);
    expect(invitePending('/invite/tok?email=p%40example.com')).toBe(true);
    // Spent or dead: `dropTokenFromUrl` leaves the bare route behind.
    expect(invitePending('/invite')).toBe(false);
    expect(invitePending('/sign-up')).toBe(false);
    expect(invitePending('/')).toBe(false);
  });
  it('carries the mount point into the links it mails', () => {
    setBasePath('/panel');
    expect(inviteUrl('tok', 'https://app.test')).toBe('https://app.test/panel/invite/tok');
    setBasePath('/');
  });
});
