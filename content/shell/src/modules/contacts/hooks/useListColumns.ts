import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { Band } from '~ui';
import type { SavedView } from '../lib/savedViews';
import {
  COLUMNS_PARAM,
  DEFAULT_PREFERENCES,
  applyColumnLayout,
  attributeNamesFor,
  columnSpec,
  parseColumnParam,
  shownColumns,
  toColumnLayout,
  visibleColumnKeys,
  withParamColumns,
  type ColumnLayout,
  type ColumnSpec,
  type ListPreferences,
} from '../lib/tableColumns';
import { moduleParams } from '../lib/tableSelection';
import type { AttributeCatalog } from './useAttributeCatalog';

/**
 * The `cols` the address bar is carrying right now.
 *
 * The Fields surface's "Show in the list" hands columns over as
 * `cols=attr:Plan,attr:City`, and the list reads them off the link rather than
 * off a prop: `views/types.ts` is a frozen contract, and a parameter that only
 * one surface writes and only one surface reads does not belong in it.
 *
 * Outside a browser this is simply nothing, so importing the view never
 * touches `window`.
 */
function columnsParam(): string | null {
  if (typeof window === 'undefined') return null;
  return moduleParams(window.location.href).get(COLUMNS_PARAM);
}

export interface ListColumnsArgs {
  band: Band;
  catalog: AttributeCatalog;
  /** The views context's stamp: the saved view the workspace applied last. */
  lastApplied: { view: SavedView; at: number } | null;
}

export interface ListColumnsApi {
  preferences: ListPreferences;
  setPreferences: Dispatch<SetStateAction<ListPreferences>>;
  /** The attribute names the visible columns need the query to carry. */
  attrNames: string[];
  specs: ColumnSpec[];
  /** The current preferences as a saved view's layout. */
  layout: ColumnLayout;
}

/**
 * Which columns the table shows, and where that answer comes from: the
 * reading preferences held here, the `cols` the address bar carries, and the
 * columns of the saved view the workspace last applied.
 */
export function useListColumns({ band, catalog, lastApplied }: ListColumnsArgs): ListColumnsApi {
  const [preferences, setPreferences] = useState<ListPreferences>(DEFAULT_PREFERENCES);
  const [cols, setCols] = useState<string | null>(columnsParam);

  /**
   * Columns the Fields surface asked for, folded in.
   *
   * The mount read is the one that does the work: switching to this surface
   * mounts the view, with the address already written. The listener is for the
   * two cases that bypass a mount — back / forward, and a link pasted into the
   * address bar of a tab that is already here.
   *
   * Applying it does not rewrite the URL — the list does not own the address
   * bar — so `withParamColumns` is written to be idempotent and a `cols` still
   * sitting in the link costs one no-op fold per mount. The one visible
   * consequence, stated rather than hidden: a column the link names comes back
   * if you hide it and then leave the surface and return, because the link
   * still says to show it. The link IS the instruction, which is also why only
   * the Fields surface ever writes this key.
   */
  useEffect(() => {
    const sync = () => setCols(columnsParam());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  useEffect(() => {
    const keys = parseColumnParam(cols);
    if (keys.length === 0) return;
    setPreferences((current) => withParamColumns(current, keys));
  }, [cols]);

  const chosen = useMemo(() => shownColumns(preferences), [preferences]);
  const visible = useMemo(() => visibleColumnKeys(chosen, band), [chosen, band]);
  const attrNames = useMemo(() => attributeNamesFor(visible), [visible]);
  const specs = useMemo<ColumnSpec[]>(
    () => visible.flatMap((key) => columnSpec(key, catalog.dataTypeOf) ?? []),
    [visible, catalog],
  );

  const layout = useMemo(() => toColumnLayout(preferences), [preferences]);

  /* Keyed on the STAMP, not on the view: adopting is then idempotent, it
     cannot fire for a filter change that came from anywhere else, and applying
     the same view twice still puts the columns back the second time. */
  const appliedAt = lastApplied?.at ?? null;
  useEffect(() => {
    const applied = lastApplied;
    if (applied === null) return;
    setPreferences((current) => applyColumnLayout(current, applied.view.layout));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the stamp so adopting stays idempotent and cannot fire for a filter change from anywhere else
  }, [appliedAt]);

  return { preferences, setPreferences, attrNames, specs, layout };
}
