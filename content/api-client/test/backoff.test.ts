import { describe, expect, it } from 'vitest';
import { backoffDelay } from '../src/backoff';

describe('backoffDelay (spec: min(5s * 2^n, 60s) * (0.5 + rand * 0.5))', () => {
  it('attempt 0 is within [2.5s, 5s]', () => {
    expect(backoffDelay(0, { rand: () => 0 })).toBe(2500);
    expect(backoffDelay(0, { rand: () => 1 })).toBe(5000);
  });

  it('caps at 60s (attempt 10: [30s, 60s])', () => {
    expect(backoffDelay(10, { rand: () => 0 })).toBe(30_000);
    expect(backoffDelay(10, { rand: () => 1 })).toBe(60_000);
  });

  it('grows exponentially before the cap', () => {
    expect(backoffDelay(2, { rand: () => 1 })).toBe(20_000);
  });

  it('honours custom base/cap (throttle retry constants)', () => {
    expect(backoffDelay(0, { baseMs: 1000, capMs: 30_000, rand: () => 1 })).toBe(1000);
    expect(backoffDelay(9, { baseMs: 1000, capMs: 30_000, rand: () => 1 })).toBe(30_000);
  });
});
