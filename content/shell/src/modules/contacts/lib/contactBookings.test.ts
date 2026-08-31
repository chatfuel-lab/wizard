import { describe, expect, it } from 'vitest';
import {
  BOOKING_WINDOWS,
  DEFAULT_BOOKING_WINDOW,
  bookingServiceTitle,
  bookingStatusMeta,
  bookingSummary,
  bookingWhen,
  bookingWindow,
  bookingWindowCaveat,
  bookingsForContact,
  botHasBookings,
  splitBookings,
  widerWindow,
  type BookingLike,
} from './contactBookings';

const NOW = Date.parse('2026-08-18T12:00:00.000Z');

const booking = (id: string, startIso: string, overrides: Partial<BookingLike> = {}): BookingLike => ({
  __typename: 'Booking',
  id,
  startTime: startIso,
  endTime: startIso,
  status: 'Confirmed',
  contact: { id: 'ct-1' },
  service: { __typename: 'GoodsService', title: 'Consultation' },
  ...overrides,
});

describe('the window', () => {
  it('asks for the span a salesperson acts on by default', () => {
    const { startTime, endTime } = bookingWindow(DEFAULT_BOOKING_WINDOW, NOW);
    expect(Date.parse(startTime)).toBe(NOW - 30 * 86_400_000);
    expect(Date.parse(endTime)).toBe(NOW + 90 * 86_400_000);
  });

  it('offers exactly one wider window and then stops', () => {
    expect(widerWindow(BOOKING_WINDOWS[0])?.key).toBe('year');
    expect(widerWindow(BOOKING_WINDOWS[1])).toBeNull();
  });

  it('says out loud that it is a window rather than a history', () => {
    expect(bookingWindowCaveat(DEFAULT_BOOKING_WINDOW)).toContain('window, not a full history');
    expect(bookingWindowCaveat(BOOKING_WINDOWS[1])).toContain('the last year');
  });
});

describe('bookingsForContact', () => {
  it('keeps only this contact, because the query returns the whole bot', () => {
    const rows = bookingsForContact(
      [booking('a', '2026-08-19T10:00:00Z'), booking('b', '2026-08-19T11:00:00Z', { contact: { id: 'ct-2' } })],
      'ct-1',
      NOW,
    );
    expect(rows.map((row) => row.id)).toEqual(['a']);
  });

  it('drops a booking with no contact rather than guessing it is this one', () => {
    expect(bookingsForContact([booking('a', '2026-08-19T10:00:00Z', { contact: null })], 'ct-1', NOW)).toEqual([]);
  });

  it('splits on now', () => {
    const rows = bookingsForContact(
      [booking('past', '2026-08-01T10:00:00Z'), booking('soon', '2026-08-20T10:00:00Z')],
      'ct-1',
      NOW,
    );
    expect(rows.find((row) => row.id === 'soon')?.upcoming).toBe(true);
    expect(rows.find((row) => row.id === 'past')?.upcoming).toBe(false);
  });

  it('never produces NaN from an unreadable instant', () => {
    const rows = bookingsForContact([booking('x', 'whenever')], 'ct-1', NOW);
    expect(rows[0].at).toBe(0);
    expect(Number.isNaN(rows[0].at)).toBe(false);
    expect(rows[0].upcoming).toBe(false);
  });

  it('survives no bookings at all', () => {
    expect(bookingsForContact(null, 'ct-1', NOW)).toEqual([]);
  });
});

describe('splitBookings', () => {
  it('reads soonest-first forwards and most-recent-first backwards', () => {
    const rows = bookingsForContact(
      [
        booking('later', '2026-09-01T10:00:00Z'),
        booking('sooner', '2026-08-20T10:00:00Z'),
        booking('old', '2026-07-01T10:00:00Z'),
        booking('recent', '2026-08-15T10:00:00Z'),
      ],
      'ct-1',
      NOW,
    );
    const { upcoming, past } = splitBookings(rows);
    expect(upcoming.map((row) => row.id)).toEqual(['sooner', 'later']);
    expect(past.map((row) => row.id)).toEqual(['recent', 'old']);
  });
});

describe('bookingSummary', () => {
  it('counts only the halves that exist', () => {
    const upcomingOnly = bookingsForContact([booking('a', '2026-08-20T10:00:00Z')], 'ct-1', NOW);
    expect(bookingSummary(upcomingOnly)).toBe('1 upcoming');

    const both = bookingsForContact(
      [booking('a', '2026-08-20T10:00:00Z'), booking('b', '2026-08-01T10:00:00Z')],
      'ct-1',
      NOW,
    );
    expect(bookingSummary(both)).toBe('1 upcoming · 1 past');
  });

  it('says nothing rather than zero of each', () => {
    expect(bookingSummary([])).toBeNull();
  });
});

describe('bookingWhen', () => {
  it('says the time is unknown rather than printing 1970', () => {
    const [row] = bookingsForContact([booking('x', 'whenever')], 'ct-1', NOW);
    expect(bookingWhen(row)).toBe('Time unknown');
  });

  it('prints a range when the booking has an end after its start', () => {
    const [row] = bookingsForContact(
      [booking('x', '2026-08-20T10:00:00Z', { endTime: '2026-08-20T11:00:00Z' })],
      'ct-1',
      NOW,
    );
    expect(bookingWhen(row)).toContain('\u2013');
  });

  it('prints one instant when start and end are the same', () => {
    const [row] = bookingsForContact([booking('x', '2026-08-20T10:00:00Z')], 'ct-1', NOW);
    expect(bookingWhen(row)).not.toContain('\u2013');
  });
});

describe('the service and the status', () => {
  it('names a deleted service rather than leaving a blank', () => {
    expect(bookingServiceTitle({ __typename: 'DeletedGoodsService' })).toBe('Deleted service');
    expect(bookingServiceTitle(null)).toBe('Appointment');
    expect(bookingServiceTitle({ __typename: 'GoodsService', title: '  ' })).toBe('Appointment');
    expect(bookingServiceTitle({ __typename: 'GoodsService', title: 'Haircut' })).toBe('Haircut');
  });

  it('labels every status the schema declares and survives one it does not', () => {
    for (const status of ['Pending', 'Confirmed', 'Attended', 'NoShow', 'Reschedule', 'Canceled']) {
      expect(bookingStatusMeta(status).label.length).toBeGreaterThan(0);
    }
    expect(bookingStatusMeta('Teleported')).toEqual({ label: 'Teleported', tone: 'neutral' });
  });
});

describe('botHasBookings', () => {
  it('is the only evidence available that this bot sells appointments', () => {
    expect(botHasBookings([])).toBe(false);
    expect(botHasBookings(null)).toBe(false);
    expect(botHasBookings([booking('a', '2026-08-20T10:00:00Z', { contact: { id: 'someone-else' } })])).toBe(true);
  });
});
