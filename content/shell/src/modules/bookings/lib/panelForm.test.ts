import { describe, expect, it } from 'vitest';
import { ChatfuelGraphQLError } from '~api';
import type { DisplayZone } from '../types';
import { formatMoney } from './appointmentsColumns';
import { formatPrice } from './serviceInput';
import {
  botTimeLabel,
  dayLabel,
  isPastBooking,
  isWhenDirty,
  priceLabel,
  timeSpanLabel,
  validateWhen,
  whenFieldOfError,
  whenFormOf,
  whenInstants,
  whenLabel,
} from './panelForm';
import { sampleBooking } from './samples';
import { wallClock } from './zone';

const MX = 'America/Mexico_City';
const BER = 'Europe/Berlin';
const EN = { hour12: false, locale: 'en-US' };

const nested = (code: string) =>
  new ChatfuelGraphQLError([
    {
      message: 'The upstream service rejected the request.',
      extensions: { errors: [{ message: 'x', extensions: { code } }] },
    } as never,
  ]);

describe('whenFormOf / whenInstants', () => {
  it('reads a record into day + minute + duration in the display zone', () => {
    const b = sampleBooking({ start: '2026-08-18T10:00:00-06:00', minutes: 45 });
    expect(whenFormOf(b, MX)).toEqual({ day: '2026-08-18', startMinute: 600, duration: 45 });
    // The same instant seen from Berlin is 18:00.
    expect(whenFormOf(b, BER)).toEqual({ day: '2026-08-18', startMinute: 18 * 60, duration: 45 });
  });

  it('a booking that crosses midnight in the display zone keeps its start day', () => {
    // 22:00 Mexico City = 06:00 next day in Berlin.
    const b = sampleBooking({ start: '2026-08-18T22:00:00-06:00', minutes: 60 });
    expect(whenFormOf(b, BER).day).toBe('2026-08-19');
    expect(whenFormOf(b, MX).day).toBe('2026-08-18');
  });

  it('builds instants in the display zone and formats them with the bot offset', () => {
    const wire = whenInstants({ day: '2026-08-18', startMinute: 600, duration: 30 }, MX, MX);
    expect(wire).toEqual({ startTime: '2026-08-18T10:00:00-06:00', endTime: '2026-08-18T10:30:00-06:00' });
    // Display Berlin, bot Mexico City: 18:00 Berlin is 10:00 in the bot zone, and that is what goes on the wire.
    const cross = whenInstants({ day: '2026-08-18', startMinute: 18 * 60, duration: 30 }, BER, MX);
    expect(cross.startTime).toBe('2026-08-18T10:00:00-06:00');
    // No bot zone → UTC framing, never `Z`.
    const utc = whenInstants({ day: '2026-08-18', startMinute: 600, duration: 30 }, MX, null);
    expect(utc.startTime).toBe('2026-08-18T16:00:00+00:00');
  });

  it('round-trips a record through the form', () => {
    const b = sampleBooking({ start: '2026-03-29T01:30:00+01:00', minutes: 90 }); // Berlin DST day
    const wire = whenInstants(whenFormOf(b, BER), BER, BER);
    expect(new Date(wire.startTime).getTime()).toBe(new Date(b.startTime).getTime());
    expect(new Date(wire.endTime).getTime()).toBe(new Date(b.endTime).getTime());
  });
});

describe('isWhenDirty', () => {
  const b = sampleBooking({ start: '2026-08-18T10:00:00-06:00', minutes: 30 });
  it('is clean for the record itself and dirty for any change', () => {
    const form = whenFormOf(b, MX);
    expect(isWhenDirty(form, b, MX)).toBe(false);
    expect(isWhenDirty({ ...form, startMinute: 660 }, b, MX)).toBe(true);
    expect(isWhenDirty({ ...form, duration: 45 }, b, MX)).toBe(true);
    expect(isWhenDirty({ ...form, day: '2026-08-19' }, b, MX)).toBe(true);
  });
  it('is dirty (not clean by accident) when the day does not parse', () => {
    expect(isWhenDirty({ day: 'junk', startMinute: 600, duration: 30 }, b, MX)).toBe(true);
  });
});

describe('validateWhen', () => {
  it('accepts a normal form and names the first problem otherwise', () => {
    expect(validateWhen({ day: '2026-08-18', startMinute: 600, duration: 30 })).toBeNull();
    expect(validateWhen({ day: '2026-02-30', startMinute: 600, duration: 30 })).toBe('Pick a day.');
    expect(validateWhen({ day: '2026-08-18', startMinute: -1, duration: 30 })).toBe('Pick a start time.');
    expect(validateWhen({ day: '2026-08-18', startMinute: 1440, duration: 30 })).toBe('Pick a start time.');
    expect(validateWhen({ day: '2026-08-18', startMinute: 600, duration: 0 })).toMatch(/at least 5 minutes/);
    expect(validateWhen({ day: '2026-08-18', startMinute: 600, duration: 24 * 60 })).toBeNull();
    expect(validateWhen({ day: '2026-08-18', startMinute: 600, duration: 24 * 60 + 1 })).toMatch(/24 hours/);
  });
});

describe('whenFieldOfError', () => {
  it('maps the booking codes to the control they belong under', () => {
    expect(whenFieldOfError(nested('BookingEndTimeBeforeStartTime'))).toBe('duration');
    expect(whenFieldOfError(nested('BookingInvalidDuration'))).toBe('duration');
    expect(whenFieldOfError(nested('BookingStartTimeRequired'))).toBe('start');
    expect(whenFieldOfError(nested('BookingDoesNotExist'))).toBeNull();
    expect(whenFieldOfError(new Error('network'))).toBeNull();
  });
});

describe('isPastBooking', () => {
  it('is past once the end has gone by', () => {
    const b = sampleBooking({ start: '2026-08-18T10:00:00-06:00', minutes: 30 });
    const end = new Date(b.endTime).getTime();
    expect(isPastBooking(b, end - 1)).toBe(false);
    expect(isPastBooking(b, end + 1)).toBe(true);
  });
});

describe('labels', () => {
  const b = sampleBooking({ start: '2026-08-18T10:00:00-06:00', minutes: 30 });

  it('dayLabel prints weekday + month + day, "Today" for today, the year when it is another year', () => {
    expect(dayLabel('2026-08-18', { locale: 'en-US', todayKey: '2026-08-17' })).toBe('Tue, Aug 18');
    expect(dayLabel('2026-08-18', { locale: 'en-US', todayKey: '2026-08-18' })).toBe('Today');
    expect(dayLabel('2027-01-04', { locale: 'en-US', todayKey: '2026-08-18' })).toBe('Mon, Jan 4, 2027');
    expect(dayLabel('junk', { locale: 'en-US' })).toBe('junk');
  });

  it('timeSpanLabel reads both ends in the zone and names the day when the end is another day', () => {
    expect(timeSpanLabel(b, MX, EN)).toBe('10:00 – 10:30');
    expect(timeSpanLabel(b, BER, EN)).toBe('18:00 – 18:30');
    const late = sampleBooking({ start: '2026-08-18T22:30:00-06:00', minutes: 165 });
    expect(timeSpanLabel(late, MX, EN)).toBe('22:30 – 01:15 (Wed, Aug 19)');
    // Ending exactly at midnight is still "today".
    const toMidnight = sampleBooking({ start: '2026-08-18T23:00:00-06:00', minutes: 60 });
    expect(timeSpanLabel(toMidnight, MX, EN)).toBe('23:00 – 00:00');
  });

  it('whenLabel joins the day and the span', () => {
    expect(whenLabel(b, MX, { ...EN, todayKey: '2026-08-17' })).toBe('Tue, Aug 18 · 10:00 – 10:30');
  });

  it('priceLabel formats per currency, says Free for zero, and never throws', () => {
    expect(priceLabel({ amount: '25.00', currency: 'USD' }, 'en-US')).toBe('$25.00');
    expect(priceLabel({ amount: '80.00', currency: 'EUR' }, 'en-US')).toBe('€80.00');
    expect(priceLabel({ amount: '0.00', currency: 'USD' }, 'en-US')).toBe('Free');
    // Intl accepts any well-formed 3-letter code; a malformed one falls back to "amount CODE".
    expect(priceLabel({ amount: '12', currency: 'XXQ' }, 'en-US')).toMatch(/^XXQ\s12\.00$/);
    expect(priceLabel({ amount: '12', currency: 'not-a-code' }, 'en-US')).toBe('12.00 not-a-code');
    expect(priceLabel({ amount: 'lots', currency: 'USD' }, 'en-US')).toBe('lots USD');
    expect(priceLabel(null)).toBe('');
  });

  it('prices the same number the same way as the table and a service card', () => {
    for (const currency of ['USD', 'EUR', 'XXQ', 'not-a-code']) {
      const money = formatMoney(12.5, currency, 'en-US');
      expect(priceLabel({ amount: '12.50', currency }, 'en-US')).toBe(money);
      expect(formatPrice({ amount: '12.50', currency }, 'en-US')).toBe(money);
    }
  });

  it('botTimeLabel is null when the display zone shows the bot wall clock, else the bot span', () => {
    const botZoneOnly: DisplayZone = { botZone: MX, zone: MX, source: 'bot' };
    expect(botTimeLabel(b, botZoneOnly, EN)).toBeNull();
    const local: DisplayZone = { botZone: MX, zone: BER, source: 'local' };
    expect(botTimeLabel(b, local, EN)).toBe('10:00 – 10:30 in bot time (America/Mexico_City)');
    // Same offset, different name → nothing to add.
    const paris: DisplayZone = { botZone: BER, zone: 'Europe/Paris', source: 'local' };
    expect(botTimeLabel(b, paris, EN)).toBeNull();
    // No bot zone at all → nothing to add.
    expect(botTimeLabel(b, { botZone: null, zone: BER, source: 'local' }, EN)).toBeNull();
    // Different day in the bot zone → the day is said.
    const late = sampleBooking({ start: '2026-08-18T22:30:00-06:00', minutes: 30 });
    expect(botTimeLabel(late, { botZone: MX, zone: BER, source: 'local' }, EN)).toBe(
      'Tue, Aug 18 · 22:30 – 23:00 in bot time (America/Mexico_City)',
    );
    expect(wallClock(new Date(late.startTime).getTime(), BER).dayKey).toBe('2026-08-19');
  });
});
