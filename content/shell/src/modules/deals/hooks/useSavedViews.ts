import { useCallback, useMemo } from 'react';
import { createUserStorage } from '~api';
import { nextEntryId, removeEntry, renameEntry, serializeStoredList, upsertEntry, useStoredList } from '~ui';
import { useDeals } from '../DealsContext';
import type { DealsFilter } from '../lib/dealsFilter';
import type { DealsView } from '../lib/dealsParams';
import { MAX_NAME_LENGTH, MAX_SAVED_VIEWS, SAVED_VIEWS_KEY, parseSavedViews, type SavedView } from '../lib/savedViews';

/**
 * Saved views over `currentUser.userStorageItem` — the only persistence this
 * API has, and it is **per user**.
 *
 * Two consequences the UI is not allowed to blur:
 *
 * - Nothing here is shared. A teammate signed into the same bot sees none of
 *   it, so the menu says "your views" and never implies otherwise.
 * - The whole list is one string under one id. Every mutation therefore writes
 *   the *entire* list, and a write that fails must leave the in-memory list
 *   exactly as it was — `useStoredList` commits non-optimistically for exactly
 *   that reason.
 *
 * This hook binds the store once and keeps the domain edits — what a save
 * upserts, what a name may be — while the load/commit lifecycle is the shared
 * `useStoredList`.
 */

export interface SavedViewsState {
  views: SavedView[];
  loading: boolean;
  /** A write is in flight. */
  saving: boolean;
  error: string | null;
  save: (name: string, view: DealsView, filter: DealsFilter) => Promise<SavedView | null>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reload: () => void;
}

export function useSavedViews(): SavedViewsState {
  const { client } = useDeals();

  /* useMemo-stable: a fresh store per render would re-read storage every render. */
  const store = useMemo(() => createUserStorage(client, SAVED_VIEWS_KEY), [client]);
  const list = useStoredList<SavedView>({
    store,
    /* No seed — deals starts a first-time user on an empty list, so `empty`
     * is never acted on. */
    parse: (raw) => ({ entries: parseSavedViews(raw), empty: false }),
    serialize: (views) => serializeStoredList(views, MAX_SAVED_VIEWS),
  });

  const save = useCallback(
    async (name: string, view: DealsView, filter: DealsFilter): Promise<SavedView | null> => {
      const trimmed = name.trim();
      if (trimmed === '') return null;
      const now = Date.now();
      const current = list.latest();
      const existing = current.find((entry) => entry.name.toLowerCase() === trimmed.toLowerCase());
      const saved: SavedView = {
        id: existing?.id ?? nextEntryId(current, trimmed, now),
        name: trimmed,
        view,
        filter,
        savedAt: now,
      };
      return (await list.commit(upsertEntry(current, saved, MAX_SAVED_VIEWS))) ? saved : null;
    },
    [list],
  );

  const rename = useCallback(
    async (id: string, name: string) => {
      await list.commit(renameEntry(list.latest(), id, name, MAX_NAME_LENGTH));
    },
    [list],
  );

  const remove = useCallback(
    async (id: string) => {
      await list.commit(removeEntry(list.latest(), id));
    },
    [list],
  );

  return {
    views: list.entries,
    loading: list.loading,
    saving: list.saving,
    error: list.error,
    save,
    rename,
    remove,
    reload: list.reload,
  };
}
