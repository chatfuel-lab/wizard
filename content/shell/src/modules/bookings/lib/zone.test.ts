import { describe, expect, it } from 'vitest';
import {
  dayKeyInZone,
  isValidZone,
  offsetLabel,
  parseDayKey,
  sameWallClock,
  shiftDayKey,
  startOfDayInZone,
  toZoneIso,
  usableBotZone,
  wallClock,
  weekdayOfKey,
  zoneOffsetMinutes,
  zonedInstant,
} from './zone';

const MX = 'America/Mexico_City';
const BER = 'Europe/Berlin';
const NY = 'America/New_York';

describe('wallClock', () => {
  it('reads the zone wall clock exactly', () => {
    const at = Date.UTC(2026, 7, 18, 16, 0, 0); // 16:00Z
    expect(wallClock(at, MX)).toMatchObject({
      dayKey: '2026-08-18',
      hour: 10,
      minute: 0,
      minuteOfDay: 600,
      weekday: 2,
    });
    expect(wallClock(at, BER)).toMatchObject({ dayKey: '2026-08-18', hour: 18, minuteOfDay: 1080 });
    expect(wallClock(at, 'UTC')).toMatchObject({ hour: 16 });
  });

  it('crosses the date line', () => {
    const at = Date.UTC(2026, 7, 18, 3, 30, 0);
    expect(wallClock(at, MX).dayKey).toBe('2026-08-17'); // 21:30 the day before
    expect(wallClock(at, 'Asia/Tokyo').dayKey).toBe('2026-08-18');
  });
});

describe('zoneOffsetMinutes / offsetLabel', () => {
  it('knows DST', () => {
    expect(zoneOffsetMinutes(BER, Date.UTC(2026, 7, 18))).toBe(120);
    expect(zoneOffsetMinutes(BER, Date.UTC(2026, 0, 18))).toBe(60);
    expect(zoneOffsetMinutes(MX, Date.UTC(2026, 7, 18))).toBe(-360);
    expect(zoneOffsetMinutes(MX, Date.UTC(2026, 0, 18))).toBe(-360);
    expect(zoneOffsetMinutes('Asia/Kolkata', Date.UTC(2026, 7, 18))).toBe(330);
  });
  it('labels', () => {
    expect(offsetLabel(MX, Date.UTC(2026, 7, 18))).toBe('GMT−06:00');
    expect(offsetLabel('Asia/Kolkata', Date.UTC(2026, 7, 18))).toBe('GMT+05:30');
    expect(offsetLabel('UTC', 0)).toBe('GMT+00:00');
  });
});

describe('toZoneIso', () => {
  it('prints the zone offset, never Z', () => {
    const at = Date.UTC(2026, 7, 18, 16, 0, 5);
    expect(toZoneIso(at, MX)).toBe('2026-08-18T10:00:05-06:00');
    expect(toZoneIso(at, BER)).toBe('2026-08-18T18:00:05+02:00');
    expect(toZoneIso(at, 'UTC')).toBe('2026-08-18T16:00:05+00:00');
    expect(toZoneIso(at, 'Asia/Kolkata')).toBe('2026-08-18T21:30:05+05:30');
  });
  it('round-trips through Date', () => {
    const at = Date.UTC(2026, 2, 8, 12, 34, 56);
    for (const tz of [MX, BER, NY, 'UTC', 'Australia/Adelaide']) {
      expect(new Date(toZoneIso(at, tz)).getTime()).toBe(at);
    }
  });
});

describe('day keys', () => {
  it('parses strictly', () => {
    expect(parseDayKey('2026-08-18')).toEqual([2026, 8, 18]);
    expect(parseDayKey('2026-02-30')).toBeNull();
    expect(parseDayKey('2026-8-1')).toBeNull();
    expect(parseDayKey('')).toBeNull();
    expect(parseDayKey(null)).toBeNull();
  });
  it('shifts and reads weekdays without a zone', () => {
    expect(shiftDayKey('2026-08-31', 1)).toBe('2026-09-01');
    expect(shiftDayKey('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDayKey('2028-03-01', -1)).toBe('2028-02-29');
    expect(weekdayOfKey('2026-08-17')).toBe(1); // Monday
    expect(weekdayOfKey('2026-08-16')).toBe(0);
  });
});

describe('zonedInstant / startOfDayInZone', () => {
  it('inverts wallClock on ordinary days', () => {
    for (const tz of [MX, BER, NY, 'UTC']) {
      const at = zonedInstant('2026-08-18', 10 * 60 + 15, tz);
      expect(wallClock(at, tz)).toMatchObject({ dayKey: '2026-08-18', minuteOfDay: 615 });
    }
  });
  it('day start is the zone midnight', () => {
    expect(startOfDayInZone('2026-08-18', MX)).toBe(Date.UTC(2026, 7, 18, 6));
    expect(startOfDayInZone('2026-08-18', BER)).toBe(Date.UTC(2026, 7, 17, 22));
    expect(dayKeyInZone(startOfDayInZone('2026-08-18', BER), BER)).toBe('2026-08-18');
  });
  it('resolves the New York spring gap forward and the fall fold to the earlier instant', () => {
    // 2026-03-08 02:30 does not exist in New York (clocks jump 02:00 → 03:00).
    const gap = zonedInstant('2026-03-08', 2 * 60 + 30, NY);
    expect(wallClock(gap, NY)).toMatchObject({ dayKey: '2026-03-08', hour: 3, minute: 30 });
    // 2026-11-01 01:30 happens twice; we take the first (EDT, -4).
    const fold = zonedInstant('2026-11-01', 90, NY);
    expect(wallClock(fold, NY)).toMatchObject({ dayKey: '2026-11-01', hour: 1, minute: 30 });
    expect(zoneOffsetMinutes(NY, fold)).toBe(-240);
  });
  it('a DST day is 23 hours long in Berlin', () => {
    const a = startOfDayInZone('2026-03-29', BER);
    const b = startOfDayInZone('2026-03-30', BER);
    expect((b - a) / 3_600_000).toBe(23);
  });
});

describe('zone validity', () => {
  it('accepts IANA names and rejects junk', () => {
    expect(isValidZone(MX)).toBe(true);
    expect(isValidZone('Mars/Olympus')).toBe(false);
    expect(isValidZone(null)).toBe(false);
    expect(usableBotZone('Mars/Olympus')).toBeNull();
    expect(usableBotZone(BER)).toBe(BER);
  });
  it('sameWallClock compares offsets at an instant', () => {
    expect(sameWallClock(BER, 'Europe/Paris', Date.UTC(2026, 7, 18))).toBe(true);
    expect(sameWallClock(BER, MX, Date.UTC(2026, 7, 18))).toBe(false);
  });
});
