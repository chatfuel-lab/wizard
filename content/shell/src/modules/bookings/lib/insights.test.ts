import { describe, expect, it } from 'vitest';
import { BookingStatus, GoodsItemPriceCurrency } from '~api/generated/bookings/graphql';
import type { BookingRecord } from '../types';
import type { DayRange } from './calendarRange';
import {
  computeInsights,
  coverageLine,
  formatMinutes,
  formatRate,
  occupiedMinutes,
  peaks,
  PERIOD_LABELS,
  scheduledMinutesFor,
  shareOfMax,
  trimHours,
  weekdayOccurrences,
} from './insights';
import { sampleBooking, sampleDay, sampleSpecialist } from './samples';
import { STATUS_META } from './status';
import { zonedInstant } from './zone';

const MX = 'America/Mexico_City';
const en = { locale: 'en-US' };
/** Mon Aug 17 – Sun Aug 23, 2026 (Monday-first week). */
const WEEK: DayRange = { startKey: '2026-08-17', endKey: '2026-08-24' };

const priced = (amount: string, currency = GoodsItemPriceCurrency.Usd, deleted = false): BookingRecord['service'] =>
  deleted
    ? { __typename: 'DeletedGoodsService', id: 'old', title: 'Old', durationSeconds: 1800, price: { amount, currency } }
    : {
        __typename: 'GoodsService',
        id: 'svc',
        title: 'Svc',
        durationSeconds: 1800,
        isAvailable: true,
        price: { amount, currency },
      };

const on = (day: string, hhmm: string, minutes: number, over: Partial<BookingRecord> = {}): BookingRecord => {
  const [h, m] = hhmm.split(':').map(Number) as [number, number];
  const start = zonedInstant(day, h * 60 + m, MX);
  return sampleBooking({ start: new Date(start).toISOString(), minutes, ...over });
};

const base = (records: BookingRecord[], over: Partial<Parameters<typeof computeInsights>[0]> = {}) =>
  computeInsights({
    records,
    range: WEEK,
    zone: MX,
    specialists: [sampleSpecialist()],
    weekStartsOn: 1,
    format: en,
    ...over,
  });

describe('insights', () => {
  it('counts the status mix in STATUS_META order with shares', () => {
    const r = base([
      on('2026-08-17', '10:00', 30, { status: BookingStatus.Attended }),
      on('2026-08-17', '11:00', 30, { status: BookingStatus.Attended }),
      on('2026-08-18', '10:00', 30, { status: BookingStatus.NoShow }),
      on('2026-08-19', '10:00', 30, { status: BookingStatus.Canceled }),
    ]);
    expect(r.total).toBe(4);
    expect(r.statusMix.map((s) => s.status)).toEqual(STATUS_META.map((m) => m.status));
    expect(r.statusMix.map((s) => s.count)).toEqual([0, 0, 2, 1, 0, 1]);
    expect(r.statusMix[2]!.share).toBe(0.5);
    expect(r.statusMix[2]!.tone).toBe('success');
  });

  it('rates: no-show over resolved, cancel over total, null on a zero denominator', () => {
    const empty = base([]);
    expect(empty.noShow).toEqual({ noShow: 0, attended: 0, rate: null });
    expect(empty.cancel).toEqual({ canceled: 0, total: 0, rate: null });
    const unresolved = base([
      on('2026-08-17', '10:00', 30, { status: BookingStatus.Confirmed }),
      on('2026-08-17', '11:00', 30, { status: BookingStatus.Canceled }),
    ]);
    expect(unresolved.noShow.rate).toBeNull();
    expect(unresolved.cancel).toEqual({ canceled: 1, total: 2, rate: 0.5 });
    const r = base([
      on('2026-08-17', '10:00', 30, { status: BookingStatus.Attended }),
      on('2026-08-17', '11:00', 30, { status: BookingStatus.Attended }),
      on('2026-08-17', '12:00', 30, { status: BookingStatus.Attended }),
      on('2026-08-18', '10:00', 30, { status: BookingStatus.NoShow }),
      on('2026-08-18', '11:00', 30, { status: BookingStatus.Pending }),
    ]);
    expect(r.noShow).toEqual({ noShow: 1, attended: 3, rate: 0.25 });
    expect(r.cancel.rate).toBe(0);
    expect(formatRate(r.noShow.rate)).toBe('25%');
    expect(formatRate(null)).toBe('—');
    expect(formatRate(0.333)).toBe('33%');
  });

  it('sums attended revenue per currency, never across, counts unpriced, prices deleted services', () => {
    const r = base([
      on('2026-08-17', '10:00', 30, { status: BookingStatus.Attended, service: priced('25.00') }),
      on('2026-08-17', '11:00', 30, { status: BookingStatus.Attended, service: priced('10.50') }),
      on('2026-08-17', '12:00', 30, {
        status: BookingStatus.Attended,
        service: priced('80.00', GoodsItemPriceCurrency.Eur),
      }),
      on('2026-08-17', '13:00', 30, {
        status: BookingStatus.Attended,
        service: priced('40.00', GoodsItemPriceCurrency.Usd, true),
      }),
      on('2026-08-17', '14:00', 30, { status: BookingStatus.Attended, service: null }),
      on('2026-08-17', '15:00', 30, {
        status: BookingStatus.Attended,
        service: {
          __typename: 'GoodsService',
          id: 'free',
          title: 'Free',
          durationSeconds: 60,
          isAvailable: true,
          price: null,
        },
      }),
      on('2026-08-18', '10:00', 30, { status: BookingStatus.Confirmed, service: priced('999.00') }), // not attended → not revenue
      on('2026-08-18', '11:00', 30, { status: BookingStatus.NoShow, service: priced('999.00') }),
    ]);
    expect(r.revenue.attended).toBe(6);
    expect(r.revenue.unpriced).toBe(2);
    expect(r.revenue.perCurrency).toEqual([
      { currency: 'USD', amount: 75.5, bookings: 3 },
      { currency: 'EUR', amount: 80, bookings: 1 },
    ]);
  });

  it('counts weekday occurrences and scheduled minutes across a range, break subtracted', () => {
    expect(weekdayOccurrences(WEEK)).toEqual([1, 1, 1, 1, 1, 1, 1]);
    expect(weekdayOccurrences({ startKey: '2026-08-01', endKey: '2026-09-01' })).toEqual([5, 5, 4, 4, 4, 4, 5]); // Aug 2026 starts on a Saturday
    // Alex: Mon 09–18 with a 13–14 break (8 h), Tue–Fri 09–18 (9 h) → 44 h a week.
    expect(scheduledMinutesFor(sampleSpecialist(), WEEK)).toBe(44 * 60);
    expect(
      scheduledMinutesFor(
        sampleSpecialist({
          schedule: { enabled: false, sun: null, mon: null, tue: null, wed: null, thu: null, fri: null, sat: null },
        }),
        WEEK,
      ),
    ).toBeNull();
    // Two weeks double it.
    expect(scheduledMinutesFor(sampleSpecialist(), { startKey: '2026-08-17', endKey: '2026-08-31' })).toBe(88 * 60);
  });

  it('utilisation = occupied (non-Canceled) minutes / scheduled minutes, clipped to the window; no schedule → null', () => {
    const sam = sampleSpecialist({
      id: 'sp-sam',
      profile: { firstName: 'Sam', lastName: null, aboutInfo: null, logo: null },
      schedule: { enabled: false, sun: null, mon: null, tue: null, wed: null, thu: null, fri: null, sat: null },
    });
    const samRef: BookingRecord['specialist'] = {
      __typename: 'Specialist',
      id: 'sp-sam',
      profile: { firstName: 'Sam', lastName: null, logo: null },
    };
    const window = { startMs: zonedInstant(WEEK.startKey, 0, MX), endMs: zonedInstant(WEEK.endKey, 0, MX) };
    const r = base(
      [
        on('2026-08-17', '10:00', 60, { status: BookingStatus.Confirmed }),
        on('2026-08-18', '10:00', 120, { status: BookingStatus.Attended }),
        on('2026-08-19', '10:00', 60, { status: BookingStatus.Canceled }), // frees the time
        on('2026-08-23', '23:00', 120, { status: BookingStatus.Confirmed }), // Sun 23:00 → 60 min inside the week, 60 outside
        on('2026-08-20', '10:00', 60, { status: BookingStatus.Pending, specialist: samRef }),
        on('2026-08-20', '12:00', 60, { status: BookingStatus.Pending, specialist: null }), // unassigned: nobody's utilisation
      ],
      { specialists: [sampleSpecialist(), sam], window },
    );
    expect(r.utilisation).toHaveLength(2);
    const alex = r.utilisation[0]!;
    expect(alex).toMatchObject({
      specialistId: 'sp-1',
      name: 'Alex Kim',
      occupiedMinutes: 240,
      scheduledMinutes: 44 * 60,
      bookings: 3,
    });
    expect(alex.ratio).toBeCloseTo(240 / (44 * 60), 6);
    expect(r.utilisation[1]).toEqual({
      specialistId: 'sp-sam',
      name: 'Sam',
      occupiedMinutes: 60,
      scheduledMinutes: null,
      ratio: null,
      bookings: 1,
    });
    // Without a window the straddling booking counts whole.
    const unclipped = base([on('2026-08-23', '23:00', 120, { status: BookingStatus.Confirmed })]);
    expect(unclipped.utilisation[0]!.occupiedMinutes).toBe(120);
  });

  it('occupiedMinutes clips both edges and ignores nonsense', () => {
    const w = { startMs: 1_000 * 60_000, endMs: 2_000 * 60_000 };
    const rec = (s: number, e: number) => ({
      startTime: new Date(s * 60_000).toISOString(),
      endTime: new Date(e * 60_000).toISOString(),
    });
    expect(occupiedMinutes(rec(900, 1_100), w)).toBe(100);
    expect(occupiedMinutes(rec(1_900, 2_100), w)).toBe(100);
    expect(occupiedMinutes(rec(500, 900), w)).toBe(0);
    expect(occupiedMinutes(rec(1_100, 1_000), w)).toBe(0);
    expect(occupiedMinutes(rec(1_100, 1_130), null)).toBe(30);
    expect(occupiedMinutes({ startTime: 'x', endTime: 'y' }, null)).toBe(0);
  });

  it('buckets weekdays (in week order) and start hours in the DISPLAY zone', () => {
    const records = [
      on('2026-08-17', '09:00', 30), // Mon 09 MX = Mon 17 Berlin (CEST)
      on('2026-08-17', '09:30', 30),
      on('2026-08-18', '20:00', 30), // Tue 20 MX = Wed 04 Berlin
      on('2026-08-23', '10:00', 30), // Sun
    ];
    const mx = base(records);
    expect(mx.weekdays.map((b) => b.label)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(mx.weekdays.map((b) => b.count)).toEqual([2, 1, 0, 0, 0, 0, 1]);
    expect(mx.hours).toHaveLength(24);
    expect(mx.hours[9]!.count).toBe(2);
    expect(mx.hours[20]!.count).toBe(1);
    expect(mx.hours[9]!.label).toBe('09:00');
    const berlin = base(records, { zone: 'Europe/Berlin' });
    expect(berlin.weekdays.map((b) => b.count)).toEqual([2, 0, 1, 0, 0, 0, 1]);
    expect(berlin.hours[17]!.count).toBe(2);
    expect(berlin.hours[4]!.count).toBe(1);
    const sundayFirst = base(records, { weekStartsOn: 0 });
    expect(sundayFirst.weekdays.map((b) => b.label)).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    expect(sundayFirst.weekdays[0]!.count).toBe(1);
  });

  it('trims the hour axis around the busy span, never narrower than a working day', () => {
    const empty = base([]);
    expect(trimHours(empty.hours).map((h) => h.key)).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
    const late = base([on('2026-08-17', '21:00', 30), on('2026-08-17', '07:00', 30)]);
    expect(trimHours(late.hours).map((h) => h.key)).toEqual([
      6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
    ]);
    const midnight = base([on('2026-08-17', '00:15', 30), on('2026-08-17', '23:30', 30)]);
    expect(trimHours(midnight.hours)[0]!.key).toBe(0);
    expect(trimHours(midnight.hours).at(-1)!.key).toBe(23);
  });

  it('shares, peaks and coverage', () => {
    const r = base([on('2026-08-17', '09:00', 30), on('2026-08-17', '09:30', 30), on('2026-08-18', '10:00', 30)]);
    expect(shareOfMax(1, r.weekdays)).toBe(0.5);
    expect(shareOfMax(0, [])).toBe(0);
    expect(peaks(r.weekdays).map((b) => b.label)).toEqual(['Mon']);
    expect(peaks(base([]).weekdays)).toEqual([]);
    expect(
      peaks([
        { key: 1, label: 'a', count: 2 },
        { key: 2, label: 'b', count: 2 },
      ]),
    ).toHaveLength(2);
    expect(r.coverage).toEqual({ count: 3, range: WEEK, days: 7 });
    expect(coverageLine(r, en)).toBe('over 3 bookings · Aug 17 – 23');
    expect(coverageLine(base([on('2026-08-17', '09:00', 30)]), en)).toBe('over 1 booking · Aug 17 – 23');
    expect(coverageLine(base([]), en)).toBe('over 0 bookings · Aug 17 – 23');
  });

  it('formats minutes and names periods', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(90)).toBe('1 h 30 min');
    expect(formatMinutes(120)).toBe('2 h');
    expect(formatMinutes(44 * 60 + 15)).toBe('44 h');
    expect(PERIOD_LABELS['30d']).toBe('Last 30 days');
    expect(Object.keys(PERIOD_LABELS)).toEqual(['week', 'month', '30d', '90d', 'custom']);
  });

  it('never mutates its input', () => {
    const records = [on('2026-08-17', '09:00', 30)];
    const snapshot = JSON.stringify(records);
    base(records);
    expect(JSON.stringify(records)).toBe(snapshot);
    expect(sampleDay().enabled).toBe(true);
  });
});
