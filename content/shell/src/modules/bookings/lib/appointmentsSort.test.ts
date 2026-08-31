import { describe, expect, it } from 'vitest';
import { BookingStatus, GoodsItemPriceCurrency } from '~api/generated/bookings/graphql';
import type { BookingRecord } from '../types';
import {
  defaultSort,
  effectiveSort,
  fromSortState,
  isDefaultSort,
  sortAppointments,
  toSortState,
} from './appointmentsSort';
import { SORT_KEYS } from './bookingsParams';
import { sampleBooking } from './samples';

const svc = (
  title: string,
  amount: string | null,
  currency = GoodsItemPriceCurrency.Usd,
): BookingRecord['service'] => ({
  __typename: 'GoodsService',
  id: `svc-${title}`,
  title,
  durationSeconds: 1800,
  isAvailable: true,
  price: amount === null ? null : { amount, currency },
});

const sp = (name: string): BookingRecord['specialist'] => ({
  __typename: 'Specialist',
  id: `sp-${name}`,
  profile: { firstName: name, lastName: null, logo: null },
});

function rows(): BookingRecord[] {
  return [
    sampleBooking({
      id: 'a',
      start: '2026-08-18T10:00:00-06:00',
      minutes: 30,
      status: BookingStatus.Confirmed,
      service: svc('Haircut', '25.00'),
      specialist: sp('Maria'),
      inlineContact: { id: 'i1', name: 'Zed Last', phoneNumber: '+1', note: null },
    }),
    sampleBooking({
      id: 'b',
      start: '2026-08-18T09:00:00-06:00',
      minutes: 90,
      status: BookingStatus.Attended,
      service: svc('Massage', '80.00', GoodsItemPriceCurrency.Eur),
      specialist: sp('Alex'),
      inlineContact: { id: 'i2', name: 'anna first', phoneNumber: '+1', note: null },
    }),
    sampleBooking({
      id: 'c',
      start: '2026-08-19T09:00:00-06:00',
      minutes: 15,
      status: BookingStatus.Pending,
      service: svc('Consultation', null),
      specialist: null,
      inlineContact: null,
    }),
    sampleBooking({
      id: 'd',
      start: '2026-08-17T15:00:00-06:00',
      minutes: 60,
      status: BookingStatus.Canceled,
      service: null,
      specialist: sp('Maria'),
      inlineContact: { id: 'i3', name: 'Ben', phoneNumber: '+1', note: null },
    }),
    sampleBooking({
      id: 'e',
      start: '2026-08-18T10:00:00-06:00',
      minutes: 30,
      status: BookingStatus.Confirmed,
      service: svc('Haircut', '10.00'),
      specialist: sp('Alex'),
      inlineContact: { id: 'i4', name: 'Ben', phoneNumber: '+1', note: null },
    }),
  ];
}

const ids = (list: BookingRecord[]) => list.map((r) => r.id).join('');

describe('appointmentsSort', () => {
  it('defaults: soonest first upcoming, most recent first past, and the override wins', () => {
    expect(defaultSort('upcoming')).toEqual({ key: 'start', direction: 'asc' });
    expect(defaultSort('past')).toEqual({ key: 'start', direction: 'desc' });
    expect(defaultSort('custom')).toEqual({ key: 'start', direction: 'asc' });
    expect(effectiveSort('past', { key: 'price', direction: 'asc' })).toEqual({ key: 'price', direction: 'asc' });
    expect(effectiveSort('past', null)).toEqual(defaultSort('past'));
    expect(isDefaultSort('past', { key: 'start', direction: 'desc' })).toBe(true);
    expect(isDefaultSort('upcoming', { key: 'start', direction: 'desc' })).toBe(false);
  });

  it('sorts by start both ways with a stable id tie-break', () => {
    expect(ids(sortAppointments(rows(), { key: 'start', direction: 'asc' }))).toBe('dbaec');
    expect(ids(sortAppointments(rows(), { key: 'start', direction: 'desc' }))).toBe('caebd');
  });

  it('sorts customers case-insensitively with walk-ins last', () => {
    expect(ids(sortAppointments(rows(), { key: 'customer', direction: 'asc' }))).toBe('bdeac');
    expect(ids(sortAppointments(rows(), { key: 'customer', direction: 'desc' }))).toBe('adebc');
  });

  it('sorts service and specialist by name, nulls last either way', () => {
    expect(ids(sortAppointments(rows(), { key: 'service', direction: 'asc' }))).toBe('caebd');
    expect(ids(sortAppointments(rows(), { key: 'service', direction: 'desc' }))).toBe('baecd');
    expect(ids(sortAppointments(rows(), { key: 'specialist', direction: 'asc' }))).toBe('bedac');
    expect(ids(sortAppointments(rows(), { key: 'specialist', direction: 'desc' }))).toBe('dabec');
  });

  it('sorts status in STATUS_META order and duration numerically', () => {
    expect(ids(sortAppointments(rows(), { key: 'status', direction: 'asc' }))).toBe('caebd');
    expect(ids(sortAppointments(rows(), { key: 'duration', direction: 'asc' }))).toBe('caedb');
    expect(ids(sortAppointments(rows(), { key: 'duration', direction: 'desc' }))).toBe('bdaec');
  });

  it('sorts price within a currency, orders currencies by code, and puts unpriced last', () => {
    expect(ids(sortAppointments(rows(), { key: 'price', direction: 'asc' }))).toBe('beadc');
    expect(ids(sortAppointments(rows(), { key: 'price', direction: 'desc' }))).toBe('aebdc');
  });

  it('never mutates its input and covers every key', () => {
    const input = rows();
    const before = ids(input);
    for (const key of SORT_KEYS) {
      const out = sortAppointments(input, { key, direction: 'asc' });
      expect(out).toHaveLength(input.length);
    }
    expect(ids(input)).toBe(before);
  });

  it('maps to and from DataTable sort state', () => {
    expect(toSortState({ key: 'price', direction: 'desc' })).toEqual({ key: 'price', dir: 'desc' });
    expect(fromSortState({ key: 'price', dir: 'asc' }, SORT_KEYS)).toEqual({ key: 'price', direction: 'asc' });
    expect(fromSortState(null, SORT_KEYS)).toBeNull();
    expect(fromSortState({ key: 'bogus', dir: 'asc' }, SORT_KEYS)).toBeNull();
  });
});
