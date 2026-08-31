import type { BookingsFilter } from '../lib/bookingsFilter';
import type { BookingsParams, NewBookingPrefill } from '../lib/bookingsParams';
import type { WeekStartsOn } from '../lib/calendarRange';
import type { Band, Density } from '../lib/layout';
import type { DisplayZone } from '../types';

/**
 * The contract between `BookingsWorkspace` and a section view. FROZEN: every
 * view takes exactly this, so adding or rewriting one never edits the
 * workspace, and four tracks can build views at once.
 *
 * A view owns its own data (its range store, its own toolbar). It shares the
 * URL model, the filter, the layout band, the display zone and the role — and
 * reports its count and busy state upward so the header shows one number and
 * one spinner. Undo, the live bus, the catalog and the settings come from
 * contexts (`useBookingsUndo`, `useBookingsLive`, `useCatalog`, `useSettings`).
 *
 * Only the active view is mounted.
 */
export interface BookingsViewProps {
  /** The whole parsed URL model; a view reads its own keys. */
  params: BookingsParams;
  /** Patch the URL model (own keys only; the shell owns the rest). */
  onParams: (patch: Partial<BookingsParams>) => void;
  /** Identity-stable slice of `params.filter`. */
  filter: BookingsFilter;
  onFilterChange: (next: BookingsFilter) => void;
  /** Already resolved against the band — a view never re-applies `effectiveDensity`. */
  density: Density;
  onDensityChange: (next: Density) => void;
  band: Band;
  role: { canEdit: boolean; canManage: boolean };
  /** Which wall clock to render; times are SENT in the bot zone regardless (see `lib/zone.ts`). */
  zone: DisplayZone;
  onZoneSourceChange: (source: 'bot' | 'local') => void;
  weekStartsOn: WeekStartsOn;
  /** `YYYY-MM-DD` of today in the display zone (recomputed at midnight). */
  todayKey: string;
  /** Report the view's own total, or null while it does not know one. */
  onCount: (count: number | null) => void;
  /** Report whether a refresh is still in flight, so the header can spin. */
  onBusy: (busy: boolean) => void;
  /** Bumped by the header's refresh button and `r`; a view refetches when it changes. */
  refreshToken: number;
  /** The open booking (`?b=`), or null. */
  openBookingId: string | null;
  onOpenBooking: (id: string | null) => void;
  /** Open the workspace-owned wizard, optionally prefilled (grid drag / duplicate). */
  onNewBooking: (prefill?: Partial<NewBookingPrefill>) => void;
}
