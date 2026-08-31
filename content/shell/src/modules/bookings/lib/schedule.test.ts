import { describe, expect, it } from 'vitest';
import {
  breakRange,
  defaultSchedule,
  scheduleInputOf,
  scheduleSummary,
  specialistInputOf,
  validateSchedule,
  weeklyMinutes,
  workingMinutes,
  workingRanges,
} from './schedule';
import { sampleDay, sampleSpecialist } from './samples';

describe('workingRanges', () => {
  it('subtracts the break and skips off days', () => {
    const sp = sampleSpecialist();
    expect(workingRanges(sp.schedule, 'mon')).toEqual([
      { start: 540, end: 780 },
      { start: 840, end: 1080 },
    ]);
    expect(workingRanges(sp.schedule, 'tue')).toEqual([{ start: 540, end: 1080 }]);
    expect(workingRanges(sp.schedule, 'sun')).toEqual([]);
    expect(workingRanges(null, 'mon')).toEqual([]);
    expect(workingRanges({ ...sp.schedule!, enabled: false }, 'mon')).toEqual([]);
    expect(breakRange(sp.schedule, 'mon')).toEqual({ start: 780, end: 840 });
    expect(breakRange(sp.schedule, 'tue')).toBeNull();
  });

  it('a break outside the hours or inverted is ignored', () => {
    const s = { ...defaultSchedule(), mon: sampleDay('09:00', '12:00', { start: '13:00', end: '14:00' }) };
    expect(workingRanges(s, 'mon')).toEqual([{ start: 540, end: 720 }]);
    const inv = { ...defaultSchedule(), mon: sampleDay('09:00', '12:00', { start: '11:00', end: '10:00' }) };
    expect(workingRanges(inv, 'mon')).toEqual([{ start: 540, end: 720 }]);
  });

  it('counts minutes', () => {
    const sp = sampleSpecialist();
    expect(workingMinutes(sp.schedule, 'mon')).toBe(480);
    expect(weeklyMinutes(sp.schedule)).toBe(480 + 4 * 540);
    expect(weeklyMinutes(null)).toBe(0);
  });
});

describe('validateSchedule', () => {
  it('accepts the default and reports the server rules', () => {
    expect(validateSchedule(defaultSchedule())).toEqual([]);
    const empty = defaultSchedule();
    for (const d of ['mon', 'tue', 'wed', 'thu', 'fri'] as const) empty[d] = { ...sampleDay(), enabled: false };
    expect(validateSchedule(empty)).toEqual([
      { day: null, message: 'Enable at least one day, or turn the schedule off' },
    ]);
    expect(validateSchedule({ ...empty, enabled: false })).toEqual([]);
    const bad = { ...defaultSchedule(), mon: sampleDay('18:00', '09:00'), tue: sampleDay('9am', '18:00') };
    expect(validateSchedule(bad).map((p) => p.day)).toEqual(['mon', 'tue']);
    const brk = { ...defaultSchedule(), wed: sampleDay('09:00', '18:00', { start: '08:00', end: '09:30' }) };
    expect(validateSchedule(brk)[0]).toMatchObject({ day: 'wed' });
  });
});

describe('inputs', () => {
  it('scheduleInputOf mirrors the record and null → disabled', () => {
    expect(scheduleInputOf(null)).toEqual({ enabled: false });
    const input = scheduleInputOf(sampleSpecialist().schedule);
    expect(input.enabled).toBe(true);
    expect(input.mon).toEqual({ enabled: true, start: '09:00', end: '18:00', break: { start: '13:00', end: '14:00' } });
    expect(input.sun).toEqual({ enabled: false, start: '09:00', end: '18:00', break: null });
  });

  it('specialistInputOf is the full replace', () => {
    const sp = sampleSpecialist({
      profile: {
        firstName: 'Alex',
        lastName: null,
        aboutInfo: 'hi',
        logo: { id: 'f1', url: 'u', type: 'Image' as never, status: 'Downloaded' as never, size: 1 },
      },
    });
    expect(specialistInputOf(sp)).toEqual({
      profile: { firstName: 'Alex', lastName: null, aboutInfo: 'hi', logo: 'f1' },
      schedule: scheduleInputOf(sp.schedule),
      goodsServices: ['svc-1'],
    });
  });
});

describe('scheduleSummary', () => {
  it('collapses consecutive identical days', () => {
    const s = defaultSchedule();
    expect(scheduleSummary(s)).toBe('Mon–Fri 09:00–18:00');
    expect(scheduleSummary({ ...s, sat: sampleDay('10:00', '14:00') })).toBe('Mon–Fri 09:00–18:00 · Sat 10:00–14:00');
    expect(scheduleSummary({ ...s, tue: { ...s.tue!, enabled: false }, thu: { ...s.thu!, enabled: false } })).toBe(
      'Mon, Wed, Fri 09:00–18:00',
    );
    expect(scheduleSummary(null)).toBe('No working hours');
    expect(scheduleSummary({ ...s, enabled: false })).toBe('No working hours');
    // A break splits a group.
    const withBreak = { ...s, wed: sampleDay('09:00', '18:00', { start: '13:00', end: '14:00' }) };
    expect(scheduleSummary(withBreak)).toBe('Mon, Tue, Thu, Fri 09:00–18:00 · Wed 09:00–18:00, break 13:00–14:00');
  });

  it('honours the week start', () => {
    const all = defaultSchedule();
    for (const d of ['sun', 'sat'] as const) all[d] = sampleDay();
    expect(scheduleSummary(all, 1)).toBe('Mon–Sun 09:00–18:00');
    expect(scheduleSummary(all, 0)).toBe('Sun–Sat 09:00–18:00');
  });
});
