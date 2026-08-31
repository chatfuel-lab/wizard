import { useCallback, useEffect, useMemo, useReducer } from 'react';
import type { ModuleClient } from '~api';
import { GoodsCatalogDocument, SpecialistsDocument } from '~api/generated/knowledge-base/graphql';
import { catalogReducer, initialCatalogState, type CatalogState } from '../lib/catalogStore';
import { messageFor } from '../lib/errors';
import type { CatalogEntry, CatalogItem, SpecialistInfo } from '../types';

export interface CatalogStore {
  state: CatalogState;
  refetch: () => void;
  /** A create or delete response carries the whole catalog. */
  applyCatalog: (entries: readonly CatalogEntry[]) => void;
  /** An update response carries one item. */
  applyItem: (item: CatalogItem) => void;
  applySpecialists: (specialists: readonly SpecialistInfo[]) => void;
}

/**
 * The goods catalog and the specialists, loaded once for the four sources that
 * read them (Products, Services, Team and the Overview's budget breakdown).
 *
 * The specialists query is allowed to fail quietly: the Team source shows its
 * own error, and a bot without the bookings product still has a perfectly good
 * catalog. A catalog failure is a real load error.
 */
export function useCatalogStore(client: ModuleClient, botId: string): CatalogStore {
  const [state, dispatch] = useReducer(catalogReducer, initialCatalogState);

  const refetch = useCallback(() => dispatch({ type: 'reset' }), []);

  useEffect(() => {
    let cancelled = false;
    const epoch = state.epoch;
    client
      .query(GoodsCatalogDocument, { botID: botId })
      .then((data) => {
        if (!cancelled) dispatch({ type: 'loaded', epoch, entries: data.bot.goodsCatalog });
      })
      .catch((error: unknown) => {
        if (!cancelled) dispatch({ type: 'failed', epoch, error: messageFor(error) });
      });
    client
      .query(SpecialistsDocument, { botID: botId })
      .then((data) => {
        if (!cancelled) dispatch({ type: 'specialistsLoaded', epoch, specialists: data.bot.specialists });
      })
      .catch(() => {
        /* Staff are one source out of eight; the catalog still loaded. */
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, state.epoch]);

  useEffect(() => client.onReconnect(refetch), [client, refetch]);

  const applyCatalog = useCallback(
    (entries: readonly CatalogEntry[]) => dispatch({ type: 'catalogReplaced', entries }),
    [],
  );
  const applyItem = useCallback((item: CatalogItem) => dispatch({ type: 'itemMerged', item }), []);
  const applySpecialists = useCallback(
    (specialists: readonly SpecialistInfo[]) => dispatch({ type: 'specialistsReplaced', specialists }),
    [],
  );

  return useMemo(
    () => ({ state, refetch, applyCatalog, applyItem, applySpecialists }),
    [state, refetch, applyCatalog, applyItem, applySpecialists],
  );
}
