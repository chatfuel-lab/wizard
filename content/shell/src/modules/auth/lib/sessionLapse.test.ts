import { describe, expect, it } from 'vitest';
import { ChatfuelSessionError } from '~api';
import { isSessionLapse } from './sessionLapse';

const gateError = (code: 'AuthSessionRequired' | 'AuthTenantForbidden') =>
  new ChatfuelSessionError([{ message: code, extensions: { code } }]);
const sessionRequired = gateError('AuthSessionRequired');
const forbidden = gateError('AuthTenantForbidden');

describe('isSessionLapse', () => {
  it('is a lapse only for somebody who had a session', () => {
    expect(isSessionLapse(sessionRequired, true)).toBe(true);
    expect(isSessionLapse(sessionRequired, false)).toBe(false);
  });

  // The bot-title query runs outside the gate: a signed-out visitor on /sign-up
  // draws a 401 immediately, and reacting to it hijacked the page.
  it('ignores anything at all while signed out', () => {
    expect(isSessionLapse(new Error('boom'), false)).toBe(false);
    expect(isSessionLapse(forbidden, false)).toBe(false);
  });

  // A signed-in non-member belongs on /no-access, still signed in.
  it('does not sign out a non-member', () => {
    expect(isSessionLapse(forbidden, true)).toBe(false);
  });

  it('treats an unrecognised failure as a lapse for a signed-in user', () => {
    expect(isSessionLapse(new Error('boom'), true)).toBe(true);
  });
});
