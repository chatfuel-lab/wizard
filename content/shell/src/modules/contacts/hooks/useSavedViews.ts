import { useCallback, useMemo, useRef } from 'react';
import { createUserStorage } from '~api';
import { useStoredList } from '~ui';
import { useContacts } from '../ContactsContext';
import type { ContactsFilter } from '../lib/contactsFilter';
import type { Density } from '../lib/contactsParams';
import {
  DEFAULT_STARTER_FIELDS,
  SAVED_VIEWS_KEY,
  nextViewId,
  parseSavedViews,
  removeSavedView,
  renameSavedView,
  serializeSavedViews,
  starterViews,
  upsertSavedView,
  type ContactsListLayout,
  type RollingWindow,
  type SavedView,
  type StarterFieldNames,
} from '../lib/savedViews';

/**
 * Saved views over `currentUser.userStorageItem` — the only persistence this
 * API has, and it is **per user**.
 *
 * The load/seed/commit lifecycle — one string under one id, non-optimistic
 * writes, seeding exactly once and writing the seed so deleting a starter
 * sticks — is `useStoredList` over the per-user store. What stays here is the
 * domain: what a view is, the starter set, and the save/rename/remove rules.
 *
 * One consequence the UI is not allowed to blur: **nothing here is shared.** A
 * teammate signed into the same bot sees none of it. Every string in the menu
 * says "your views" and states it plainly.
 */

export interface SaveViewInput {
  name: string;
  filter: ContactsFilter;
  density: Density;
  /** The list's columns, or null when the caller has none to save. */
  layout: ContactsListLayout | null;
  /** The one time value to recompute on every apply, or null. */
  rolling: RollingWindow | null;
}

export interface SavedViewsState {
  views: SavedView[];
  loading: boolean;
  /** A write is in flight. */
  saving: boolean;
  error: string | null;
  save: (input: SaveViewInput) => Promise<SavedView | null>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reload: () => void;
}

export function useSavedViews(fields: StarterFieldNames = DEFAULT_STARTER_FIELDS): SavedViewsState {
  const { client } = useContacts();

  /* Read through a ref rather than a dependency: the catalog resolves after
     the first load has already run, and re-reading storage because a field
     name arrived would be a second request for the same answer. */
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  /* Memoised on the client: a fresh store per render would re-read storage
     every render. */
  const store = useMemo(() => createUserStorage(client, SAVED_VIEWS_KEY), [client]);

  const list = useStoredList<SavedView>({
    store,
    parse: (raw) => {
      const { views, empty } = parseSavedViews(raw);
      return { entries: views, empty };
    },
    serialize: serializeSavedViews,
    seed: () => starterViews(Date.now(), fieldsRef.current),
  });
  const { latest, commit, reload } = list;

  const save = useCallback(
    async (input: SaveViewInput): Promise<SavedView | null> => {
      const name = input.name.trim();
      if (name === '') return null;
      const now = Date.now();
      const current = latest();
      /* Saving under a name that already exists updates that view — otherwise
         the menu fills with three things called "Hot leads". */
      const existing = current.find((entry) => entry.name.toLowerCase() === name.toLowerCase());
      const saved: SavedView = {
        id: existing?.id ?? nextViewId(current, name, now),
        name,
        filter: input.filter,
        density: input.density,
        layout: input.layout,
        rolling: input.rolling,
        savedAt: now,
      };
      return (await commit(upsertSavedView(current, saved))) ? saved : null;
    },
    [latest, commit],
  );

  const rename = useCallback(
    async (id: string, name: string) => {
      await commit(renameSavedView(latest(), id, name));
    },
    [latest, commit],
  );

  const remove = useCallback(
    async (id: string) => {
      await commit(removeSavedView(latest(), id));
    },
    [latest, commit],
  );

  /* Memoised because this object is a context value: a fresh literal every
     render would re-render every consumer of `ContactsViewsContext` on every
     keystroke in the filter bar. */
  return useMemo(
    () => ({
      views: list.entries,
      loading: list.loading,
      saving: list.saving,
      error: list.error,
      save,
      rename,
      remove,
      reload,
    }),
    [list.entries, list.loading, list.saving, list.error, save, rename, remove, reload],
  );
}
