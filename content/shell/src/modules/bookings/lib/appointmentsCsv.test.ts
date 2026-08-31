import { describe, expect, it } from 'vitest';
import { BookingStatus, GoodsItemPriceCurrency } from '~api/generated/bookings/graphql';
import { CSV_BOM } from '~ui';
import type { BookingRecord } from '../types';
import { CSV_HEADER, csvFileName, csvRow, toCsv } from './appointmentsCsv';
import { sampleBooking } from './samples';

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

describe('appointmentsCsv', () => {
  it('writes the header once, CRLF rows, and no BOM of its own', () => {
    const csv = toCsv([], 'Europe/Berlin');
    expect(csv).toBe(`${CSV_HEADER.join(',')}\r\n`);
    expect(csv.startsWith(CSV_BOM)).toBe(false);
    const two = toCsv([sampleBooking(), sampleBooking()], 'Europe/Berlin').split('\r\n');
    expect(two).toHaveLength(4); // header, 2 rows, trailing empty
    expect(two[3]).toBe('');
  });

  it('prints every column of an inline-contact booking in the display zone', () => {
    const b = sampleBooking({
      id: 'bk-x',
      start: '2026-08-18T10:00:00-06:00',
      minutes: 30,
      status: BookingStatus.Attended,
    });
    const row = csvRow(b, 'Europe/Berlin');
    expect(row).toHaveLength(CSV_HEADER.length);
    expect(row).toEqual([
      '2026-08-18',
      '18:00',
      '18:30',
      'Europe/Berlin',
      'Dana Ray',
      'Inline contact',
      '+12025550100',
      'Consultation',
      'Active',
      'Alex Kim',
      'Attended',
      30,
      '',
      '',
      'bk-x',
    ]);
  });

  it('prints a real contact with its phone, a priced deleted service and a deleted specialist', () => {
    const b = sampleBooking({
      id: 'bk-y',
      inlineContact: null,
      contact: {
        __typename: 'WhatsappContact',
        id: 'wa',
        name: 'Priya, "VIP" Nair',
        phone: '12025550122',
        profilePictureUrl: null,
        note: null,
        conversation: null,
      },
      service: {
        __typename: 'DeletedGoodsService',
        id: 'old',
        title: 'Old Facial',
        durationSeconds: 3600,
        price: { amount: '40.5', currency: GoodsItemPriceCurrency.Usd },
      },
      specialist: { __typename: 'DeletedSpecialist', id: 'gone', profile: { firstName: 'Jo', lastName: 'Former' } },
    });
    const row = csvRow(b, 'America/Mexico_City');
    expect(row.slice(4, 15)).toEqual([
      'Priya, "VIP" Nair',
      'Contact',
      '12025550122',
      'Old Facial',
      'Deleted',
      'Jo Former (deleted)',
      'Confirmed',
      30,
      '40.50',
      'USD',
      'bk-y',
    ]);
    const line = toCsv([b], 'America/Mexico_City').split('\r\n')[1]!;
    expect(line).toContain('"Priya, ""VIP"" Nair"');
  });

  it('prints the Google Calendar event and the walk-in honestly, and an end on another day with its date', () => {
    const g = csvRow(gcal(), 'Europe/Berlin');
    expect(g.slice(4, 7)).toEqual(['Dentist', 'Google Calendar', '']);
    expect(g[14]).toBe('bk-g (gcal:evt-1)');
    const w = csvRow(sampleBooking({ inlineContact: null, service: null, specialist: null }), 'Europe/Berlin');
    expect(w.slice(4, 10)).toEqual(['', 'Walk-in', '', '', '', '']);
    const overnight = csvRow(sampleBooking({ start: '2026-08-18T23:30:00-06:00', minutes: 60 }), 'America/Mexico_City');
    expect(overnight.slice(0, 3)).toEqual(['2026-08-18', '23:30', '2026-08-19 00:30']);
  });

  it('names the file after the tab and the loaded window, inclusive', () => {
    expect(csvFileName('upcoming', { startKey: '2026-08-17', endKey: '2026-11-15' })).toBe(
      'appointments-upcoming-2026-08-17--2026-11-14.csv',
    );
    expect(csvFileName('past', { startKey: '2026-07-18', endKey: '2026-08-18' })).toBe(
      'appointments-past-2026-07-18--2026-08-17.csv',
    );
  });
});
