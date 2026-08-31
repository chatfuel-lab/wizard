import { describe, expect, it } from 'vitest';
import { Weekday } from '~api/generated/knowledge-base/graphql';
import type { WorkingHoursDay } from '../types';
import {
  DAY_INDEX,
  WRITE_ORDER,
  anyDayOpen,
  closedWeek,
  hoursSummary,
  toWeekHours,
  toWorkingHours,
  weekHoursIdentity,
} from './weekHours';

const day = (d: Weekday, enabled: boolean, start = '09:00', end = '18:00'): WorkingHoursDay => ({
  day: d,
  enabled,
  start,
  end,
});

describe('the two weekday vocabularies', () => {
  it('maps every API weekday onto a distinct Date.getDay() index', () => {
    const indexes = Object.values(DAY_INDEX);
    expect(new Set(indexes).size).toBe(7);
    expect(DAY_INDEX[Weekday.Sun]).toBe(0);
    expect(DAY_INDEX[Weekday.Sat]).toBe(6);
  });

  it('writes Monday first, not the alphabetical order the SDL declares', () => {
    expect(WRITE_ORDER).toEqual([
      Weekday.Mon,
      Weekday.Tue,
      Weekday.Wed,
      Weekday.Thu,
      Weekday.Fri,
      Weekday.Sat,
      Weekday.Sun,
    ]);
    /* The trap this guards: Object.keys on the enum gives Fri, Mon, Sat, Sun… */
    expect([...WRITE_ORDER].sort()).not.toEqual([...WRITE_ORDER]);
  });
});

describe('toWeekHours', () => {
  it('treats a day the server did not send as closed', () => {
    const week = toWeekHours([day(Weekday.Mon, true, '07:30', '19:00')]);
    expect(week[1]).toEqual({ enabled: true, start: '07:30', end: '19:00', break: null });
    expect(week[0].enabled).toBe(false);
    expect(week[6].enabled).toBe(false);
  });

  it('answers a null schedule with seven closed days at usable times', () => {
    const week = toWeekHours(null);
    expect(anyDayOpen(week)).toBe(false);
    expect(week[3].start).toBe('09:00');
    expect(week[3].end).toBe('18:00');
  });

  it('replaces an empty time with the default — a blank time input cannot be fixed by typing over it', () => {
    const week = toWeekHours([day(Weekday.Tue, true, '', '')]);
    expect(week[2]).toEqual({ enabled: true, start: '09:00', end: '18:00', break: null });
  });

  it('ignores a weekday this build does not know rather than writing week[undefined]', () => {
    const week = toWeekHours([{ day: 'Caturday' as Weekday, enabled: true, start: '10:00', end: '11:00' }]);
    expect(week).toEqual(closedWeek());
  });
});

describe('toWorkingHours', () => {
  it('always sends all seven days, Monday first', () => {
    const days = toWorkingHours(toWeekHours([day(Weekday.Mon, true)]));
    expect(days.map((entry) => entry.day)).toEqual([...WRITE_ORDER]);
    expect(days.filter((entry) => entry.enabled)).toHaveLength(1);
  });

  it('round-trips a schedule unchanged', () => {
    const sent = [
      day(Weekday.Mon, true, '07:30', '19:00'),
      day(Weekday.Sat, true, '09:00', '18:00'),
      day(Weekday.Sun, false),
    ];
    const back = toWorkingHours(toWeekHours(sent));
    for (const entry of sent) {
      expect(back.find((candidate) => candidate.day === entry.day)).toMatchObject({
        enabled: entry.enabled,
        start: entry.start,
        end: entry.end,
      });
    }
  });

  it('carries no break — the schedule input has no field for one', () => {
    const week = toWeekHours([day(Weekday.Mon, true)]);
    week[1] = { ...week[1], break: { start: '13:00', end: '14:00' } };
    expect(Object.keys(toWorkingHours(week)[0]!)).toEqual(['day', 'enabled', 'start', 'end']);
  });
});

describe('weekHoursIdentity', () => {
  it('is equal for equal weeks and different for a moved time', () => {
    const a = toWeekHours([day(Weekday.Mon, true, '09:00', '18:00')]);
    const b = toWeekHours([day(Weekday.Mon, true, '09:00', '18:00')]);
    expect(weekHoursIdentity(a)).toBe(weekHoursIdentity(b));
    b[1] = { ...b[1], end: '17:00' };
    expect(weekHoursIdentity(a)).not.toBe(weekHoursIdentity(b));
  });

  it('ignores the times of a closed day, so toggling one off twice is one state', () => {
    const a = toWeekHours([day(Weekday.Mon, false, '09:00', '18:00')]);
    const b = toWeekHours([day(Weekday.Mon, false, '07:00', '23:00')]);
    expect(weekHoursIdentity(a)).toBe(weekHoursIdentity(b));
  });
});

describe('hoursSummary', () => {
  it('collapses consecutive days with the same times', () => {
    const week = toWeekHours([
      day(Weekday.Mon, true, '07:30', '19:00'),
      day(Weekday.Tue, true, '07:30', '19:00'),
      day(Weekday.Wed, true, '07:30', '19:00'),
      day(Weekday.Thu, true, '07:30', '19:00'),
      day(Weekday.Fri, true, '07:30', '19:00'),
      day(Weekday.Sat, true, '09:00', '18:00'),
    ]);
    expect(hoursSummary(week)).toBe('Mon–Fri 07:30–19:00 · Sat 09:00–18:00 · Sun closed');
  });

  it('names one open day on its own', () => {
    expect(hoursSummary(toWeekHours([day(Weekday.Wed, true, '10:00', '16:00')]))).toBe(
      'Mon–Tue closed · Wed 10:00–16:00 · Thu–Sun closed',
    );
  });

  it('says so when nothing is open', () => {
    expect(hoursSummary(closedWeek())).toBe('Closed every day');
  });

  it('does not wrap Sunday into a Monday run', () => {
    const week = toWeekHours(WRITE_ORDER.map((d) => day(d, true, '09:00', '18:00')));
    expect(hoursSummary(week)).toBe('Mon–Sun 09:00–18:00');
  });
});
