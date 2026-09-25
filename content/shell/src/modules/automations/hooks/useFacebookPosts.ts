import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AutomationsFacebookPostsDocument,
  AutomationsFacebookPostsSyncDocument,
  AutomationsFacebookPostsSyncStatusDocument,
  FbPagePostsSyncStatus,
} from '~api/generated/automations/graphql';
import { useAutomations } from '../AutomationsContext';
import { errorMessage } from '../lib/errors';
import type { FacebookPostNode } from '../types';

export interface FacebookPostsOptions {
  enabled: boolean;
  pageSize?: number;
}

export interface FacebookPostsApi {
  /** The connected page, or null when the response carries no `FacebookContactScope`. */
  page: { id: string; name: string } | null;
  /** False once a load answered without a page — "Connect a Facebook page". Null before the first answer. */
  connected: boolean | null;
  nodes: FacebookPostNode[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasNext: boolean;
  loadMore: () => void;
  reload: () => void;
  /** A sync from Facebook is in flight. */
  refreshing: boolean;
  /** Pull the page's latest posts from Facebook, wait for them, then re-read. Rejects with what to show. */
  refreshFromFacebook: (pageId: string) => Promise<void>;
}

const PAGE_SIZE = 20;
/** How many of the latest posts a manual refresh asks Facebook for — Instagram's refetch count. */
export const SYNC_COUNT = 30;
/**
 * How long a refresh waits for `fbPagePostsSyncStatusUpdated` to say
 * `finished` before re-reading anyway. The sync answers `true` at once and the
 * posts land later; a status that never comes is not a reason to hang.
 */
export const SYNC_WAIT_MS = 15_000;

/**
 * Cursor-paginated read over `facebookPage.posts` for the Facebook post scopes.
 * Unverified against the ListOfPosts setter — the drawer offers a paste
 * fallback.
 */
export function useFacebookPosts({ enabled, pageSize = PAGE_SIZE }: FacebookPostsOptions): FacebookPostsApi {
  const { client, botId } = useAutomations();
  const [page, setPage] = useState<{ id: string; name: string } | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [nodes, setNodes] = useState<FacebookPostNode[]>([]);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
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
        .query(AutomationsFacebookPostsDocument, { botID: botId, first: pageSize, ...(after ? { after } : {}) })
        .then((data) => {
          if (gen !== generation.current) return;
          const scope = data.bot.contactScopes.find(
            (s): s is Extract<(typeof data.bot.contactScopes)[number], { __typename: 'FacebookContactScope' }> =>
              s.__typename === 'FacebookContactScope',
          );
          if (!scope) {
            setPage(null);
            setConnected(false);
            return;
          }
          setPage({ id: scope.facebookPage.id, name: scope.facebookPage.name });
          setConnected(true);
          const fresh = scope.facebookPage.posts.edges.map((edge) => edge.node);
          setNodes((prev) => {
            const seen = new Set(prev.map((node) => node.id));
            return [...prev, ...fresh.filter((node) => !seen.has(node.id))];
          });
          setEndCursor(scope.facebookPage.posts.pageInfo.endCursor ?? null);
          setHasNext(scope.facebookPage.posts.pageInfo.hasNextPage);
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

  const refreshFromFacebook = useCallback(
    async (pageId: string) => {
      setRefreshing(true);
      setError(null);
      let off: () => void = () => undefined;
      try {
        /* Subscribe before asking, so a sync that finishes fast is not missed. */
        const finished = new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, SYNC_WAIT_MS);
          off = client.subscribe(
            AutomationsFacebookPostsSyncStatusDocument,
            { pageID: pageId },
            {
              next: (data) => {
                if (data.fbPagePostsSyncStatusUpdated === FbPagePostsSyncStatus.Finished) {
                  clearTimeout(timer);
                  resolve();
                }
              },
              error: () => undefined,
            },
          );
        });
        await client.mutate(AutomationsFacebookPostsSyncDocument, { pageID: pageId, count: SYNC_COUNT });
        await finished;
        loadPage(null);
      } catch (err) {
        const message = errorMessage(err);
        setError(message);
        throw new Error(message, { cause: err });
      } finally {
        off();
        setRefreshing(false);
      }
    },
    [client, loadPage],
  );

  return {
    page,
    connected,
    nodes,
    loading,
    loadingMore,
    error,
    hasNext,
    loadMore,
    reload,
    refreshing,
    refreshFromFacebook,
  };
}
