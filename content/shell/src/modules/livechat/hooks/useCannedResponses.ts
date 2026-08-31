import { useCallback, useMemo } from 'react';
import { createUserStorage } from '~api';
import { nextEntryId, removeEntry, serializeStoredList, upsertEntry, useStoredList } from '~ui';
import { useLivechat } from '../LivechatContext';
import {
  CANNED_RESPONSES_KEY,
  MAX_CANNED_BODY_LENGTH,
  MAX_CANNED_RESPONSES,
  MAX_CANNED_TITLE_LENGTH,
  parseCannedResponses,
  type CannedResponse,
} from '../lib/cannedResponses';

export interface CannedResponsesState {
  responses: CannedResponse[];
  loading: boolean;
  /** The list is full — the caller stops offering "Save". */
  full: boolean;
  /** A write failed. The list on screen never moved. */
  error: string | null;
  save: (title: string, body: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/**
 * Canned responses over the per-user store — the same lifecycle as
 * `useSavedViews`, over the same one string per key, for the same reason: this
 * API offers a client no other persistence. The load and the non-optimistic
 * commit are the shared `useStoredList`; what stays here is the domain — the
 * body is required, the title is optional, and the clock is read in the hook
 * so `lib/cannedResponses.ts` stays pure enough to test.
 */
export function useCannedResponses(): CannedResponsesState {
  const { client } = useLivechat();

  /* useMemo-stable: a fresh store per render would re-read storage every render. */
  const store = useMemo(() => createUserStorage(client, CANNED_RESPONSES_KEY), [client]);
  const list = useStoredList<CannedResponse>({
    store,
    /* No seed — a first-time user starts with no replies, so `empty` is never
     * acted on. */
    parse: (raw) => ({ entries: parseCannedResponses(raw), empty: false }),
    serialize: (responses) => serializeStoredList(responses, MAX_CANNED_RESPONSES),
  });
  const { latest, commit } = list;

  const save = useCallback(
    async (title: string, body: string) => {
      const text = body.slice(0, MAX_CANNED_BODY_LENGTH);
      if (text.trim() === '') return;
      const name = title.trim().slice(0, MAX_CANNED_TITLE_LENGTH);
      const now = Date.now();
      const current = latest();
      const response: CannedResponse = {
        id: nextEntryId(current, name || text, now),
        title: name || text.trim().slice(0, MAX_CANNED_TITLE_LENGTH),
        body: text,
        savedAt: now,
      };
      await commit(upsertEntry(current, response, MAX_CANNED_RESPONSES));
    },
    [latest, commit],
  );

  const remove = useCallback(
    async (id: string) => {
      await commit(removeEntry(latest(), id));
    },
    [latest, commit],
  );

  return {
    responses: list.entries,
    loading: list.loading,
    full: list.entries.length >= MAX_CANNED_RESPONSES,
    error: list.error,
    save,
    remove,
  };
}
