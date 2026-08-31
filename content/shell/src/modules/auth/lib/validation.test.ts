import { describe, expect, it } from 'vitest';
import {
  MIN_PASSWORD_LENGTH,
  maskEmail,
  matchesMaskedEmail,
  passwordsMatch,
  validateEmail,
  validateInviteEmail,
  validateName,
  validatePassword,
} from './validation';

describe('validateEmail', () => {
  it('accepts ordinary addresses, including the awkward ones', () => {
    for (const email of ['a@b.co', 'first.last+tag@sub.example.com', "o'brien@example.io", 'ünïcode@exämple.de']) {
      expect(validateEmail(email), email).toBeNull();
    }
    expect(validateEmail('  owner@example.com  ')).toBeNull();
  });
  it('refuses the empty field and the obviously broken', () => {
    expect(validateEmail('')).toBe('Enter your email address');
    expect(validateEmail('   ')).toBe('Enter your email address');
    for (const email of ['owner', 'owner@', '@example.com', 'owner@example', 'a b@example.com', 'a@@b.com']) {
      expect(validateEmail(email), email).toBe('Enter a valid email address');
    }
  });
});

describe('validatePassword / passwordsMatch', () => {
  it('enforces the eight-character floor GoTrue enforces', () => {
    expect(validatePassword('')).toBe('Enter a password');
    expect(validatePassword('a'.repeat(MIN_PASSWORD_LENGTH - 1))).toBe('Use at least 8 characters');
    expect(validatePassword('a'.repeat(MIN_PASSWORD_LENGTH))).toBeNull();
  });
  it('compares the confirmation', () => {
    expect(passwordsMatch('password123', '')).toBe('Repeat the password');
    expect(passwordsMatch('password123', 'password124')).toBe('The two passwords do not match');
    expect(passwordsMatch('password123', 'password123')).toBeNull();
  });
});

describe('validateName', () => {
  it('only objects to length', () => {
    expect(validateName('')).toBeNull();
    expect(validateName('Olga Owner')).toBeNull();
    expect(validateName('x'.repeat(60))).toBeNull();
    expect(validateName(`  ${'x'.repeat(61)}  `)).toBe('Keep the name under 60 characters');
  });
});

describe('masked email', () => {
  it('masks exactly as cf_mask_email does', () => {
    expect(maskEmail('pat@example.com')).toBe('p***@example.com');
    expect(maskEmail('  Pat@Example.com ')).toBe('p***@example.com');
    expect(maskEmail('nonsense')).toBeNull();
    expect(maskEmail('@example.com')).toBeNull();
    expect(maskEmail('pat@')).toBeNull();
    expect(maskEmail(null)).toBeNull();
  });
  it('answers "is the signed-in person the invited one" without an address', () => {
    expect(matchesMaskedEmail('pat@example.com', 'p***@example.com')).toBe(true);
    expect(matchesMaskedEmail('paula@example.com', 'p***@example.com')).toBe(true); // a mask is not proof
    expect(matchesMaskedEmail('sam@example.com', 'p***@example.com')).toBe(false);
    expect(matchesMaskedEmail('pat@other.com', 'p***@example.com')).toBe(false);
    expect(matchesMaskedEmail('anyone@example.com', null)).toBe(true); // unrestricted invite
    expect(matchesMaskedEmail(null, 'p***@example.com')).toBe(false);
  });
});

/* The Team page's rules, folded in from its own twin at close. */
describe('the invite address', () => {
  it('is optional but must look like one', () => {
    expect(validateInviteEmail('')).toBeNull();
    expect(validateInviteEmail('  ')).toBeNull();
    expect(validateInviteEmail('nope')).not.toBeNull();
    expect(validateInviteEmail('a@b.co')).toBeNull();
  });
});
