import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BroadcastAttributesDocument,
  type AttributeDataType,
  type AttributeType,
} from '~api/generated/broadcasts/graphql';
import { useBroadcasts } from '../BroadcastsContext';
import { errorMessage } from '../lib/errors';
import { walkPages } from '../lib/walkPages';

export interface CatalogEntry {
  name: string;
  type: AttributeType;
  dataType: AttributeDataType;
  /** Contacts that carry a value. Null when the API declines to count. */
  usersCount: number | null;
}

export interface AttributeCatalog {
  entries: CatalogEntry[];
  byName: Map<string, CatalogEntry>;
  loading: boolean;
  error: string | null;
  dataTypeOf: (name: string) => AttributeDataType | undefined;
  /** Entries at least one contact carries — what a picker offers first. */
  suggested: CatalogEntry[];
  refresh: () => void;
}

/**
 * How far the walk goes. A ceiling rather than a guess at the largest
 * catalog: the query is ordered by contacts-count descending, so what a
 * truncation drops is the tail nobody filters on.
 */
const PAGE = 100;
const MAX_PAGES = 5;

/**
 * The bot's WhatsApp attribute catalog — what the audience builder filters
 * on. A copy of the contacts module's hook over `BroadcastAttributes`, which
 * asks for WhatsApp contacts only: an attribute another platform owns is not
 * one a WhatsApp campaign can see.
 *
 * Failure is not fatal. A name typed into a FILTER that the bot does not have
 * selects nobody and creates nothing (confirmed live — the parameter setter
 * is the one that creates attributes, and that is another step's concern),
 * so an empty catalog leaves the picker offering free text and every row
 * still works.
 */
export function useAttributeCatalog(): AttributeCatalog {
  const { client, botId } = useBroadcasts();
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState(0);

  const refresh = useCallback(() => setToken((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    walkPages<CatalogEntry>(async (after) => {
      const data = await client.query(BroadcastAttributesDocument, { botID: botId, first: PAGE, after });
      const connection = data.bot.botAttributes;
      return {
        nodes: connection.edges.map((edge) => ({
          name: edge.node.botAttribute.name,
          type: edge.node.botAttribute.type,
          dataType: edge.node.botAttribute.dataType,
          usersCount: edge.node.usersCount ?? null,
        })),
        next: connection.pageInfo.hasNextPage ? (connection.pageInfo.endCursor ?? null) : null,
      };
    }, MAX_PAGES)
      .then((collected) => {
        if (cancelled) return;
        setEntries(collected);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(errorMessage(err, 'Could not read the fields'));
        setLoading(false);
      });
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
      suggested: entries.filter((entry) => (entry.usersCount ?? 0) > 0),
      refresh,
    };
  }, [entries, loading, error, refresh]);
}
