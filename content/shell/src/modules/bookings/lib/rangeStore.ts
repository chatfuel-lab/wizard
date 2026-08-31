/**
 * The bookings of one time window as a pure reducer — three instances of it
 * run at once (calendar, appointments, insights), each keyed on its own
 * `vars`, all fed by the same live channel.
 *
 * Shape and rules, deliberately those of `deals/lib/dealsStore.ts`:
 *
 * 1. **`byId` is the one place a record exists.** Views derive order with
 *    selectors; a record can never be in two states at once.
 * 2. **`pending` holds a per-booking inverse.** An optimistic edit (drag,
 *    resize, reassign, status) stores the record it replaced; a failure rolls
 *    back exactly that booking and flashes it, leaving concurrent successes and
 *    interleaved live events alone. `editFailed` needs only the id, which is
 *    what keeps rollback right under StrictMode's double invocation.
 * 3. **`epoch` lives in state.** Every request-shaped action carries the epoch
 *    it was issued under and is dropped if it moved on; a `reset` bumps it and
 *    IS the request (the data hook loads on the epoch).
 * 4. **`live` is guarded by `loading`, not by the epoch.** Epoch-gating it
 *    would force the subscription effect to depend on the epoch, and the socket
 *    would tear down on every reconnect-driven refetch. A live event dropped
 *    while a full load is in flight is lost for nothing: the load is the truth.
 *
 * One rule of its own: **`rangeLoaded` replaces everything cached inside the
 * loaded window.** `bookingsV2` returns the whole window, so a booking the
 * cache still holds there but the response no longer does was deleted while
 * we were not looking — it must go, or a stale block lingers on the grid.
 * Outside the window the cache is kept: it costs nothing and lets a view that
 * navigates back paint before its own load lands.
 */
import type { BookingRecord } from '../types';
import { overlapsInstants, type RangeVars } from './calendarRange';

export type { RangeVars };

export interface PendingEdit {
  /** The record as it was before the optimistic edit. */
  prev: BookingRecord;
  /** The record as the edit wants it. Re-applied over a load that lands mid-flight. */
  next: BookingRecord;
}

export type LiveEvent =
  | { kind: 'upsert'; booking: BookingRecord; origin: 'live' | 'own' }
  | { kind: 'remove'; id: string; origin: 'live' | 'own' };

export interface RangeState {
  /** The window this instance is asked for; null before the first `reset`. */
  vars: RangeVars | null;
  byId: Record<string, BookingRecord>;
  pending: Record<string, PendingEdit>;
  selection: string[];
  /** id → the `now` a rollback happened, so exactly that booking flashes. */
  flash: Record<string, number>;
  epoch: number;
  loading: boolean;
  error: string | null;
  /** The window the last successful load actually covered — what "showing" lines print. */
  loaded: RangeVars | null;
}

export type RangeAction =
  | { type: 'reset'; vars: RangeVars }
  | { type: 'rangeLoaded'; epoch: number; vars: RangeVars; bookings: readonly BookingRecord[] }
  | { type: 'failed'; epoch: number; message: string }
  | { type: 'live'; event: LiveEvent }
  | { type: 'editStarted'; id: string; next: BookingRecord }
  | { type: 'editSucceeded'; id: string; booking: BookingRecord }
  | { type: 'editFailed'; id: string; now: number }
  | { type: 'flashCleared'; id: string }
  | { type: 'selectionToggled'; id: string }
  | { type: 'selectionSet'; ids: readonly string[] }
  | { type: 'selectionPruned'; visible: readonly string[] }
  | { type: 'selectionCleared' }
  | { type: 'errorCleared' };

export const FLASH_MS = 600;

export function initialRangeState(vars: RangeVars | null = null): RangeState {
  return {
    vars,
    byId: {},
    pending: {},
    selection: [],
    flash: {},
    epoch: 0,
    loading: false,
    error: null,
    loaded: null,
  };
}

const startMs = (b: BookingRecord) => new Date(b.startTime).getTime();
const endMs = (b: BookingRecord) => new Date(b.endTime).getTime();

function inWindow(b: BookingRecord, vars: RangeVars): boolean {
  return overlapsInstants(startMs(b), endMs(b), new Date(vars.startTime).getTime(), new Date(vars.endTime).getTime());
}

/** The fields an optimistic edit owns; a live echo may still carry the pre-edit values. */
function keepOptimistic(incoming: BookingRecord, optimistic: BookingRecord): BookingRecord {
  return {
    ...incoming,
    startTime: optimistic.startTime,
    endTime: optimistic.endTime,
    status: optimistic.status,
    service: optimistic.service,
    specialist: optimistic.specialist,
  } as BookingRecord;
}

function withoutId<T>(map: Record<string, T>, id: string): Record<string, T> {
  if (!(id in map)) return map;
  const { [id]: _dropped, ...rest } = map;
  return rest;
}

export function rangeReducer(state: RangeState, action: RangeAction): RangeState {
  switch (action.type) {
    case 'reset':
      return {
        ...state,
        vars: action.vars,
        epoch: state.epoch + 1,
        loading: true,
        error: null,
        selection: [],
        flash: {},
      };

    case 'rangeLoaded': {
      if (action.epoch !== state.epoch) return state;
      const byId: Record<string, BookingRecord> = {};
      // Keep what lies outside the loaded window; drop what lies inside and did not come back.
      for (const [id, record] of Object.entries(state.byId)) {
        if (!inWindow(record, action.vars) || id in state.pending) byId[id] = record;
      }
      for (const booking of action.bookings) {
        const pending = state.pending[booking.id];
        byId[booking.id] = pending ? keepOptimistic(booking, pending.next) : booking;
      }
      const selection = state.selection.filter((id) => id in byId);
      return { ...state, byId, selection, loading: false, error: null, loaded: action.vars };
    }

    case 'failed':
      if (action.epoch !== state.epoch) return state;
      return { ...state, loading: false, error: action.message };

    case 'live': {
      if (state.loading) return state;
      const event = action.event;
      if (event.kind === 'remove') {
        if (!(event.id in state.byId) && !(event.id in state.pending)) return state;
        return {
          ...state,
          byId: withoutId(state.byId, event.id),
          pending: withoutId(state.pending, event.id),
          flash: withoutId(state.flash, event.id),
          selection: state.selection.filter((id) => id !== event.id),
        };
      }
      const pending = state.pending[event.booking.id];
      const next = pending ? keepOptimistic(event.booking, pending.next) : event.booking;
      return { ...state, byId: { ...state.byId, [event.booking.id]: next } };
    }

    case 'editStarted': {
      const prev = state.byId[action.id];
      if (!prev) return state;
      // A second edit on a booking still in flight keeps the FIRST prev: that
      // is the last state the server confirmed.
      const pending = state.pending[action.id] ?? { prev, next: action.next };
      return {
        ...state,
        byId: { ...state.byId, [action.id]: action.next },
        pending: { ...state.pending, [action.id]: { prev: pending.prev, next: action.next } },
      };
    }

    case 'editSucceeded':
      // A live `remove` may have landed while the mutation was in flight — it
      // drops the record from `byId` AND from `pending`. Writing the server's
      // answer back in would resurrect a booking that no longer exists, and
      // without a `pending` entry nothing short of a full reload would clear it.
      if (!(action.id in state.byId) && !(action.id in state.pending)) return state;
      return {
        ...state,
        byId: { ...state.byId, [action.id]: action.booking },
        pending: withoutId(state.pending, action.id),
      };

    case 'editFailed': {
      // `prev` is what the server last confirmed BEFORE this edit, so the
      // rollback is a rollback of the edit and of anything that landed under
      // it: a live update from another operator arriving while the mutation
      // was in flight is written over here. Deliberate, and the narrow case —
      // two people editing the same booking inside one round trip — because
      // the alternative is leaving a booking on screen in a state the server
      // refused. The next `rangeLoaded` or live event corrects it.
      const pending = state.pending[action.id];
      if (!pending) return state;
      return {
        ...state,
        byId: { ...state.byId, [action.id]: pending.prev },
        pending: withoutId(state.pending, action.id),
        flash: { ...state.flash, [action.id]: action.now },
      };
    }

    case 'flashCleared':
      return action.id in state.flash ? { ...state, flash: withoutId(state.flash, action.id) } : state;

    case 'selectionToggled':
      return {
        ...state,
        selection: state.selection.includes(action.id)
          ? state.selection.filter((id) => id !== action.id)
          : [...state.selection, action.id],
      };

    case 'selectionSet': {
      const ids = action.ids.filter((id) => id in state.byId);
      return { ...state, selection: Array.from(new Set(ids)) };
    }

    /* A selection the view can no longer show (a filter or a search hid the
     * row) is pruned to what is visible. Same state object when nothing is
     * pruned, so a view may dispatch this on every visible-set change. */
    case 'selectionPruned': {
      const visible = new Set(action.visible);
      if (state.selection.every((id) => visible.has(id))) return state;
      return { ...state, selection: state.selection.filter((id) => visible.has(id)) };
    }

    case 'selectionCleared':
      return state.selection.length === 0 ? state : { ...state, selection: [] };

    case 'errorCleared':
      return state.error === null ? state : { ...state, error: null };
  }
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function byStart(a: BookingRecord, b: BookingRecord): number {
  const d = startMs(a) - startMs(b);
  if (d !== 0) return d;
  const e = endMs(b) - endMs(a); // longer first among equal starts
  return e !== 0 ? e : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Every record overlapping the requested window (or the loaded one before the first load), sorted. */
export function selectVisible(state: RangeState): BookingRecord[] {
  const vars = state.vars ?? state.loaded;
  if (!vars) return [];
  return Object.values(state.byId)
    .filter((b) => inWindow(b, vars))
    .sort(byStart);
}

export function selectSelected(state: RangeState): BookingRecord[] {
  return state.selection.map((id) => state.byId[id]).filter((b): b is BookingRecord => Boolean(b));
}

/** The records for `ids`, in that order; ids the store no longer holds are skipped. */
export function selectByIds(state: Pick<RangeState, 'byId'>, ids: readonly string[]): BookingRecord[] {
  return ids.map((id) => state.byId[id]).filter((r): r is BookingRecord => Boolean(r));
}

/** True while the window has been asked for but nothing has ever come back. */
export function isInitialLoad(state: RangeState): boolean {
  return state.loading && state.loaded === null;
}
