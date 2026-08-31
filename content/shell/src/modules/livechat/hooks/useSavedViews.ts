import { useCallback, useMemo } from 'react';
import { createUserStorage } from '~api';
import { nextEntryId, removeEntry, renameEntry, serializeStoredList, upsertEntry, useStoredList } from '~ui';
import { useLivechat } from '../LivechatContext';
import type { InboxFilter } from '../lib/inboxFilter';
import {
  MAX_NAME_LENGTH,
  MAX_SAVED_VIEWS,
  SAVED_VIEWS_KEY,
  parseSavedViews,
  type SavedInboxView,
} from '../lib/inboxViews';

export interface SavedViewsState {
  views: SavedInboxView[];
  loading: boolean;
  /** The list is full — the caller disables "Save current view". */
  full: boolean;
  /** A write failed. The list on screen never moved. */
  error: string | null;
  save: (name: string, filter: InboxFilter) => Promise<void>;
  remove: (id: string) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
}

/**
 * Saved views, over the one piece of persistence this API offers a client.
 *
 * `setUserStorageItem` is scoped to the SIGNED-IN USER — not the team, not the
 * bot. Every label in the UI built on this must say "your views". It also holds
 * one string per id, so the whole list lives under a single key and every
 * mutation rewrites all of it — and a write that fails must leave the in-memory
 * list exactly as it was, which is why the shared `useStoredList` commits
 * non-optimistically: state moves only once the server has the string.
 *
 * This hook binds the store once and keeps the domain rules — what a save
 * trims, where the clock is read, when the list counts as full — while the
 * load/commit lifecycle is `useStoredList`.
 */
export function useSavedViews(): SavedViewsState {
  const { client } = useLivechat();

  /* useMemo-stable: a fresh store per render would re-read storage every render. */
  const store = useMemo(() => createUserStorage(client, SAVED_VIEWS_KEY), [client]);
  const list = useStoredList<SavedInboxView>({
    store,
    /* No seed — the inbox starts a first-time user on an empty list, so
     * `empty` is never acted on. */
    parse: (raw) => ({ entries: parseSavedViews(raw), empty: false }),
    serialize: (views) => serializeStoredList(views, MAX_SAVED_VIEWS),
  });
  const { latest, commit } = list;

  const save = useCallback(
    async (name: string, filter: InboxFilter) => {
      const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
      if (trimmed === '') return;
      /* The id is minted from the name and the clock, which is why the clock is
         read HERE and not in `lib/inboxViews.ts`: that file is pure and a
         reducer that reads the clock is a reducer no test can pin. */
      const now = Date.now();
      const current = latest();
      const view: SavedInboxView = {
        id: nextEntryId(current, trimmed, now),
        name: trimmed,
        filter,
        savedAt: now,
      };
      await commit(upsertEntry(current, view, MAX_SAVED_VIEWS));
    },
    [latest, commit],
  );

  const remove = useCallback(
    async (id: string) => {
      await commit(removeEntry(latest(), id));
    },
    [latest, commit],
  );

  const rename = useCallback(
    async (id: string, name: string) => {
      await commit(renameEntry(latest(), id, name, MAX_NAME_LENGTH));
    },
    [latest, commit],
  );

  return {
    views: list.entries,
    loading: list.loading,
    full: list.entries.length >= MAX_SAVED_VIEWS,
    error: list.error,
    save,
    remove,
    rename,
  };
}
