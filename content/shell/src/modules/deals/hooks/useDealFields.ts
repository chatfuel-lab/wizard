import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AttributeType,
  BotAttributeOrderBy,
  DashboardLocale,
  DealFieldsCatalogDocument,
  Sort,
} from '~api/generated/deals/graphql';
import { useDeals } from '../DealsContext';
import {
  bindDealFields,
  requestedNames,
  unboundFields,
  type CatalogEntry,
  type DealFieldBindings,
} from '../lib/dealFieldBinding';
import { ALL_PLATFORMS } from '../lib/platforms';

export interface DealFieldsState {
  loading: boolean;
  bindings: DealFieldBindings;
  /** Attribute names to request. Identity is stable while the set is unchanged. */
  names: string[];
  /** Re-read the catalog — writing a field for the first time creates it. */
  refresh: () => void;
}

const CATALOG_PAGE = 100;

/**
 * Binds the convention in `lib/dealFields.ts` to what this bot actually has.
 *
 * **Nothing waits on this.** `names` starts as the configured names and the
 * board queries with them immediately; unknown names are silently omitted from
 * `contact.attributes(names:)`, so an unbound field
 * simply comes back empty. The catalog only ever *adds* an alias — a bot that
 * already calls it `Deal Amount` should bind to that rather than quietly
 * creating a second attribute beside it.
 *
 * Two pages, because a bot can have hundreds of attributes: the most-used
 * ones, and everything matching "deal".
 */
export function useDealFields(): DealFieldsState {
  const { client, botId } = useDeals();
  const [bindings, setBindings] = useState<DealFieldBindings>(unboundFields);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const page = (inputSubstring?: string) =>
      client.query(DealFieldsCatalogDocument, {
        botID: botId,
        locale: DashboardLocale.En,
        platforms: ALL_PLATFORMS,
        attributeTypes: [AttributeType.Custom],
        filters: [],
        orderBy: { direction: Sort.Desc, orderBy: BotAttributeOrderBy.ContactsCount },
        inputSubstring,
        first: CATALOG_PAGE,
      });
    Promise.all([page(), page('deal')])
      .then((pages) => {
        if (cancelled) return;
        const entries: CatalogEntry[] = pages.flatMap((data) =>
          (data.bot?.botAttributes?.edges ?? []).map((edge) => ({
            name: edge.node.botAttribute.name,
            aliases: edge.node.botAttribute.aliases,
          })),
        );
        setBindings(bindDealFields(entries));
        setLoading(false);
      })
      .catch(() => {
        // Aliases are a nicety; the configured names work without them.
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, nonce]);

  // Keyed on the joined list, so a catalog refetch that finds nothing new does
  // not hand the board a new array and trigger a pointless reset.
  const namesKey = requestedNames(bindings).join('\n');
  const names = useMemo(() => namesKey.split('\n'), [namesKey]);
  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  return { loading, bindings, names, refresh };
}
