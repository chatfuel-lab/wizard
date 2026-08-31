import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  InstagramLibraryDocument,
  InstagramMediaAddedDocument,
  InstagramRefetchMediasDocument,
} from '~api/generated/publishing/graphql';
import { usePublishing } from '../PublishingContext';
import { LIBRARY_PAGE_SIZE, REFETCH_COUNT } from '../lib/constants';
import { errorMessage } from '../lib/errors';
import { appendNodes, mergeLive, unlistedPublished, withLive } from '../lib/libraryItems';
import type { Account, MediaNode } from '../types';

export interface LibraryApi {
  /** Every page loaded so far, with anything the live feed brought in on top. */
  nodes: MediaNode[];
  /** Page one is in flight and there is nothing on screen yet. */
  loading: boolean;
  loadingMore: boolean;
  /** The pull-from-Instagram mutation is in flight. */
  refreshing: boolean;
  error: string | null;
  hasNext: boolean;
  loadMore: () => void;
  reload: () => void;
  /** `instagramAccountRefetchLatestMedias`, then page one again. */
  refreshFromInstagram: () => Promise<void>;
  /** False until the account has answered — the refresh has nothing to aim at. */
  canRefresh: boolean;
}

/**
 * The account's media, paged forward and kept current.
 *
 * Three things here are not the obvious shape, and each of them is measured
 * behaviour of this API rather than caution:
 *
 * 1. **A request counter, not a cleanup flag.** Reloading page one while a
 *    later page is still in flight would otherwise append that page to a list
 *    that has just been emptied. Every request remembers the generation it was
 *    issued under, and an answer from an older one is dropped.
 *
 * 2. **The live feed is a second list.** `botInstagramMediaAdded` fires when
 *    the platform ingests media, and `instagramMediasConnection` starts
 *    returning it at some point after that. Splicing arrivals into the paged
 *    list would lose them on the next reload, so they are kept apart and merged
 *    at read time — and cleared only by the refresh that genuinely puts them in
 *    the connection.
 *
 * 3. **Publishing does not add anything to the list, and does not fire the
 *    subscription either.** Both wait on `instagramAccountRefetchLatestMedias`,
 *    which is what makes the platform pull the media down. A library that only
 *    listed and listened would be missing exactly the post somebody had just
 *    made, so this hook watches for that and refreshes itself — once per id,
 *    never in a loop.
 *
 * The account arrives as an argument, never as a query of this hook's own: the
 * workspace owns the module's one `useAccount`, and `useAccount` has no cache,
 * so a second mount here would be a second query — one the header's refresh
 * could reach while the other kept a stale answer.
 *
 * `publishedMediaIds` is what rule 3 is checked against — the ids this app has
 * successfully published. This hook owns the refresh that follows a publish;
 * the composer must not fire one of its own, or two three-second refetches race
 * over the same work.
 */
export function useLibrary(
  refreshToken = 0,
  publishedMediaIds: readonly string[] = [],
  account: Account | null = null,
): LibraryApi {
  const { client, botId } = usePublishing();

  const [paged, setPaged] = useState<MediaNode[]>([]);
  const [live, setLive] = useState<MediaNode[]>([]);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const loadPage = useCallback(
    (after: string | null) => {
      const issued = after === null ? (generation.current += 1) : generation.current;
      if (after === null) {
        setLoading(true);
        setPaged([]);
        setEndCursor(null);
        setHasNext(false);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      client
        .query(InstagramLibraryDocument, {
          botID: botId,
          first: LIBRARY_PAGE_SIZE,
          ...(after ? { after } : {}),
        })
        .then((data) => {
          if (issued !== generation.current) return;
          const connection = data.bot.instagramMediasConnection;
          const page = connection.edges.map((edge) => edge.node);
          setPaged((prev) => appendNodes(prev, page));
          setEndCursor(connection.pageInfo.endCursor ?? null);
          setHasNext(connection.pageInfo.hasNextPage);
        })
        .catch((err: unknown) => {
          if (issued !== generation.current) return;
          setError(errorMessage(err));
        })
        .finally(() => {
          if (issued !== generation.current) return;
          setLoading(false);
          setLoadingMore(false);
        });
    },
    [client, botId],
  );

  useEffect(() => {
    loadPage(null);
  }, [loadPage, refreshToken]);

  /* The only live signal this API has.
     `next` is guarded because a subscription can be refused at the RESULT level
     rather than the transport one — the client turns that into `error`, and a
     frame carrying no node would otherwise be pushed into the list as one.
     `error` is swallowed on purpose: a live feed that stopped is not a failure
     of anything anybody asked for, the list on screen is still correct, and the
     refresh action remains the way to bring it up to date. */
  useEffect(() => {
    return client.subscribe(
      InstagramMediaAddedDocument,
      { botID: botId },
      {
        next: (data) => {
          const node = data?.botInstagramMediaAdded;
          if (node) setLive((prev) => withLive(prev, node));
        },
        error: () => undefined,
      },
    );
  }, [client, botId]);

  const loadMore = useCallback(() => {
    if (hasNext && !loading && !loadingMore) loadPage(endCursor);
  }, [hasNext, loading, loadingMore, loadPage, endCursor]);

  const reload = useCallback(() => loadPage(null), [loadPage]);

  const accountId = account?.id ?? null;

  const refreshFromInstagram = useCallback(async () => {
    if (!accountId) return;
    setRefreshing(true);
    setError(null);
    try {
      await client.mutate(InstagramRefetchMediasDocument, {
        accountID: accountId,
        count: REFETCH_COUNT,
      });
      /* Now that the connection holds them, the separate list would only be a
         second copy of the same media. */
      setLive([]);
      loadPage(null);
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      throw new Error(message, { cause: err });
    } finally {
      setRefreshing(false);
    }
  }, [client, accountId, loadPage]);

  const nodes = useMemo(() => mergeLive(live, paged), [live, paged]);

  /* Chased at most once each: an account can hold media this app published and
     the platform later removed, and re-checking that forever would be a refetch
     every time a page settles. */
  const chased = useRef<Set<string>>(new Set());
  const missing = useMemo(
    () => unlistedPublished(publishedMediaIds, nodes).filter((id) => !chased.current.has(id)),
    [publishedMediaIds, nodes],
  );

  useEffect(() => {
    if (missing.length === 0 || loading || refreshing || !accountId) return;
    for (const id of missing) chased.current.add(id);
    /* The rejection is already on `error`; this is a refresh nobody pressed, so
       there is nothing to interrupt them with. */
    void refreshFromInstagram().catch(() => undefined);
  }, [missing, loading, refreshing, accountId, refreshFromInstagram]);

  return {
    nodes,
    loading,
    loadingMore,
    refreshing,
    error,
    hasNext,
    loadMore,
    reload,
    refreshFromInstagram,
    canRefresh: accountId !== null,
  };
}
