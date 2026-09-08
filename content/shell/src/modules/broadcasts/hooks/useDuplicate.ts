import { useCallback, useRef, useState } from 'react';
import { useCampaigns } from '../BroadcastsCampaignsContext';
import { useBroadcasts } from '../BroadcastsContext';
import type { CampaignRecord } from '../lib/campaign';
import { duplicateCampaign, type DuplicateResult } from '../lib/duplicate';
import { errorMessage } from '../lib/errors';

export interface DuplicateApi {
  /**
   * A new draft with `source` replayed onto it. Resolves with the copy's flow
   * id and whatever did not make it; rejects only when no copy was made.
   */
  duplicate: (source: CampaignRecord) => Promise<DuplicateResult>;
  pending: boolean;
  /** Why the last attempt made no copy, or null. */
  failure: string | null;
}

/**
 * Duplicate, for the composer's review step over a sent campaign. The list's
 * row menu opens the composer there; the composer runs this and moves onto
 * the copy.
 */
export function useDuplicate(zone: string, now: number): DuplicateApi {
  const { client } = useBroadcasts();
  const store = useCampaigns();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const storeRef = useRef(store);
  storeRef.current = store;

  const duplicate = useCallback(
    async (source: CampaignRecord): Promise<DuplicateResult> => {
      setPending(true);
      setFailure(null);
      try {
        return await duplicateCampaign(storeRef.current, client, source, zone, now);
      } catch (err) {
        setFailure(errorMessage(err));
        throw err;
      } finally {
        setPending(false);
      }
    },
    [client, zone, now],
  );

  return { duplicate, pending, failure };
}
