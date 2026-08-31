import { useCallback, useEffect, useMemo, useReducer, type Dispatch } from 'react';
import { BookingGetDocument } from '~api/generated/bookings/graphql';
import { useBookings } from '../BookingsContext';
import { useBookingsLive } from '../BookingsLiveContext';
import { detailReducer, initialDetailState, type DetailAction, type DetailState } from '../lib/detailStore';
import { errorMessage, isNotFound } from '../lib/errors';
import type { BookingRecord } from '../types';

export interface BookingDetail {
  state: DetailState;
  dispatch: Dispatch<DetailAction>;
  refetch: () => void;
}

/**
 * The one open booking (`lib/detailStore.ts`). Opening always fetches
 * `BookingGet` — `?b=` may point outside every loaded window, and the range
 * stores are view-owned, so there is nothing to seed from here. The live bus
 * keeps it fresh (a `remove` for this id sets `gone`); a reconnect refetches;
 * a not-found answer is `gone`, not an error.
 */
export function useDetailStore(bookingId: string): BookingDetail {
  const { client, botId } = useBookings();
  const { bus } = useBookingsLive();
  const [state, dispatch] = useReducer(detailReducer, undefined, initialDetailState);

  // The epoch bump IS the request.
  useEffect(() => {
    if (state.epoch === 0 || !state.bookingId || !state.loading) return;
    let cancelled = false;
    const epoch = state.epoch;
    client
      .query(BookingGetDocument, { botID: botId, bookingID: state.bookingId })
      .then((data) => {
        if (cancelled) return;
        dispatch({ type: 'loaded', epoch, booking: data.bot.bookingV2 as BookingRecord });
      })
      .catch((err: unknown) => {
        if (!cancelled) dispatch({ type: 'failed', epoch, message: errorMessage(err), notFound: isNotFound(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, state.epoch, state.bookingId, state.loading]);

  useEffect(
    () =>
      bus.subscribe((event) => {
        if (event.kind === 'reconnect') dispatch({ type: 'refetch' });
        else dispatch({ type: 'live', event });
      }),
    [bus],
  );

  // A different booking → open it (declared after the load effect on purpose).
  useEffect(() => {
    dispatch({ type: 'opened', id: bookingId, seed: null });
    return () => dispatch({ type: 'closed' });
  }, [bookingId, client, botId]);

  const refetch = useCallback(() => dispatch({ type: 'refetch' }), []);

  return useMemo(() => ({ state, dispatch, refetch }), [state, refetch]);
}
