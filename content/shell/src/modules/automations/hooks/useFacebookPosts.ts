import { useCallback, useEffect, useRef, useState } from 'react';
import { AutomationsFacebookPostsDocument } from '~api/generated/automations/graphql';
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
}

const PAGE_SIZE = 20;

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

  return { page, connected, nodes, loading, loadingMore, error, hasNext, loadMore, reload };
}
