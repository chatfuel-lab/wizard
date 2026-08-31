import { useCallback, useMemo } from 'react';
import { useToast } from '~ui';
import {
  GoodsServiceCreateDocument,
  GoodsServiceDeleteDocument,
  GoodsServiceUpdateDocument,
  type GoodsServiceInput,
} from '~api/generated/knowledge-base/graphql';
import { useCatalog } from '../KnowledgeBaseCatalogContext';
import { useKnowledgeBase } from '../KnowledgeBaseContext';
import { useKnowledge } from '../KnowledgeBaseStoreContext';
import { useKnowledgeUndo } from '../KnowledgeBaseUndoContext';
import { messageFor } from '../lib/errors';
import { serviceInputOf, serviceInputWithAvailability } from '../lib/serviceInput';
import { undoCaveat, type UndoEntry } from '../lib/undo';
import type { CatalogEntry, CatalogService } from '../types';

export interface ServiceMutations {
  create: (input: GoodsServiceInput) => Promise<CatalogService | null>;
  update: (id: string, input: GoodsServiceInput) => Promise<CatalogService>;
  setAvailability: (record: CatalogService, isAvailable: boolean) => Promise<void>;
  remove: (record: CatalogService) => Promise<void>;
}

/**
 * The Services mirror's writes — reachable only when the bookings module is
 * NOT installed in this deployment (see `lib/mirror.ts`). Bookings owns
 * services when it is there, and this hook is never called.
 *
 * Same three API shapes as the products hook: create and delete answer with
 * the whole catalog and the new usage, update answers with one record and no
 * `__typename` at the root.
 *
 * No bulk here on purpose. A shop has a handful of services and dozens of
 * products; a bulk bar over four rows is furniture.
 */
export function useServiceMutations(): ServiceMutations {
  const { client, botId } = useKnowledgeBase();
  const catalog = useCatalog();
  const store = useKnowledge();
  const undo = useKnowledgeUndo();
  const toast = useToast();

  const adopt = useCallback(
    (entries: readonly CatalogEntry[], usage: { total: number; catalog: number } | null | undefined) => {
      catalog.applyCatalog(entries);
      if (usage) store.applyUsage({ total: usage.total, catalog: usage.catalog });
    },
    [catalog, store],
  );

  const send = useCallback(
    async (input: GoodsServiceInput): Promise<CatalogService | null> => {
      const before = new Set(catalog.state.order);
      const data = await client.mutate(GoodsServiceCreateDocument, { botID: botId, service: input });
      const bot = data.goodsServiceCreate;
      adopt(bot.goodsCatalog, bot.fuelyConfig?.usage);
      return (
        bot.goodsCatalog.find(
          (entry): entry is CatalogService => entry.__typename === 'GoodsService' && !before.has(entry.id),
        ) ?? null
      );
    },
    [client, botId, catalog.state.order, adopt],
  );

  const create = useCallback<ServiceMutations['create']>(
    async (input) => {
      try {
        const created = await send(input);
        toast.show({ title: `${input.title} added`, tone: 'success', duration: 3000 });
        return created;
      } catch (error) {
        store.noteLimit(error);
        throw error;
      }
    },
    [send, toast, store],
  );

  const update = useCallback<ServiceMutations['update']>(
    async (id, input) => {
      try {
        const data = await client.mutate(GoodsServiceUpdateDocument, { botID: botId, itemID: id, service: input });
        const saved: CatalogService = { ...data.goodsServiceUpdate, __typename: 'GoodsService' };
        catalog.applyItem(saved);
        toast.show({ id: `service-saved-${id}`, title: `${saved.title} saved`, tone: 'success', duration: 3000 });
        return saved;
      } catch (error) {
        store.noteLimit(error);
        throw error;
      }
    },
    [client, botId, catalog, toast, store],
  );

  const setAvailability = useCallback<ServiceMutations['setAvailability']>(
    async (record, isAvailable) => {
      try {
        const data = await client.mutate(GoodsServiceUpdateDocument, {
          botID: botId,
          itemID: record.id,
          service: serviceInputWithAvailability(record, isAvailable),
        });
        catalog.applyItem({ ...data.goodsServiceUpdate, __typename: 'GoodsService' });
        toast.show({
          id: `service-avail-${record.id}`,
          title: `${record.title} is ${isAvailable ? 'available' : 'unavailable'}`,
          tone: 'success',
          duration: 2500,
        });
      } catch (error) {
        store.noteLimit(error);
        throw new Error(messageFor(error), { cause: error });
      }
    },
    [client, botId, catalog, toast, store],
  );

  const remove = useCallback<ServiceMutations['remove']>(
    async (record) => {
      try {
        const data = await client.mutate(GoodsServiceDeleteDocument, { botID: botId, itemID: record.id });
        adopt(data.goodsServiceDelete.goodsCatalog, data.goodsServiceDelete.fuelyConfig?.usage);
        const entry: UndoEntry = { kind: 'item', title: record.title, what: 'delete', at: Date.now() };
        undo.push(entry, async () => {
          try {
            await send(serviceInputOf(record));
            toast.show({
              title: `${record.title} is back`,
              description: undoCaveat(entry) ?? undefined,
              tone: 'success',
            });
          } catch (error) {
            toast.show({ title: 'Could not put that back', description: messageFor(error), tone: 'danger' });
          }
        });
        toast.show({
          title: `${record.title} deleted`,
          description: undoCaveat(entry) ?? undefined,
          tone: 'info',
          duration: 6000,
          action: { label: 'Undo', onClick: undo.run },
        });
      } catch (error) {
        toast.show({ title: `Could not delete ${record.title}`, description: messageFor(error), tone: 'danger' });
        throw error;
      }
    },
    [client, botId, adopt, send, undo, toast],
  );

  return useMemo(() => ({ create, update, setAvailability, remove }), [create, update, setAvailability, remove]);
}
