import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AttributeType,
  BotAttributeOrderBy,
  DashboardLocale,
  Sort,
  BotAttributesCatalogDocument,
  type AttributeDataType,
  type BotAttributesCatalogQuery,
} from '~api/generated/contacts/graphql';
import { useContacts } from '../ContactsContext';
import { ALL_PLATFORMS } from '../lib/platforms';

export interface CatalogEntry {
  name: string;
  type: AttributeType;
  dataType: AttributeDataType;
  /** Contacts that carry a value. Null when the API declines to count. */
  usersCount: number | null;
  /** A bot-wide default makes EVERY contact read this field as non-empty. */
  defaultValue: string | null;
  flowsCount: number;
  aliases: { locale: string; alias: string }[];
}

export interface AttributeCatalog {
  entries: CatalogEntry[];
  byName: Map<string, CatalogEntry>;
  loading: boolean;
  error: string | null;
  dataTypeOf: (name: string) => AttributeDataType | undefined;
  /** System attributes whose name mentions a phone — the free-text search targets. */
  phoneNames: string[];
  /** Entries a column picker or a filter builder should offer first. */
  suggested: CatalogEntry[];
  refresh: () => void;
}

/**
 * How far the walk goes. A ceiling rather than a guess at the largest catalog:
 * the query is ordered by contacts-count descending, so what a truncation drops
 * is the tail nobody filters on.
 */
const PAGE = 100;
const MAX_PAGES = 5;

/**
 * The bot's attribute catalog — the vocabulary of the whole module: what a
 * column may show, what a filter may ask about, what the fields surface
 * administers.
 *
 * It is ordered by contacts-count descending, so the first page is the fields
 * a person actually uses rather than the alphabet. Failure is not fatal: an
 * empty catalog means the pickers offer free text instead of a list, and every
 * screen still works.
 */
export function useAttributeCatalog(): AttributeCatalog {
  const { client, botId } = useContacts();
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState(0);

  const refresh = useCallback(() => setToken((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      const collected: CatalogEntry[] = [];
      let after: string | null = null;

      /* The page loader is its own function so `after` never appears inside
         the expression that produces it — otherwise the result type refers to
         itself and tsc gives up (TS7022). */
      const loadPage = (cursor: string | null): Promise<BotAttributesCatalogQuery> =>
        client.query(BotAttributesCatalogDocument, {
          botID: botId,
          locale: DashboardLocale.En,
          platforms: [...ALL_PLATFORMS],
          attributeTypes: [AttributeType.Custom, AttributeType.System],
          filters: [],
          orderBy: { orderBy: BotAttributeOrderBy.ContactsCount, direction: Sort.Desc },
          first: PAGE,
          after: cursor,
        });

      try {
        for (let page = 0; page < MAX_PAGES; page += 1) {
          const data = await loadPage(after);
          const connection = data.bot.botAttributes;
          for (const edge of connection.edges) {
            collected.push({
              name: edge.node.botAttribute.name,
              type: edge.node.botAttribute.type,
              dataType: edge.node.botAttribute.dataType,
              usersCount: edge.node.usersCount ?? null,
              defaultValue: edge.node.defaultValue ?? null,
              flowsCount: edge.node.flowsCount,
              aliases: edge.node.botAttribute.aliases.map((alias: { locale: string; alias: string }) => ({
                locale: alias.locale,
                alias: alias.alias,
              })),
            });
          }
          if (!connection.pageInfo.hasNextPage || !connection.pageInfo.endCursor) break;
          after = connection.pageInfo.endCursor as string;
        }
        if (!cancelled) {
          setEntries(collected);
          setLoading(false);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not read the attribute catalog');
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client, botId, token]);

  return useMemo(() => {
    const byName = new Map(entries.map((entry) => [entry.name, entry]));
    return {
      entries,
      byName,
      loading,
      error,
      dataTypeOf: (name: string) => byName.get(name)?.dataType,
      phoneNames: entries
        .filter((entry) => entry.type === AttributeType.System && entry.name.toLowerCase().includes('phone'))
        .map((entry) => entry.name),
      suggested: entries.filter((entry) => (entry.usersCount ?? 0) > 0),
      refresh,
    };
  }, [entries, loading, error, refresh]);
}
