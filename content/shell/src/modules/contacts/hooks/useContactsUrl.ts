import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ModuleAppProps } from '../../types';
import type { ContactsFilter } from '../lib/contactsFilter';
import {
  DEFAULT_PARAMS,
  parseContactsParams,
  viewSegment,
  writeContactsParams,
  type ContactsParams,
  type ContactsView,
} from '../lib/contactsParams';
import { listRoute } from '../lib/fields';
import { resolveSavedFilter, type SavedView } from '../lib/savedViews';

export interface ContactsUrlArgs {
  params: URLSearchParams;
  /** The view segment of the address ('' at the module's root). */
  viewSeg: string;
  /** The shell's writer: view segment and params in one move. */
  setLocation: ModuleAppProps['setView'];
  navigate: ModuleAppProps['navigate'];
  savedViews: SavedView[];
}

export interface ContactsUrlApi {
  parsed: ContactsParams;
  filter: ContactsFilter;
  write: (next: Partial<ContactsParams> | ((current: ContactsParams) => Partial<ContactsParams>)) => void;
  setFilter: (next: ContactsFilter) => void;
  setView: (view: ContactsView) => void;
  goToList: (options?: { addColumn?: string }) => void;
  openContact: (contactId: string) => void;
  closeContact: () => void;
  applySavedView: (id: string) => void;
  lastApplied: { view: SavedView; at: number } | null;
}

/**
 * The address bar and the filter, as one seam.
 *
 * The URL is the workspace's only writable state: everything here either reads
 * it (`parsed`, `filter`) or writes it through `write`, which is the single
 * place that merges a patch over the current params. `applySavedView` lives
 * here too, because applying a view writes the filter AND the density in one
 * `write` — split across owners, the two writes would race (see `writtenRef`).
 */
export function useContactsUrl({
  params,
  viewSeg,
  setLocation,
  navigate,
  savedViews,
}: ContactsUrlArgs): ContactsUrlApi {
  /* Keyed on the string, not the object: `params` is a fresh URLSearchParams on
     every shell render, and re-parsing would hand every surface a new filter. */
  const query = params.toString();
  const parsed = useMemo(() => parseContactsParams(new URLSearchParams(query), viewSeg), [query, viewSeg]);

  /* Filter identity has to survive a re-render that did not change it: the data
     hook keys its whole life on the plan built from this object, and a
     fresh-but-equal object every render is a refetch loop. */
  const filterKey = JSON.stringify(parsed.filter);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the serialized filter so an equal-but-fresh object keeps its identity
  const urlFilter = useMemo(() => parsed.filter, [filterKey]);

  /* Filter groups are not URL-sized — twenty predicates is not a link — so they
     live here and are merged over what the link carried. Applying a saved view
     writes both halves. */
  const [groups, setGroups] = useState<ContactsFilter['groups']>([]);
  const [groupOperator, setGroupOperator] = useState<ContactsFilter['groupOperator']>(urlFilter.groupOperator);
  const filter = useMemo<ContactsFilter>(
    () => ({ ...urlFilter, groups, groupOperator }),
    [urlFilter, groups, groupOperator],
  );

  const [lastApplied, setLastApplied] = useState<{ view: SavedView; at: number } | null>(null);

  /* The last params this component wrote, before React has handed them back.
     Two writes in one tick — applying a saved view writes the filter AND the
     density — would otherwise both build on the render's stale `params` and the
     first one would vanish. Cleared as soon as the real params arrive. */
  const writtenRef = useRef<URLSearchParams | null>(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const viewRef = useRef(parsed.view);
  viewRef.current = parsed.view;
  useEffect(() => {
    writtenRef.current = null;
  }, [params]);

  const write = useCallback(
    (next: Partial<ContactsParams> | ((current: ContactsParams) => Partial<ContactsParams>)) => {
      const base = writtenRef.current ?? paramsRef.current;
      const current = parseContactsParams(base, viewRef.current);
      const patch = typeof next === 'function' ? next(current) : next;
      const merged = { ...DEFAULT_PARAMS, ...current, ...patch };
      const written = writeContactsParams(base, merged);
      writtenRef.current = written;
      /* A surface is a place and pushes; everything else — a filter, a density,
         an open record — replaces, so Back is not a list of keystrokes. */
      setLocation(viewSegment(merged.view), written, { replace: merged.view === current.view });
    },
    [setLocation],
  );

  const setFilter = useCallback(
    (next: ContactsFilter) => {
      setGroups(next.groups);
      setGroupOperator(next.groupOperator);
      write({ filter: next });
    },
    [write],
  );

  /* Going to a surface leaves the record page. Otherwise "Go to Fields" from
     the palette would change a tab nobody can see behind an open contact. */
  const setView = useCallback((view: ContactsView) => write({ view, contact: null, tab: 'overview' }), [write]);
  /* The Fields surface sends people back to the list, sometimes asking for one
     more column. The list is the module's root, so this is a move, not a param
     write — and the view must not read the address bar to make it. */
  const goToList = useCallback(
    (options: { addColumn?: string } = {}) =>
      navigate(listRoute(paramsRef.current.toString(), { ...options, moduleId: 'contacts' })),
    [navigate],
  );
  const openContact = useCallback((contactId: string) => write({ contact: contactId }), [write]);
  const closeContact = useCallback(() => write({ contact: null, tab: 'overview' }), [write]);

  const applySavedView = useCallback(
    (id: string) => {
      const view = savedViews.find((entry) => entry.id === id);
      if (!view) return;
      const next = resolveSavedFilter(view);
      setGroups(next.groups);
      setGroupOperator(next.groupOperator);
      write({ filter: next, density: view.density, view: 'list', contact: null });
      /* Stamped so the list can adopt the saved columns: the workspace owns the
         URL, but the table owns its layout, and this is the only seam between
         them that does not unfreeze the view contract. */
      setLastApplied({ view, at: Date.now() });
    },
    [savedViews, write],
  );

  return {
    parsed,
    filter,
    write,
    setFilter,
    setView,
    goToList,
    openContact,
    closeContact,
    applySavedView,
    lastApplied,
  };
}
