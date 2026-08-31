import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { BookingAvailabilityDocument } from '~api/generated/bookings/graphql';
import { useBookings } from '../BookingsContext';
import { useBookingsLive } from '../BookingsLiveContext';
import {
  availabilityKey,
  availabilityReducer,
  initialAvailabilityState,
  needsFetch,
  nextEpoch,
  type AvailabilityEntryState,
} from '../lib/availabilityStore';
import { errorMessage } from '../lib/errors';
import { touchedDays } from '../lib/liveBus';
import { dayKeyInZone } from '../lib/zone';
import type { AvailabilityEntry } from '../types';

export interface Availability {
  /** Every specialist's free start periods for the service on the day, or null before the first answer. */
  entries: AvailabilityEntry[] | null;
  loading: boolean;
  error: string | null;
  /** True while a fresh answer is on its way for an entry that is shown from cache. */
  stale: boolean;
  refetch: () => void;
}

const IDLE: Availability = { entries: null, loading: false, error: null, stale: false, refetch: () => undefined };

/**
 * One service × one day of availability (`lib/availabilityStore.ts`), fetched
 * when the wizard reads it and remembered while the wizard stays mounted.
 * Invalidation is by DAY from the live bus: any upsert or removal marks the
 * days it touches stale (both days of a move — the last record seen for that
 * id on the bus is the "before"; an unknown removal invalidates everything).
 * Days are keyed in the BOT zone, which is what the API means by `date`.
 */
export function useAvailability(
  serviceId: string | null,
  dateKey: string | null,
  botZone: string | null,
): Availability {
  const { client, botId } = useBookings();
  const { bus } = useBookingsLive();
  const [state, dispatch] = useReducer(availabilityReducer, undefined, initialAvailabilityState);
  const key = serviceId && dateKey ? availabilityKey(serviceId, dateKey) : null;
  const wire = botZone ?? 'UTC';

  // The last timing seen per booking id, so a move invalidates its OLD day too.
  const seenRef = useRef(new Map<string, { startTime: string; endTime: string }>());

  useEffect(
    () =>
      bus.subscribe((event) => {
        if (event.kind === 'reconnect') {
          dispatch({ type: 'invalidateAll' });
          return;
        }
        const dayOf = (ms: number) => dayKeyInZone(ms, wire);
        if (event.kind === 'upsert') {
          const before = seenRef.current.get(event.booking.id) ?? null;
          seenRef.current.set(event.booking.id, { startTime: event.booking.startTime, endTime: event.booking.endTime });
          dispatch({ type: 'daysTouched', days: touchedDays(before, event.booking, dayOf) });
        } else {
          const before = seenRef.current.get(event.id) ?? null;
          seenRef.current.delete(event.id);
          if (before) dispatch({ type: 'daysTouched', days: touchedDays(before, null, dayOf) });
          else dispatch({ type: 'invalidateAll' });
        }
      }),
    [bus, wire],
  );

  const entry: AvailabilityEntryState | undefined = key ? state.byKey[key] : undefined;
  const wanted = key !== null && needsFetch(state, key);

  /* No cancel flag on purpose: dispatching `requested` flips `wanted` off, and
   * a cleanup keyed on that would drop the very answer it asked for. The
   * store's epoch is the guard — a late answer for a superseded request is
   * inert (`loaded` checks it). */
  useEffect(() => {
    if (!key || !serviceId || !dateKey || !wanted) return;
    const epoch = nextEpoch(state, key);
    dispatch({ type: 'requested', key, epoch });
    client
      .query(BookingAvailabilityDocument, { botID: botId, serviceID: serviceId, date: dateKey })
      .then((data) => {
        const service = data.bot.goodsService;
        const entries = service.__typename === 'GoodsService' ? service.bookingAvailableStartTime : [];
        dispatch({ type: 'loaded', key, epoch, entries, at: Date.now() });
      })
      .catch((err: unknown) => dispatch({ type: 'failed', key, epoch, message: errorMessage(err) }));
    // `state` is read for the epoch only; re-running on every state change would refetch on every answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, botId, key, serviceId, dateKey, wanted]);

  const refetch = useCallback(() => {
    if (key) dispatch({ type: 'daysTouched', days: [dateKey!] });
  }, [key, dateKey]);

  return useMemo<Availability>(() => {
    if (!entry) return key ? { ...IDLE, loading: true, refetch } : IDLE;
    return {
      entries: entry.entries,
      loading: entry.loading && entry.entries === null,
      error: entry.error,
      stale: entry.stale || (entry.loading && entry.entries !== null),
      refetch,
    };
  }, [entry, key, refetch]);
}
