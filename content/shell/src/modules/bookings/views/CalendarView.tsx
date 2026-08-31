import { useCallback, useMemo, useRef, type ReactNode } from 'react';
import { ActionBar, Alert, Button, IconPlus, monthKeyOf, timeRangeLabel } from '~ui';
import { useCatalog } from '../BookingsCatalogContext';
import { DeleteBookingsDialog } from '../components/DeleteBookingsDialog';
import { AgendaSurface } from '../components/calendar/AgendaSurface';
import { CalendarAlerts } from '../components/calendar/CalendarAlerts';
import { CalendarSkeleton } from '../components/calendar/CalendarSkeleton';
import { CalendarToolbar } from '../components/calendar/CalendarToolbar';
import { EventBlock } from '../components/calendar/EventBlock';
import { MonthSurface } from '../components/calendar/MonthSurface';
import { TimeGridSurface } from '../components/calendar/TimeGridSurface';
import {
  bookingMenuItems,
  calendarBulkActions,
  type BookingMenuContext,
} from '../components/calendar/bookingMenuItems';
import { useCalendarActions } from '../hooks/useCalendarActions';
import { useCalendarGrid } from '../hooks/useCalendarGrid';
import { useCalendarKeyboard } from '../hooks/useCalendarKeyboard';
import { isFilterEmpty } from '../lib/bookingsFilter';
import type { CalendarMode } from '../lib/bookingsParams';
import { fallbackFocusables, type FocusableEvent } from '../lib/calendarFocus';
import { blockLook, calendarEmptyCopy, rangeLabel } from '../lib/calendarLayout';
import { stepAnchor } from '../lib/calendarRange';
import { duplicatePrefill } from '../lib/gridSpan';
import { selectSelected } from '../lib/rangeStore';
import { wallClock } from '../lib/zone';
import type { BookingRecord } from '../types';
import type { BookingsViewProps } from './types';

const NOUN = { one: 'booking', many: 'bookings' };

/**
 * The calendar section: day / week / month over `bookingsV2`, with the
 * FullCalendar interaction model on `~ui`'s grids — drag to move, drag an
 * edge to resize, drag on empty grid to create, drop a month chip on another
 * day — every write optimistic through `useRangeMutations` (rollback + flash
 * on failure, one undo on success).
 *
 * What is decided here and nowhere else: which surface renders — the
 * `TimeGridSurface`, `MonthSurface` or (in the compact band) `AgendaSurface`
 * under `components/calendar/` — and the contract every surface shares: how a
 * booking looks (`renderBlock` over `blockLook`), what a click means
 * (`onBlockClick`), its context menu (`bookingMenuItems`) and the keyboard
 * over whichever surface is up. What every gesture DOES lives in
 * `hooks/useCalendarActions.ts`; the geometry in `hooks/useCalendarGrid.ts`.
 * The URL owns mode / date / by / colour / filter; the store owns the
 * selection and the flash.
 */
export function CalendarView({
  params,
  onParams,
  filter,
  onFilterChange,
  density,
  band,
  role,
  zone,
  onZoneSourceChange,
  weekStartsOn,
  todayKey,
  onCount,
  onBusy,
  refreshToken,
  openBookingId,
  onOpenBooking,
  onNewBooking,
}: BookingsViewProps) {
  const catalog = useCatalog();
  const anchor = params.date ?? todayKey;
  const canEdit = role.canEdit;
  const grid = useCalendarGrid({
    band,
    requestedMode: params.mode,
    by: params.by,
    anchor,
    weekStartsOn,
    filter,
    zone,
    refreshToken,
    onCount,
    onBusy,
  });
  const { store, mode, bySpecialist, layout, filtered, records, catalogOrder, hour12 } = grid;
  const { state, dispatch, refetch } = store;
  const containerRef = useRef<HTMLDivElement>(null);

  const actions = useCalendarActions({
    containerRef,
    state,
    dispatch,
    layout,
    zone,
    catalog: grid.catalog,
    records,
    filtered,
    hour12,
  });
  // Destructured because the `actions` object is fresh each render; the callbacks are the stable identities.
  const { setStatus, requestDelete, reassign, toggleSelect, clearSelection, clearFlash } = actions;

  // ---------------------------------------------------------------------
  // Navigation (URL patches)
  // ---------------------------------------------------------------------
  const setAnchor = useCallback(
    (day: string) => onParams({ date: day === todayKey ? null : day }),
    [onParams, todayKey],
  );
  const setMode = useCallback((next: CalendarMode) => onParams({ mode: next }), [onParams]);
  const openDay = useCallback(
    (day: string) => onParams({ mode: 'day', date: day === todayKey ? null : day }),
    [onParams, todayKey],
  );
  const step = useCallback((delta: -1 | 1) => setAnchor(stepAnchor(mode, anchor, delta)), [setAnchor, mode, anchor]);

  // ---------------------------------------------------------------------
  // Keyboard over whichever surface is on screen
  // ---------------------------------------------------------------------
  const monthKey = monthKeyOf(anchor);
  const focusables = useMemo<{ events: FocusableEvent[]; columnOrder: string[] }>(() => {
    if (layout) return { events: layout.events, columnOrder: layout.columns.map((c) => c.id) };
    return fallbackFocusables(filtered, zone.zone, mode, monthKey, weekStartsOn, anchor);
  }, [layout, filtered, zone.zone, mode, monthKey, weekStartsOn, anchor]);

  const keyboard = useCalendarKeyboard(containerRef, {
    events: focusables.events,
    columnOrder: focusables.columnOrder,
    flow: band === 'compact' ? 'list' : 'grid',
    canEdit,
    selection: state.selection,
    signature: actions.signature,
    onOpen: onOpenBooking,
    onToggleSelect: toggleSelect,
    onSelectAll: actions.selectAll,
    onClearSelection: clearSelection,
    onStatus: (ids, status) => void setStatus(ids, status),
    onNudge: actions.onNudge,
    onResizeNudge: actions.onResizeNudge,
    onDelete: requestDelete,
  });

  // ---------------------------------------------------------------------
  // The cross-surface contract: menus and blocks
  // ---------------------------------------------------------------------
  const menuCtx = useMemo<BookingMenuContext>(
    () => ({
      canEdit,
      selection: state.selection,
      specialists: grid.catalog,
      onOpen: onOpenBooking,
      onToggleSelect: toggleSelect,
      onStatus: (ids, status) => void setStatus(ids, status),
      onReassign: reassign,
      onDuplicate: (record) => onNewBooking(duplicatePrefill(record)),
      onDelete: requestDelete,
    }),
    [
      canEdit,
      state.selection,
      grid.catalog,
      onOpenBooking,
      toggleSelect,
      setStatus,
      reassign,
      onNewBooking,
      requestDelete,
    ],
  );

  const selectedSet = useMemo(() => new Set(state.selection), [state.selection]);
  const timeLabelOf = useCallback(
    (record: BookingRecord) => {
      const s = wallClock(new Date(record.startTime).getTime(), zone.zone);
      const e = wallClock(new Date(record.endTime).getTime(), zone.zone);
      return timeRangeLabel(s.minuteOfDay, s.dayKey === e.dayKey ? e.minuteOfDay : e.minuteOfDay + 1440, { hour12 });
    },
    [zone.zone, hour12],
  );

  const renderBlock = useCallback(
    (record: BookingRecord, variant: 'block' | 'chip' | 'row', heightPx?: number, label?: string) => (
      <EventBlock
        record={record}
        variant={variant}
        look={blockLook(record, params.color, catalogOrder)}
        timeLabel={label ?? timeLabelOf(record)}
        heightPx={heightPx}
        selected={selectedSet.has(record.id) || record.id === openBookingId}
        flashAt={state.flash[record.id]}
        onFlashDone={clearFlash}
        menuItems={bookingMenuItems(record, menuCtx)}
      />
    ),
    [params.color, catalogOrder, timeLabelOf, selectedSet, openBookingId, state.flash, clearFlash, menuCtx],
  );

  /** Click opens; ⌘/Ctrl/Shift-click toggles selection (when editable). The open booking wears the selected ring too, so the panel's subject is visible on the grid. */
  const onBlockClick = useCallback(
    (record: BookingRecord, dom: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }) => {
      if (canEdit && (dom.metaKey || dom.ctrlKey || dom.shiftKey)) toggleSelect(record.id);
      else onOpenBooking(record.id);
    },
    [canEdit, toggleSelect, onOpenBooking],
  );

  // ---------------------------------------------------------------------
  // States
  // ---------------------------------------------------------------------
  const catalogEmpty =
    catalog.state.loadedAt !== null && (catalog.state.services.length === 0 || catalog.state.specialists.length === 0);
  const loaded = state.loaded !== null;
  const empty = loaded && !state.loading && filtered.length === 0;
  const { title: emptyTitle } = calendarEmptyCopy(mode, records.length > 0, isFilterEmpty(filter));
  const emptyAction =
    records.length > 0 && !isFilterEmpty(filter) ? (
      <Button
        variant="outline"
        size="sm"
        onClick={() => onFilterChange({ specialists: [], services: [], statuses: [] })}
      >
        Clear filters
      </Button>
    ) : canEdit ? (
      <Button variant="primary" size="sm" onClick={() => onNewBooking()}>
        <IconPlus />
        New booking
      </Button>
    ) : undefined;

  const gridDensity = density === 'compact' ? 'compact' : 'cozy';
  const ariaLabel = `${mode === 'day' ? 'Day' : mode === 'week' ? 'Week' : 'Month'}: ${rangeLabel(mode, grid.range, anchor)}`;

  let surface: ReactNode;
  if (grid.initial) {
    surface = (
      <CalendarSkeleton
        columns={mode === 'week' ? 7 : bySpecialist ? Math.max(1, grid.catalog.length) : 1}
        month={mode === 'month'}
      />
    );
  } else if (state.error && !loaded) {
    surface = (
      <div className="p-gutter">
        <Alert
          tone="danger"
          title="The calendar could not load"
          action={
            <Button variant="outline" size="sm" onClick={refetch}>
              Retry
            </Button>
          }
        >
          {state.error}
        </Alert>
      </div>
    );
  } else if (band === 'compact') {
    surface = (
      <AgendaSurface
        filtered={filtered}
        zone={zone.zone}
        todayKey={todayKey}
        selectedSet={selectedSet}
        emptyTitle={emptyTitle}
        emptyAction={emptyAction}
        timeLabelOf={timeLabelOf}
        renderBlock={renderBlock}
        onBlockClick={onBlockClick}
        aria-label={ariaLabel}
      />
    );
  } else if (mode === 'month') {
    surface = (
      <MonthSurface
        actions={actions}
        empty={empty}
        emptyTitle={emptyTitle}
        emptyAction={emptyAction}
        canEdit={canEdit}
        monthKey={monthKey}
        weekStartsOn={weekStartsOn}
        filtered={filtered}
        zone={zone.zone}
        density={density}
        todayKey={todayKey}
        selectedDayKey={params.date}
        hour12={hour12}
        openDay={openDay}
        renderBlock={renderBlock}
        onBlockClick={onBlockClick}
        aria-label={ariaLabel}
      />
    );
  } else if (layout) {
    surface = (
      <TimeGridSurface
        actions={actions}
        layout={layout}
        empty={empty}
        emptyTitle={emptyTitle}
        emptyAction={emptyAction}
        hasRecords={records.length > 0}
        canEdit={canEdit}
        mode={mode}
        bySpecialist={bySpecialist}
        gridDensity={gridDensity}
        zone={zone}
        hour12={hour12}
        now={grid.now}
        todayKey={todayKey}
        catalogOrder={catalogOrder}
        color={params.color}
        openDay={openDay}
        onNewBooking={onNewBooking}
        timeLabelOf={timeLabelOf}
        renderBlock={renderBlock}
        onBlockClick={onBlockClick}
        aria-label={ariaLabel}
      />
    );
  }

  const selected = useMemo(() => selectSelected(state), [state]);
  const bulkActions = useMemo(
    () =>
      calendarBulkActions({
        selection: state.selection,
        onStatus: (ids, status) => void setStatus(ids, status),
        onDelete: requestDelete,
      }),
    [state.selection, setStatus, requestDelete],
  );

  return (
    <>
      <CalendarToolbar
        band={band}
        requestedMode={params.mode}
        mode={mode}
        onMode={setMode}
        range={grid.range}
        anchor={anchor}
        todayKey={todayKey}
        weekStartsOn={weekStartsOn}
        onAnchor={setAnchor}
        onStep={step}
        onToday={() => onParams({ date: null })}
        by={params.by}
        onBy={(by) => onParams({ by })}
        color={params.color}
        onColor={(color) => onParams({ color })}
        filter={filter}
        onFilterChange={onFilterChange}
        specialists={grid.catalog}
        services={catalog.state.services}
        zone={zone}
        nowMs={grid.nowMs}
        onZoneSourceChange={onZoneSourceChange}
        canEdit={canEdit}
        onNew={() => onNewBooking()}
        selectedCount={state.selection.length}
        onClearSelection={clearSelection}
      />
      <CalendarAlerts
        catalogEmpty={catalogEmpty}
        refreshError={state.error && loaded ? state.error : null}
        onParams={onParams}
        onDismissError={() => dispatch({ type: 'errorCleared' })}
        onRetry={refetch}
      />
      <div
        ref={containerRef}
        onKeyDown={keyboard.onKeyDown}
        onFocusCapture={keyboard.onFocusCapture}
        className="relative flex min-h-0 flex-1 flex-col"
      >
        {surface}
      </div>
      {canEdit ? (
        <ActionBar count={selected.length} noun={NOUN} actions={bulkActions} onClear={clearSelection} />
      ) : null}
      <DeleteBookingsDialog
        targets={actions.pendingDelete}
        busy={actions.deleting}
        onConfirm={() => void actions.confirmDelete()}
        onCancel={actions.cancelDelete}
      />
      <div aria-live="polite" aria-atomic className="sr-only">
        {actions.announcement}
      </div>
    </>
  );
}
