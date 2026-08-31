import { describe, expect, it } from 'vitest';
import {
  MAX_RANGE_DAYS,
  customRange,
  daysOf,
  monthGridStart,
  pastRange,
  periodRange,
  rangeForMode,
  rangeVars,
  sameRangeVars,
  shiftMonthKey,
  startOfWeekKey,
  stepAnchor,
  upcomingRange,
} from './calendarRange';

describe('week and month geometry', () => {
  it('starts the week on the configured day', () => {
    expect(startOfWeekKey('2026-08-19', 1)).toBe('2026-08-17'); // Wednesday → Monday
    expect(startOfWeekKey('2026-08-19', 0)).toBe('2026-08-16');
    expect(startOfWeekKey('2026-08-19', 6)).toBe('2026-08-15');
    expect(startOfWeekKey('2026-08-17', 1)).toBe('2026-08-17');
    expect(startOfWeekKey('2026-08-16', 1)).toBe('2026-08-10'); // Sunday → previous Monday
  });

  it('month grid always spans 42 days from the week containing the 1st', () => {
    expect(monthGridStart('2026-08-19', 1)).toBe('2026-07-27'); // Aug 1 2026 is a Saturday
    expect(monthGridStart('2026-08-19', 0)).toBe('2026-07-26');
    const range = rangeForMode('month', '2026-02-10', 1);
    expect(daysOf(range)).toHaveLength(42);
    expect(range.startKey).toBe('2026-01-26');
  });

  it('day and week ranges are half-open', () => {
    expect(rangeForMode('day', '2026-08-19', 1)).toEqual({ startKey: '2026-08-19', endKey: '2026-08-20' });
    expect(rangeForMode('week', '2026-08-19', 1)).toEqual({ startKey: '2026-08-17', endKey: '2026-08-24' });
    expect(daysOf(rangeForMode('week', '2026-08-19', 1))).toHaveLength(7);
  });

  it('shifts months with day clamping', () => {
    expect(shiftMonthKey('2026-01-31', 1)).toBe('2026-02-28');
    expect(shiftMonthKey('2026-12-15', 1)).toBe('2027-01-15');
    expect(shiftMonthKey('2026-01-15', -1)).toBe('2025-12-15');
    expect(shiftMonthKey('2028-01-31', 1)).toBe('2028-02-29');
  });

  it('steps the anchor per mode', () => {
    expect(stepAnchor('day', '2026-08-31', 1)).toBe('2026-09-01');
    expect(stepAnchor('week', '2026-08-19', -1)).toBe('2026-08-12');
    expect(stepAnchor('month', '2026-08-31', 1)).toBe('2026-09-30');
  });
});

describe('rangeVars', () => {
  it('formats display-zone midnights with the bot offset', () => {
    const vars = rangeVars({ startKey: '2026-08-17', endKey: '2026-08-24' }, 'Europe/Berlin', 'America/Mexico_City');
    // Berlin midnight Aug 17 = 22:00Z Aug 16 = 16:00 Mexico City Aug 16.
    expect(vars).toEqual({ startTime: '2026-08-16T16:00:00-06:00', endTime: '2026-08-23T16:00:00-06:00' });
    const same = rangeVars(
      { startKey: '2026-08-17', endKey: '2026-08-24' },
      'America/Mexico_City',
      'America/Mexico_City',
    );
    expect(same).toEqual({ startTime: '2026-08-17T00:00:00-06:00', endTime: '2026-08-24T00:00:00-06:00' });
    expect(sameRangeVars(vars, { ...vars })).toBe(true);
    expect(sameRangeVars(vars, same)).toBe(false);
    expect(sameRangeVars(null, null)).toBe(true);
  });
});

describe('list ranges', () => {
  it('upcoming grows forward in 90-day chunks, past grows backward in 30', () => {
    expect(upcomingRange('2026-08-17', 1)).toEqual({ startKey: '2026-08-17', endKey: '2026-11-15' });
    expect(upcomingRange('2026-08-17', 2).endKey).toBe('2027-02-13');
    expect(pastRange('2026-08-17', 1)).toEqual({ startKey: '2026-07-18', endKey: '2026-08-18' });
    expect(pastRange('2026-08-17', 0)).toEqual(pastRange('2026-08-17', 1));
  });

  it('custom is inclusive, self-repairing and capped', () => {
    expect(customRange('2026-08-01', '2026-08-31', '2026-08-17')).toEqual({
      range: { startKey: '2026-08-01', endKey: '2026-09-01' },
      capped: false,
    });
    expect(customRange('2026-08-31', '2026-08-01', '2026-08-17').range.startKey).toBe('2026-08-01');
    expect(customRange(null, null, '2026-08-17').range).toEqual({ startKey: '2026-08-01', endKey: '2026-09-01' });
    expect(customRange('2026-08-01', null, '2026-08-17').range.endKey).toBe('2026-08-31');
    const capped = customRange('2024-01-01', '2026-08-01', '2026-08-17');
    expect(capped.capped).toBe(true);
    expect(daysOf(capped.range)).toHaveLength(MAX_RANGE_DAYS);
  });

  it('insights periods', () => {
    expect(periodRange('week', '2026-08-19', 1, null, null)).toEqual({ startKey: '2026-08-17', endKey: '2026-08-24' });
    expect(periodRange('month', '2026-08-19', 1, null, null)).toEqual({ startKey: '2026-08-01', endKey: '2026-09-01' });
    expect(periodRange('30d', '2026-08-19', 1, null, null)).toEqual({ startKey: '2026-07-21', endKey: '2026-08-20' });
    expect(daysOf(periodRange('90d', '2026-08-19', 1, null, null))).toHaveLength(90);
    expect(periodRange('custom', '2026-08-19', 1, '2026-08-01', '2026-08-10')).toEqual({
      startKey: '2026-08-01',
      endKey: '2026-08-11',
    });
  });
});

describe('weekStartsOnFor', () => {
  it('maps ICU firstDay to getDay numbering, with a fallback', async () => {
    const { weekStartsOnFor } = await import('./calendarRange');
    const us = weekStartsOnFor('en-US');
    const de = weekStartsOnFor('de-DE');
    // Engines without weekInfo answer the fallback for both; engines with it answer 0 / 1.
    expect([0, 1]).toContain(us);
    expect([0, 1]).toContain(de);
    expect(weekStartsOnFor('not a locale!!', 6)).toBe(6);
  });
});
