/**
 * A contact's appointments — and the reason they are a WINDOW rather than a
 * history.
 *
 * `Contact` has no bookings field and `BookingBase` has no contact filter. The
 * only door is `bookingsV2(startTime, endTime)`, which returns EVERY booking on
 * the bot inside a time range; matching them to one contact is client-side work
 * on `booking.contact.id`.
 *
 * Three consequences the card has to be honest about, and each one is a rule
 * below:
 *
 * 1. **It is a window, so it can be wrong by omission.** An appointment from
 *    last spring is not missing because the contact has none — it is outside
 *    the range that was asked for. The card says which range it asked for and
 *    offers a wider one, rather than printing "no appointments".
 * 2. **The cost is the whole bot, not this contact.** A year-wide window on a
 *    busy bot is a large answer for two rows, which is why the default is
 *    −30 d / +90 d: the span a salesperson acts on.
 * 3. **A bot with no bookings at all must show nothing.** There is no query
 *    that asks "does this bot sell appointments?", so the only available
 *    evidence is the answer itself: an empty window for the WHOLE bot means
 *    there is nothing to show, and an empty card explaining that would be
 *    furniture. The card is rendered only when the bot has bookings.
 */
import { DAY as DAY_MS } from './time';

export type BookingStatusLike = string;

export interface BookingServiceLike {
  __typename: string;
  title?: string | null;
}

export interface BookingLike {
  __typename: string;
  id: string;
  startTime: string;
  endTime: string;
  status: BookingStatusLike;
  contact?: { id: string } | null;
  service?: BookingServiceLike | null;
}

// ---------------------------------------------------------------------------
// The window
// ---------------------------------------------------------------------------

export interface BookingWindowSpec {
  key: string;
  label: string;
  backDays: number;
  forwardDays: number;
}

/**
 * Two windows, not a date picker.
 *
 * The card is a glance on a record page. A person who wants to interrogate the
 * calendar has a calendar; what they want here is "and is there one further
 * back?", which is one button.
 */
export const BOOKING_WINDOWS: readonly BookingWindowSpec[] = [
  { key: 'near', label: 'Last 30 days and the next 90', backDays: 30, forwardDays: 90 },
  { key: 'year', label: 'The last year and the next', backDays: 365, forwardDays: 365 },
];

export const DEFAULT_BOOKING_WINDOW: BookingWindowSpec = BOOKING_WINDOWS[0];

export function bookingWindow(spec: BookingWindowSpec, now = Date.now()): { startTime: string; endTime: string } {
  return {
    startTime: new Date(now - spec.backDays * DAY_MS).toISOString(),
    endTime: new Date(now + spec.forwardDays * DAY_MS).toISOString(),
  };
}

/** The sentence under the card. Always true, always about the range that was asked for. */
export function bookingWindowCaveat(spec: BookingWindowSpec): string {
  return `A window, not a full history: ${spec.label.toLowerCase()}. Anything outside it is not shown.`;
}

/** The wider window to offer, or null when this already is the widest. */
export function widerWindow(spec: BookingWindowSpec): BookingWindowSpec | null {
  const index = BOOKING_WINDOWS.findIndex((entry) => entry.key === spec.key);
  return index >= 0 && index + 1 < BOOKING_WINDOWS.length ? BOOKING_WINDOWS[index + 1] : null;
}

// ---------------------------------------------------------------------------
// The rows
// ---------------------------------------------------------------------------

export type BookingTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

interface StatusMeta {
  label: string;
  tone: BookingTone;
}

/**
 * The six statuses the schema declares. A status outside the table still reads:
 * the enum is the server's and it is allowed to grow without this card
 * breaking.
 */
const STATUS_META: Record<string, StatusMeta> = {
  Pending: { label: 'Pending', tone: 'warning' },
  Confirmed: { label: 'Confirmed', tone: 'accent' },
  Attended: { label: 'Attended', tone: 'success' },
  NoShow: { label: 'No-show', tone: 'danger' },
  Reschedule: { label: 'Needs reschedule', tone: 'warning' },
  Canceled: { label: 'Canceled', tone: 'neutral' },
};

export function bookingStatusMeta(status: BookingStatusLike): StatusMeta {
  return STATUS_META[status] ?? { label: status, tone: 'neutral' };
}

/**
 * What the row calls the service.
 *
 * `DeletedGoodsService` carries only an id: the service is gone but the
 * appointment it produced is not, and saying so is more use than a blank.
 */
export function bookingServiceTitle(service: BookingServiceLike | null | undefined): string {
  if (!service) return 'Appointment';
  if (service.__typename === 'DeletedGoodsService') return 'Deleted service';
  const title = (service.title ?? '').trim();
  return title === '' ? 'Appointment' : title;
}

export interface ContactBooking {
  id: string;
  /** Epoch ms. An unreadable instant sorts last rather than to 1970. */
  at: number;
  endAt: number | null;
  status: BookingStatusLike;
  statusLabel: string;
  tone: BookingTone;
  service: string;
  upcoming: boolean;
}

const instant = (iso: string): number | null => {
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? null : parsed;
};

/**
 * The bot's window, narrowed to one contact.
 *
 * A booking whose `contact` is null belongs to an inline guest the calendar
 * captured without a contact record; it is not this contact's, and matching it
 * on anything else would be a guess.
 */
export function bookingsForContact(
  bookings: readonly BookingLike[] | null | undefined,
  contactId: string,
  now = Date.now(),
): ContactBooking[] {
  const rows: ContactBooking[] = [];
  for (const booking of bookings ?? []) {
    if (booking.contact?.id !== contactId) continue;
    const at = instant(booking.startTime);
    const meta = bookingStatusMeta(booking.status);
    rows.push({
      id: booking.id,
      at: at ?? 0,
      endAt: instant(booking.endTime),
      status: booking.status,
      statusLabel: meta.label,
      tone: meta.tone,
      service: bookingServiceTitle(booking.service),
      upcoming: at !== null && at >= now,
    });
  }
  return rows;
}

/**
 * Upcoming first and soonest first, then the past, most recent first.
 *
 * That is the order a person reads a record in: what is coming, then what
 * happened. A single flat sort by time cannot express it.
 */
export function splitBookings(rows: readonly ContactBooking[]): {
  upcoming: ContactBooking[];
  past: ContactBooking[];
} {
  const upcoming = rows.filter((row) => row.upcoming).sort((a, b) => a.at - b.at);
  const past = rows.filter((row) => !row.upcoming).sort((a, b) => b.at - a.at);
  return { upcoming, past };
}

/**
 * The count line — emitted only for the halves that exist.
 *
 * `null` when there is nothing on either side, so the caller prints the empty
 * sentence instead of "0 upcoming, 0 past".
 */
export function bookingSummary(rows: readonly ContactBooking[]): string | null {
  const { upcoming, past } = splitBookings(rows);
  const parts: string[] = [];
  if (upcoming.length > 0) parts.push(`${upcoming.length} upcoming`);
  if (past.length > 0) parts.push(`${past.length} past`);
  return parts.length === 0 ? null : parts.join(' · ');
}

const WHEN_FORMAT = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });

/**
 * When the appointment is, in one line.
 *
 * A booking whose `startTime` this module cannot read says so rather than
 * printing 1 January 1970 — `at` is 0 for exactly that case, and `new Date(0)`
 * formats perfectly happily, which is what makes the guard necessary rather
 * than optional.
 */
export function bookingWhen(row: ContactBooking): string {
  if (row.at <= 0) return 'Time unknown';
  const start = WHEN_FORMAT.format(row.at);
  if (row.endAt === null || row.endAt <= row.at) return start;
  return `${start} – ${TIME_FORMAT.format(row.endAt)}`;
}

/**
 * Does this bot do appointments at all?
 *
 * The only evidence available: there is no "is the bookings product installed"
 * query in this module's operations, and `bookingsV2` answers with the bot's
 * bookings or an empty list either way. So an empty window for the whole bot is
 * read as "nothing to show" and the card does not render — which is the right
 * answer for a bot without bookings and a harmless one for a quiet week, since
 * a quiet week has nothing for this contact either.
 */
export function botHasBookings(bookings: readonly BookingLike[] | null | undefined): boolean {
  return (bookings ?? []).length > 0;
}
