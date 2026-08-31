import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, ContextMenu, PageBody, Spinner, useHotkeys, type ContextMenuPoint, type SortState } from '~ui';
import { useContactsViews } from '../ContactsViewsContext';
import { useBulkRun } from '../hooks/useBulkRun';
import { useContactsStore } from '../hooks/useContactsStore';
import { useExpiringMarks } from '../hooks/useExpiringMarks';
import { useListColumns } from '../hooks/useListColumns';
import { useRowActions } from '../hooks/useRowActions';
import { useRowMutations } from '../hooks/useRowMutations';
import { useSelectAllFill } from '../hooks/useSelectAllFill';
import { useSentinel } from '../hooks/useSentinel';
import { ImportButton } from '../components/io/ImportButton';
import { BulkBar } from '../components/list/BulkBar';
import { ContactsTable, type EditingCell } from '../components/list/ContactsTable';
import { FillProgress } from '../components/list/FillProgress';
import { ListEmpty } from '../components/list/ListEmpty';
import { ListToolbar } from '../components/list/ListToolbar';
import { NewContactDialog } from '../components/list/NewContactDialog';
import { SelectAllDialog } from '../components/list/SelectAllDialog';
import { EMPTY_FILTER, isFilterEmpty, usesChatOnlyFilters, type ContactsFilter } from '../lib/contactsFilter';
import type { Density } from '../lib/contactsParams';
import { planQuery } from '../lib/queryPlan';
import { applyColumnLayout, setWidths, sortFromState, sortStateFor, type ColumnLayout } from '../lib/tableColumns';
import { actionTargets, emptyKind, loadMoreLabel, rowsFor } from '../lib/tableSelection';
import type { ContactsViewProps } from './types';

/** Typing goes to the URL debounced: a keystroke per history entry is not a history. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * The contacts list: the module's front door.
 *
 * This file is deliberately thin for its size. The decisions are pure and
 * unit-tested in `lib/` (`queryPlan`, `contactsStore`, `tableColumns`,
 * `tableSelection`, `bulk`) because vitest here is node-only; the stateful
 * seams are hooks beside this file — `useListColumns` (which columns, in what
 * order, how wide), `useExpiringMarks` (the row marks that fade on a timer),
 * `useRowActions` (edits, copies and the row menu) and `useSelectAllFill`
 * (the paging loop behind "select everything that matches").
 *
 * What the view still owns itself: the editing cell ("Enter commits and moves
 * to the cell below" is a statement about two cells, and the second one does
 * not exist yet when the key is pressed), the context-menu point (a table
 * cannot wrap its own rows), and the search text on its debounced way to the
 * URL. The selection is deliberately NOT here: it lives in the reducer, the
 * only place that can prune it when a live batch retires a row.
 */
export function ListView({
  filter,
  onFilterChange,
  density,
  onDensityChange,
  band,
  canEdit,
  team,
  catalog,
  onOpenContact,
  refreshToken,
  onCount,
  onBusy,
  onOrderChange,
  navigate,
}: ContactsViewProps) {
  const views = useContactsViews();
  const rootRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState(filter.q);
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [menu, setMenu] = useState<{ point: ContextMenuPoint; ids: string[] } | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectAllOpen, setSelectAllOpen] = useState(false);
  const [pendingDensity, setPendingDensity] = useState<Density | null>(null);

  /* ── what the table is showing ─────────────────────────────────────────── */

  const { preferences, setPreferences, attrNames, specs, layout } = useListColumns({
    band,
    catalog,
    lastApplied: views.lastApplied,
  });

  const plan = useMemo(
    () => planQuery({ filter, attrNames, dataTypeOf: catalog.dataTypeOf }),
    [filter, attrNames, catalog],
  );
  const data = useContactsStore(plan, refreshToken);
  const { state, rows, counts } = data;

  const mutations = useRowMutations({ store: data, dataTypeOf: catalog.dataTypeOf, attrNames });
  const rowById = useCallback((id: string) => state.byId[id], [state.byId]);
  const clearSelection = data.clearSelection;
  const bulk = useBulkRun({
    mutations,
    rowById,
    onFinished: useCallback(() => clearSelection(), [clearSelection]),
  });

  /* ── the workspace contract ────────────────────────────────────────────── */

  useEffect(() => {
    onCount(state.loading ? null : { shown: counts.shown, server: counts.serverCount });
  }, [onCount, state.loading, counts.shown, counts.serverCount]);

  /* The record page steps through this with ←/→ after the list unmounts, so
     it has to be reported rather than read. */
  useEffect(() => {
    onOrderChange?.(rows.map((row) => row.id));
  }, [rows, onOrderChange]);

  useEffect(() => {
    onBusy(state.loading || state.paging || bulk.running);
  }, [onBusy, state.loading, state.paging, bulk.running]);

  useEffect(() => {
    if (search === filter.q) return undefined;
    const timer = setTimeout(() => onFilterChange({ ...filter, q: search }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, filter, onFilterChange]);

  /* A filter arriving from elsewhere — a saved view, a deep link — has to reach
     the search box, or the box would keep overwriting it on the next keystroke. */
  useEffect(() => setSearch(filter.q), [filter.q]);

  /* ── paging and selection fills ────────────────────────────────────────── */

  const sentinel = useSentinel(data.canAutoPage, data.loadMore);
  const { fillTarget, setFillTarget, selectAll, canSelectAll } = useSelectAllFill(data);

  /* ── the marks that expire on their own ────────────────────────────────── */

  const { flash, arrived } = useExpiringMarks(state.flash, state.arrived);

  /* ── writes ────────────────────────────────────────────────────────────── */

  const { editRow, runPlan, rowMenuFor } = useRowActions({ mutations, bulk, canEdit, team, onOpenContact, navigate });

  /* ── saved views ───────────────────────────────────────────────────────── */

  /**
   * A saved view carries the filter, the density and the columns; the list is
   * the only thing that holds the last of those, so it is the only thing that
   * can hand it over and take it back.
   *
   * Two paths reach here and they are not the same. The MENU calls `onApply`
   * with both extras. ⌘K goes through the workspace instead, which owns the
   * URL and writes the filter and the density itself in one call, then stamps
   * `lastApplied` — so that path only leaves the columns to adopt.
   */
  const applySavedView = useCallback(
    (next: ContactsFilter, extras?: { density: Density; layout: ColumnLayout | null }) => {
      onFilterChange(next);
      if (extras === undefined) return;
      /* Parked rather than written now: `onFilterChange` and `onDensityChange`
         each rebuild the whole query string from the params of THIS render, so
         two calls in one tick keep only whichever ran last. The effect below
         writes it one commit later, against the params the filter change
         produced. */
      setPendingDensity(extras.density);
      setPreferences((current) => applyColumnLayout(current, extras.layout));
    },
    [onFilterChange, setPreferences],
  );

  useEffect(() => {
    if (pendingDensity === null) return;
    setPendingDensity(null);
    if (pendingDensity !== density) onDensityChange(pendingDensity);
  }, [pendingDensity, density, onDensityChange]);

  /* ── keyboard ──────────────────────────────────────────────────────────── */

  const selection = state.selection;

  useHotkeys(
    [
      { id: 'new', keys: 'c' },
      { id: 'clear', keys: 'escape', scope: 'always' },
    ] as const,
    (id) => {
      if (id === 'new' && canEdit) setCreating(true);
      if (id === 'clear') {
        if (editing) setEditing(null);
        else if (selection.length > 0) data.clearSelection();
      }
    },
    { rootRef },
  );

  const selectedRows = data.selected;

  /* ── render ────────────────────────────────────────────────────────────── */

  const sort = useMemo<SortState | null>(() => sortStateFor(filter.sort, specs), [filter.sort, specs]);
  const menuTargets = useMemo(() => (menu ? rowsFor(menu.ids, state.byId) : []), [menu, state.byId]);
  const empty = emptyKind(counts, isFilterEmpty(filter));

  const table = (
    <>
      <ContactsTable
        rows={rows}
        columns={specs}
        density={density}
        loading={state.loading}
        canEdit={canEdit}
        team={team}
        sortable={plan.engine === 'segment'}
        sort={sort}
        onSortChange={(next) => onFilterChange({ ...filter, sort: sortFromState(next, specs) })}
        selectedIds={selection}
        onSelectionChange={data.setSelection}
        onOpen={onOpenContact}
        onEdit={editRow}
        onRowContextMenu={(row, event) => {
          /* The handler owns preventDefault in controlled mode — the menu is
             mounted once for the whole table and never sees the event. */
          event.preventDefault();
          const ids = actionTargets(row.id, selection, state.byId);
          if (ids.length === 0) return;
          setMenu({ point: { x: event.clientX, y: event.clientY }, ids });
        }}
        rowMenu={(row) => rowMenuFor([row])}
        widths={preferences.widths}
        onWidthsChange={(widths) => setPreferences((current) => setWidths(current, widths))}
        editing={editing}
        onEditingChange={setEditing}
        flash={flash}
        arrived={arrived}
        cards={band === 'compact'}
        empty={
          <ListEmpty
            kind={empty}
            canEdit={canEdit}
            onClearFilters={() => onFilterChange(EMPTY_FILTER)}
            onNewContact={() => setCreating(true)}
            importSlot={<ImportButton catalog={catalog} onImported={data.refetch} disabled={!canEdit} />}
          />
        }
      />

      {/* The observer's target. Rendered only while auto-paging is allowed, so
          past the cap it costs nothing and the button below takes over. */}
      {data.canAutoPage ? <div ref={sentinel.setTarget} aria-hidden className="h-px" /> : null}

      {state.paging ? (
        <div className="flex justify-center p-3">
          <Spinner size={16} />
        </div>
      ) : data.needsManualPage ? (
        <div className="flex flex-col items-center gap-1 p-3">
          <Button variant="secondary" size="sm" onClick={data.loadMore}>
            {loadMoreLabel(counts, state.order.length)}
          </Button>
        </div>
      ) : null}
    </>
  );

  return (
    /* `relative` is load-bearing: the bulk bar is absolutely positioned and
       deliberately not portalled, so an embed's bar stays inside the module
       instead of stretching across the host's viewport. */
    <div ref={rootRef} className="relative flex min-h-0 flex-1 flex-col">
      <ListToolbar
        filter={filter}
        onFilterChange={onFilterChange}
        catalog={catalog}
        team={team}
        search={search}
        onSearchChange={setSearch}
        onApplySavedView={applySavedView}
        density={density}
        onDensityChange={onDensityChange}
        layout={layout}
        preferences={preferences}
        onPreferencesChange={setPreferences}
        canEdit={canEdit}
        onImported={data.refetch}
        onNewContact={() => setCreating(true)}
        plan={plan}
        selection={selection}
        exportDisabled={bulk.running}
      />

      {state.error ? (
        <div className="px-gutter pt-2">
          <Alert
            tone="danger"
            title="Could not load contacts"
            action={
              <Button variant="secondary" size="sm" onClick={data.refetch}>
                Retry
              </Button>
            }
          >
            {state.error}
          </Alert>
        </div>
      ) : null}

      {/* `padded={false}` because the table owns its padding, and the ref is
          the point: the sentinel observes THIS element, not the window. A
          module can be one panel of a host page whose window never scrolls. */}
      <PageBody ref={sentinel.setRoot} padded={false} className="min-h-0 min-w-0 flex-1">
        {table}
      </PageBody>

      <ContextMenu
        /* Closed the moment its targets stop existing: a live `Remove` can
           retire the row under an open menu, and a menu of actions against
           nothing is worse than no menu. */
        point={menuTargets.length > 0 ? (menu?.point ?? null) : null}
        onPointChange={() => setMenu(null)}
        items={rowMenuFor(menuTargets)}
        aria-label="Contact actions"
      />

      <BulkBar
        selected={selectedRows}
        canEdit={canEdit}
        team={team}
        catalog={catalog}
        progress={bulk.progress}
        onStop={bulk.stop}
        onRun={runPlan}
        onClear={data.clearSelection}
        selectAll={
          canSelectAll
            ? {
                label: `Select all ${counts.serverCount === null ? 'matching' : counts.serverCount.toLocaleString()}`,
                onSelect: () => setSelectAllOpen(true),
              }
            : null
        }
      />

      <SelectAllDialog
        open={selectAllOpen}
        onClose={() => setSelectAllOpen(false)}
        plan={selectAll}
        serverCount={counts.serverCount}
        onConfirm={() => {
          setSelectAllOpen(false);
          setFillTarget(selectAll.target);
        }}
      />

      {fillTarget !== null ? (
        <FillProgress loaded={state.order.length} target={fillTarget} onStop={() => setFillTarget(null)} />
      ) : null}

      <NewContactDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={mutations.createWhatsappContact}
        onCreated={(contactId) => {
          data.refetch();
          onOpenContact(contactId);
        }}
        /* Under the chats engine the new contact is invisible until it chats —
           `conversation` is null on a contact created by hand. */
        underConversationFilter={plan.engine === 'chats' || usesChatOnlyFilters(filter)}
      />
    </div>
  );
}
