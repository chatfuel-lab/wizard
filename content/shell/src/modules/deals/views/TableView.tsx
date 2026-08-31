import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SalesStageV2 } from '~api/generated/deals/graphql';
import {
  ActionBar,
  Alert,
  Button,
  DURATION,
  EASING,
  EmptyState,
  IconDownload,
  IconLayoutList,
  PageBody,
  Spinner,
  prefersReducedMotion,
  useHotkeys,
  useToast,
  type ContextMenuPoint,
  type MenuItem,
} from '~ui';
import { useDealsUndo } from '../DealsUndoContext';
import { DealsFilterBar } from '../components/DealsFilterBar';
import { DealsTable } from '../components/DealsTable';
import { TableCaveatBar } from '../components/TableCaveatBar';
import { TableExportStatus } from '../components/TableExportStatus';
import { TableRowMenu } from '../components/TableRowMenu';
import { useDealExport } from '../hooks/useDealExport';
import { useDealsTable } from '../hooks/useDealsTable';
import { MAX_MULTI_MOVE } from '../lib/constants';
import { canExport, csvColumnOptions, defaultCsvSelection, exportAttributes } from '../lib/csvColumns';
import { DEAL_FIELDS } from '../lib/dealFields';
import { EMPTY_FILTER, isFilterEmpty, type AttrPredicate, type DealsFilter } from '../lib/dealsFilter';
import { adoptPredicates } from '../lib/dealsTableStore';
import { planQuery } from '../lib/queryPlan';
import type { BoardShortcutId } from '../lib/shortcuts';
import { STAGES, STAGE_META } from '../lib/stages';
import { stageForKey } from '../lib/stageKeys';
import {
  DEFAULT_HIDDEN,
  contactName,
  hiddenForBand,
  sortFromState,
  sortStateFor,
  tableColumns,
} from '../lib/tableColumns';
import { enteredIndexes, sortSignature } from '../lib/tableMotion';
import {
  TABLE_ROW_BINDINGS,
  actionTargets,
  dealLink,
  groupUndoMoves,
  movableRows,
  rowShortcutKey,
  rowsFor,
  stageShortcutKey,
  undoableMoves,
} from '../lib/tableSelection';
import { undoEntryFor, undoLabel } from '../lib/undo';
import type { DealsTableRow } from '../types';
import type { DealsViewProps } from './types';

/** How far ahead of the sentinel a page starts loading. */
const SENTINEL_MARGIN = '300px';

/**
 * The table: every deal as a row, over two mutually exclusive query engines.
 *
 * This file is deliberately thin. The routing decision is
 * `lib/queryPlan.ts`, the list state is `lib/dealsTableStore.ts`, the columns
 * are `lib/tableColumns.ts`, and what a selection may be acted on with is
 * `lib/tableSelection.ts` — all pure, all unit-tested, because vitest runs
 * node-only here and a React file is the one thing no test can reach.
 *
 * Two pieces of state the view owns rather than the shared filter model:
 *
 * - **Predicates.** They are not in the URL by design (unbounded, and a link
 *   carrying them would be unshareable), so `parseDealsParams` hands back
 *   `predicates: []` on every round trip. They are held here and pushed up
 *   anyway, so a saved view can serialize them; `adoptPredicates` takes a
 *   non-empty list back from above, which can only be one being applied.
 * - **Hidden columns.** A per-user reading preference, not a filter — putting
 *   it in the URL would mean sharing a link changes what the reader sees.
 *
 * The selection is deliberately *not* here: it lives in the reducer, which is
 * the only place that can prune it when a subscription retires a row.
 */
export function TableView({
  filter,
  onFilterChange,
  density,
  onDensityChange,
  band,
  fields,
  canEdit,
  onCount,
  onBusy,
  refreshToken,
  onOpenDeal,
}: DealsViewProps) {
  const [predicates, setPredicates] = useState<AttrPredicate[]>(filter.predicates);
  const [hidden, setHidden] = useState<string[]>([...DEFAULT_HIDDEN]);
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [menu, setMenu] = useState<{ point: ContextMenuPoint; ids: string[] } | null>(null);

  const toast = useToast();
  const undo = useDealsUndo();
  const exporter = useDealExport();
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPredicates((local) => adoptPredicates(local, filter.predicates));
  }, [filter.predicates]);

  const effective = useMemo<DealsFilter>(() => ({ ...filter, predicates }), [filter, predicates]);
  const plan = useMemo(() => planQuery({ filter: effective, fieldNames: fields.names }), [effective, fields.names]);

  const table = useDealsTable(plan);
  const {
    byId,
    rows,
    selection,
    selectedRows,
    loading,
    loadingMore,
    count,
    autoPage,
    manualPage,
    liveTick,
    loadMore,
    refetch,
    setSelection,
    clearSelection,
    setStage,
  } = table;

  const columns = useMemo(() => tableColumns(fields.bindings), [fields.bindings]);
  const effectiveHidden = useMemo(() => hiddenForBand(hidden, band), [hidden, band]);
  const sort = useMemo(() => sortStateFor(effective, columns), [effective, columns]);

  /* The attribute names the predicate editor offers first. Any other name can
   * still be typed — the deal fields are a convention, not a schema. */
  const attributeNames = useMemo(
    () => [...new Set([...fields.names, ...DEAL_FIELDS.map((spec) => spec.attributeName)])],
    [fields.names],
  );

  useEffect(() => onCount(loading ? null : count), [onCount, loading, count]);
  useEffect(() => onBusy(loading || loadingMore), [onBusy, loading, loadingMore]);

  // The header's refresh button. Skipped on mount — the load effect already ran.
  useEffect(() => {
    if (refreshToken > 0) refetch();
  }, [refreshToken, refetch]);

  /* Auto-paging stops at the cap in `dealsTableStore.ts`; past it the observer
   * is not even created and the button below takes over. */
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !autoPage || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: SENTINEL_MARGIN },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [autoPage, loadMore]);

  /* ── motion ──────────────────────────────────────────────────────────────
   * Both effects reach into the tbody, because `DataTable` owns the `<tr>` and
   * a row cannot carry a class of its own. Both consult `prefersReducedMotion`
   * explicitly: WAAPI never sees the CSS token collapse.
   */

  const rowIds = useMemo(() => rows.map((row) => row.id), [rows]);
  const shownIds = useRef(rowIds);
  const shownTick = useRef(liveTick);

  // Rows that arrived on a subscription batch, and only those: a page append
  // is the user asking for rows, and flashing what they just requested is noise.
  useEffect(() => {
    const previous = shownIds.current;
    shownIds.current = rowIds;
    const fromLive = shownTick.current !== liveTick;
    shownTick.current = liveTick;
    if (!fromLive || prefersReducedMotion()) return;
    const body = scrollRef.current?.querySelector('tbody');
    if (!body) return;
    for (const index of enteredIndexes(previous, rowIds)) {
      body.children[index]?.animate(
        [
          { backgroundColor: 'var(--color-accent-soft)' },
          { backgroundColor: 'var(--color-accent-soft)', offset: 0.4 },
          { backgroundColor: 'transparent' },
        ],
        { duration: DURATION.slow * 2, easing: EASING.standard },
      );
    }
  }, [rowIds, liveTick]);

  /* The sort transition runs when the reordered rows arrive, not when the
   * header is clicked: a new sort is a new plan, so the body is showing
   * skeletons for the round trip in between. Opacity only — a transform on a
   * table-row-group is not something every engine agrees about. */
  const sortKey = sortSignature(sort);
  const settledSort = useRef(sortKey);
  useEffect(() => {
    if (loading || settledSort.current === sortKey) return;
    settledSort.current = sortKey;
    if (prefersReducedMotion()) return;
    scrollRef.current?.querySelector('tbody')?.animate([{ opacity: 0.3 }, { opacity: 1 }], {
      duration: DURATION.base,
      easing: EASING.entrance,
    });
  }, [sortKey, loading]);

  /* ── actions ─────────────────────────────────────────────────────────── */

  /**
   * Every stage change on the table funnels through here — the cell's select,
   * a menu entry, the bar, `1`–`6` — so the toast, the undo offer and the
   * selection clear happen once per batch rather than once per row.
   */
  const applyStage = useCallback(
    async (targets: readonly DealsTableRow[], to: SalesStageV2) => {
      const ids = targets.map((row) => row.id);
      const movable = movableRows(ids, byId, to);
      if (movable.length === 0) return;
      if (movable.length > MAX_MULTI_MOVE) {
        toast.show({
          tone: 'warning',
          title: `Too many deals selected (${movable.length})`,
          description: `There is no bulk mutation — every move is a separate request, and ${MAX_MULTI_MOVE} at a time is the limit.`,
        });
        return;
      }

      const stage = STAGE_META[to].label;
      const report = await setStage(ids, to);

      if (report.failed.length > 0) {
        toast.show({
          tone: 'danger',
          title:
            report.failed.length === 1
              ? `${contactName(report.failed[0]!)} could not be moved`
              : `${report.failed.length} deals could not be moved`,
          description: report.message ?? undefined,
        });
      }
      if (report.moved.length === 0) return;
      /* Only when the batch actually came from the selection. The stage cell's
       * own select moves one row, and wiping an unrelated selection because a
       * dropdown three rows down was touched is exactly the kind of silent
       * loss the right-click convention exists to avoid. */
      if (ids.some((id) => selection.includes(id))) clearSelection();

      const moved = report.moved.length === 1 ? `Moved to ${stage}` : `Moved ${report.moved.length} deals to ${stage}`;

      /* A row that had no stage at all cannot come back: `salesStageV2` is
       * non-null on the mutation, so there is no value meaning "none". Those
       * moves are real and simply not undoable, and offering an Undo that
       * silently skipped them would be worse than offering none. */
      const entry = undoEntryFor(undoableMoves(report.moved), to, Date.now());
      if (entry === null) {
        toast.show({ tone: 'success', title: moved });
        return;
      }

      undo.push(entry, async () => {
        /* Undo is a compensating forward mutation, one call per source stage. */
        for (const group of groupUndoMoves(entry)) {
          const back = await setStage(group.ids, group.to);
          if (back.failed.length > 0) {
            toast.show({
              tone: 'danger',
              title: `${back.failed.length} of the undone moves did not stick`,
              description: back.message ?? undefined,
            });
          }
        }
      });

      toast.show({
        tone: 'success',
        title: moved,
        /* Said out loud because it is not reversible and not obvious: this
         * table sorts by conversation time, so the rows do not jump — but the
         * board's column order and the rot clock both read the stage time the
         * server just re-stamped. */
        description:
          'Undo moves them back rather than reverting, so the server re-stamps the stage time: their age in the pipeline restarts.',
        action: { label: undoLabel(entry), onClick: undo.run },
      });
    },
    [byId, selection, setStage, clearSelection, toast, undo],
  );

  const exportColumns = useMemo(
    () => exportAttributes('selected', defaultCsvSelection(fields.bindings), csvColumnOptions(fields.bindings)),
    [fields.bindings],
  );

  /**
   * Export exactly the selection — `csvContactExportStartByIDsList` takes ids,
   * so there is nothing to choose and nothing to explain. The forecast's
   * `ExportDialog` exists for the other start, the one that cannot be narrowed
   * to deals at all.
   */
  const runExport = useCallback(
    (targets: readonly DealsTableRow[]) => {
      if (targets.length === 0) return;
      if (!canExport('selected', exportColumns)) {
        toast.show({
          tone: 'warning',
          title: 'Nothing to export',
          description:
            'None of the deal fields resolved to an attribute on this bot, and an empty column list is how the API is told to export every attribute there is.',
        });
        return;
      }
      void exporter.startByIds(
        targets.map((row) => row.id),
        exportColumns,
      );
    },
    [exporter, exportColumns, toast],
  );

  const copyLink = useCallback(
    async (row: DealsTableRow) => {
      const link = dealLink(window.location.href, row.id);
      try {
        await navigator.clipboard.writeText(link);
        toast.show({ title: 'Link copied', description: link });
      } catch {
        /* No clipboard outside a secure context, and the user can refuse it —
         * the link goes in the toast either way so it stays selectable. */
        toast.show({ tone: 'warning', title: 'Could not copy the link', description: link });
      }
    },
    [toast],
  );

  /**
   * `1`–`6` and `[`/`]` act on the selection, and `esc` clears it — the same
   * keys the board binds, taken from the same array (`TABLE_ROW_BINDINGS`) so
   * the `?` sheet documents both at once. Bound only while something is
   * selected, or a stray `3` over an empty table would move nothing and
   * swallow the keystroke.
   */
  const onRowShortcut = useCallback(
    (id: BoardShortcutId) => {
      if (id === 'clear') {
        clearSelection();
        return;
      }
      if (!canEdit) return;
      const key = rowShortcutKey(id);
      /* `[` and `]` step relative to a stage, and a selection can span several.
       * The first selected row is the reference, exactly as the board uses the
       * focused card's — the whole selection then lands on that one stage. */
      const to = key === null ? null : stageForKey(key, selectedRows[0]?.salesStageV2 ?? null);
      if (to === null) return;
      void applyStage(selectedRows, to);
    },
    [canEdit, clearSelection, selectedRows, applyStage],
  );

  useHotkeys(TABLE_ROW_BINDINGS, onRowShortcut, {
    rootRef,
    enabled: selection.length > 0,
  });

  const barActions = useMemo<MenuItem[]>(() => {
    const actions: MenuItem[] = [];
    if (canEdit) {
      for (const [index, stage] of STAGES.entries()) {
        const key = stageShortcutKey(index);
        actions.push({
          id: `stage-${stage}`,
          label: `Move to ${STAGE_META[stage].label}`,
          shortcut: key === null ? undefined : [key],
          onSelect: () => void applyStage(selectedRows, stage),
        });
      }
      actions.push({ kind: 'separator', id: 'bar-sep' });
    }
    actions.push({
      id: 'export',
      label: 'Export CSV',
      icon: <IconDownload size={14} />,
      onSelect: () => runExport(selectedRows),
    });
    return actions;
  }, [canEdit, selectedRows, applyStage, runExport]);

  const menuTargets = useMemo(() => (menu ? rowsFor(menu.ids, byId) : []), [menu, byId]);

  const clear = useCallback(() => {
    setPredicates([]);
    onFilterChange(EMPTY_FILTER);
  }, [onFilterChange]);

  /* Offered by the caveat bar: drop only what forced engine C, keep the rest. */
  const relax = useCallback(() => {
    setPredicates([]);
    onFilterChange({ ...filter, sort: null });
  }, [filter, onFilterChange]);

  const narrowed = !isFilterEmpty(effective);

  return (
    /* `relative` is load-bearing: ActionBar is absolutely positioned and is
       deliberately not portalled, so an embed's bulk bar stays inside the
       module instead of stretching across the host's viewport. */
    <div ref={rootRef} className="relative flex min-h-0 flex-1 flex-col">
      <DealsFilterBar
        filter={filter}
        onFilterChange={onFilterChange}
        predicates={predicates}
        onPredicatesChange={setPredicates}
        attributeNames={attributeNames}
        density={density}
        onDensityChange={onDensityChange}
        columns={columns}
        hidden={hidden}
        onHiddenChange={setHidden}
        onClear={clear}
      />

      <TableCaveatBar caveats={table.caveats} onRelax={plan.engine === 'segment' ? relax : undefined} />

      <TableExportStatus exporter={exporter} />

      {table.error ? (
        <div className="px-gutter pt-3">
          {/* Load failures only — a stage change that did not stick is a toast
              next to its Undo, not a banner over the list it failed on. */}
          <Alert
            tone="danger"
            action={
              <Button variant="secondary" size="sm" onClick={refetch}>
                Retry
              </Button>
            }
          >
            {table.error}
          </Alert>
        </div>
      ) : null}

      {/* `padded={false}` because the table owns its own padding, and the ref is
          the point: both motion effects above reach through it for the `tbody`
          DataTable owns. This was a hand-rolled div for as long as `PageBody`
          forwarded neither a ref nor `onScroll`; it forwards both now, and it
          puts them on the element that actually scrolls rather than on a
          wrapper — reading `scrollTop` off a wrapper returns a constant zero. */}
      <PageBody ref={scrollRef} padded={false}>
        <DealsTable
          rows={rows}
          columns={columns}
          hidden={effectiveHidden}
          bindings={fields.bindings}
          density={density}
          sort={sort}
          onSortChange={(next) => onFilterChange({ ...filter, sort: sortFromState(next, columns) })}
          loading={loading}
          canEdit={canEdit}
          onOpen={onOpenDeal}
          onStage={(row, to) => void applyStage([row], to)}
          selectedIds={selection}
          onSelectionChange={setSelection}
          onRowContextMenu={(row, event) => {
            /* The handler owns preventDefault in controlled mode — the menu is
               mounted once for the whole table and never sees the event. */
            event.preventDefault();
            const ids = actionTargets(row.id, selection, byId);
            if (ids.length === 0) return;
            /* Right-clicking inside the selection acts on all of it; outside it
               acts on that row alone and leaves the selection untouched, so a
               menu never silently discards one. */
            setMenu({ point: { x: event.clientX, y: event.clientY }, ids });
          }}
          widths={widths}
          onWidthsChange={setWidths}
          empty={
            <EmptyState
              icon={<IconLayoutList />}
              title={narrowed ? 'No deals match' : 'No deals yet'}
              description={
                narrowed
                  ? 'Widen the filter, or clear it to see every deal again.'
                  : 'Set a sales stage on a contact (Contacts module, or via the API) and it appears here.'
              }
            />
          }
        />

        <div ref={sentinelRef} aria-hidden className="h-px" />

        {loadingMore ? (
          <div className="flex justify-center p-3">
            <Spinner size={16} />
          </div>
        ) : manualPage ? (
          <div className="flex flex-col items-center gap-1 p-3">
            <Button variant="ghost" size="sm" onClick={loadMore}>
              Load more
            </Button>
            <span className="text-xs text-text-faint">
              Auto-loading stops here so the page stays responsive — this table is not virtualized.
            </span>
          </div>
        ) : null}
      </PageBody>

      <TableRowMenu
        /* Closed the moment its targets stop existing: a subscription `Remove`
           can retire the row under an open menu, and a menu of actions against
           nothing is worse than no menu. */
        point={menuTargets.length > 0 ? (menu?.point ?? null) : null}
        onPointChange={() => setMenu(null)}
        targets={menuTargets}
        canEdit={canEdit}
        onOpen={onOpenDeal}
        onStage={(targets, to) => void applyStage(targets, to)}
        onCopyLink={(row) => void copyLink(row)}
        onExport={runExport}
      />

      <ActionBar count={selection.length} actions={barActions} onClear={clearSelection} />
    </div>
  );
}
