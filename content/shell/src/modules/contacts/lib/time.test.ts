import { describe, expect, it } from 'vitest';
import { ago, shortTime, toDateInput } from './time';

const NOW = Date.parse('2026-08-18T12:00:00Z');

describe('shortTime', () => {
  it('says nothing for a missing or unreadable value', () => {
    expect(shortTime(null)).toBe('—');
    expect(shortTime('not a date')).toBe('—');
  });

  it('renders something for a real instant', () => {
    expect(shortTime('2026-08-18T09:00:00Z', NOW)).not.toBe('—');
    expect(shortTime('2019-01-02T09:00:00Z', NOW)).toContain('2019');
  });
});

describe('ago', () => {
  it('degrades from minutes to years', () => {
    expect(ago(null, NOW)).toBe('never');
    expect(ago('2026-08-18T11:59:30Z', NOW)).toBe('just now');
    expect(ago('2026-08-18T11:30:00Z', NOW)).toBe('30 min ago');
    expect(ago('2026-08-18T06:00:00Z', NOW)).toBe('6 h ago');
    expect(ago('2026-08-14T12:00:00Z', NOW)).toBe('4 d ago');
    expect(ago('2026-05-18T12:00:00Z', NOW)).toBe('3 mo ago');
    expect(ago('2023-08-18T12:00:00Z', NOW)).toBe('3 y ago');
  });

  it('never renders a negative age', () => {
    expect(ago('2027-01-01T00:00:00Z', NOW)).toBe('just now');
  });
});

describe('toDateInput', () => {
  it('is empty for nothing readable', () => {
    expect(toDateInput(null)).toBe('');
    expect(toDateInput('nope')).toBe('');
  });

  it('produces a yyyy-mm-dd string', () => {
    expect(toDateInput('2026-08-18T12:00:00Z')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
