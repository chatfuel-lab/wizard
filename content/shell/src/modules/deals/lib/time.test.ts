import { describe, expect, it } from 'vitest';
import { ageLabel } from './time';

const NOW = Date.parse('2026-08-13T12:00:00Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe('ageLabel', () => {
  it('rolls over at each unit boundary', () => {
    expect(ageLabel(ago(30_000), NOW)).toBe('now');
    expect(ageLabel(ago(60_000), NOW)).toBe('1m');
    expect(ageLabel(ago(59 * 60_000), NOW)).toBe('59m');
    expect(ageLabel(ago(60 * 60_000), NOW)).toBe('1h');
    expect(ageLabel(ago(23 * 3_600_000), NOW)).toBe('23h');
    expect(ageLabel(ago(24 * 3_600_000), NOW)).toBe('1d');
    expect(ageLabel(ago(6 * 86_400_000), NOW)).toBe('6d');
    expect(ageLabel(ago(7 * 86_400_000), NOW)).toBe('1w');
    expect(ageLabel(ago(60 * 86_400_000), NOW)).toBe('8w');
  });

  it('renders nothing rather than NaN for a date it cannot read', () => {
    expect(ageLabel(null, NOW)).toBe('');
    expect(ageLabel(undefined, NOW)).toBe('');
    expect(ageLabel('', NOW)).toBe('');
    expect(ageLabel('last tuesday', NOW)).toBe('');
  });

  it('treats a future timestamp as now — clock skew must not print "-3d"', () => {
    expect(ageLabel(ago(-5 * 86_400_000), NOW)).toBe('now');
  });
});
