/**
 * Services and specialists, as full records, shared by every section.
 *
 * Why FULL records: `goodsServiceUpdate` and `specialistUpdate` take the whole
 * input (no partial update), so an editor that toggles one flag must re-send
 * everything else — and the only honest source for "everything else" is what
 * the API last returned. Why one store for both: `Specialist.services` points
 * at services, and the wizard, the grid columns and the staff list all need
 * the pair together.
 *
 * There is no specialist/catalog subscription. The hook refetches on mount,
 * on WS reconnect, when the tab becomes visible again (throttled), on `r`, and
 * reconciles from every own mutation's payload — create/delete answer with the
 * whole list, update with the one record.
 */
import type { ServiceRecord, SpecialistRecord, SyncTask } from '../types';

export interface CatalogState {
  services: ServiceRecord[];
  specialists: SpecialistRecord[];
  epoch: number;
  loading: boolean;
  error: string | null;
  /** When the last full load landed (the visibility refetch throttles on it). */
  loadedAt: number | null;
}

export type CatalogAction =
  | { type: 'reset' }
  | {
      type: 'loaded';
      epoch: number;
      services: readonly ServiceRecord[];
      specialists: readonly SpecialistRecord[];
      at: number;
    }
  | { type: 'failed'; epoch: number; message: string }
  | { type: 'servicesReplaced'; services: readonly ServiceRecord[] }
  | { type: 'serviceWritten'; service: ServiceRecord }
  | { type: 'specialistsReplaced'; specialists: readonly SpecialistRecord[] }
  | { type: 'specialistWritten'; specialist: SpecialistRecord }
  | { type: 'specialistTask'; specialistId: string; task: SyncTask | null }
  | { type: 'errorCleared' };

export const CATALOG_REFETCH_THROTTLE_MS = 30_000;

export function initialCatalogState(): CatalogState {
  return { services: [], specialists: [], epoch: 0, loading: false, error: null, loadedAt: null };
}

/** Catalog order is the API's, which is stable; the tone a specialist gets is its position here. */
export function catalogReducer(state: CatalogState, action: CatalogAction): CatalogState {
  switch (action.type) {
    case 'reset':
      return { ...state, epoch: state.epoch + 1, loading: true, error: null };
    case 'loaded':
      if (action.epoch !== state.epoch) return state;
      return {
        ...state,
        services: [...action.services],
        specialists: [...action.specialists],
        loading: false,
        error: null,
        loadedAt: action.at,
      };
    case 'failed':
      if (action.epoch !== state.epoch) return state;
      return { ...state, loading: false, error: action.message };
    case 'servicesReplaced':
      return { ...state, services: [...action.services] };
    case 'serviceWritten': {
      const exists = state.services.some((s) => s.id === action.service.id);
      return {
        ...state,
        services: exists
          ? state.services.map((s) => (s.id === action.service.id ? action.service : s))
          : [...state.services, action.service],
      };
    }
    case 'specialistsReplaced':
      return { ...state, specialists: [...action.specialists] };
    case 'specialistWritten': {
      const exists = state.specialists.some((s) => s.id === action.specialist.id);
      return {
        ...state,
        specialists: exists
          ? state.specialists.map((s) => (s.id === action.specialist.id ? action.specialist : s))
          : [...state.specialists, action.specialist],
      };
    }
    case 'specialistTask':
      return {
        ...state,
        specialists: state.specialists.map((s) =>
          s.id === action.specialistId ? { ...s, latestGoogleCalendarSyncTask: action.task } : s,
        ),
      };
    case 'errorCleared':
      return state.error === null ? state : { ...state, error: null };
  }
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function serviceById(
  state: Pick<CatalogState, 'services'>,
  id: string | null | undefined,
): ServiceRecord | null {
  if (!id) return null;
  return state.services.find((s) => s.id === id) ?? null;
}

export function specialistById(
  state: Pick<CatalogState, 'specialists'>,
  id: string | null | undefined,
): SpecialistRecord | null {
  if (!id) return null;
  return state.specialists.find((s) => s.id === id) ?? null;
}

/** Specialists offering a service (Specialist.services is the truth, not the reverse). */
export function specialistsForService(state: Pick<CatalogState, 'specialists'>, serviceId: string): SpecialistRecord[] {
  return state.specialists.filter((s) => s.services.some((svc) => svc.id === serviceId));
}

/** Services the wizard offers: available ones only. */
export function bookableServices(state: Pick<CatalogState, 'services'>): ServiceRecord[] {
  return state.services.filter((s) => s.isAvailable);
}

export function specialistName(profile: { firstName: string; lastName?: string | null }): string {
  return [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() || 'Specialist';
}

/** Whether a specialist can take bookings through availability at all. */
export function hasSchedule(specialist: Pick<SpecialistRecord, 'schedule'>): boolean {
  const s = specialist.schedule;
  if (!s || !s.enabled) return false;
  return [s.sun, s.mon, s.tue, s.wed, s.thu, s.fri, s.sat].some((d) => d?.enabled);
}

/** Position → tone index, stable across the session because the API's order is. */
export function toneIndexOf(state: Pick<CatalogState, 'specialists'>, specialistId: string): number {
  const at = state.specialists.findIndex((s) => s.id === specialistId);
  return at < 0 ? -1 : at;
}
