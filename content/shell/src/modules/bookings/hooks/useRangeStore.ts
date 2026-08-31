import { useCallback, useEffect, useMemo, useReducer, useRef, type Dispatch } from 'react';
import { BookingsRangeDocument } from '~api/generated/bookings/graphql';
import { useBookings } from '../BookingsContext';
import { useBookingsLive } from '../BookingsLiveContext';
import type { RangeVars } from '../lib/calendarRange';
import { sameRangeVars } from '../lib/calendarRange';
import { errorMessage } from '../lib/errors';
import { initialRangeState, rangeReducer, type RangeAction, type RangeState } from '../lib/rangeStore';
import type { BookingRecord } from '../types';

export interface RangeStore {
  state: RangeState;
  dispatch: Dispatch<RangeAction>;
  /** Full reload of the current window (epoch bump). */
  refetch: () => void;
}

/**
 * One window of bookings, live. Pass the `RangeVars` a view wants (built with
 * `rangeVars`, so equal windows compare equal by value); a change resets and
 * reloads; the live bus feeds it; a `reconnect` on the bus reloads it.
 *
 * Ordering matters (deals' `useDealsBoard` lesson): the "vars changed → reset"
 * effect is declared AFTER the load effect so the first render does not issue
 * a request under a stale epoch.
 */
export function useRangeStore(vars: RangeVars | null): RangeStore {
  const { client, botId } = useBookings();
  const { bus } = useBookingsLive();
  const [state, dispatch] = useReducer(rangeReducer, vars, initialRangeState);
  const varsRef = useRef(vars);
  varsRef.current = vars;

  // The epoch bump IS the request.
  useEffect(() => {
    if (state.epoch === 0 || !state.vars) return;
    let cancelled = false;
    const epoch = state.epoch;
    const wanted = state.vars;
    client
      .query(BookingsRangeDocument, { botID: botId, startTime: wanted.startTime, endTime: wanted.endTime })
      .then((data) => {
        if (cancelled) return;
        dispatch({
          type: 'rangeLoaded',
          epoch,
          vars: wanted,
          bookings: (data.bot?.bookingsV2 ?? []) as BookingRecord[],
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) dispatch({ type: 'failed', epoch, message: errorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, state.epoch, state.vars]);

  // Live events feed the reducer; a reconnect reloads the window we show.
  useEffect(
    () =>
      bus.subscribe((event) => {
        if (event.kind === 'reconnect') {
          if (varsRef.current) dispatch({ type: 'reset', vars: varsRef.current });
          return;
        }
        dispatch({ type: 'live', event });
      }),
    [bus],
  );

  // Vars changed → reset (declared after the load effect on purpose).
  useEffect(() => {
    if (!vars) return;
    if (sameRangeVars(vars, state.vars) && state.epoch > 0) return;
    dispatch({ type: 'reset', vars });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vars?.startTime, vars?.endTime]);

  const refetch = useCallback(() => {
    if (varsRef.current) dispatch({ type: 'reset', vars: varsRef.current });
  }, []);

  return useMemo(() => ({ state, dispatch, refetch }), [state, refetch]);
}
