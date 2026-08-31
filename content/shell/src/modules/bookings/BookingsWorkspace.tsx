import { useCallback, useEffect, useState, type ReactElement, type RefObject } from 'react';
import { InspectorHost, ShortcutsDialog, useBand } from '~ui';
import type { ModuleAppProps } from '../types';
import { usePublishScreenContext } from '../shellApi';
import { useBookingsLive } from './BookingsLiveContext';
import { useDisplayZone } from './hooks/useDisplayZone';
import { BookingsCommandPalette } from './components/BookingsCommandPalette';
import { BookingsHeader } from './components/BookingsHeader';
import { BookingPanel } from './components/panel/BookingPanel';
import { NewBookingWizard } from './components/wizard/NewBookingWizard';
import { useBookingsCommands } from './hooks/useBookingsCommands';
import { useBookingsUrl } from './hooks/useBookingsUrl';
import { useMyRole } from './hooks/useMyRole';
import { usePrefs } from './hooks/usePrefs';
import type { BookingsView } from './lib/bookingsParams';
import { weekStartsOnFor } from './lib/calendarRange';
import { effectiveDensity } from './lib/layout';
import { SHORTCUT_ROWS, SHORTCUT_SECTIONS } from './lib/shortcuts';
import { AppointmentsView } from './views/AppointmentsView';
import { CalendarView } from './views/CalendarView';
import { InsightsView } from './views/InsightsView';
import { ServicesView } from './views/ServicesView';
import { SettingsView } from './views/SettingsView';
import { StaffView } from './views/StaffView';
import type { BookingsViewProps } from './views/types';

const VIEW_COMPONENTS: Record<BookingsView, (props: BookingsViewProps) => ReactElement> = {
  calendar: CalendarView,
  appointments: AppointmentsView,
  staff: StaffView,
  services: ServicesView,
  settings: SettingsView,
  insights: InsightsView,
};

type WorkspaceProps = Pick<ModuleAppProps, 'params' | 'view'> & { setLocation: ModuleAppProps['setView'] } & {
  /** The module root, forwarded from `ModuleRoot`: what `useHotkeys` scopes focus against. */
  rootRef: RefObject<HTMLDivElement | null>;
};

/** How long the header dot pulses after a live event. */
const LIVE_PULSE_MS = 2500;

/**
 * Below the providers: the URL (`useBookingsUrl`), the band, the display zone,
 * the keyboard (`useBookingsCommands`), the open booking, the wizard, and the
 * section switch. Each section owns its own data; only the active one is
 * mounted.
 */
export function BookingsWorkspace({ rootRef, params, view: viewSeg, setLocation }: WorkspaceProps) {
  const band = useBand();
  const role = useMyRole();
  const live = useBookingsLive();
  const prefs = usePrefs();

  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  // The display zone: bot's by default, the operator's on request; today's key in it.
  const { zone, todayKey, otherZone, setZoneSource, now } = useDisplayZone(prefs);
  const weekStartsOn = prefs.prefs.weekStartsOn ?? weekStartsOnFor();

  const {
    parsed,
    filterKey,
    filter,
    patch,
    setView,
    setFilter,
    setDensity,
    setMode,
    setOpenBooking,
    openWizard,
    closeWizard,
    goToday,
    step,
  } = useBookingsUrl({ params, viewSeg, setLocation, todayKey });

  /* What the Coworker sees when it asks what is on screen. Write-only into a
     sink the shell owns; a no-op when this module runs as an embed. */
  usePublishScreenContext({
    module: 'Bookings',
    view: parsed.view,
    calendarMode: parsed.mode,
    day: parsed.date,
    search: parsed.q || null,
    filter: filterKey,
    openBooking: parsed.b,
  });

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

  /* The live dot: a pulse per event, not a permanent light. */
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (live.tick === 0) return;
    setPulse(true);
    const timer = window.setTimeout(() => setPulse(false), LIVE_PULSE_MS);
    return () => window.clearTimeout(timer);
  }, [live.tick]);

  const { paletteOpen, setPaletteOpen, shortcutsOpen, setShortcutsOpen, commandContext, commandHandlers } =
    useBookingsCommands({
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
      canEdit: role.canEdit,
      zoneSource: zone.source,
      setZoneSource,
      otherZone,
    });

  const View = VIEW_COMPONENTS[parsed.view];

  return (
    <>
      <BookingsHeader
        view={parsed.view}
        onView={setView}
        count={count}
        live={pulse}
        onRefresh={refresh}
        refreshing={busy}
        canEdit={role.canEdit}
        onNewBooking={() => openWizard()}
        onOpenPalette={() => setPaletteOpen(true)}
      />
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <View
            params={parsed}
            onParams={patch}
            filter={filter}
            onFilterChange={setFilter}
            density={effectiveDensity(band, parsed.density)}
            onDensityChange={setDensity}
            band={band}
            role={{ canEdit: role.canEdit, canManage: role.canManage }}
            zone={zone}
            onZoneSourceChange={setZoneSource}
            weekStartsOn={weekStartsOn}
            todayKey={todayKey}
            onCount={setCount}
            onBusy={setBusy}
            refreshToken={refreshToken}
            openBookingId={parsed.b}
            onOpenBooking={setOpenBooking}
            onNewBooking={openWizard}
          />
        </div>
        <InspectorHost open={parsed.b !== null} onClose={() => setOpenBooking(null)} title="Booking">
          {parsed.b === null ? null : (
            <BookingPanel
              bookingId={parsed.b}
              onClose={() => setOpenBooking(null)}
              onNewBooking={openWizard}
              canEdit={role.canEdit}
              zone={zone}
              todayKey={todayKey}
              weekStartsOn={weekStartsOn}
              now={now}
            />
          )}
        </InspectorHost>
      </div>

      <NewBookingWizard
        open={parsed.new !== null}
        prefill={parsed.new}
        onClose={closeWizard}
        onCreated={(booking) => patch({ new: null, b: booking.id })}
        band={band}
        zone={zone}
        todayKey={todayKey}
        weekStartsOn={weekStartsOn}
        canEdit={role.canEdit}
      />
      <BookingsCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        context={commandContext}
        handlers={commandHandlers}
      />
      <ShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        sections={SHORTCUT_SECTIONS}
        rows={SHORTCUT_ROWS}
      />
    </>
  );
}
