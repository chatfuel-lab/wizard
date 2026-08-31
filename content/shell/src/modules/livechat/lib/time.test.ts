import { describe, expect, it } from 'vitest';
import { humanDuration } from './time';

describe('humanDuration', () => {
  it('reads both shapes the server sends', () => {
    /* The shape a real bot sends. */
    expect(humanDuration('24h:00m:00s')).toBe('24 hours');
    expect(humanDuration('0h:10m:00s')).toBe('10 minutes');
    expect(humanDuration('0h:00m:45s')).toBe('45 seconds');
    /* The shape the schema documents. */
    expect(humanDuration('1h23m')).toBe('1 hour 23 minutes');
    expect(humanDuration('10m')).toBe('10 minutes');
  });

  it('keeps the two largest units and drops the rest', () => {
    expect(humanDuration('1h:23m:45s')).toBe('1 hour 23 minutes');
    expect(humanDuration('1d:02h:03m:04s')).toBe('1 day 2 hours');
    expect(humanDuration('3d:00h:00m:00s')).toBe('3 days');
  });

  it('prints the units the server chose rather than the tidiest ones', () => {
    /* 24 hours and 3 days are separate auto-close settings, so neither is
       rewritten as the other. */
    expect(humanDuration('72h:00m:00s')).toBe('72 hours');
    expect(humanDuration('90m')).toBe('90 minutes');
  });

  it('says nothing at all when the duration is empty or adds up to nothing', () => {
    expect(humanDuration('')).toBe('');
    expect(humanDuration('   ')).toBe('');
    expect(humanDuration('0h:00m:00s')).toBe('');
    expect(humanDuration('0s')).toBe('');
  });

  it('passes a string it cannot read through untouched', () => {
    expect(humanDuration('soon')).toBe('soon');
    expect(humanDuration('about an hour')).toBe('about an hour');
    expect(humanDuration('  2 days  ')).toBe('2 days');
    /* A unit named twice is a shape we have not seen; guessing at it would be
       worse than repeating it. */
    expect(humanDuration('1h2h')).toBe('1h2h');
  });

  it('is not thrown by a singular, a plural or an upper-case unit', () => {
    expect(humanDuration('1h:00m:00s')).toBe('1 hour');
    expect(humanDuration('2h:00m:00s')).toBe('2 hours');
    expect(humanDuration('24H:00M:00S')).toBe('24 hours');
  });
});
