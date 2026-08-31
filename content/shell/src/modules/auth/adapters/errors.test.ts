import { describe, expect, it } from 'vitest';
import {
  AUTH_API_CODES,
  HINT_CODES,
  authError,
  codeForHint,
  isNetworkFailure,
  rpcError,
  toAuthAdapterError,
} from './errors';
import { AuthAdapterError } from '../types';

/** What PostgREST hands back for `raise sqlstate 'PT403' … hint = 'not_admin'`. */
const postgrest = (hint: string, over: Record<string, unknown> = {}) => ({
  code: 'PT403',
  details: null,
  hint,
  message: 'Only admins can do that',
  ...over,
});

/** What GoTrue hands back — supabase-js does not export the class, so this is the shape. */
const gotrue = (code: string, status = 400) => ({
  name: 'AuthApiError',
  message: 'Invalid login credentials',
  status,
  code,
});

describe('hint → AuthErrorCode', () => {
  it('maps every hint the SQL raises', () => {
    // The table is the contract with modules/auth/supabase/migrations/0001_auth.sql.
    const hints = [
      'unauthenticated',
      'tenant_not_found',
      'invite_not_found',
      'invite_revoked',
      'invite_accepted',
      'invite_expired',
      'not_admin',
      'not_owner',
      'member_not_found',
      'is_owner',
      'owner_cannot_leave',
      'self_target',
      'bad_role',
      'bad_expiry',
      'rank',
    ];
    for (const hint of hints) expect(HINT_CODES[hint], hint).toBeTruthy();
    expect(Object.keys(HINT_CODES).sort()).toEqual(hints.sort());
  });

  it('reads the hint before anything else and keeps the message', () => {
    const err = rpcError(postgrest('not_admin'));
    expect(err).toBeInstanceOf(AuthAdapterError);
    expect(err.code).toBe('NotAllowed');
    expect(err.message).toBe('Only admins can do that');
  });

  it("reads 'email_mismatch' as the invite's when the invite raised it", () => {
    expect(codeForHint('email_mismatch', 'invite')).toBe('InviteEmailMismatch');
    expect(rpcError(postgrest('email_mismatch'), 'invite').code).toBe('InviteEmailMismatch');
    /* Outside an invite the hint has no other meaning left — refusal, generically. */
    expect(codeForHint('email_mismatch')).toBe('NotAllowed');
  });

  it('maps the invite lifecycle to distinct codes', () => {
    expect(rpcError(postgrest('invite_expired'), 'invite').code).toBe('InviteExpired');
    expect(rpcError(postgrest('invite_revoked'), 'invite').code).toBe('InviteRevoked');
    expect(rpcError(postgrest('invite_accepted'), 'invite').code).toBe('InviteUsed');
    expect(rpcError(postgrest('invite_not_found'), 'invite').code).toBe('InviteInvalid');
  });

  it('falls back to PostgREST codes, then the status, then Unknown', () => {
    expect(rpcError({ code: 'PGRST301', message: 'JWT expired' }).code).toBe('SessionRequired');
    expect(rpcError({ code: '42501', message: 'permission denied' }).code).toBe('NotAllowed');
    expect(rpcError({ code: 'PGRST202', message: 'Could not find the function' }).code).toBe('Unknown');
    expect(rpcError({ message: 'nope', status: 429 }).code).toBe('RateLimited');
    expect(rpcError({ message: 'nope', status: 401 }).code).toBe('SessionRequired');
  });

  it('keeps the original message on Unknown — it is the only clue support gets', () => {
    const err = rpcError({ code: 'PGRST202', message: 'Could not find the function public.cf_typo' });
    expect(err.code).toBe('Unknown');
    expect(err.message).toBe('Could not find the function public.cf_typo');
    expect(rpcError({}).message).toBe('Request failed');
  });

  it('never re-wraps an AuthAdapterError', () => {
    const original = new AuthAdapterError('IsOwner', 'nope');
    expect(rpcError(original)).toBe(original);
    expect(authError(original)).toBe(original);
    expect(toAuthAdapterError(original)).toBe(original);
  });
});

describe('GoTrue error → AuthErrorCode', () => {
  it('maps the codes the screens branch on', () => {
    expect(authError(gotrue('invalid_credentials')).code).toBe('InvalidCredentials');
    expect(authError(gotrue('email_not_confirmed')).code).toBe('EmailNotConfirmed');
    expect(authError(gotrue('user_already_exists', 422)).code).toBe('UserExists');
    expect(authError(gotrue('email_exists', 422)).code).toBe('UserExists');
    expect(authError(gotrue('weak_password', 422)).code).toBe('WeakPassword');
    expect(authError(gotrue('over_request_rate_limit', 429)).code).toBe('RateLimited');
    expect(authError(gotrue('otp_expired', 403)).code).toBe('InviteExpired');
    expect(authError(gotrue('session_not_found', 404)).code).toBe('SessionRequired');
    /* The app never turns sign-ups off; if the project has, that is a misconfiguration. */
    expect(AUTH_API_CODES.signup_disabled).toBe('Unknown');
  });

  it('preserves the message and falls back on the status', () => {
    const err = authError(gotrue('invalid_credentials'));
    expect(err.message).toBe('Invalid login credentials');
    expect(authError({ message: 'slow down', status: 429 }).code).toBe('RateLimited');
    expect(authError({ message: 'who?', status: 401 }).code).toBe('SessionRequired');
    expect(authError({ message: 'boom' }).code).toBe('Unknown');
    expect(authError({ message: 'boom' }).message).toBe('boom');
  });

  it('keeps the cause for the console', () => {
    const raw = gotrue('invalid_credentials');
    expect(authError(raw).cause).toBe(raw);
  });
});

describe('network failures', () => {
  it('recognises the shapes fetch failures arrive in', () => {
    expect(isNetworkFailure(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkFailure({ name: 'AuthRetryableFetchError', message: 'x', status: 0 })).toBe(true);
    expect(isNetworkFailure({ message: 'TypeError: Failed to fetch', code: '' })).toBe(true);
    expect(isNetworkFailure({ message: 'NetworkError when attempting to fetch resource.' })).toBe(true);
    expect(isNetworkFailure({ message: 'Load failed' })).toBe(true);
    expect(isNetworkFailure(postgrest('not_admin'))).toBe(false);
    expect(isNetworkFailure(null)).toBe(false);
  });

  it('maps them to Network from both sides', () => {
    expect(rpcError({ message: 'TypeError: Failed to fetch', code: '' }).code).toBe('Network');
    expect(authError({ name: 'AuthRetryableFetchError', message: 'offline' }).code).toBe('Network');
  });
});

describe('toAuthAdapterError', () => {
  it('routes by whether a hint is present', () => {
    expect(toAuthAdapterError(postgrest('is_owner')).code).toBe('IsOwner');
    expect(toAuthAdapterError(gotrue('weak_password', 422)).code).toBe('WeakPassword');
    expect(toAuthAdapterError('a string').code).toBe('Unknown');
  });
});
