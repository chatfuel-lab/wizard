import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookingContactsSearchDocument } from '~api/generated/bookings/graphql';
import { useBookings } from '../BookingsContext';
import { errorMessage } from '../lib/errors';
import type { ContactHit } from '../types';

export interface ContactSearch {
  query: string;
  setQuery: (query: string) => void;
  hits: ContactHit[];
  loading: boolean;
  error: string | null;
}

/** How long typing pauses before the server is asked. */
export const CONTACT_SEARCH_DEBOUNCE_MS = 250;
/** Rows per answer — a combobox list, not a table. */
export const CONTACT_SEARCH_FIRST = 8;

/**
 * Server search over the bot's contacts for the wizard's "Existing customer"
 * combobox (`BookingContactsSearch` = `contactChatsConnection(textInputFilter)`,
 * which matches name and phone). Debounced; a stale answer that lands after
 * a newer query is dropped by epoch. The empty query is asked too, so the
 * list opens with someone in it. Every typename comes back — the caller
 * disables what cannot be booked (only WhatsApp contacts can).
 */
export function useContactSearch(enabled: boolean): ContactSearch {
  const { client, botId } = useBookings();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<ContactHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const epochRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const epoch = epochRef.current + 1;
    epochRef.current = epoch;
    setLoading(true);
    const timer = window.setTimeout(() => {
      client
        .query(BookingContactsSearchDocument, {
          botID: botId,
          first: CONTACT_SEARCH_FIRST,
          textInputFilter: query.trim() === '' ? null : query.trim(),
        })
        .then((data) => {
          if (epochRef.current !== epoch) return;
          setHits(data.bot.contactChatsConnection.edges.map((edge) => edge.node));
          setError(null);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (epochRef.current !== epoch) return;
          setError(errorMessage(err));
          setLoading(false);
        });
    }, CONTACT_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [client, botId, query, enabled]);

  const set = useCallback((next: string) => setQuery(next), []);

  return useMemo(() => ({ query, setQuery: set, hits, loading, error }), [query, set, hits, loading, error]);
}
