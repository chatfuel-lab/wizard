import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { BookingServicesDocument, BookingSpecialistsDocument } from '~api/generated/bookings/graphql';
import type { BookingsCatalogValue } from '../BookingsCatalogContext';
import { CATALOG_REFETCH_THROTTLE_MS, catalogReducer, initialCatalogState } from '../lib/catalogStore';
import { errorMessage } from '../lib/errors';
import type { LiveBus } from '../lib/liveBus';
import type { ApiClient, ServiceRecord } from '../types';

/**
 * Loads services + specialists and keeps them fresh without a subscription:
 * on mount, on WS reconnect (bus), when the tab becomes visible again
 * (throttled), and on demand. Called by `BookingsApp` with props (validate 10b).
 */
export function useCatalogStore(client: ApiClient, botId: string, bus: LiveBus): BookingsCatalogValue {
  const [state, dispatch] = useReducer(catalogReducer, undefined, initialCatalogState);
  const loadedAtRef = useRef<number | null>(null);
  loadedAtRef.current = state.loadedAt;

  const refresh = useCallback(() => dispatch({ type: 'reset' }), []);

  // The epoch bump IS the request.
  useEffect(() => {
    if (state.epoch === 0) return;
    let cancelled = false;
    const epoch = state.epoch;
    Promise.all([
      client.query(BookingServicesDocument, { botID: botId }),
      client.query(BookingSpecialistsDocument, { botID: botId }),
    ])
      .then(([servicesData, specialistsData]) => {
        if (cancelled) return;
        const services = (servicesData.bot?.goodsCatalog ?? []).filter(
          (item): item is ServiceRecord => item.__typename === 'GoodsService',
        );
        dispatch({
          type: 'loaded',
          epoch,
          services,
          specialists: specialistsData.bot?.specialists ?? [],
          at: Date.now(),
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) dispatch({ type: 'failed', epoch, message: errorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, state.epoch]);

  // First load, and a fresh one per (client, bot).
  useEffect(() => {
    dispatch({ type: 'reset' });
  }, [client, botId]);

  // Reconnect → reload; a tab that comes back after a while → reload (throttled).
  useEffect(() => {
    const offBus = bus.subscribe((event) => {
      if (event.kind === 'reconnect') dispatch({ type: 'reset' });
    });
    const onVisible = () => {
      if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
      const at = loadedAtRef.current;
      if (at === null || Date.now() - at > CATALOG_REFETCH_THROTTLE_MS) dispatch({ type: 'reset' });
    };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
    return () => {
      offBus();
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
    };
  }, [bus]);

  return useMemo(() => ({ state, dispatch, refresh }), [state, refresh]);
}
