import { useCallback, useEffect, useRef, useState } from 'react';
import { AutomationsMetaAdsDocument, type Platform } from '~api/generated/automations/graphql';
import { useAutomations } from '../AutomationsContext';
import { errorMessage } from '../lib/errors';
import type { MetaAdAccount, MetaAdNode } from '../types';

export interface MetaAdsOptions {
  enabled: boolean;
  /** From the scope (`adPlatformsOf`); a change reloads. */
  platforms: readonly Platform[];
  pageSize?: number;
}

export interface MetaAdAccountState {
  id: string;
  metaAdAccountID: string;
  name: string;
  hasWhatsappAds: boolean;
  hasInstagramAds: boolean;
  ads: MetaAdNode[];
  hasNext: boolean;
  endCursor: string | null;
  loadingMore: boolean;
}

export interface MetaAdsApi {
  accounts: MetaAdAccountState[];
  syncState: { requestedAt: string; finishedAt: string | null } | null;
  loading: boolean;
  error: string | null;
  /** True once a load answered — distinguishes "no accounts" from "not asked yet". */
  loaded: boolean;
  /** Page one account further (the query takes one cursor; only that account's edges are merged). */
  loadMore: (accountId: string) => void;
  reload: () => void;
}

const PAGE_SIZE = 20;

const toState = (account: MetaAdAccount): MetaAdAccountState => ({
  id: account.id,
  metaAdAccountID: account.metaAdAccountID,
  name: account.name,
  hasWhatsappAds: account.hasWhatsappAds,
  hasInstagramAds: account.hasInstagramAds,
  ads: account.ads.edges.map((edge) => edge.node),
  hasNext: account.ads.pageInfo.hasNextPage,
  endCursor: account.ads.pageInfo.endCursor ?? null,
  loadingMore: false,
});

/**
 * `currentUser.metaAdAccounts` with each account's ads for the scope's
 * platforms. The document carries ONE `$after`, applied to every account —
 * so paging one account sends its cursor and adopts only its own edges from
 * the answer. The account tested had no ad accounts: the list shape is
 * verified, the picker path is not.
 */
export function useMetaAds({ enabled, platforms, pageSize = PAGE_SIZE }: MetaAdsOptions): MetaAdsApi {
  const { client, botId } = useAutomations();
  const [accounts, setAccounts] = useState<MetaAdAccountState[]>([]);
  const [syncState, setSyncState] = useState<MetaAdsApi['syncState']>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const platformsKey = platforms.join(',');

  const load = useCallback(() => {
    const gen = ++generation.current;
    setLoading(true);
    setError(null);
    client
      .query(AutomationsMetaAdsDocument, { botID: botId, platforms: [...platforms], first: pageSize })
      .then((data) => {
        if (gen !== generation.current) return;
        setAccounts(data.currentUser.metaAdAccounts.map(toState));
        const sync = data.currentUser.metaAdsSyncState;
        setSyncState(sync ? { requestedAt: sync.requestedAt, finishedAt: sync.finishedAt ?? null } : null);
        setLoaded(true);
      })
      .catch((err: unknown) => {
        if (gen !== generation.current) return;
        setError(errorMessage(err));
      })
      .finally(() => {
        if (gen === generation.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, botId, platformsKey, pageSize]);

  useEffect(() => {
    if (!enabled) return;
    load();
  }, [enabled, load]);

  const loadMore = useCallback(
    (accountId: string) => {
      const account = accounts.find((a) => a.id === accountId);
      if (!account || !account.hasNext || account.loadingMore || !account.endCursor) return;
      const gen = generation.current;
      setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, loadingMore: true } : a)));
      client
        .query(AutomationsMetaAdsDocument, {
          botID: botId,
          platforms: [...platforms],
          first: pageSize,
          after: account.endCursor,
        })
        .then((data) => {
          if (gen !== generation.current) return;
          const answer = data.currentUser.metaAdAccounts.find((a) => a.id === accountId);
          setAccounts((prev) =>
            prev.map((a) => {
              if (a.id !== accountId) return a;
              if (!answer) return { ...a, hasNext: false, loadingMore: false };
              const seen = new Set(a.ads.map((ad) => ad.id));
              return {
                ...a,
                ads: [...a.ads, ...answer.ads.edges.map((e) => e.node).filter((ad) => !seen.has(ad.id))],
                hasNext: answer.ads.pageInfo.hasNextPage,
                endCursor: answer.ads.pageInfo.endCursor ?? null,
                loadingMore: false,
              };
            }),
          );
        })
        .catch((err: unknown) => {
          if (gen !== generation.current) return;
          setError(errorMessage(err));
          setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, loadingMore: false } : a)));
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accounts, client, botId, platformsKey, pageSize],
  );

  return { accounts, syncState, loading, loaded, error, loadMore, reload: load };
}
