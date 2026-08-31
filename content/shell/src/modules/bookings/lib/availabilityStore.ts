/**
 * A cache of availability answers keyed `serviceId|date`.
 *
 * The API answers one service × one day per call, so the wizard asks for the
 * day it shows and this remembers it. Invalidation is by DAY: any live upsert
 * or removal touching a day (its old day AND its new one, for a move) marks
 * every entry for that day stale, and a stale entry is refetched the next time
 * something reads it. Canceled bookings free the slot server-side, so a
 * status change is a touch too. Nothing here needs the schedule: the server
 * already applied it.
 *
 * A failed entry is NOT retried: `needsFetch` says no while `error` is set and
 * `entries` is null, so the day shows its error until something invalidates it
 * (a live touch, `invalidateAll`, or a new epoch). That is deliberate — a
 * retry-on-read would spin the hook against a failing server for as long as the
 * day is on screen. `stores.test.ts` pins it.
 */
import type { AvailabilityEntry } from '../types';

export interface AvailabilityEntryState {
  epoch: number;
  loading: boolean;
  entries: AvailabilityEntry[] | null;
  error: string | null;
  fetchedAt: number | null;
  stale: boolean;
}

export interface AvailabilityState {
  byKey: Record<string, AvailabilityEntryState>;
}

export type AvailabilityAction =
  | { type: 'requested'; key: string; epoch: number }
  | { type: 'loaded'; key: string; epoch: number; entries: readonly AvailabilityEntry[]; at: number }
  | { type: 'failed'; key: string; epoch: number; message: string }
  | { type: 'daysTouched'; days: readonly string[] }
  | { type: 'invalidateAll' };

export const availabilityKey = (serviceId: string, date: string) => `${serviceId}|${date}`;
// `lastIndexOf`: the key is `${serviceId}|${dayKey}` and only the day is fixed-shape — a service id containing a `|` must not shift the split.
export const dateOfKey = (key: string) => key.slice(key.lastIndexOf('|') + 1);

export function initialAvailabilityState(): AvailabilityState {
  return { byKey: {} };
}

export function availabilityReducer(state: AvailabilityState, action: AvailabilityAction): AvailabilityState {
  switch (action.type) {
    case 'requested': {
      const prev = state.byKey[action.key];
      return {
        byKey: {
          ...state.byKey,
          [action.key]: {
            epoch: action.epoch,
            loading: true,
            entries: prev?.entries ?? null,
            error: null,
            fetchedAt: prev?.fetchedAt ?? null,
            stale: false,
          },
        },
      };
    }
    case 'loaded': {
      const prev = state.byKey[action.key];
      if (!prev || prev.epoch !== action.epoch) return state;
      return {
        byKey: {
          ...state.byKey,
          [action.key]: {
            ...prev,
            loading: false,
            entries: [...action.entries],
            error: null,
            fetchedAt: action.at,
            stale: false,
          },
        },
      };
    }
    case 'failed': {
      const prev = state.byKey[action.key];
      if (!prev || prev.epoch !== action.epoch) return state;
      return { byKey: { ...state.byKey, [action.key]: { ...prev, loading: false, error: action.message } } };
    }
    case 'daysTouched': {
      const days = new Set(action.days);
      let changed = false;
      const byKey: Record<string, AvailabilityEntryState> = {};
      for (const [key, entry] of Object.entries(state.byKey)) {
        if (days.has(dateOfKey(key)) && !entry.stale) {
          byKey[key] = { ...entry, stale: true };
          changed = true;
        } else byKey[key] = entry;
      }
      return changed ? { byKey } : state;
    }
    case 'invalidateAll': {
      const byKey: Record<string, AvailabilityEntryState> = {};
      for (const [key, entry] of Object.entries(state.byKey))
        byKey[key] = entry.stale ? entry : { ...entry, stale: true };
      return { byKey };
    }
  }
}

/** True when a read of `key` should trigger a fetch. */
export function needsFetch(state: AvailabilityState, key: string): boolean {
  const entry = state.byKey[key];
  if (!entry) return true;
  if (entry.loading) return false;
  return entry.stale || (entry.entries === null && entry.error === null);
}

export function nextEpoch(state: AvailabilityState, key: string): number {
  return (state.byKey[key]?.epoch ?? 0) + 1;
}
