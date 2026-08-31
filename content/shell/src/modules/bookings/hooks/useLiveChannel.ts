import { useEffect, useMemo, useState } from 'react';
import { BookingAddedDocument, BookingDeletedDocument, BookingUpdatedDocument } from '~api/generated/bookings/graphql';
import type { BookingsLiveValue } from '../BookingsLiveContext';
import { createLiveBus } from '../lib/liveBus';
import type { ApiClient, BookingRecord } from '../types';

/**
 * The module's one live channel: three bot-wide subscriptions, mounted once
 * per (client, bot), fanned out on the bus. `client.onReconnect` becomes a
 * `reconnect` bus event, which every range store answers with a refetch.
 *
 * Called by `BookingsApp` with props (not context) — it renders the provider,
 * so it must not consume one (validate 10b).
 */
export function useLiveChannel(client: ApiClient, botId: string): BookingsLiveValue {
  const bus = useMemo(() => createLiveBus(), []);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    const onError = () => {
      /* transport retries; the reconnect event refetches */
    };
    const offAdded = client.subscribe(
      BookingAddedDocument,
      { botID: botId },
      {
        next: (data) => {
          if (data.bookingAdded) {
            bus.publish({ kind: 'upsert', booking: data.bookingAdded as BookingRecord, origin: 'live' });
            bump();
          }
        },
        error: onError,
      },
    );
    const offUpdated = client.subscribe(
      BookingUpdatedDocument,
      { botID: botId },
      {
        next: (data) => {
          if (data.bookingUpdated) {
            bus.publish({ kind: 'upsert', booking: data.bookingUpdated as BookingRecord, origin: 'live' });
            bump();
          }
        },
        error: onError,
      },
    );
    const offDeleted = client.subscribe(
      BookingDeletedDocument,
      { botID: botId },
      {
        next: (data) => {
          if (data.bookingDeleted) {
            bus.publish({ kind: 'remove', id: data.bookingDeleted, origin: 'live' });
            bump();
          }
        },
        error: onError,
      },
    );
    const offReconnect = client.onReconnect(() => bus.publish({ kind: 'reconnect' }));
    return () => {
      offAdded();
      offUpdated();
      offDeleted();
      offReconnect();
    };
  }, [client, botId, bus]);

  return useMemo(() => ({ bus, tick }), [bus, tick]);
}
