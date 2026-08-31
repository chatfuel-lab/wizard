import { useCallback, useEffect, useRef, useState } from 'react';
import { InstagramLibraryDocument } from '~api/generated/publishing/graphql';
import { LIBRARY_PAGE_SIZE } from '../lib/constants';
import { errorMessage } from '../lib/errors';
import type { ApiClient, MediaNode } from '../types';

/**
 * The account's own media, paged, for picking from inside the composer.
 *
 * Its own hook rather than the library view's, because it answers a different
 * question: the view lists everything, and this offers only what the post being
 * written could take. It also has to open and close repeatedly without starting
 * again from the top, which is why the cursor lives here and not in the dialog.
 *
 * Nothing is fetched until `enabled` — a picker nobody has opened should cost
 * nothing — and nothing is fetched again on re-opening, because the pages
 * already read are still good. `reload` is the way to ask for fresh ones.
 */
export interface LibraryPicker {
  nodes: MediaNode[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  more: () => void;
  reload: () => void;
}

export function useLibraryPicker(client: ApiClient, botId: string, enabled: boolean): LibraryPicker {
  const [nodes, setNodes] = useState<MediaNode[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [epoch, setEpoch] = useState(0);
  /* One request at a time: the grid's end sentinel fires several times before a
     page lands, and each of those would ask for the same cursor again. */
  const inFlight = useRef(false);
  const loaded = useRef(-1);

  const fetchPage = useCallback(
    async (after: string | null) => {
      if (inFlight.current) return;
      inFlight.current = true;
      if (after) setLoadingMore(true);
      else setLoading(true);
      try {
        const data = await client.query(InstagramLibraryDocument, { botID: botId, first: LIBRARY_PAGE_SIZE, after });
        const page = data.bot.instagramMediasConnection;
        const arrived = page.edges.map((edge) => edge.node as MediaNode);
        setNodes((current) => (after ? [...current, ...arrived] : arrived));
        setCursor(page.pageInfo.endCursor ?? null);
        setHasMore(page.pageInfo.hasNextPage);
        setError(null);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        inFlight.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [client, botId],
  );

  useEffect(() => {
    if (!enabled || loaded.current === epoch) return;
    loaded.current = epoch;
    void fetchPage(null);
  }, [enabled, epoch, fetchPage]);

  /* A different bot is a different library. */
  useEffect(() => {
    loaded.current = -1;
    setNodes([]);
    setCursor(null);
    setHasMore(false);
  }, [client, botId]);

  const more = useCallback(() => {
    if (!hasMore || loading || loadingMore) return;
    void fetchPage(cursor);
  }, [cursor, fetchPage, hasMore, loading, loadingMore]);

  const reload = useCallback(() => {
    setNodes([]);
    setCursor(null);
    setHasMore(false);
    setEpoch((n) => n + 1);
  }, []);

  return { nodes, loading, loadingMore, error, hasMore, more, reload };
}
