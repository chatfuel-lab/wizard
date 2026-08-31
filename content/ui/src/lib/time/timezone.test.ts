import { describe, expect, it } from 'vitest';
import {
  FALLBACK_TIME_ZONES,
  formatInZone,
  isValidTimeZone,
  isoOffset,
  listTimeZones,
  localTimeZone,
  offsetLabel,
  sameWallClock,
  toZoneIso,
  wallClockIn,
  wallClockToInstant,
  zoneCityLabel,
  zoneOffsetMinutes,
} from './timezone';

const BERLIN = 'Europe/Berlin';
const NEW_YORK = 'America/New_York';
const MEXICO = 'America/Mexico_City';

describe('isValidTimeZone / localTimeZone / listTimeZones', () => {
  it('accepts IANA names and rejects the rest', () => {
    expect(isValidTimeZone(BERLIN)).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus_Mons')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
  });

  it('local zone is a valid zone', () => {
    expect(isValidTimeZone(localTimeZone())).toBe(true);
  });

  it('lists Region/City zones plus UTC, sorted, and every fallback zone is valid', () => {
    const zones = listTimeZones();
    expect(zones).toContain('UTC');
    expect(zones).toContain(BERLIN);
    expect(zones).toContain(MEXICO);
    expect([...zones].sort()).toEqual(zones);
    for (const zone of FALLBACK_TIME_ZONES) expect(isValidTimeZone(zone)).toBe(true);
  });

  it('humanises a zone name', () => {
    expect(zoneCityLabel(MEXICO)).toBe('Mexico City');
    expect(zoneCityLabel('America/Argentina/Buenos_Aires')).toBe('Buenos Aires');
    expect(zoneCityLabel('UTC')).toBe('UTC');
  });
});

describe('wallClockIn', () => {
  it('reads the wall clock of a zone at an instant', () => {
    const at = Date.UTC(2026, 7, 17, 12, 34, 56);
    const berlin = wallClockIn(at, BERLIN);
    expect(berlin).toMatchObject({ year: 2026, month: 8, day: 17, hour: 14, minute: 34, second: 56 });
    expect(berlin.dayKey).toBe('2026-08-17');
    expect(berlin.minuteOfDay).toBe(14 * 60 + 34);
    expect(berlin.weekday).toBe(1);

    const tokyo = wallClockIn(at, 'Asia/Tokyo');
    expect(tokyo.hour).toBe(21);
    const kolkata = wallClockIn(at, 'Asia/Kolkata');
    expect(kolkata.hour).toBe(18);
    expect(kolkata.minute).toBe(4);
  });

  it('never prints midnight as 24', () => {
    // 22:00Z is 00:00 in Berlin (summer).
    const wall = wallClockIn(Date.UTC(2026, 7, 16, 22, 0, 0), BERLIN);
    expect(wall.hour).toBe(0);
    expect(wall.dayKey).toBe('2026-08-17');
  });
});

describe('zoneOffsetMinutes', () => {
  it('is exact and signed east-positive', () => {
    const summer = Date.UTC(2026, 6, 1, 12);
    const winter = Date.UTC(2026, 0, 1, 12);
    expect(zoneOffsetMinutes(summer, BERLIN)).toBe(120);
    expect(zoneOffsetMinutes(winter, BERLIN)).toBe(60);
    expect(zoneOffsetMinutes(summer, NEW_YORK)).toBe(-240);
    expect(zoneOffsetMinutes(winter, NEW_YORK)).toBe(-300);
    expect(zoneOffsetMinutes(summer, 'Asia/Kolkata')).toBe(330);
    expect(zoneOffsetMinutes(summer, 'UTC')).toBe(0);
  });

  it('knows Mexico City stopped observing DST in 2022', () => {
    expect(zoneOffsetMinutes(Date.UTC(2026, 6, 1, 12), MEXICO)).toBe(-360);
    expect(zoneOffsetMinutes(Date.UTC(2026, 0, 1, 12), MEXICO)).toBe(-360);
  });

  it('flips at the exact transition instant', () => {
    // Berlin 2026-03-29 01:00:00Z: clocks go 02:00 → 03:00.
    const change = Date.UTC(2026, 2, 29, 1, 0, 0);
    expect(zoneOffsetMinutes(change - 1000, BERLIN)).toBe(60);
    expect(zoneOffsetMinutes(change, BERLIN)).toBe(120);
  });
});

describe('isoOffset / offsetLabel', () => {
  it('formats ISO offsets, zero as +00:00 and never Z', () => {
    expect(isoOffset(120)).toBe('+02:00');
    expect(isoOffset(-300)).toBe('-05:00');
    expect(isoOffset(330)).toBe('+05:30');
    expect(isoOffset(0)).toBe('+00:00');
    expect(isoOffset(-570)).toBe('-09:30');
  });

  it('formats human labels', () => {
    expect(offsetLabel(120)).toBe('UTC+2');
    expect(offsetLabel(-300)).toBe('UTC−5');
    expect(offsetLabel(330)).toBe('UTC+5:30');
    expect(offsetLabel(0)).toBe('UTC');
  });
});

describe('wallClockToInstant', () => {
  it('round-trips an ordinary wall clock in summer and winter', () => {
    const summer = wallClockToInstant({ year: 2026, month: 8, day: 17, hour: 9, minute: 30 }, BERLIN);
    expect(summer).toBe(Date.UTC(2026, 7, 17, 7, 30));
    expect(wallClockIn(summer, BERLIN)).toMatchObject({ hour: 9, minute: 30, day: 17 });

    const winter = wallClockToInstant({ year: 2026, month: 1, day: 17, hour: 9, minute: 30 }, BERLIN);
    expect(winter).toBe(Date.UTC(2026, 0, 17, 8, 30));

    const mexico = wallClockToInstant({ year: 2026, month: 8, day: 17, hour: 9 }, MEXICO);
    expect(mexico).toBe(Date.UTC(2026, 7, 17, 15));
  });

  it('defaults hour, minute and second to zero', () => {
    expect(wallClockToInstant({ year: 2026, month: 8, day: 17 }, 'UTC')).toBe(Date.UTC(2026, 7, 17));
  });

  it('resolves a spring-forward gap forward by default and backward on request', () => {
    // New York 2026-03-08: 02:00 EST → 03:00 EDT. 02:30 does not exist.
    const gap = { year: 2026, month: 3, day: 8, hour: 2, minute: 30 };
    const forward = wallClockToInstant(gap, NEW_YORK);
    expect(wallClockIn(forward, NEW_YORK)).toMatchObject({ hour: 3, minute: 30 });
    expect(forward).toBe(Date.UTC(2026, 2, 8, 7, 30));

    const backward = wallClockToInstant(gap, NEW_YORK, { gap: 'backward' });
    expect(wallClockIn(backward, NEW_YORK)).toMatchObject({ hour: 1, minute: 30 });
    expect(backward).toBe(Date.UTC(2026, 2, 8, 6, 30));
  });

  it('resolves a fall-back fold to the earlier instant by default and the later on request', () => {
    // New York 2026-11-01: 02:00 EDT → 01:00 EST. 01:30 happens twice.
    const fold = { year: 2026, month: 11, day: 1, hour: 1, minute: 30 };
    const earlier = wallClockToInstant(fold, NEW_YORK);
    const later = wallClockToInstant(fold, NEW_YORK, { fold: 'later' });
    expect(earlier).toBe(Date.UTC(2026, 10, 1, 5, 30)); // EDT, −4
    expect(later).toBe(Date.UTC(2026, 10, 1, 6, 30)); // EST, −5
    expect(later - earlier).toBe(3_600_000);
    expect(wallClockIn(earlier, NEW_YORK)).toMatchObject({ hour: 1, minute: 30 });
    expect(wallClockIn(later, NEW_YORK)).toMatchObject({ hour: 1, minute: 30 });
  });

  it('handles the Berlin gap and fold too', () => {
    // 2026-03-29 02:30 does not exist in Berlin.
    const gap = wallClockToInstant({ year: 2026, month: 3, day: 29, hour: 2, minute: 30 }, BERLIN);
    expect(wallClockIn(gap, BERLIN)).toMatchObject({ hour: 3, minute: 30 });
    // 2026-10-25 02:30 happens twice.
    const a = wallClockToInstant({ year: 2026, month: 10, day: 25, hour: 2, minute: 30 }, BERLIN);
    const b = wallClockToInstant({ year: 2026, month: 10, day: 25, hour: 2, minute: 30 }, BERLIN, { fold: 'later' });
    expect(b - a).toBe(3_600_000);
  });
});

describe('toZoneIso', () => {
  it('writes the zone wall clock with its real offset, second precision, never Z', () => {
    const at = Date.UTC(2026, 7, 17, 7, 30, 5);
    expect(toZoneIso(at, BERLIN)).toBe('2026-08-17T09:30:05+02:00');
    expect(toZoneIso(at, NEW_YORK)).toBe('2026-08-17T03:30:05-04:00');
    expect(toZoneIso(at, MEXICO)).toBe('2026-08-17T01:30:05-06:00');
    expect(toZoneIso(at, 'Asia/Kolkata')).toBe('2026-08-17T13:00:05+05:30');
  });

  it('writes +00:00 for UTC — the API reads it as bot wall clock, which for a UTC bot is the same instant', () => {
    const at = Date.UTC(2026, 0, 5, 23, 59, 59);
    const iso = toZoneIso(at, 'UTC');
    expect(iso).toBe('2026-01-05T23:59:59+00:00');
    expect(iso.endsWith('Z')).toBe(false);
    expect(Date.parse(iso)).toBe(at);
  });

  it('is parseable back to the same instant in every zone', () => {
    const at = Date.UTC(2026, 10, 1, 5, 45, 0);
    for (const zone of [BERLIN, NEW_YORK, MEXICO, 'Asia/Tokyo', 'Pacific/Auckland']) {
      expect(Date.parse(toZoneIso(at, zone))).toBe(at);
    }
  });

  it('uses the winter offset in winter', () => {
    expect(toZoneIso(Date.UTC(2026, 0, 17, 8, 30, 0), BERLIN)).toBe('2026-01-17T09:30:00+01:00');
  });
});

describe('sameWallClock', () => {
  it('compares offsets at an instant, not zone identity', () => {
    const summer = Date.UTC(2026, 6, 1, 12);
    const winter = Date.UTC(2026, 0, 1, 12);
    expect(sameWallClock(BERLIN, 'Europe/Paris', summer)).toBe(true);
    expect(sameWallClock(BERLIN, 'Europe/London', summer)).toBe(false);
    expect(sameWallClock('UTC', 'Europe/London', winter)).toBe(true);
    expect(sameWallClock('UTC', 'Europe/London', summer)).toBe(false);
    expect(sameWallClock(BERLIN, BERLIN, summer)).toBe(true);
  });

  it('defaults to the local zone and now', () => {
    expect(sameWallClock(localTimeZone())).toBe(true);
  });
});

describe('formatInZone', () => {
  it('formats a time in a zone, defaulting to a short time', () => {
    const at = Date.UTC(2026, 7, 17, 7, 30);
    expect(formatInZone(at, BERLIN, { locale: 'de-DE' })).toMatch(/^0?9:30$/);
    expect(formatInZone(at, BERLIN, { locale: 'en-US' })).toMatch(/9:30\sAM/);
    expect(formatInZone(at, BERLIN, { locale: 'en-US', weekday: 'short', day: 'numeric', month: 'short' })).toBe(
      'Mon, Aug 17',
    );
  });
});
