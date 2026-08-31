import { describe, expect, it } from 'vitest';
import { scorePassword, strengthLabel } from './password';

describe('scorePassword — the floor', () => {
  it('scores nothing typed as 0', () => {
    expect(scorePassword('')).toBe(0);
  });

  it('never rates anything under eight characters above weak, however mixed', () => {
    expect(scorePassword('a')).toBe(1);
    expect(scorePassword('aB3$xyz')).toBe(1);
  });

  it('keeps the everybody-types-it passwords at weak regardless of length', () => {
    expect(scorePassword('password')).toBe(1);
    expect(scorePassword('Password123')).toBe(1);
    expect(scorePassword('123456789')).toBe(1);
  });

  it('keeps a long run of the same few characters at weak', () => {
    expect(scorePassword('aaaaaaaaaaaaaaaa')).toBe(1);
    expect(scorePassword('abababababababab')).toBe(1);
  });
});

describe('scorePassword — the ramp', () => {
  it('climbs weak → fair → good → strong as length and variety climb', () => {
    expect(scorePassword('sunflowerx')).toBe(1);
    expect(scorePassword('sunflower1')).toBe(2);
    expect(scorePassword('Sunflower1')).toBe(3);
    expect(scorePassword('Sunflower1!x')).toBe(4);
  });

  it('lets a long lowercase passphrase reach good, and one with spaces reach strong', () => {
    expect(scorePassword('correcthorsebatterystaple')).toBe(3);
    expect(scorePassword('correct horse battery staple')).toBe(4);
  });

  it('never exceeds 4', () => {
    expect(scorePassword('Tr0ub4dor&3-and-then-some-more-words!')).toBe(4);
  });
});

describe('strengthLabel', () => {
  it('has one word per score', () => {
    expect([0, 1, 2, 3, 4].map((score) => strengthLabel(score as 0 | 1 | 2 | 3 | 4))).toEqual([
      'Too weak',
      'Weak',
      'Fair',
      'Good',
      'Strong',
    ]);
  });
});
