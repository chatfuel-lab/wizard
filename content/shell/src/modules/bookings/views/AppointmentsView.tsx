import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BookingStatus } from '~api/generated/bookings/graphql';
import {
  ActionBar,
  Alert,
  Button,
  CSV_BOM,
  downloadTextFile,
  EmptyState,
  IconDownload,
  IconLayoutList,
  IconTrash,
  PageBody,
  useHotkeys,
  useToast,
  usesHour12,
  type ContextMenuPoint,
  type MenuItem,
} from '~ui';
import { AppointmentsRowMenu } from '../components/appointments/AppointmentsRowMenu';
import { AppointmentsTable } from '../components/appointments/AppointmentsTable';
import { AppointmentsToolbar } from '../components/appointments/AppointmentsToolbar';
import { CoverageBar } from '../components/appointments/CoverageBar';
import { DeleteBookingsDialog } from '../components/DeleteBookingsDialog';
import { useAppointmentsNow } from '../hooks/useAppointmentsNow';
import { useRangeMutations } from '../hooks/useRangeMutations';
import { useRangeStore } from '../hooks/useRangeStore';
import { hiddenColumnsFor, type FormatOptions } from '../lib/appointmentsColumns';
import { csvFileName, toCsv } from '../lib/appointmentsCsv';
import { emptyCopy, inTab, listWindow, loadMoreLabel, canLoadMore } from '../lib/appointmentsRange';
import { searchAppointments } from '../lib/appointmentsSearch';
import { effectiveSort, fromSortState, isDefaultSort, sortAppointments, toSortState } from '../lib/appointmentsSort';
import { EMPTY_FILTER, isFilterEmpty, matchesFilter } from '../lib/bookingsFilter';
import { SORT_KEYS, type AppointmentsRange } from '../lib/bookingsParams';
import { customRange, rangeVars } from '../lib/calendarRange';
import { FLASH_MS, isInitialLoad, selectSelected, selectVisible } from '../lib/rangeStore';
import { CALENDAR_BINDINGS, type CalendarShortcutId } from '../lib/shortcuts';
import { STATUS_META, statusForKey, TARGET_STATUSES } from '../lib/status';
import { shiftDayKey } from '../lib/zone';
import type { BookingRecord } from '../types';
import type { BookingsViewProps } from './types';

/** The calendar's status/clear/delete keys, re-used on the list's selection (same `?` sheet rows). */
const LIST_BINDINGS = CALENDAR_BINDINGS.filter((b) => /^status[1-5]$|^clear$|^delete$/.test(b.id));

/**
 * The appointments list: every booking of a chunked window as a row.
 *
 * Deliberately thin. The window is `lib/appointmentsRange.ts`, the split on
 * `now`, the search, the sort and the CSV are pure and tested; the store is
 * the shared `rangeStore` (one of three instances, fed by the one live
 * channel), and every write goes through `useRangeMutations`. This file wires
 * URL ↔ view state and holds the two things nothing else can: the chunk count
 * (how far the window has been widened; local because it is not a link) and
 * the context-menu / delete-dialog targets.
 *
 * Selection lives in the reducer, not here — `rangeLoaded`, `live remove` and
 * `reset` are the only places that can prune it when a row leaves.
 */
export function AppointmentsView({
  params,
  onParams,
  filter,
  onFilterChange,
  density,
  onDensityChange,
  band,
  role,
  zone,
  todayKey,
  weekStartsOn,
  onCount,
  onBusy,
  refreshToken,
  onOpenBooking,
}: BookingsViewProps) {
  const tab: AppointmentsRange = params.range;
  /* How far the window was widened, remembered PER TAB so a tab switch is one
   * request for the small window, not a wasted one for the old big window
   * followed by a reset. */
  const [widened, setWidened] = useState<{ tab: AppointmentsRange; chunks: number }>({ tab, chunks: 1 });
  const chunks = widened.tab === tab ? widened.chunks : 1;
  const loadMore = useCallback(() => setWidened((w) => ({ tab, chunks: (w.tab === tab ? w.chunks : 1) + 1 })), [tab]);
  const [menu, setMenu] = useState<{ point: ContextMenuPoint; ids: string[] } | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<BookingRecord[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const now = useAppointmentsNow();

  const frame = useMemo(
    () => listWindow(tab, todayKey, chunks, params.from, params.to),
    [tab, todayKey, chunks, params.from, params.to],
  );
  const vars = useMemo(
    () => rangeVars(frame.range, zone.zone, zone.botZone ?? 'UTC'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [frame.range.startKey, frame.range.endKey, zone.zone, zone.botZone],
  );
  const store = useRangeStore(vars);
  const { state, dispatch, refetch } = store;
  const mutations = useRangeMutations(dispatch);

  /* Window → tab side of now → shared filter → search → sort. Each step is a
   * pure function; the memo chain re-runs only the tail that changed. */
  const inWindow = useMemo(() => selectVisible(state), [state]);
  const loaded = useMemo(() => inTab(inWindow, tab, now), [inWindow, tab, now]);
  const filtered = useMemo(() => loaded.filter((r) => matchesFilter(r, filter)), [loaded, filter]);
  const searched = useMemo(() => searchAppointments(filtered, params.q), [filtered, params.q]);
  const sort = useMemo(() => effectiveSort(tab, params.sort), [tab, params.sort]);
  const rows = useMemo(() => sortAppointments(searched, sort), [searched, sort]);
  const narrowed = !isFilterEmpty(filter) || params.q.trim() !== '';

  const initial = isInitialLoad(state);
  useEffect(() => onCount(initial ? null : rows.length), [onCount, initial, rows.length]);
  useEffect(() => onBusy(state.loading), [onBusy, state.loading]);

  // The header's refresh button; skipped on mount (the reset already loaded).
  useEffect(() => {
    if (refreshToken > 0) refetch();
  }, [refreshToken, refetch]);

  // A rollback flashes its row once, then the mark clears.
  useEffect(() => {
    const ids = Object.keys(state.flash);
    if (ids.length === 0) return;
    const timers = ids.map((id) => globalThis.setTimeout(() => dispatch({ type: 'flashCleared', id }), FLASH_MS));
    return () => timers.forEach((t) => globalThis.clearTimeout(t));
  }, [state.flash, dispatch]);

  /* A row the filter or the search hides cannot stay selected: the bar would
   * count something the reader cannot see. The reducer bails (same state
   * object) when nothing is pruned. */
  const rowIds = useMemo(() => rows.map((r) => r.id), [rows]);
  useEffect(() => {
    dispatch({ type: 'selectionPruned', visible: rowIds });
  }, [rowIds, dispatch]);

  const selectedRows = useMemo(() => selectSelected(state), [state]);
  const setSelection = useCallback((ids: string[]) => dispatch({ type: 'selectionSet', ids }), [dispatch]);
  const clearSelection = useCallback(() => dispatch({ type: 'selectionCleared' }), [dispatch]);

  /* ── URL writes ─────────────────────────────────────────────────────── */

  const setTab = useCallback(
    (next: AppointmentsRange) => {
      if (next === 'custom' && !params.from && !params.to) {
        // Custom starts on this month, written out so the pickers show real dates.
        const fallback = customRange(null, null, todayKey).range;
        onParams({ range: next, from: fallback.startKey, to: shiftDayKey(fallback.endKey, -1) });
        return;
      }
      onParams({ range: next });
    },
    [onParams, params.from, params.to, todayKey],
  );

  const setDates = useCallback((from: string | null, to: string | null) => onParams({ from, to }), [onParams]);
  const setQuery = useCallback((q: string) => onParams({ q }), [onParams]);
  const clearAll = useCallback(() => onParams({ filter: EMPTY_FILTER, q: '' }), [onParams]);
  const onSortChange = useCallback(
    (next: { key: string; dir: 'asc' | 'desc' } | null) => {
      const parsed = fromSortState(next, SORT_KEYS);
      onParams({ sort: parsed && !isDefaultSort(tab, parsed) ? parsed : null });
    },
    [onParams, tab],
  );

  /* ── actions ────────────────────────────────────────────────────────── */

  const applyStatus = useCallback(
    async (targets: readonly BookingRecord[], status: BookingStatus) => {
      if (!role.canEdit || targets.length === 0) return;
      const report = await mutations.setStatus(targets, status);
      if (report.phrase) setAnnouncement(report.phrase);
      // Only a batch that came from the selection clears it.
      if (report.done.length > 0 && targets.some((r) => state.selection.includes(r.id))) clearSelection();
    },
    [role.canEdit, mutations, state.selection, clearSelection],
  );

  const confirmDelete = useCallback(async () => {
    if (deleteTargets.length === 0) return;
    setDeleting(true);
    try {
      const report = await mutations.deleteBookings(deleteTargets);
      if (report.phrase) setAnnouncement(report.phrase);
      if (report.done.length > 0) clearSelection();
    } finally {
      setDeleting(false);
      setDeleteTargets([]);
    }
  }, [deleteTargets, mutations, clearSelection]);

  const exportCsv = useCallback(
    (targets: readonly BookingRecord[]) => {
      if (targets.length === 0) return;
      downloadTextFile(csvFileName(tab, frame.range), CSV_BOM + toCsv(targets, zone.zone), 'text/csv;charset=utf-8');
      toast.show({
        title: `Exported ${targets.length.toLocaleString()} ${targets.length === 1 ? 'row' : 'rows'}`,
        description: 'Loaded rows only — the API has no bookings export.',
        tone: 'info',
        duration: 3000,
      });
    },
    [tab, frame.range, zone.zone, toast],
  );

  /* `1`–`5`, `esc` and `delete` act on the selection while there is one — the
   * calendar's own bindings, so the `?` sheet documents both at once. */
  const onListShortcut = useCallback(
    (id: CalendarShortcutId, event: KeyboardEvent) => {
      if (id === 'clear') {
        clearSelection();
        return;
      }
      if (!role.canEdit) return;
      if (id === 'delete') {
        event.preventDefault();
        setDeleteTargets(selectedRows);
        return;
      }
      const status = statusForKey(id.replace('status', ''));
      if (status) void applyStatus(selectedRows, status);
    },
    [clearSelection, role.canEdit, selectedRows, applyStatus],
  );
  useHotkeys(LIST_BINDINGS, onListShortcut, {
    rootRef,
    enabled: state.selection.length > 0 && deleteTargets.length === 0,
  });

  const barActions = useMemo<MenuItem[]>(() => {
    const actions: MenuItem[] = [];
    if (role.canEdit) {
      for (const status of TARGET_STATUSES) {
        const meta = STATUS_META.find((m) => m.status === status)!;
        actions.push({
          id: `status-${status}`,
          label: meta.label,
          shortcut: meta.key ? [meta.key] : undefined,
          onSelect: () => void applyStatus(selectedRows, status),
        });
      }
      actions.push({ kind: 'separator', id: 'sep-1' });
    }
    actions.push({
      id: 'export',
      label: 'Export CSV',
      icon: <IconDownload size={14} />,
      onSelect: () => exportCsv(selectedRows),
    });
    if (role.canEdit) {
      actions.push({
        id: 'delete',
        label: 'Delete…',
        icon: <IconTrash size={14} />,
        tone: 'danger',
        onSelect: () => setDeleteTargets(selectedRows),
      });
    }
    return actions;
  }, [role.canEdit, selectedRows, applyStatus, exportCsv]);

  const menuTargets = useMemo(
    () => (menu ? menu.ids.map((id) => state.byId[id]).filter((r): r is BookingRecord => Boolean(r)) : []),
    [menu, state.byId],
  );

  const hidden = useMemo(() => hiddenColumnsFor(band, density), [band, density]);
  const format = useMemo<FormatOptions>(() => ({ todayKey, hour12: usesHour12() }), [todayKey]);
  const copy = emptyCopy(tab, narrowed);
  const more = loadMoreLabel(tab);

  return (
    /* `relative` is load-bearing: ActionBar is absolute and deliberately not
       portalled, so an embed's bulk bar stays inside the module. */
    <div ref={rootRef} className="relative flex min-h-0 flex-1 flex-col">
      <AppointmentsToolbar
        range={tab}
        onRange={setTab}
        from={params.from}
        to={params.to}
        onDates={setDates}
        query={params.q}
        onQueryChange={setQuery}
        filter={filter}
        onFilterChange={onFilterChange}
        density={density}
        onDensityChange={onDensityChange}
        band={band}
        todayKey={todayKey}
        weekStartsOn={weekStartsOn}
        exportCount={rows.length}
        onExport={() => exportCsv(rows)}
        onClear={clearAll}
      />

      <CoverageBar
        range={tab}
        window={frame.range}
        loaded={loaded.length}
        shown={rows.length}
        chunks={chunks}
        onLoadMore={loadMore}
        loading={state.loading}
        capped={frame.capped}
        format={format}
      />

      {state.error ? (
        <div className="px-gutter pt-3">
          <Alert
            tone="danger"
            action={
              <Button variant="secondary" size="sm" onClick={refetch}>
                Retry
              </Button>
            }
          >
            {state.error}
          </Alert>
        </div>
      ) : null}

      <PageBody padded={false}>
        <AppointmentsTable
          rows={rows}
          hidden={hidden}
          cards={band === 'compact'}
          density={density}
          zone={zone.zone}
          format={format}
          sort={toSortState(sort)}
          onSortChange={onSortChange}
          loading={state.loading}
          selectedIds={state.selection}
          onSelectionChange={setSelection}
          onOpen={onOpenBooking}
          onRowContextMenu={(row, event) => {
            event.preventDefault();
            // Right-click inside the selection acts on all of it; outside, on that row alone.
            const ids = state.selection.includes(row.id) ? state.selection : [row.id];
            setMenu({ point: { x: event.clientX, y: event.clientY }, ids });
          }}
          flashing={state.flash}
          empty={
            <EmptyState
              icon={<IconLayoutList />}
              title={copy.title}
              description={copy.description}
              action={
                narrowed ? (
                  <Button variant="secondary" size="sm" onClick={clearAll}>
                    Clear filters
                  </Button>
                ) : more && canLoadMore(tab, chunks) ? (
                  <Button variant="secondary" size="sm" onClick={loadMore}>
                    {more}
                  </Button>
                ) : undefined
              }
            />
          }
        />
      </PageBody>

      <AppointmentsRowMenu
        point={menuTargets.length > 0 ? (menu?.point ?? null) : null}
        onPointChange={() => setMenu(null)}
        targets={menuTargets}
        canEdit={role.canEdit}
        onOpen={onOpenBooking}
        onStatus={(targets, status) => void applyStatus(targets, status)}
        onDelete={(targets) => setDeleteTargets([...targets])}
      />

      <DeleteBookingsDialog
        targets={deleteTargets}
        onCancel={() => (deleting ? undefined : setDeleteTargets([]))}
        onConfirm={() => void confirmDelete()}
        busy={deleting}
      />

      <ActionBar
        count={state.selection.length}
        noun={{ one: 'booking', many: 'bookings' }}
        actions={barActions}
        onClear={clearSelection}
      />

      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
