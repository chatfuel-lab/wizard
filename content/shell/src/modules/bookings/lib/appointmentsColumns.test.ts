import { describe, expect, it } from 'vitest';
import { BookingStatus, GoodsItemPriceCurrency } from '~api/generated/bookings/graphql';
import type { BookingRecord } from '../types';
import {
  APPOINTMENT_COLUMNS,
  customerCell,
  displayCustomerName,
  durationCell,
  formatDayLabel,
  formatDurationLabel,
  formatMoney,
  formatPhone,
  formatShortDay,
  hiddenColumnsFor,
  isGoogleCalendarRef,
  priceCell,
  serviceCell,
  specialistCell,
  timeCell,
} from './appointmentsColumns';
import { SORT_KEYS } from './bookingsParams';
import { sampleBooking } from './samples';

const en = { locale: 'en-US' };

const gcal = (): BookingRecord =>
  ({
    __typename: 'BookingWithGoogleCalendarRef',
    id: 'bk-g',
    startTime: '2026-08-18T16:00:00+02:00',
    endTime: '2026-08-18T17:00:00+02:00',
    status: BookingStatus.Confirmed,
    service: null,
    specialist: null,
    contact: null,
    inlineContact: null,
    googleCalendarRefData: {
      calendar: { id: 'gcal', summary: 'alex@example.com' },
      eventID: 'evt-1',
      summary: 'Dentist',
    },
  }) as BookingRecord;

describe('appointmentsColumns', () => {
  it('lists every sort key exactly once, in display order', () => {
    expect(APPOINTMENT_COLUMNS.map((c) => c.key)).toEqual([...SORT_KEYS]);
    expect(new Set(APPOINTMENT_COLUMNS.map((c) => c.key)).size).toBe(SORT_KEYS.length);
    expect(APPOINTMENT_COLUMNS.every((c) => c.sortable)).toBe(true);
  });

  it('hides columns per band so the table fits its floor width', () => {
    expect(hiddenColumnsFor('inline', 'comfortable')).toEqual([]);
    expect(hiddenColumnsFor('wide', 'compact')).toEqual(['duration']);
    expect(hiddenColumnsFor('narrow', 'comfortable')).toEqual(['specialist', 'duration', 'price']);
    expect(hiddenColumnsFor('compact', 'compact')).toEqual(['specialist', 'duration', 'price']);
  });

  it('prints the time in the display zone, day + range', () => {
    const b = sampleBooking({ start: '2026-08-18T10:00:00-06:00', minutes: 30 });
    const mx = timeCell(b, 'America/Mexico_City', en);
    expect(mx.day).toBe('Tue, Aug 18');
    expect(mx.range).toBe('10:00 – 10:30');
    expect(mx.dayKey).toBe('2026-08-18');
    expect(mx.crossesMidnight).toBe(false);
    const berlin = timeCell(b, 'Europe/Berlin', en);
    expect(berlin.range).toBe('18:00 – 18:30');
    expect(timeCell(b, 'America/Mexico_City', { ...en, hour12: true }).range).toBe('10:00 AM – 10:30 AM');
  });

  it('says when a booking crosses midnight, and treats 23:00–00:00 as one day', () => {
    const late = sampleBooking({ start: '2026-08-18T23:00:00-06:00', minutes: 90 });
    const cell = timeCell(late, 'America/Mexico_City', en);
    expect(cell.crossesMidnight).toBe(true);
    expect(cell.range).toBe('23:00 – Wed 00:30');
    const toMidnight = sampleBooking({ start: '2026-08-18T23:00:00-06:00', minutes: 60 });
    expect(timeCell(toMidnight, 'America/Mexico_City', en)).toMatchObject({
      crossesMidnight: false,
      range: '23:00 – 00:00',
    });
  });

  it('adds the year only when it differs from today', () => {
    expect(formatDayLabel('2026-08-18', { ...en, todayKey: '2026-01-01' })).toBe('Tue, Aug 18');
    expect(formatDayLabel('2027-08-18', { ...en, todayKey: '2026-01-01' })).toBe('Wed, Aug 18, 2027');
    expect(formatShortDay('2026-08-18', en)).toBe('Aug 18');
    expect(formatShortDay('2025-12-31', { ...en, todayKey: '2026-08-17' })).toBe('Dec 31, 2025');
    expect(formatDayLabel('garbage', en)).toBe('garbage');
  });

  it('describes both customer identities, the GCal event and the walk-in', () => {
    const inline = customerCell(sampleBooking());
    expect(inline).toMatchObject({
      kind: 'inline',
      name: 'Dana Ray',
      detail: '+1 202 555 0100',
      phone: '+12025550100',
      avatar: null,
    });
    const contact = customerCell(
      sampleBooking({
        inlineContact: null,
        contact: {
          __typename: 'WhatsappContact',
          id: 'wa_1',
          name: 'Priya Nair',
          phone: '12025550122',
          profilePictureUrl: 'x.png',
          note: null,
          conversation: null,
        },
      }),
    );
    expect(contact).toMatchObject({
      kind: 'contact',
      name: 'Priya Nair',
      detail: '+1 202 555 0122',
      avatar: 'x.png',
      phone: '12025550122',
    });
    const ig = customerCell(
      sampleBooking({
        inlineContact: null,
        contact: {
          __typename: 'InstagramContact',
          id: 'ig',
          name: 'insta.olivia',
          profilePictureUrl: null,
          note: null,
          conversation: null,
        },
      }),
    );
    expect(ig).toMatchObject({ kind: 'contact', name: 'insta.olivia', detail: null, phone: null });
    const g = customerCell(gcal());
    expect(g).toMatchObject({
      kind: 'gcal',
      name: 'Google Calendar event',
      detail: 'Dentist',
      searchName: 'Dentist',
      phone: null,
    });
    expect(isGoogleCalendarRef(gcal())).toBe(true);
    expect(isGoogleCalendarRef(sampleBooking())).toBe(false);
    const walk = customerCell(sampleBooking({ inlineContact: null }));
    expect(walk).toMatchObject({ kind: 'walkin', name: 'Walk-in', detail: null, searchName: '' });
    expect(displayCustomerName(gcal())).toBe('Google Calendar event');
    expect(displayCustomerName(sampleBooking())).toBe('Dana Ray');
    expect(displayCustomerName(sampleBooking({ inlineContact: null }))).toBe('Walk-in');
  });

  it('formats phones without inventing digits', () => {
    expect(formatPhone('+12025550100')).toBe('+1 202 555 0100');
    expect(formatPhone('12025550100')).toBe('+1 202 555 0100');
    // Only NANP is regrouped; every other plan is echoed, because its grouping is not in the digits.
    expect(formatPhone('+4915112345678')).toBe('+4915112345678');
    expect(formatPhone('+49 151 12345678')).toBe('+49 151 12345678');
    expect(formatPhone('12345')).toBe('12345');
  });

  it('marks deleted services and specialists, and still prices a deleted service', () => {
    expect(serviceCell(sampleBooking())).toEqual({ title: 'Consultation', deleted: false });
    const deleted = sampleBooking({
      service: {
        __typename: 'DeletedGoodsService',
        id: 'old',
        title: 'Old Facial',
        durationSeconds: 3600,
        price: { amount: '40.00', currency: GoodsItemPriceCurrency.Usd },
      },
    });
    expect(serviceCell(deleted)).toEqual({ title: 'Old Facial', deleted: true });
    expect(priceCell(deleted, 'en-US')).toEqual({ amount: 40, currency: 'USD', label: '$40.00' });
    expect(priceCell(sampleBooking())).toBeNull();
    expect(
      priceCell(
        sampleBooking({
          service: {
            __typename: 'GoodsService',
            id: 's',
            title: 'X',
            durationSeconds: 60,
            isAvailable: true,
            price: { amount: 'abc', currency: GoodsItemPriceCurrency.Usd },
          },
        }),
      ),
    ).toBeNull();
    expect(serviceCell(sampleBooking({ service: null }))).toBeNull();
    expect(specialistCell(sampleBooking())).toEqual({ name: 'Alex Kim', deleted: false, avatar: null });
    expect(
      specialistCell(
        sampleBooking({
          specialist: { __typename: 'DeletedSpecialist', id: 'gone', profile: { firstName: 'Jo', lastName: 'Former' } },
        }),
      ),
    ).toEqual({ name: 'Jo Former', deleted: true, avatar: null });
    expect(specialistCell(sampleBooking({ specialist: null }))).toBeNull();
  });

  it('formats money and durations', () => {
    expect(formatMoney(25, 'USD', 'en-US')).toBe('$25.00');
    expect(formatMoney(80, 'EUR', 'en-US')).toBe('€80.00');
    // Intl accepts any three-letter code and prints it as-is; a malformed code falls back to `amount CODE`.
    expect(formatMoney(12.5, 'XYZ', 'en-US')).toBe('XYZ 12.50');
    expect(formatMoney(12.5, 'not-a-code', 'en-US')).toBe('12.50 not-a-code');
    // The second call for the same refused code reads the cache; it must not lose the code.
    expect(formatMoney(12.5, 'not-a-code', 'en-US')).toBe('12.50 not-a-code');
    expect(formatMoney(3, 'not-a-code', 'en-US')).toBe('3.00 not-a-code');
    expect(formatDurationLabel(90)).toBe('1 h 30 min');
    expect(formatDurationLabel(60)).toBe('1 h');
    expect(formatDurationLabel(15)).toBe('15 min');
    expect(durationCell(sampleBooking({ minutes: 45 }))).toEqual({ minutes: 45, label: '45 min' });
  });
});
