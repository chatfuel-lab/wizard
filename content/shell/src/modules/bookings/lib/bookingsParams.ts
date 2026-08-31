/**
 * The module's deep links, parsed and serialized in one pure place.
 *
 * The view is a path segment — '/bookings/staff' — and everything else is a
 * query parameter. The default view has no segment of its own: '/bookings' IS
 * the calendar. A '?view=' from an older link is still read, once, and dropped
 * on the next write.
 *
 * Two rules the whole file exists to hold (deals' rules, verbatim):
 *
 * 1. **An unknown value falls back silently.** A hand-edited or stale URL must
 *    never white-screen and must never throw — it renders the default.
 * 2. **A default is omitted from the written params.** Otherwise every mount
 *    would rewrite the URL with the full schema and a shared link would carry
 *    a dozen noise parameters.
 *
 * `?week=YYYY-MM-DD` (an earlier link of this module) is still read — as
 * `mode=week&date=` — and never written back; `?b=<id>` survives unchanged.
 * `?new=1&start=&end=&contact=&ns=<specialistID>&nsvc=<serviceID>` opens the wizard
 * prefilled (the shared `specialist=`/`service=` filter keys are the fallback),
 * which is what a "Book an appointment" button in Live Chat will link to.
 */
import type { BookingStatus } from '~api/generated/bookings/graphql';
import { EMPTY_FILTER, parseFilter, type BookingsFilter } from './bookingsFilter';
import { parseDayKey } from './zone';

export type BookingsView = 'calendar' | 'appointments' | 'staff' | 'services' | 'settings' | 'insights';
export const VIEWS: readonly BookingsView[] = ['calendar', 'appointments', 'staff', 'services', 'settings', 'insights'];
export const DEFAULT_VIEW: BookingsView = 'calendar';

export type CalendarMode = 'day' | 'week' | 'month';
export const MODES: readonly CalendarMode[] = ['day', 'week', 'month'];
export const DEFAULT_MODE: CalendarMode = 'week';

export type CalendarBy = 'time' | 'specialist';
export type CalendarColor = 'specialist' | 'status';
export type AppointmentsRange = 'upcoming' | 'past' | 'custom';
export type InsightsPeriod = 'week' | 'month' | '30d' | '90d' | 'custom';
export const INSIGHTS_PERIODS: readonly InsightsPeriod[] = ['week', 'month', '30d', '90d', 'custom'];

export type AppointmentsSortKey = 'start' | 'customer' | 'service' | 'specialist' | 'status' | 'duration' | 'price';
export const SORT_KEYS: readonly AppointmentsSortKey[] = [
  'start',
  'customer',
  'service',
  'specialist',
  'status',
  'duration',
  'price',
];
export interface AppointmentsSort {
  key: AppointmentsSortKey;
  direction: 'asc' | 'desc';
}

export type Density = 'compact' | 'comfortable';

export const DENSITIES: readonly Density[] = ['comfortable', 'compact'];

export const DEFAULT_DENSITY: Density = 'comfortable';

/** What `?new=1` carries into the wizard. Everything optional; times are RFC3339. */
export interface NewBookingPrefill {
  start: string | null;
  end: string | null;
  contact: string | null;
  specialist: string | null;
  service: string | null;
}

export interface BookingsParams {
  view: BookingsView;
  /** Calendar */
  mode: CalendarMode;
  /** Anchor day, `YYYY-MM-DD`, or null for "today" (the writer never stores today). */
  date: string | null;
  by: CalendarBy;
  color: CalendarColor;
  /** Shared by calendar, appointments and insights. */
  filter: BookingsFilter;
  /** Appointments */
  q: string;
  range: AppointmentsRange;
  from: string | null;
  to: string | null;
  sort: AppointmentsSort | null;
  /** Insights */
  period: InsightsPeriod;
  density: Density;
  /** Staff detail: a specialist id, `'new'`, or null. */
  s: string | null;
  /** The open booking, or null. */
  b: string | null;
  /** The wizard, prefilled, or null when closed. */
  new: NewBookingPrefill | null;
}

export const DEFAULT_PARAMS: BookingsParams = {
  view: DEFAULT_VIEW,
  mode: DEFAULT_MODE,
  date: null,
  by: 'time',
  color: 'specialist',
  filter: EMPTY_FILTER,
  q: '',
  range: 'upcoming',
  from: null,
  to: null,
  sort: null,
  period: '30d',
  density: DEFAULT_DENSITY,
  s: null,
  b: null,
  new: null,
};

const oneOf = <T extends string>(raw: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.includes(raw as T) ? (raw as T) : fallback;

const dayKeyOrNull = (raw: string | null): string | null => (parseDayKey(raw) ? raw : null);
const nonEmpty = (raw: string | null): string | null => (raw === null || raw === '' ? null : raw);

/** RFC3339-ish or null — the wizard re-validates; here it only has to be a parseable instant. */
function instantOrNull(raw: string | null): string | null {
  if (!raw) return null;
  return Number.isNaN(new Date(raw).getTime()) ? null : raw;
}

export function parseSort(raw: string | null): AppointmentsSort | null {
  if (!raw) return null;
  const at = raw.lastIndexOf(':');
  if (at <= 0) return null;
  const key = raw.slice(0, at).trim();
  const direction = raw
    .slice(at + 1)
    .trim()
    .toLowerCase();
  if (!SORT_KEYS.includes(key as AppointmentsSortKey)) return null;
  if (direction !== 'asc' && direction !== 'desc') return null;
  return { key: key as AppointmentsSortKey, direction };
}

/** The path segment for a view — the default view has none. */
export const viewSegment = (view: BookingsView): string => (view === DEFAULT_VIEW ? '' : view);

export function parseBookingsParams(params: URLSearchParams, view = ''): BookingsParams {
  const filter = parseFilter(params);
  const legacyWeek = dayKeyOrNull(params.get('week'));
  const date = dayKeyOrNull(params.get('date')) ?? legacyWeek;
  const mode = params.has('mode') || legacyWeek === null ? oneOf(params.get('mode'), MODES, DEFAULT_MODE) : 'week';

  const wantsNew = params.get('new') === '1';
  const prefill: NewBookingPrefill | null = wantsNew
    ? {
        start: instantOrNull(params.get('start')),
        end: instantOrNull(params.get('end')),
        contact: nonEmpty(params.get('contact')),
        // The wizard's own picks ride under their own keys; the shared filter is
        // only a fallback (a calendar filtered to Alex opens the wizard on Alex).
        specialist: nonEmpty(params.get('ns')) ?? filter.specialists[0] ?? null,
        service: nonEmpty(params.get('nsvc')) ?? filter.services[0] ?? null,
      }
    : null;

  return {
    view: oneOf(view === '' ? params.get('view') : view, VIEWS, DEFAULT_VIEW),
    mode,
    date,
    by: oneOf(params.get('by'), ['time', 'specialist'] as const, 'time'),
    color: oneOf(params.get('color'), ['specialist', 'status'] as const, 'specialist'),
    filter,
    q: params.get('q') ?? '',
    range: oneOf(params.get('range'), ['upcoming', 'past', 'custom'] as const, 'upcoming'),
    from: dayKeyOrNull(params.get('from')),
    to: dayKeyOrNull(params.get('to')),
    sort: parseSort(params.get('sort')),
    period: oneOf(params.get('period'), INSIGHTS_PERIODS, '30d'),
    density: oneOf(params.get('density'), DENSITIES, DEFAULT_DENSITY),
    s: nonEmpty(params.get('s')),
    b: nonEmpty(params.get('b')),
    new: prefill,
  };
}

/**
 * Rewrites only this module's keys and leaves anything else in `params`
 * untouched — the shell owns the rest of the query string.
 */
export function writeBookingsParams(params: URLSearchParams, next: BookingsParams): URLSearchParams {
  const out = new URLSearchParams(params);
  const set = (key: string, value: string | null) => {
    if (value === null || value === '') out.delete(key);
    else out.set(key, value);
  };
  const list = (values: readonly string[]) => (values.length === 0 ? null : values.join(','));

  out.delete('week'); // legacy, read-only
  set('view', null); // the view lives in the path; a stale key is read in and dropped here
  set('mode', next.mode === DEFAULT_MODE ? null : next.mode);
  set('date', next.date);
  set('by', next.by === 'time' ? null : next.by);
  set('color', next.color === 'specialist' ? null : next.color);
  set('specialist', list(next.filter.specialists));
  set('service', list(next.filter.services));
  set('status', list(next.filter.statuses as readonly BookingStatus[]));
  set('q', next.q.trim() === '' ? null : next.q);
  set('range', next.range === 'upcoming' ? null : next.range);
  // `from`/`to` serve both custom ranges (appointments) and the custom period (insights).
  const custom = next.range === 'custom' || next.period === 'custom';
  set('from', custom ? next.from : null);
  set('to', custom ? next.to : null);
  set('sort', next.sort === null ? null : `${next.sort.key}:${next.sort.direction}`);
  set('period', next.period === '30d' ? null : next.period);
  set('density', next.density === DEFAULT_DENSITY ? null : next.density);
  set('s', next.s);
  set('b', next.b);
  if (next.new) {
    set('new', '1');
    set('start', next.new.start);
    set('end', next.new.end);
    set('contact', next.new.contact);
    // Only written when they differ from the shared filter's first pick, so a
    // wizard opened from a filtered calendar carries no redundant keys.
    set(
      'ns',
      next.new.specialist && next.new.specialist !== (next.filter.specialists[0] ?? null) ? next.new.specialist : null,
    );
    set('nsvc', next.new.service && next.new.service !== (next.filter.services[0] ?? null) ? next.new.service : null);
  } else {
    for (const key of ['new', 'start', 'end', 'contact', 'ns', 'nsvc']) out.delete(key);
  }
  return out;
}
