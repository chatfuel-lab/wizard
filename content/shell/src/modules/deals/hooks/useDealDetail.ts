import { useCallback, useEffect, useState } from 'react';
import { DealGetDocument, DealLiveContactDocument } from '~api/generated/deals/graphql';
import { useDeals } from '../DealsContext';
import type { DealRecord } from '../types';

/** A whole contact, or the few fields a narrow mutation answers with. */
export type DealPatch = Partial<DealRecord> & { id: string };

export interface DealDetailState {
  deal: DealRecord | null;
  loading: boolean;
  error: string | null;
  /** Take what a mutation or the subscription just answered with — no refetch. */
  apply: (patch: DealPatch) => void;
  reload: () => void;
}

/**
 * One open deal. `contactUpdated` carries the whole contact, so an edit made in
 * Live Chat, a flow, or another tab lands here without polling — and a mutation
 * response is the same shape, which is why `apply` exists instead of a refetch.
 */
export function useDealDetail(contactId: string | null, fieldNames: string[]): DealDetailState {
  const { client, botId } = useDeals();
  const [deal, setDeal] = useState<DealRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const apply = useCallback((patch: DealPatch) => {
    setDeal((current) => {
      // Ignore an echo for a deal that is no longer the open one.
      if (!current || current.id !== patch.id) return current;
      // Patching fields of the same contact cannot change its __typename, but
      // TypeScript cannot see that through the six-member union.
      return { ...current, ...patch } as DealRecord;
    });
  }, []);

  useEffect(() => {
    if (!contactId) {
      setDeal(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    client
      .query(DealGetDocument, { botID: botId, contactID: contactId, fieldNames })
      .then((data) => {
        if (cancelled) return;
        setDeal(data.bot?.contact ?? null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, contactId, fieldNames, nonce]);

  useEffect(() => {
    if (!contactId) return;
    const unsubscribe = client.subscribe(
      DealLiveContactDocument,
      { botID: botId, contactID: contactId, fieldNames },
      {
        next: (data) => {
          if (data.contactUpdated) apply(data.contactUpdated);
        },
        error: () => {
          /* transport retries; the panel keeps what it has */
        },
      },
    );
    return unsubscribe;
  }, [client, botId, contactId, fieldNames, apply]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return { deal, loading, error, apply, reload };
}
