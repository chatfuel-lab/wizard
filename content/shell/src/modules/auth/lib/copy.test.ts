import { describe, expect, it } from 'vitest';
import { AUTH_ERROR_CODES, codeOfError, messageFor, messageForError } from './copy';
import { AuthAdapterError } from '../types';
import { HINT_CODES, AUTH_API_CODES } from '../adapters/errors';

describe('copy', () => {
  it('has a sentence for every AuthErrorCode', () => {
    /* The table is a Record<AuthErrorCode, string>, so tsc already refuses a
       missing key. What this adds is that none of them is a placeholder. */
    expect(AUTH_ERROR_CODES.length).toBeGreaterThan(20);
    for (const code of AUTH_ERROR_CODES) {
      const message = messageFor(code);
      expect(message, code).toBeTruthy();
      expect(message.length, code).toBeGreaterThan(10);
      expect(message, code).not.toContain(code);
      expect(message.endsWith('.'), code).toBe(true);
    }
  });

  it('covers every code the two error tables can produce', () => {
    for (const code of [...Object.values(HINT_CODES), ...Object.values(AUTH_API_CODES)]) {
      expect(AUTH_ERROR_CODES, code).toContain(code);
    }
  });

  it('never leaks Supabase vocabulary at a person', () => {
    for (const code of AUTH_ERROR_CODES) {
      expect(messageFor(code).toLowerCase(), code).not.toMatch(/supabase|postgrest|jwt|rpc|sqlstate|token_hash/);
    }
  });

  it('says nothing about whether an account exists', () => {
    expect(messageFor('InvalidCredentials')).toBe('That email and password do not match an account.');
  });

  it('turns any thrown thing into one sentence', () => {
    expect(messageForError(new AuthAdapterError('RateLimited'))).toBe(messageFor('RateLimited'));
    expect(messageForError(new Error('Cannot read properties of undefined'))).toBe(messageFor('Unknown'));
    expect(messageForError(undefined)).toBe(messageFor('Unknown'));
  });

  it('exposes the code for the screens that branch on it', () => {
    expect(codeOfError(new AuthAdapterError('UserExists'))).toBe('UserExists');
    expect(codeOfError(new Error('x'))).toBeNull();
  });
});
