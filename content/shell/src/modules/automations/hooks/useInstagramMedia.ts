import { useCallback, useEffect, useRef, useState } from 'react';
import { AutomationsInstagramRefetchDocument, InstagramMediaPickerDocument } from '~api/generated/automations/graphql';
import { useAutomations } from '../AutomationsContext';
import { errorMessage } from '../lib/errors';
import type { InstagramMediaNode } from '../types';

export interface InstagramMediaOptions {
  /** Load when this turns true (the drawer opening); a later true reloads page 1. */
  enabled: boolean;
  pageSize?: number;
}

export interface InstagramMediaApi {
  /** Every loaded page, in order, deduped by id. */
  nodes: InstagramMediaNode[];
  /** Page 1 (or a reload) is in flight and nothing is shown yet. */
  loading: boolean;
  /** A further page is in flight. */
  loadingMore: boolean;
  /** "Refresh from Instagram" is in flight. */
  refreshing: boolean;
  error: string | null;
  hasNext: boolean;
  loadMore: () => void;
  reload: () => void;
  /** `instagramAccountRefetchLatestMedias(count: 30)` then page 1 again. Rejects with a sentence. */
  refreshFromInstagram: (accountId: string) => Promise<void>;
}

const PAGE_SIZE = 24;
const REFETCH_COUNT = 30;

/**
 * Cursor-paginated read over `bot.instagramMediasConnection` — posts, reels,
 * ads and stories together (the drawer filters by kind). Media ids are
 * `InstagramMediaID` strings, passed to the settings as PostID / StoryID.
 * A request counter drops answers that belong to an earlier reload.
 */
export function useInstagramMedia({ enabled, pageSize = PAGE_SIZE }: InstagramMediaOptions): InstagramMediaApi {
  const { client, botId } = useAutomations();
  const [nodes, setNodes] = useState<InstagramMediaNode[]>([]);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const loadPage = useCallback(
    (after: string | null) => {
      const gen = after === null ? ++generation.current : generation.current;
      if (after === null) {
        setLoading(true);
        setNodes([]);
        setEndCursor(null);
        setHasNext(false);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      client
        .query(InstagramMediaPickerDocument, { botID: botId, first: pageSize, ...(after ? { after } : {}) })
        .then((data) => {
          if (gen !== generation.current) return;
          const connection = data.bot.instagramMediasConnection;
          const fresh = connection.edges.map((edge) => edge.node);
          setNodes((prev) => {
            const seen = new Set(prev.map((node) => node.id));
            return [...prev, ...fresh.filter((node) => !seen.has(node.id))];
          });
          setEndCursor(connection.pageInfo.endCursor ?? null);
          setHasNext(connection.pageInfo.hasNextPage);
        })
        .catch((err: unknown) => {
          if (gen !== generation.current) return;
          setError(errorMessage(err));
        })
        .finally(() => {
          if (gen !== generation.current) return;
          setLoading(false);
          setLoadingMore(false);
        });
    },
    [client, botId, pageSize],
  );

  useEffect(() => {
    if (!enabled) return;
    loadPage(null);
  }, [enabled, loadPage]);

  const loadMore = useCallback(() => {
    if (hasNext && !loading && !loadingMore) loadPage(endCursor);
  }, [hasNext, loading, loadingMore, loadPage, endCursor]);

  const reload = useCallback(() => loadPage(null), [loadPage]);

  const refreshFromInstagram = useCallback(
    async (accountId: string) => {
      setRefreshing(true);
      setError(null);
      try {
        await client.mutate(AutomationsInstagramRefetchDocument, { accountID: accountId, count: REFETCH_COUNT });
        loadPage(null);
      } catch (err) {
        const message = errorMessage(err);
        setError(message);
        throw new Error(message, { cause: err });
      } finally {
        setRefreshing(false);
      }
    },
    [client, loadPage],
  );

  return { nodes, loading, loadingMore, refreshing, error, hasNext, loadMore, reload, refreshFromInstagram };
}
