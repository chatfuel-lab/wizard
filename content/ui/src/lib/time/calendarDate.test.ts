import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  compareDayKeys,
  dateOfDayKey,
  dayKeyOf,
  daysInMonth,
  diffDays,
  groupByDayKey,
  isLeapYear,
  monthBounds,
  monthKeyOf,
  monthMatrix,
  parseDayKey,
  parseMonthKey,
  shiftDayKey,
  startOfWeek,
  weekDays,
  weekdayOf,
  weekdayOrder,
  weekStartsOnFor,
} from './calendarDate';

describe('parseDayKey', () => {
  it('accepts a real calendar date and rejects the shape without the calendar', () => {
    expect(parseDayKey('2026-08-17')).toEqual({ year: 2026, month: 8, day: 17 });
    expect(parseDayKey('2026-02-29')).toBeNull(); // 2026 is not a leap year
    expect(parseDayKey('2028-02-29')).toEqual({ year: 2028, month: 2, day: 29 });
    expect(parseDayKey('2026-13-01')).toBeNull();
    expect(parseDayKey('2026-8-7')).toBeNull();
    expect(parseDayKey('20260817')).toBeNull();
    expect(parseDayKey('')).toBeNull();
  });

  it('knows leap years and month lengths', () => {
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2024)).toBe(true);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
});

describe('shiftDayKey / diffDays', () => {
  it('crosses month and year ends by the calendar, not by 24 hours', () => {
    expect(shiftDayKey('2026-02-28', 1)).toBe('2026-03-01');
    expect(shiftDayKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDayKey('2027-01-01', -1)).toBe('2026-12-31');
    expect(shiftDayKey('2028-02-28', 1)).toBe('2028-02-29');
    expect(shiftDayKey('2026-08-17', 0)).toBe('2026-08-17');
  });

  it('is exact across DST changes because it never touches a Date', () => {
    // A US spring-forward Sunday: 86 400 000 ms after Saturday midnight is
    // still Sunday there, and setDate-free arithmetic does not care.
    expect(shiftDayKey('2026-03-07', 1)).toBe('2026-03-08');
    expect(shiftDayKey('2026-03-08', 1)).toBe('2026-03-09');
    expect(diffDays('2026-03-07', '2026-03-09')).toBe(2);
    expect(diffDays('2026-11-01', '2026-10-31')).toBe(-1);
  });

  it('degrades a bad key to an empty string / NaN, never a throw', () => {
    expect(shiftDayKey('nope', 1)).toBe('');
    expect(Number.isNaN(diffDays('nope', '2026-01-01'))).toBe(true);
  });

  it('compares lexically, which for this shape is chronologically', () => {
    expect(compareDayKeys('2026-01-31', '2026-02-01')).toBe(-1);
    expect(compareDayKeys('2026-02-01', '2026-02-01')).toBe(0);
  });
});

describe('addDays', () => {
  it('steps a Date by the local calendar and returns a new instance', () => {
    const start = new Date(2026, 2, 7, 12, 0, 0);
    const next = addDays(start, 1);
    expect(next).not.toBe(start);
    expect(next.getDate()).toBe(8);
    expect(next.getHours()).toBe(12);
    expect(start.getDate()).toBe(7);
  });
});

describe('weekdayOf / startOfWeek / weekDays', () => {
  it('knows the day of the week for known anchors', () => {
    expect(weekdayOf('1970-01-01')).toBe(4); // Thursday
    expect(weekdayOf('2026-08-17')).toBe(1); // Monday
    expect(weekdayOf('2026-08-16')).toBe(0); // Sunday
    expect(weekdayOf('1969-12-31')).toBe(3); // negative day numbers still work
  });

  it('starts the week on the requested day', () => {
    expect(startOfWeek('2026-08-19', 1)).toBe('2026-08-17'); // Wed → Mon
    expect(startOfWeek('2026-08-19', 0)).toBe('2026-08-16'); // Wed → Sun
    expect(startOfWeek('2026-08-19', 6)).toBe('2026-08-15'); // Wed → Sat
    expect(startOfWeek('2026-08-17', 1)).toBe('2026-08-17'); // Mon stays
    expect(startOfWeek('2026-08-16', 1)).toBe('2026-08-10'); // Sun belongs to the previous Mon-week
  });

  it('lists seven consecutive keys', () => {
    expect(weekDays('2026-08-17')).toEqual([
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
      '2026-08-21',
      '2026-08-22',
      '2026-08-23',
    ]);
  });

  it('orders the weekday headers from the first day', () => {
    expect(weekdayOrder(1)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(weekdayOrder(0)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(weekdayOrder(6)).toEqual([6, 0, 1, 2, 3, 4, 5]);
  });
});

describe('month keys', () => {
  it('parses, formats and adds across the year end', () => {
    expect(monthKeyOf('2026-08-17')).toBe('2026-08');
    expect(parseMonthKey('2026-08')).toEqual({ year: 2026, month: 8 });
    expect(parseMonthKey('2026-13')).toBeNull();
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-01', -13)).toBe('2024-12');
    expect(addMonths('2026-06', 0)).toBe('2026-06');
    expect(addMonths('bad', 1)).toBe('');
  });

  it('bounds a month', () => {
    expect(monthBounds('2026-02')).toEqual({ first: '2026-02-01', last: '2026-02-28' });
    expect(monthBounds('2028-02')).toEqual({ first: '2028-02-01', last: '2028-02-29' });
  });
});

describe('monthMatrix', () => {
  it('is ALWAYS 42 keys, six rows of seven', () => {
    // Feb 2026 starts on a Sunday and has 28 days: 4 rows would suffice.
    expect(monthMatrix('2026-02', 1)).toHaveLength(42);
    // Aug 2026: 31 days starting Saturday: needs 6 rows on a Monday start.
    expect(monthMatrix('2026-08', 1)).toHaveLength(42);
    expect(monthMatrix('2026-08', 0)).toHaveLength(42);
  });

  it('starts on the weekStartsOn at or before the 1st', () => {
    const monday = monthMatrix('2026-08', 1);
    expect(monday[0]).toBe('2026-07-27');
    expect(weekdayOf(monday[0]!)).toBe(1);
    expect(monday).toContain('2026-08-01');
    expect(monday[41]).toBe('2026-09-06');

    const sunday = monthMatrix('2026-08', 0);
    expect(sunday[0]).toBe('2026-07-26');
    expect(weekdayOf(sunday[0]!)).toBe(0);
  });

  it('starts on the 1st itself when the month begins on that weekday', () => {
    // 2026-02-01 is a Sunday.
    expect(monthMatrix('2026-02', 0)[0]).toBe('2026-02-01');
    // 2026-06-01 is a Monday.
    expect(monthMatrix('2026-06', 1)[0]).toBe('2026-06-01');
  });

  it('returns nothing for a bad month key', () => {
    expect(monthMatrix('2026-14', 1)).toEqual([]);
  });
});

describe('dayKeyOf / dateOfDayKey', () => {
  it('formats a Date by the local calendar', () => {
    expect(dayKeyOf(new Date(2026, 7, 17, 23, 59))).toBe('2026-08-17');
    expect(dayKeyOf(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
    expect(dayKeyOf(Number.NaN)).toBe('');
  });

  it('formats an instant by a named zone when asked', () => {
    // 2026-08-17T23:30Z is already Aug 18 in Tokyo and still Aug 17 in Mexico City.
    const at = Date.UTC(2026, 7, 17, 23, 30);
    expect(dayKeyOf(at, 'Asia/Tokyo')).toBe('2026-08-18');
    expect(dayKeyOf(at, 'America/Mexico_City')).toBe('2026-08-17');
    expect(dayKeyOf(at, 'UTC')).toBe('2026-08-17');
  });

  it('round-trips through a local Date', () => {
    const date = dateOfDayKey('2026-08-17');
    expect(date).not.toBeNull();
    expect(dayKeyOf(date!)).toBe('2026-08-17');
    expect(dateOfDayKey('nope')).toBeNull();
  });
});

describe('weekStartsOnFor', () => {
  it('returns a weekday for any locale, and Monday for garbage', () => {
    const us = weekStartsOnFor('en-US');
    expect([0, 1, 6]).toContain(us);
    expect(weekStartsOnFor('de-DE')).toBe(1);
    expect(weekStartsOnFor('not a locale at all !!')).toBe(1);
  });
});

describe('groupByDayKey', () => {
  it('buckets in ascending key order, keeps item order, drops unplaceable items', () => {
    const items = [
      { id: 'a', day: '2026-08-18' },
      { id: 'b', day: '2026-08-17' },
      { id: 'c', day: '2026-08-18' },
      { id: 'd', day: '' },
    ];
    expect(groupByDayKey(items, (item) => item.day)).toEqual([
      { key: '2026-08-17', items: [{ id: 'b', day: '2026-08-17' }] },
      {
        key: '2026-08-18',
        items: [
          { id: 'a', day: '2026-08-18' },
          { id: 'c', day: '2026-08-18' },
        ],
      },
    ]);
    expect(groupByDayKey([], () => '2026-01-01')).toEqual([]);
  });
});
