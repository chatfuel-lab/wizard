import { describe, expect, it } from 'vitest';
import type { AvailabilityEntry } from '../types';
import { formatHHmm, groupSlots, noSlotsReason, parseHHmm, sliceStartPeriods, slotInstant, slotsFor } from './slots';

const entry = (
  specialistID: string,
  periods: { start: string; end: string }[],
  over: Partial<AvailabilityEntry> = {},
): AvailabilityEntry => ({
  specialistID,
  date: '2026-08-18',
  hasSchedule: true,
  isWorkingDay: true,
  availableStartTime: periods,
  ...over,
});

describe('HH:mm', () => {
  it('parses and formats', () => {
    expect(parseHHmm('09:00')).toBe(540);
    expect(parseHHmm('9:05')).toBe(545);
    expect(parseHHmm('24:00')).toBe(1440);
    expect(parseHHmm('24:01')).toBeNull();
    expect(parseHHmm('9')).toBeNull();
    expect(formatHHmm(545)).toBe('09:05');
  });
});

describe('sliceStartPeriods — the live semantics', () => {
  it('treats periods as inclusive-end start ranges (the last slot survives)', () => {
    // 30-min service on a 09–18 day: the server says 09:00–17:30.
    const starts = sliceStartPeriods([{ start: '09:00', end: '17:30' }], 30);
    expect(starts[0]).toBe(540);
    expect(starts[starts.length - 1]).toBe(1050); // 17:30 itself
    expect(starts).toHaveLength(18);
  });
  it('a booking split: 09:00–09:30 and 10:30–17:30 at step 15', () => {
    const starts = sliceStartPeriods(
      [
        { start: '09:00', end: '09:30' },
        { start: '10:30', end: '17:30' },
      ],
      15,
    );
    expect(starts.slice(0, 4).map(formatHHmm)).toEqual(['09:00', '09:15', '09:30', '10:30']);
  });
  it('aligns to the step from midnight, dedupes and ignores junk', () => {
    expect(sliceStartPeriods([{ start: '09:07', end: '09:40' }], 15).map(formatHHmm)).toEqual(['09:15', '09:30']);
    expect(sliceStartPeriods([{ start: '09:00', end: '09:00' }], 15)).toEqual([540]);
    expect(sliceStartPeriods([{ start: '10:00', end: '09:00' }], 15)).toEqual([]);
    expect(sliceStartPeriods([{ start: 'x', end: '09:00' }], 15)).toEqual([]);
    expect(
      sliceStartPeriods(
        [
          { start: '09:00', end: '09:30' },
          { start: '09:15', end: '09:45' },
        ],
        15,
      ),
    ).toEqual([540, 555, 570, 585]);
  });
});

describe('slotsFor', () => {
  const alex = entry('alex', [
    { start: '09:00', end: '09:30' },
    { start: '10:30', end: '17:30' },
  ]);
  const maria = entry('maria', [{ start: '10:00', end: '17:30' }]);
  const sam = entry('sam', [], { hasSchedule: false });
  const dana = entry('dana', [], { isWorkingDay: false });

  it('one specialist', () => {
    const slots = slotsFor([alex, maria], { specialistIds: ['alex'] });
    expect(slots[0]).toEqual({ minute: 540, label: '09:00', specialistIds: ['alex'] });
    expect(slots.find((s) => s.label === '10:00')).toBeUndefined();
  });

  it('anyone = union with who is free', () => {
    const slots = slotsFor([alex, maria, sam, dana]);
    expect(slots.find((s) => s.label === '10:00')!.specialistIds).toEqual(['maria']);
    expect(slots.find((s) => s.label === '11:00')!.specialistIds).toEqual(['alex', 'maria']);
    expect(slots.find((s) => s.label === '09:00')!.specialistIds).toEqual(['alex']);
  });

  it('hides what already passed', () => {
    const slots = slotsFor([alex], { notBefore: 11 * 60 });
    expect(slots[0]!.label).toBe('11:00');
  });

  it('groups by part of day', () => {
    const groups = groupSlots(slotsFor([alex]));
    expect(groups.map((g) => g.part)).toEqual(['morning', 'afternoon', 'evening']);
    expect(groups[2]!.slots[0]!.label).toBe('17:00');
  });

  it('explains an empty day', () => {
    expect(noSlotsReason([sam], null)).toBe('no-schedule');
    expect(noSlotsReason([sam, dana], null)).toBe('day-off');
    expect(noSlotsReason([entry('x', [])], null)).toBe('fully-booked');
    expect(noSlotsReason([alex], ['nobody'])).toBe('no-specialists');
    expect(noSlotsReason([alex], null)).toBeNull();
  });
});

describe('slotInstant', () => {
  it('is the bot-zone wall clock', () => {
    expect(slotInstant('2026-08-18', 600, 'America/Mexico_City')).toBe(Date.UTC(2026, 7, 18, 16));
  });
});
