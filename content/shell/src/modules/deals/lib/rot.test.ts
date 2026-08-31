import { describe, expect, it } from 'vitest';
import { SalesStageV2 } from '~api/generated/deals/graphql';
import { rotOf } from './rot';

const NOW = Date.parse('2026-08-13T12:00:00Z');
const daysAgo = (days: number) => new Date(NOW - days * 86_400_000).toISOString();

describe('rotOf', () => {
  it('treats the threshold as inclusive, and twice it as stale', () => {
    // New rots at 2 days.
    expect(rotOf(SalesStageV2.New, daysAgo(1.9), NOW).level).toBe('none');
    expect(rotOf(SalesStageV2.New, daysAgo(2), NOW).level).toBe('warn');
    expect(rotOf(SalesStageV2.New, daysAgo(3.9), NOW).level).toBe('warn');
    expect(rotOf(SalesStageV2.New, daysAgo(4), NOW).level).toBe('stale');
  });

  it('uses a different threshold per stage', () => {
    expect(rotOf(SalesStageV2.Sorting, daysAgo(3), NOW).level).toBe('warn');
    expect(rotOf(SalesStageV2.Ready, daysAgo(3), NOW).level).toBe('none');
    expect(rotOf(SalesStageV2.WorkingOn, daysAgo(13), NOW).level).toBe('none');
    expect(rotOf(SalesStageV2.WorkingOn, daysAgo(28), NOW).level).toBe('stale');
  });

  it('never rots a closed deal — sitting still in Won is not a problem', () => {
    expect(rotOf(SalesStageV2.Won, daysAgo(400), NOW)).toEqual({ days: 400, level: 'none' });
    expect(rotOf(SalesStageV2.Lost, daysAgo(400), NOW).level).toBe('none');
  });

  it('reports whole days since the last move', () => {
    expect(rotOf(SalesStageV2.New, daysAgo(5.7), NOW).days).toBe(5);
    expect(rotOf(SalesStageV2.New, daysAgo(0.2), NOW).days).toBe(0);
  });

  it('paints nothing for a date it cannot read — that is a data problem, not a sales one', () => {
    expect(rotOf(SalesStageV2.New, null, NOW)).toEqual({ days: 0, level: 'none' });
    expect(rotOf(SalesStageV2.New, undefined, NOW)).toEqual({ days: 0, level: 'none' });
    expect(rotOf(SalesStageV2.New, '', NOW)).toEqual({ days: 0, level: 'none' });
    expect(rotOf(SalesStageV2.New, 'yesterday-ish', NOW)).toEqual({ days: 0, level: 'none' });
  });

  it('clamps a future timestamp to zero rather than reporting negative days', () => {
    expect(rotOf(SalesStageV2.New, daysAgo(-5), NOW)).toEqual({ days: 0, level: 'none' });
  });

  it('handles a null stage — a contact can lose its stage between render and echo', () => {
    expect(rotOf(null, daysAgo(99), NOW).level).toBe('none');
  });
});
