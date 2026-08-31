import { useCallback, useMemo } from 'react';
import { useToast } from '~ui';
import {
  BookingServiceCreateDocument,
  BookingServiceDeleteDocument,
  BookingServiceUpdateDocument,
  type GoodsServiceInput,
} from '~api/generated/bookings/graphql';
import { useCatalog } from '../BookingsCatalogContext';
import { useBookings } from '../BookingsContext';
import { errorMessage } from '../lib/errors';
import { serviceInputWithAvailability } from '../lib/serviceInput';
import type { ServiceRecord } from '../types';

export interface ServicesMutations {
  /** Rejects with the API error (the dialog maps its code to a field). */
  createService: (input: GoodsServiceInput) => Promise<ServiceRecord | null>;
  /** Full replace. Rejects with the API error. */
  updateService: (id: string, input: GoodsServiceInput) => Promise<ServiceRecord>;
  /**
   * The card switch: the record with one flag flipped, re-sent whole. Rejects
   * with an `Error` whose message is already human — `Switch` shows it under
   * the track and reverts.
   */
  setAvailability: (record: ServiceRecord, isAvailable: boolean) => Promise<void>;
  /** Not undoable; ask first. Bookings keep the deleted service's title and price. */
  deleteService: (record: ServiceRecord) => Promise<void>;
}

/**
 * Every write the services section makes. Create and delete answer with the
 * whole catalog (`servicesReplaced`); update answers with the one record
 * (`serviceWritten`). Bookings that reference a service by id are not
 * touched by any of these — the calendar re-reads titles from the catalog.
 */
export function useServicesMutations(): ServicesMutations {
  const { client, botId } = useBookings();
  const catalog = useCatalog();
  const toast = useToast();

  const adoptCatalog = useCallback(
    (items: readonly { __typename: string }[]) => {
      const services = items.filter((item): item is ServiceRecord => item.__typename === 'GoodsService');
      catalog.dispatch({ type: 'servicesReplaced', services });
      return services;
    },
    [catalog],
  );

  const createService = useCallback<ServicesMutations['createService']>(
    async (input) => {
      const before = new Set(catalog.state.services.map((s) => s.id));
      const data = await client.mutate(BookingServiceCreateDocument, { botID: botId, service: input });
      const services = adoptCatalog(data.goodsServiceCreate.goodsCatalog);
      const created = services.find((s) => !before.has(s.id)) ?? services.find((s) => s.title === input.title) ?? null;
      toast.show({ title: `${input.title} added`, tone: 'success', duration: 3000 });
      return created;
    },
    [client, botId, catalog.state.services, adoptCatalog, toast],
  );

  const updateService = useCallback<ServicesMutations['updateService']>(
    async (id, input) => {
      const data = await client.mutate(BookingServiceUpdateDocument, { botID: botId, serviceID: id, service: input });
      // The update answers with the fragment alone (no `__typename` selected on the root); the record type carries it.
      const saved: ServiceRecord = { ...data.goodsServiceUpdate, __typename: 'GoodsService' };
      catalog.dispatch({ type: 'serviceWritten', service: saved });
      toast.show({ id: `service-saved-${id}`, title: `${saved.title} saved`, tone: 'success', duration: 3000 });
      return saved;
    },
    [client, botId, catalog, toast],
  );

  const setAvailability = useCallback<ServicesMutations['setAvailability']>(
    async (record, isAvailable) => {
      try {
        const data = await client.mutate(BookingServiceUpdateDocument, {
          botID: botId,
          serviceID: record.id,
          service: serviceInputWithAvailability(record, isAvailable),
        });
        catalog.dispatch({
          type: 'serviceWritten',
          service: { ...data.goodsServiceUpdate, __typename: 'GoodsService' },
        });
        toast.show({
          id: `service-avail-${record.id}`,
          title: `${record.title} is ${isAvailable ? 'available' : 'unavailable'}`,
          tone: 'success',
          duration: 2500,
        });
      } catch (err) {
        throw new Error(errorMessage(err), { cause: err });
      }
    },
    [client, botId, catalog, toast],
  );

  const deleteService = useCallback<ServicesMutations['deleteService']>(
    async (record) => {
      try {
        const data = await client.mutate(BookingServiceDeleteDocument, { botID: botId, serviceID: record.id });
        adoptCatalog(data.goodsServiceDelete.goodsCatalog);
        toast.show({
          title: `${record.title} deleted`,
          description: 'Bookings keep its name and price.',
          tone: 'info',
          duration: 4000,
        });
      } catch (err) {
        toast.show({ title: `Could not delete ${record.title}`, description: errorMessage(err), tone: 'danger' });
        throw err;
      }
    },
    [client, botId, adoptCatalog, toast],
  );

  return useMemo(
    () => ({ createService, updateService, setAvailability, deleteService }),
    [createService, updateService, setAvailability, deleteService],
  );
}
