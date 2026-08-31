import { useCallback, useEffect, useRef, useState } from 'react';
import { ContactBookingsDocument } from '~api/generated/contacts/graphql';
import { useContacts } from '../ContactsContext';
import {
  DEFAULT_BOOKING_WINDOW,
  bookingWindow,
  bookingsForContact,
  botHasBookings,
  widerWindow,
  type BookingLike,
  type BookingWindowSpec,
  type ContactBooking,
} from '../lib/contactBookings';

export interface ContactBookingsApi {
  /** This contact's appointments inside the window, unsorted — the card splits them. */
  bookings: ContactBooking[];
  /** The window that was asked for. */
  window: BookingWindowSpec;
  /** A wider one to offer, or null when this is already the widest. */
  wider: BookingWindowSpec | null;
  widen: () => void;
  loading: boolean;
  /**
   * The bot answered with at least one booking — for anybody. False means there
   * is nothing to show and the card should not be rendered at all.
   */
  botHasAny: boolean;
  reload: () => void;
}

/**
 * A contact's appointments, which the API will only hand over as a window over
 * the whole bot.
 *
 * `Contact` has no bookings field and `BookingBase` has no contact filter, so
 * the only door is `bookingsV2(startTime, endTime)` and the narrowing to one
 * contact is client-side on `booking.contact.id`. Everything
 * that follows from that — that this is a window and not a history, that a
 * wider one costs the whole bot, and that an empty answer is the only evidence
 * available about whether the bot sells appointments at all — lives in
 * `lib/contactBookings.ts` with the tests.
 *
 * A failure is silent on purpose. A bot without the bookings product is a
 * perfectly ordinary bot, and an error strip about a query the person never
 * asked for would be noise on a contact record. `botHasAny` stays false and the
 * card does not render.
 */
export function useContactBookings(contactId: string | null): ContactBookingsApi {
  const { client, botId } = useContacts();
  const [bookings, setBookings] = useState<ContactBooking[]>([]);
  const [botHasAny, setBotHasAny] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(0);

  const openRef = useRef<string | null>(contactId);
  openRef.current = contactId;

  /* The window resets with the contact: a person who widened it for one record
     has not asked for a year of the whole bot on every record after it. The
     window and the contact it was widened for are ONE piece of state rather
     than a reset from an effect, because an effect would reset it a render too
     late: the render that opened the neighbour would already have asked for
     the previous contact's window, and a year of the whole bot is not a query
     to fire and throw away. */
  const [widened, setWidened] = useState<{ contactId: string | null; spec: BookingWindowSpec }>({
    contactId,
    spec: DEFAULT_BOOKING_WINDOW,
  });
  const spec = widened.contactId === contactId ? widened.spec : DEFAULT_BOOKING_WINDOW;

  useEffect(() => {
    setBookings([]);
    setBotHasAny(false);
    if (!contactId) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    const range = bookingWindow(spec);
    client
      .query(ContactBookingsDocument, { botID: botId, startTime: range.startTime, endTime: range.endTime })
      .then((data) => {
        if (cancelled || openRef.current !== contactId) return;
        const all = (data.bot.bookingsV2 ?? []) as readonly BookingLike[];
        setBotHasAny(botHasBookings(all));
        setBookings(bookingsForContact(all, contactId));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setBotHasAny(false);
        setBookings([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, contactId, spec, token]);

  const wider = widerWindow(spec);

  return {
    bookings,
    window: spec,
    wider,
    widen: useCallback(() => {
      const next = widerWindow(spec);
      if (next) setWidened({ contactId, spec: next });
    }, [spec, contactId]),
    loading,
    botHasAny,
    reload: useCallback(() => setToken((n) => n + 1), []),
  };
}
