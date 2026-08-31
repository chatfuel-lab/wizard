import { useCallback, useMemo } from 'react';
import { useToast } from '~ui';
import {
  GoodsProductCreateDocument,
  GoodsProductDeleteDocument,
  GoodsProductUpdateDocument,
  type GoodsProductInput,
} from '~api/generated/knowledge-base/graphql';
import { useCatalog } from '../KnowledgeBaseCatalogContext';
import { useKnowledgeBase } from '../KnowledgeBaseContext';
import { useKnowledge } from '../KnowledgeBaseStoreContext';
import { useKnowledgeUndo } from '../KnowledgeBaseUndoContext';
import { messageFor } from '../lib/errors';
import { productInputOf, productInputWithAvailability } from '../lib/productInput';
import { undoCaveat, type UndoEntry } from '../lib/undo';
import type { CatalogEntry, CatalogProduct } from '../types';

export interface BulkResult {
  /** Ids that were written. */
  done: string[];
  /** Titles that were not, with the reason the first one gave. */
  failed: string[];
  error: string | null;
}

export interface ProductMutations {
  /** Rejects with the API error — the dialog maps its code to a field. */
  create: (input: GoodsProductInput) => Promise<CatalogProduct | null>;
  /** Full replace. Rejects with the API error. */
  update: (id: string, input: GoodsProductInput) => Promise<CatalogProduct>;
  /** The card switch: the record with one flag flipped, re-sent whole. Rejects with an already-human `Error`. */
  setAvailability: (record: CatalogProduct, isAvailable: boolean) => Promise<void>;
  /** Deletes, then offers an undo that RE-CREATES — a new id, and the toast says so. */
  remove: (record: CatalogProduct) => Promise<void>;
  removeMany: (records: readonly CatalogProduct[]) => Promise<BulkResult>;
  setAvailabilityMany: (records: readonly CatalogProduct[], isAvailable: boolean) => Promise<BulkResult>;
}

/**
 * Every write the Products source makes.
 *
 * Three API shapes to keep straight, and they are why this is a hook rather
 * than three calls in the view:
 *
 *   create / delete   answer with the WHOLE catalog (and the new usage)
 *   update            answers with ONE item, and with no `__typename` on it —
 *                     the fragment does not select one at the root, so the
 *                     type is re-attached here or the store's union breaks
 *   every one of them can fail with FuelyKnowledgeBaseLimitReached, which is
 *                     the only way to learn the knowledge base is full
 *
 * Undo is a compensating forward write, never a revert: the server keeps no
 * history, so "restore" means create the item again from the record that was
 * deleted. It comes back with a NEW id, `undoCaveat` says so, and the toast
 * carries that sentence rather than leaving somebody hunting for the old one.
 */
export function useProductMutations(): ProductMutations {
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

  /** The raw create, shared by "Add a product" and by every undo that puts one back. */
  const send = useCallback(
    async (input: GoodsProductInput): Promise<CatalogProduct | null> => {
      const before = new Set(catalog.state.order);
      const data = await client.mutate(GoodsProductCreateDocument, { botID: botId, product: input });
      const bot = data.goodsProductCreate;
      adopt(bot.goodsCatalog, bot.fuelyConfig?.usage);
      const created = bot.goodsCatalog.find(
        (entry): entry is CatalogProduct => entry.__typename === 'GoodsProduct' && !before.has(entry.id),
      );
      return created ?? null;
    },
    [client, botId, catalog.state.order, adopt],
  );

  const create = useCallback<ProductMutations['create']>(
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

  const update = useCallback<ProductMutations['update']>(
    async (id, input) => {
      try {
        const data = await client.mutate(GoodsProductUpdateDocument, { botID: botId, itemID: id, product: input });
        /* The update selects the fragment alone, so the root carries no `__typename`. */
        const saved: CatalogProduct = { ...data.goodsProductUpdate, __typename: 'GoodsProduct' };
        catalog.applyItem(saved);
        toast.show({ id: `product-saved-${id}`, title: `${saved.title} saved`, tone: 'success', duration: 3000 });
        return saved;
      } catch (error) {
        store.noteLimit(error);
        throw error;
      }
    },
    [client, botId, catalog, toast, store],
  );

  const setAvailability = useCallback<ProductMutations['setAvailability']>(
    async (record, isAvailable) => {
      try {
        const data = await client.mutate(GoodsProductUpdateDocument, {
          botID: botId,
          itemID: record.id,
          product: productInputWithAvailability(record, isAvailable),
        });
        catalog.applyItem({ ...data.goodsProductUpdate, __typename: 'GoodsProduct' });
        toast.show({
          id: `product-avail-${record.id}`,
          title: `${record.title} is ${isAvailable ? 'available' : 'unavailable'}`,
          tone: 'success',
          duration: 2500,
        });
      } catch (error) {
        store.noteLimit(error);
        /* `Switch` reverts itself on a rejection and shows this under the track. */
        throw new Error(messageFor(error), { cause: error });
      }
    },
    [client, botId, catalog, toast, store],
  );

  /** Offer an undo whose runner re-creates what was deleted. */
  const offerRestore = useCallback(
    (entry: UndoEntry, records: readonly CatalogProduct[]) => {
      undo.push(entry, async () => {
        try {
          for (const record of records) await send(productInputOf(record));
          toast.show({
            title: records.length === 1 ? `${records[0]!.title} is back` : `${records.length} products are back`,
            description: undoCaveat(entry) ?? undefined,
            tone: 'success',
          });
        } catch (error) {
          toast.show({ title: 'Could not put that back', description: messageFor(error), tone: 'danger' });
        }
      });
    },
    [undo, send, toast],
  );

  const remove = useCallback<ProductMutations['remove']>(
    async (record) => {
      try {
        const data = await client.mutate(GoodsProductDeleteDocument, { botID: botId, itemID: record.id });
        adopt(data.goodsProductDelete.goodsCatalog, data.goodsProductDelete.fuelyConfig?.usage);
        const entry: UndoEntry = { kind: 'item', title: record.title, what: 'delete', at: Date.now() };
        offerRestore(entry, [record]);
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
    [client, botId, adopt, offerRestore, toast, undo.run],
  );

  /**
   * One at a time, not `Promise.all`: every catalog write answers with the
   * whole catalog, so parallel deletes would race each other's snapshots and
   * the list would settle on whichever landed last.
   */
  const removeMany = useCallback<ProductMutations['removeMany']>(
    async (records) => {
      const done: string[] = [];
      const failed: string[] = [];
      let error: string | null = null;
      for (const record of records) {
        try {
          const data = await client.mutate(GoodsProductDeleteDocument, { botID: botId, itemID: record.id });
          adopt(data.goodsProductDelete.goodsCatalog, data.goodsProductDelete.fuelyConfig?.usage);
          done.push(record.id);
        } catch (err) {
          failed.push(record.title);
          error = error ?? messageFor(err);
        }
      }
      const deleted = records.filter((record) => done.includes(record.id));
      if (deleted.length > 0) {
        const entry: UndoEntry =
          deleted.length === 1
            ? { kind: 'item', title: deleted[0]!.title, what: 'delete', at: Date.now() }
            : { kind: 'items', count: deleted.length, what: 'delete', at: Date.now() };
        offerRestore(entry, deleted);
        toast.show({
          title: deleted.length === 1 ? `${deleted[0]!.title} deleted` : `${deleted.length} products deleted`,
          description: undoCaveat(entry) ?? undefined,
          tone: failed.length > 0 ? 'warning' : 'info',
          duration: 6000,
          action: { label: 'Undo', onClick: undo.run },
        });
      }
      if (failed.length > 0)
        toast.show({
          title: `Could not delete ${failed.length === 1 ? failed[0] : `${failed.length} products`}`,
          description: error ?? undefined,
          tone: 'danger',
        });
      return { done, failed, error };
    },
    [client, botId, adopt, offerRestore, toast, undo.run],
  );

  const setAvailabilityMany = useCallback<ProductMutations['setAvailabilityMany']>(
    async (records, isAvailable) => {
      const done: string[] = [];
      const failed: string[] = [];
      let error: string | null = null;
      const before = records.map((record) => ({ record, was: record.isAvailable }));
      for (const record of records) {
        if (record.isAvailable === isAvailable) {
          done.push(record.id);
          continue;
        }
        try {
          const data = await client.mutate(GoodsProductUpdateDocument, {
            botID: botId,
            itemID: record.id,
            product: productInputWithAvailability(record, isAvailable),
          });
          catalog.applyItem({ ...data.goodsProductUpdate, __typename: 'GoodsProduct' });
          done.push(record.id);
        } catch (err) {
          store.noteLimit(err);
          failed.push(record.title);
          error = error ?? messageFor(err);
        }
      }
      const changed = before.filter(({ record, was }) => done.includes(record.id) && was !== isAvailable);
      if (changed.length > 0) {
        undo.push({ kind: 'items', count: changed.length, what: 'availability', at: Date.now() }, async () => {
          for (const { record, was } of changed) {
            try {
              const data = await client.mutate(GoodsProductUpdateDocument, {
                botID: botId,
                itemID: record.id,
                product: productInputWithAvailability(record, was),
              });
              catalog.applyItem({ ...data.goodsProductUpdate, __typename: 'GoodsProduct' });
            } catch {
              /* Each row is its own write; one that refuses leaves the rest undone. */
            }
          }
        });
        toast.show({
          title: `${changed.length} ${changed.length === 1 ? 'product' : 'products'} ${isAvailable ? 'available' : 'unavailable'}`,
          tone: failed.length > 0 ? 'warning' : 'success',
          duration: 4000,
          action: { label: 'Undo', onClick: undo.run },
        });
      }
      if (failed.length > 0)
        toast.show({
          title: `Could not change ${failed.length === 1 ? failed[0] : `${failed.length} products`}`,
          description: error ?? undefined,
          tone: 'danger',
        });
      return { done, failed, error };
    },
    [client, botId, catalog, store, undo, toast],
  );

  return useMemo(
    () => ({ create, update, setAvailability, remove, removeMany, setAvailabilityMany }),
    [create, update, setAvailability, remove, removeMany, setAvailabilityMany],
  );
}
