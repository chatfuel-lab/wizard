import { describe, expect, it } from 'vitest';
import { SalesStageV2 } from '~api/generated/deals/graphql';
import { bindDealFields } from './dealFieldBinding';
import {
  ALL_TIME,
  DAY_MS,
  OPEN_STAGES,
  STAGGER_MAX_MS,
  STAGGER_STEP_MS,
  barPercent,
  combinedRollup,
  compactMoney,
  coverageLabel,
  coverageNote,
  delta,
  emptyTotals,
  formatDelta,
  formatRate,
  inWindow,
  isUnbounded,
  parseDay,
  previousWindow,
  resolveWindow,
  rollProgress,
  rollValue,
  rowsInWindow,
  shouldRoll,
  stageStats,
  staggerDelay,
  sumStages,
  weightedForecast,
  windowFilterArgs,
  windowLabel,
  winRate,
  type ForecastRow,
  type StageTotals,
} from './forecast';

const bindings = bindDealFields([{ name: 'deal amount' }, { name: 'deal currency' }, { name: 'deal probability' }]);

/** 2026-05-20T12:00:00Z — a Wednesday in Q2, so the quarter boundary is April 1. */
const NOW = Date.UTC(2026, 4, 20, 12);

const row = (id: string, values: Record<string, string>, daysAgo: number | null = 0): ForecastRow => ({
  id,
  lastSalesStageUpdateTime: daysAgo === null ? null : new Date(NOW - daysAgo * DAY_MS).toISOString(),
  attributes: Object.entries(values).map(([name, stringValue]) => ({
    attr: { name },
    value: { __typename: 'BotAttributeValueString', stringValue },
  })),
});

const totals = (over: Partial<StageTotals>): StageTotals => ({ ...emptyTotals(), ...over });

describe('resolveWindow', () => {
  it('anchors the rolling presets on now and leaves the upper bound open', () => {
    expect(resolveWindow('last7', NOW)).toEqual({ after: NOW - 7 * DAY_MS, before: null });
    expect(resolveWindow('last30', NOW)).toEqual({ after: NOW - 30 * DAY_MS, before: null });
    expect(resolveWindow('last90', NOW)).toEqual({ after: NOW - 90 * DAY_MS, before: null });
  });

  it('starts the quarter on the first day of its first month', () => {
    expect(resolveWindow('quarter', NOW)).toEqual({ after: Date.UTC(2026, 3, 1), before: null });
    expect(resolveWindow('quarter', Date.UTC(2026, 0, 9))).toEqual({
      after: Date.UTC(2026, 0, 1),
      before: null,
    });
  });

  it('is unbounded for all time', () => {
    expect(isUnbounded(resolveWindow('all', NOW))).toBe(true);
  });

  it('reads the custom "to" day as inclusive', () => {
    expect(resolveWindow('custom', NOW, { from: '2026-04-01', to: '2026-04-30' })).toEqual({
      after: Date.UTC(2026, 3, 1),
      before: Date.UTC(2026, 4, 1),
    });
  });

  it('degrades rather than throwing on a half-filled or unparseable range', () => {
    expect(resolveWindow('custom', NOW, { from: '2026-04-01', to: null })).toEqual({
      after: Date.UTC(2026, 3, 1),
      before: null,
    });
    expect(resolveWindow('custom', NOW, { from: 'yesterday', to: '' })).toEqual(ALL_TIME);
    expect(parseDay('2026-13-99')).toBeTypeOf('number'); // Date.UTC rolls over rather than failing
    expect(parseDay('nonsense')).toBeNull();
  });

  it('reads a range entered backwards in the order that makes sense', () => {
    expect(resolveWindow('custom', NOW, { from: '2026-04-30', to: '2026-04-01' })).toEqual(
      resolveWindow('custom', NOW, { from: '2026-04-01', to: '2026-04-30' }),
    );
  });
});

describe('previousWindow', () => {
  it('is the same length, immediately before', () => {
    const window = resolveWindow('last7', NOW);
    expect(previousWindow(window, NOW)).toEqual({
      after: NOW - 14 * DAY_MS,
      before: NOW - 7 * DAY_MS,
    });
  });

  it('does not exist for an unbounded window — "before all time" is not a period', () => {
    expect(previousWindow(ALL_TIME, NOW)).toBeNull();
    expect(previousWindow({ after: null, before: NOW }, NOW)).toBeNull();
  });

  it('is null for an empty range', () => {
    expect(previousWindow({ after: NOW, before: NOW }, NOW)).toBeNull();
  });
});

describe('windowFilterArgs', () => {
  it('sends null for an open side rather than a fabricated bound', () => {
    expect(windowFilterArgs(ALL_TIME)).toEqual({
      salesStageUpdatedAfter: null,
      salesStageUpdatedBefore: null,
    });
    expect(windowFilterArgs({ after: Date.UTC(2026, 3, 1), before: null })).toEqual({
      salesStageUpdatedAfter: '2026-04-01T00:00:00.000Z',
      salesStageUpdatedBefore: null,
    });
  });
});

describe('inWindow', () => {
  const window = { after: Date.UTC(2026, 3, 1), before: Date.UTC(2026, 4, 1) };

  it('is half-open: the lower bound is in, the upper bound is out', () => {
    expect(inWindow('2026-04-01T00:00:00.000Z', window)).toBe(true);
    expect(inWindow('2026-05-01T00:00:00.000Z', window)).toBe(false);
    expect(inWindow('2026-03-31T23:59:59.000Z', window)).toBe(false);
  });

  it('excludes a row with no timestamp from every bounded window', () => {
    expect(inWindow(null, window)).toBe(false);
    expect(inWindow('not a date', window)).toBe(false);
    expect(inWindow(null, ALL_TIME)).toBe(true);
  });
});

describe('windowLabel', () => {
  it('names the last day the reader chose, not the exclusive bound', () => {
    const window = resolveWindow('custom', NOW, { from: '2026-04-01', to: '2026-04-30' });
    expect(windowLabel('custom', window, 'en-US')).toBe('Apr 1 – Apr 30');
  });

  it('collapses a single day', () => {
    const window = resolveWindow('custom', NOW, { from: '2026-04-01', to: '2026-04-01' });
    expect(windowLabel('custom', window, 'en-US')).toBe('Apr 1');
  });

  it('says what an open side means', () => {
    expect(windowLabel('custom', { after: Date.UTC(2026, 3, 1), before: null }, 'en-US')).toBe('Apr 1 onwards');
    expect(windowLabel('all', ALL_TIME)).toBe('All time');
  });
});

describe('winRate', () => {
  it('is Won / (Won + Lost)', () => {
    expect(winRate(6, 2).rate).toBeCloseTo(0.75);
    expect(formatRate(winRate(6, 2).rate)).toBe('75%');
  });

  it('has no rate at all when nothing closed — 0% would read as "we lost them all"', () => {
    const rate = winRate(0, 0);
    expect(rate.rate).toBeNull();
    expect(rate.decided).toBe(0);
    expect(formatRate(rate.rate)).toBe('—');
  });

  it('is 0% when everything closed was lost — a real result, not a missing one', () => {
    expect(winRate(0, 4).rate).toBe(0);
    expect(formatRate(winRate(0, 4).rate)).toBe('0%');
  });
});

describe('delta', () => {
  it('has no percentage when the previous period was zero', () => {
    expect(delta(3, 0)).toEqual({ absolute: 3, ratio: null, direction: 'up' });
    expect(formatDelta(delta(3, 0))).toBe('+3 · new');
  });

  it('reads a drop as a drop', () => {
    expect(formatDelta(delta(8, 10))).toBe('−2 · −20%');
    expect(formatDelta(delta(10, 10))).toBe('no change');
  });
});

describe('coverage', () => {
  it('always states coverage, including when it is complete', () => {
    expect(coverageLabel(60, 128)).toBe('60 of 128 loaded');
    expect(coverageLabel(12, 12)).toBe('all 12 loaded');
    expect(coverageLabel(0, 5)).toBe('0 of 5 loaded');
    expect(coverageLabel(0, 0)).toBe('no deals in this window');
  });

  it('explains why a sum can be short', () => {
    const rollup = combinedRollup(
      { [SalesStageV2.New]: [row('a', { 'deal amount': '100' }), row('b', { 'deal amount': 'about 5k' })] },
      [SalesStageV2.New],
      bindings,
      totals({ New: 9 }),
      ALL_TIME,
    );
    const note = coverageNote(rollup);
    expect(note).toContain('1 of 9 deals');
    expect(note).toContain('no aggregation');
    expect(note).toContain('could not be read');
  });
});

describe('stageStats', () => {
  const rows = {
    [SalesStageV2.New]: [
      row('a', { 'deal amount': '1000' }, 1),
      row('b', { 'deal amount': '500' }, 40), // outside a 7-day window
    ],
    [SalesStageV2.Won]: [row('c', { 'deal amount': '2000' }, 2)],
  };

  it('keeps the server count and sums only the rows inside the window', () => {
    const stats = stageStats(
      totals({ New: 9, Won: 3 }),
      totals({ New: 4, Won: 1 }),
      rows,
      bindings,
      resolveWindow('last7', NOW),
    );
    const newStage = stats.find((stat) => stat.stage === SalesStageV2.New)!;
    expect(newStage.count).toBe(9); // server truth for the window
    expect(newStage.rollup.amount).toBe(1000); // the 40-day-old row is not in it
    expect(newStage.rollup.loaded).toBe(1);
    expect(coverageLabel(newStage.rollup.counted, newStage.count)).toBe('1 of 9 loaded');
    expect(newStage.delta).toEqual(delta(9, 4));
  });

  it('has no delta when there is no previous window', () => {
    const stats = stageStats(totals({ New: 9 }), null, rows, bindings, ALL_TIME);
    expect(stats.every((stat) => stat.delta === null && stat.previous === null)).toBe(true);
  });

  it('covers every stage even when nothing is loaded for it', () => {
    const stats = stageStats(emptyTotals(), null, {}, bindings, ALL_TIME);
    expect(stats).toHaveLength(6);
    expect(stats.every((stat) => stat.rollup.amount === null)).toBe(true);
  });
});

describe('combinedRollup', () => {
  it('refuses to sum an open pipeline priced in two currencies', () => {
    const rollup = combinedRollup(
      {
        [SalesStageV2.New]: [row('a', { 'deal amount': '1000' })],
        [SalesStageV2.Ready]: [row('b', { 'deal amount': '900', 'deal currency': 'USD' })],
      },
      OPEN_STAGES,
      bindings,
      totals({ New: 1, Ready: 1 }),
      ALL_TIME,
    );
    expect(rollup.mixedCurrencies).toBe(true);
    expect(rollup.amount).toBeNull();
    expect(rollup.total).toBe(2);
  });
});

describe('weightedForecast', () => {
  it('weights each amount by its own probability', () => {
    const result = weightedForecast(
      [
        row('a', { 'deal amount': '1000', 'deal probability': '50' }),
        row('b', { 'deal amount': '2000', 'deal probability': '25' }),
      ],
      bindings,
      2,
    );
    expect(result.amount).toBe(1000);
    expect(result.counted).toBe(2);
  });

  it('excludes a deal with no probability instead of inventing one', () => {
    const result = weightedForecast(
      [row('a', { 'deal amount': '1000', 'deal probability': '50' }), row('b', { 'deal amount': '9000' })],
      bindings,
      2,
    );
    expect(result.amount).toBe(500);
    expect(result.counted).toBe(1);
    expect(result.missingProbability).toBe(1);
  });

  it('counts an unreadable amount rather than treating it as zero', () => {
    const result = weightedForecast([row('a', { 'deal amount': 'about 5k' })], bindings, 1);
    expect(result.unreadable).toBe(1);
    expect(result.counted).toBe(0);
    expect(result.amount).toBeNull();
  });

  it('refuses to sum across currencies', () => {
    const result = weightedForecast(
      [
        row('a', { 'deal amount': '1000', 'deal probability': '50' }),
        row('b', { 'deal amount': '1000', 'deal probability': '50', 'deal currency': 'USD' }),
      ],
      bindings,
      2,
    );
    expect(result.mixedCurrencies).toBe(true);
    expect(result.amount).toBeNull();
  });
});

describe('rowsInWindow', () => {
  it('drops rows whose last update is outside, and tolerates an unknown stage', () => {
    const rows = [row('a', {}, 1), row('b', {}, 40), row('c', {}, null)];
    expect(rowsInWindow(rows, resolveWindow('last7', NOW)).map((entry) => entry.id)).toEqual(['a']);
    expect(rowsInWindow(undefined, ALL_TIME)).toEqual([]);
  });
});

describe('presentation helpers', () => {
  it('shortens only amounts big enough to be worth shortening', () => {
    expect(compactMoney(412_000, 'EUR', 'en-US')).toBe('€412K');
    expect(compactMoney(1500.5, 'EUR', 'en-US')).toBe('€1,500.50');
    expect(compactMoney(50_000, 'dollars', 'en-US')).toBe('50,000 dollars');
  });

  it('never divides by zero', () => {
    expect(barPercent(5, 0)).toBe(0);
    expect(barPercent(0, 10)).toBe(0);
    expect(barPercent(20, 10)).toBe(100);
    expect(barPercent(5, 10)).toBe(50);
  });

  it('sums a subset of the stages', () => {
    expect(sumStages(totals({ New: 3, Won: 4, Lost: 2 }), OPEN_STAGES)).toBe(3);
  });
});

describe('motion arithmetic', () => {
  it('staggers by index and then stops growing', () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(1)).toBe(STAGGER_STEP_MS);
    expect(staggerDelay(3)).toBe(3 * STAGGER_STEP_MS);
    expect(staggerDelay(40)).toBe(STAGGER_MAX_MS);
    // A negative or non-finite index is a caller bug, not a reason to flash.
    expect(staggerDelay(-2)).toBe(0);
    expect(staggerDelay(Number.NaN)).toBe(0);
  });

  it('eases out and clamps at both ends', () => {
    expect(rollProgress(-10, 200)).toBe(0);
    expect(rollProgress(0, 200)).toBe(0);
    expect(rollProgress(200, 200)).toBe(1);
    expect(rollProgress(9999, 200)).toBe(1);
    // Out, not in-out: half the time is well past half the distance.
    expect(rollProgress(100, 200)).toBeGreaterThan(0.8);
    // A zero duration is "already there", never a divide by zero.
    expect(rollProgress(0, 0)).toBe(1);
  });

  it('interpolates between two figures and lands exactly on the target', () => {
    expect(rollValue(0, 100, 0)).toBe(0);
    expect(rollValue(0, 100, 0.5)).toBe(50);
    expect(rollValue(0, 100, 1)).toBe(100);
    expect(rollValue(100, 40, 1)).toBe(40);
    // Out-of-range progress clamps rather than overshooting past the answer.
    expect(rollValue(0, 100, 2)).toBe(100);
    expect(rollValue(0, 100, -1)).toBe(0);
    expect(rollValue(Number.NaN, 100, 0.5)).toBe(100);
  });

  it('only rolls a figure that actually moved between two known values', () => {
    expect(shouldRoll(120, 412)).toBe(true);
    expect(shouldRoll(412, 412)).toBe(false);
    // Null is "there was no number here", which is a mount, not a change.
    expect(shouldRoll(null, 412)).toBe(false);
    expect(shouldRoll(412, null)).toBe(false);
  });
});
