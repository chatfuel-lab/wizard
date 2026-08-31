import { useCallback, useMemo, useState, type RefObject } from 'react';
import { useHotkeys } from '~ui';
import { useCatalog } from '../BookingsCatalogContext';
import { useBookingsUndo } from '../BookingsUndoContext';
import { EMPTY_FILTER, type BookingsFilter } from '../lib/bookingsFilter';
import type { BookingsParams, BookingsView, CalendarMode, NewBookingPrefill } from '../lib/bookingsParams';
import { specialistName } from '../lib/catalogStore';
import type { BookingsCommandContext, BookingsCommandHandlers } from '../lib/commands';
import type { Density } from '../lib/layout';
import { WORKSPACE_BINDINGS, type WorkspaceShortcutId } from '../lib/shortcuts';

export interface BookingsCommandsArgs {
  rootRef: RefObject<HTMLDivElement | null>;
  parsed: BookingsParams;
  filter: BookingsFilter;
  patch: (next: Partial<BookingsParams>) => void;
  setView: (view: BookingsView) => void;
  setMode: (mode: CalendarMode) => void;
  setFilter: (next: BookingsFilter) => void;
  setDensity: (density: Density) => void;
  openWizard: (prefill?: Partial<NewBookingPrefill>) => void;
  goToday: () => void;
  step: (delta: -1 | 1) => void;
  refresh: () => void;
  canEdit: boolean;
  /** Which wall clock the calendar renders in right now. */
  zoneSource: 'bot' | 'local';
  setZoneSource: (source: 'bot' | 'local') => void;
  /** The zone the calendar could switch to, or null when the two agree. */
  otherZone: { label: string; source: 'bot' | 'local' } | null;
}

export interface BookingsCommandsApi {
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
  commandContext: BookingsCommandContext;
  commandHandlers: BookingsCommandHandlers;
}

/**
 * The keyboard and the palette: what the commands can see, what they can do,
 * and the workspace shortcuts that reach the same handlers. Binds `useHotkeys`
 * itself, so mounting this hook IS enabling the module's keyboard.
 */
export function useBookingsCommands({
  rootRef,
  parsed,
  filter,
  patch,
  setView,
  setMode,
  setFilter,
  setDensity,
  openWizard,
  goToday,
  step,
  refresh,
  canEdit,
  zoneSource,
  setZoneSource,
  otherZone,
}: BookingsCommandsArgs): BookingsCommandsApi {
  const undo = useBookingsUndo();
  const catalog = useCatalog();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  /* The appointments search box is a view's own control; the command reaches
   * it through the DOM rather than a prop. `data-bookings-search` is the contract. */
  const focusSearch = useCallback(() => {
    const input = rootRef.current?.querySelector<HTMLInputElement>('[data-bookings-search]');
    input?.focus();
    input?.select();
  }, [rootRef]);

  const commandContext: BookingsCommandContext = useMemo(
    () => ({
      view: parsed.view,
      mode: parsed.mode,
      by: parsed.by,
      color: parsed.color,
      filter,
      density: parsed.density,
      undoLabel: undo.label,
      canEdit,
      specialists: catalog.state.specialists.map((sp) => ({ id: sp.id, name: specialistName(sp.profile) })),
      otherZone,
    }),
    [
      parsed.view,
      parsed.mode,
      parsed.by,
      parsed.color,
      filter,
      parsed.density,
      undo.label,
      canEdit,
      catalog.state.specialists,
      otherZone,
    ],
  );

  const commandHandlers: BookingsCommandHandlers = useMemo(
    () => ({
      setView,
      setMode,
      setBy: (by) => patch({ by, view: 'calendar' }),
      setColor: (color) => patch({ color, view: 'calendar' }),
      setSpecialistFilter: (ids) => setFilter({ ...filter, specialists: ids }),
      setDensity,
      clearFilter: () => setFilter(EMPTY_FILTER),
      focusSearch,
      refresh,
      undo: undo.run,
      today: goToday,
      newBooking: () => openWizard(),
      toggleZone: () => setZoneSource(zoneSource === 'bot' ? 'local' : 'bot'),
      openShortcuts: () => setShortcutsOpen(true),
    }),
    [
      setView,
      setMode,
      patch,
      setFilter,
      filter,
      setDensity,
      focusSearch,
      refresh,
      undo.run,
      goToday,
      openWizard,
      setZoneSource,
      zoneSource,
    ],
  );

  const onShortcut = useCallback(
    (id: WorkspaceShortcutId) => {
      switch (id) {
        case 'palette':
          return setPaletteOpen((open) => !open);
        case 'help':
          return setShortcutsOpen(true);
        case 'search':
          if (parsed.view !== 'appointments') setView('appointments');
          return void requestAnimationFrame(focusSearch);
        case 'undo':
          return undo.run();
        case 'refresh':
          return refresh();
        case 'newBooking':
          return canEdit ? openWizard() : undefined;
        case 'today':
          return goToday();
        case 'prev':
          return step(-1);
        case 'next':
          return step(1);
        case 'modeDay':
          return setMode('day');
        case 'modeWeek':
          return setMode('week');
        case 'modeMonth':
          return setMode('month');
        case 'goCalendar':
          return setView('calendar');
        case 'goAppointments':
          return setView('appointments');
        case 'goStaff':
          return setView('staff');
        case 'goServices':
          return setView('services');
        case 'goSettings':
          return setView('settings');
        case 'goInsights':
          return setView('insights');
      }
    },
    [parsed.view, setView, focusSearch, undo, refresh, canEdit, openWizard, goToday, step, setMode],
  );

  useHotkeys(WORKSPACE_BINDINGS, onShortcut, { rootRef });

  return { paletteOpen, setPaletteOpen, shortcutsOpen, setShortcutsOpen, commandContext, commandHandlers };
}
