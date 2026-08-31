import { describe, expect, it } from 'vitest';
import { scheduleLabel } from './scheduleLabel';

/* A Tuesday, 09:00 in London and 04:00 in New York on the same instant. */
const AT = '2026-08-25T08:00:00.000Z';

describe('scheduleLabel', () => {
  it('says nothing when there is no time', () => {
    expect(scheduleLabel(null, 'UTC')).toBeNull();
  });

  it('says nothing about a time that will not parse', () => {
    expect(scheduleLabel('whenever', 'UTC')).toBeNull();
    expect(scheduleLabel('', 'UTC')).toBeNull();
  });

  it('names the weekday, the date and the time', () => {
    expect(scheduleLabel(AT, 'UTC', 'en-GB')).toBe('Tue 25 Aug, 8:00');
  });

  it('reads the instant in the zone it was given, not the machine’s', () => {
    expect(scheduleLabel(AT, 'Europe/London', 'en-GB')).toBe('Tue 25 Aug, 9:00');
    expect(scheduleLabel(AT, 'America/New_York', 'en-GB')).toBe('Tue 25 Aug, 4:00');
  });

  it('crosses the date line where the zone does', () => {
    /* 22:00 UTC is already Wednesday in Tokyo. */
    expect(scheduleLabel('2026-08-25T22:00:00.000Z', 'Asia/Tokyo', 'en-GB')).toBe('Wed 26 Aug, 7:00');
  });

  it('reads the clock the way the locale does, so it agrees with the pickers behind it', () => {
    const at = '2026-08-25T16:00:00.000Z';
    expect(scheduleLabel(at, 'UTC', 'en-US')).toContain('4:00 PM');
    expect(scheduleLabel(at, 'UTC', 'en-GB')).toContain('16:00');
  });
});
