import { describe, expect, it } from 'vitest';
import { Weekday } from '~api/generated/flow-builder/graphql';
import {
  localInputToUtcIso,
  localUtcDayShift,
  toCorrectedWeekdays,
  toDisplayWeekdays,
  utcIsoToLocalInput,
} from './schedule';

/** Deterministic stand-in — real Dates depend on the machine timezone. */
const instant = (localDay: number, utcDay: number): Date =>
  ({ getDay: () => localDay, getUTCDay: () => utcDay }) as unknown as Date;

describe('localUtcDayShift', () => {
  it('is 0 when the local and UTC calendar days agree', () => {
    expect(localUtcDayShift(instant(1, 1))).toBe(0);
  });

  it('is +1 when local is a day ahead (incl. the Sat->Sun wrap)', () => {
    expect(localUtcDayShift(instant(2, 1))).toBe(1);
    expect(localUtcDayShift(instant(0, 6))).toBe(1);
  });

  it('is -1 when local is a day behind (incl. the Sun->Sat wrap)', () => {
    expect(localUtcDayShift(instant(1, 2))).toBe(-1);
    expect(localUtcDayShift(instant(6, 0))).toBe(-1);
  });
});

describe('toCorrectedWeekdays', () => {
  it('sends the selection as-is when the days agree', () => {
    expect(toCorrectedWeekdays([Weekday.Mon, Weekday.Fri], instant(1, 1))).toEqual([Weekday.Mon, Weekday.Fri]);
  });

  it('shifts LEFT when local is ahead of UTC (the misc.md example: local Mon 01:00 UTC+3 = UTC Sun 22:00)', () => {
    expect(toCorrectedWeekdays([Weekday.Mon], instant(2, 1))).toEqual([Weekday.Sun]);
    expect(toCorrectedWeekdays([Weekday.Sun], instant(2, 1))).toEqual([Weekday.Sat]); // wraps
  });

  it('shifts RIGHT when local is behind UTC', () => {
    expect(toCorrectedWeekdays([Weekday.Mon], instant(1, 2))).toEqual([Weekday.Tue]);
    expect(toCorrectedWeekdays([Weekday.Sat], instant(1, 2))).toEqual([Weekday.Sun]); // wraps
  });
});

describe('toDisplayWeekdays', () => {
  it('is the exact inverse of toCorrectedWeekdays for every shift', () => {
    const days = [Weekday.Sun, Weekday.Wed, Weekday.Sat];
    for (const at of [instant(1, 1), instant(2, 1), instant(1, 2)]) {
      expect(toDisplayWeekdays(toCorrectedWeekdays(days, at), at)).toEqual(days);
    }
  });
});

describe('datetime-local <-> UTC ISO round-trip', () => {
  it('round-trips at minute precision in the machine zone', () => {
    const iso = '2026-08-13T09:30:00.000Z';
    const local = utcIsoToLocalInput(iso);
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(localInputToUtcIso(local)).toBe(iso);
  });

  it('degrades to empty/null on garbage', () => {
    expect(utcIsoToLocalInput(null)).toBe('');
    expect(utcIsoToLocalInput('not a date')).toBe('');
    expect(localInputToUtcIso('')).toBeNull();
    expect(localInputToUtcIso('nope')).toBeNull();
  });
});
