/**
 * Every automation of the bot as one pure reducer — the store the rail, the
 * scope page and the Test panel derive from. Loaded once by `FuelyAutomationList` without `$scope` (all 18
 * bases + every custom rule, full settings; 21 records / 227 KB / 2.5 s on a
 * real bot), kept fresh by the `FuelyAutomationUpdated` subscription (one
 * event per automation touched — a base edit fans out to every inheritor) and
 * by every own mutation response, which goes through the SAME `live` action.
 *
 * Rules, deliberately those of `bookings/lib/rangeStore.ts`:
 *
 * 1. **`byId` is the one place a record exists.** Views derive order with
 *    selectors; a record is never in two states at once.
 * 2. **`pending` holds a per-automation inverse** for the two optimistic
 *    fields (`enabled`, `name`); a failure rolls back exactly that automation
 *    and flashes it. Setting writes are NOT optimistic — a section shows its own
 *    saving state and adopts the response (the value the server resolved may
 *    differ from what was sent: duplicates dropped, blanks removed).
 * 3. **`epoch` lives in state.** Every request-shaped action carries the epoch
 *    it was issued under and is dropped if it moved on; `reset` bumps it and
 *    IS the request.
 * 4. **`live` is guarded by `loading`, not by the epoch.** The subscription
 *    effect never depends on the epoch, so a refetch never tears the socket
 *    down. A live event dropped while a full load is in flight is lost for
 *    nothing: the load is the truth.
 * 5. **`scopeReplaced`** is what a delete returns (`Bot.fuelyAutomations(scope)`):
 *    the scope's list is adopted wholesale and any id of that scope the
 *    response no longer carries is gone.
 */
import type { FuelyAutomationScope } from '~api/generated/automations/graphql';
import type { AutomationRecord } from '../types';

export interface PendingEdit {
  prev: AutomationRecord;
  next: AutomationRecord;
}

export interface AutomationsState {
  byId: Record<string, AutomationRecord>;
  pending: Record<string, PendingEdit>;
  /** `${id}:${typename}` of setting writes in flight — section spinners. */
  saving: string[];
  /** id → the `now` a rollback happened, so exactly that automation flashes. */
  flash: Record<string, number>;
  epoch: number;
  loading: boolean;
  /** True once any load has succeeded — `loading` alone cannot tell first load from refetch. */
  loaded: boolean;
  error: string | null;
  isMigrated: boolean | null;
}

export type AutomationsAction =
  | { type: 'reset' }
  | { type: 'loaded'; epoch: number; automations: readonly AutomationRecord[]; isMigrated: boolean }
  | { type: 'failed'; epoch: number; message: string }
  | { type: 'live'; automation: AutomationRecord; origin: 'live' | 'own' }
  | { type: 'scopeReplaced'; scope: FuelyAutomationScope; automations: readonly AutomationRecord[] }
  | { type: 'removed'; id: string }
  | { type: 'editStarted'; id: string; next: AutomationRecord }
  | { type: 'editSucceeded'; id: string; automation: AutomationRecord }
  | { type: 'editFailed'; id: string; now: number }
  | { type: 'saveStarted'; key: string }
  | { type: 'saveSettled'; key: string }
  | { type: 'flashCleared'; id: string }
  | { type: 'errorCleared' };

export function initialAutomationsState(): AutomationsState {
  return {
    byId: {},
    pending: {},
    saving: [],
    flash: {},
    epoch: 0,
    loading: false,
    loaded: false,
    error: null,
    isMigrated: null,
  };
}

/** The two fields an optimistic edit owns; a live echo may still carry the pre-edit values. */
function keepOptimistic(incoming: AutomationRecord, optimistic: AutomationRecord): AutomationRecord {
  return { ...incoming, enabled: optimistic.enabled, name: optimistic.name };
}

function withoutId<T>(map: Record<string, T>, id: string): Record<string, T> {
  if (!(id in map)) return map;
  const { [id]: _dropped, ...rest } = map;
  return rest;
}

export const saveKey = (id: string, typename: string): string => `${id}:${typename}`;

export function automationsReducer(state: AutomationsState, action: AutomationsAction): AutomationsState {
  switch (action.type) {
    case 'reset':
      return { ...state, epoch: state.epoch + 1, loading: true, error: null, flash: {} };

    case 'loaded': {
      if (action.epoch !== state.epoch) return state;
      const byId: Record<string, AutomationRecord> = {};
      for (const automation of action.automations) {
        const pending = state.pending[automation.id];
        byId[automation.id] = pending ? keepOptimistic(automation, pending.next) : automation;
      }
      return { ...state, byId, loading: false, loaded: true, error: null, isMigrated: action.isMigrated };
    }

    case 'failed':
      if (action.epoch !== state.epoch) return state;
      return { ...state, loading: false, error: action.message };

    case 'live': {
      if (state.loading) return state;
      const pending = state.pending[action.automation.id];
      const next = pending ? keepOptimistic(action.automation, pending.next) : action.automation;
      return { ...state, byId: { ...state.byId, [action.automation.id]: next } };
    }

    case 'scopeReplaced': {
      const keep = new Set(action.automations.map((a) => a.id));
      const byId: Record<string, AutomationRecord> = {};
      for (const [id, record] of Object.entries(state.byId)) {
        if (record.scope !== action.scope || keep.has(id)) byId[id] = record;
      }
      for (const automation of action.automations) {
        const pending = state.pending[automation.id];
        byId[automation.id] = pending ? keepOptimistic(automation, pending.next) : automation;
      }
      let pending = state.pending;
      for (const id of Object.keys(state.pending)) if (!(id in byId)) pending = withoutId(pending, id);
      return { ...state, byId, pending };
    }

    case 'removed':
      if (!(action.id in state.byId)) return state;
      return {
        ...state,
        byId: withoutId(state.byId, action.id),
        pending: withoutId(state.pending, action.id),
        flash: withoutId(state.flash, action.id),
      };

    case 'editStarted': {
      const prev = state.byId[action.id];
      if (!prev) return state;
      // A second edit on an automation still in flight keeps the FIRST prev.
      const pending = state.pending[action.id] ?? { prev, next: action.next };
      return {
        ...state,
        byId: { ...state.byId, [action.id]: action.next },
        pending: { ...state.pending, [action.id]: { prev: pending.prev, next: action.next } },
      };
    }

    case 'editSucceeded':
      return {
        ...state,
        byId: { ...state.byId, [action.id]: action.automation },
        pending: withoutId(state.pending, action.id),
      };

    case 'editFailed': {
      const pending = state.pending[action.id];
      if (!pending) return state;
      return {
        ...state,
        byId: { ...state.byId, [action.id]: pending.prev },
        pending: withoutId(state.pending, action.id),
        flash: { ...state.flash, [action.id]: action.now },
      };
    }

    case 'saveStarted':
      return state.saving.includes(action.key) ? state : { ...state, saving: [...state.saving, action.key] };

    case 'saveSettled':
      return state.saving.includes(action.key)
        ? { ...state, saving: state.saving.filter((key) => key !== action.key) }
        : state;

    case 'flashCleared':
      return action.id in state.flash ? { ...state, flash: withoutId(state.flash, action.id) } : state;

    case 'errorCleared':
      return state.error === null ? state : { ...state, error: null };
  }
}

// ---------------------------------------------------------------------------
// Selectors — pure; views memoise on `state.byId`.
// ---------------------------------------------------------------------------

/** Base first, then customs by name (case-insensitive), id as the tiebreak. */
export function byBaseThenName(a: AutomationRecord, b: AutomationRecord): number {
  if (a.isBase !== b.isBase) return a.isBase ? -1 : 1;
  const an = (a.name ?? '').toLocaleLowerCase();
  const bn = (b.name ?? '').toLocaleLowerCase();
  if (an !== bn) return an < bn ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function selectAll(state: AutomationsState): AutomationRecord[] {
  return Object.values(state.byId);
}

export function selectByScope(state: AutomationsState, scope: FuelyAutomationScope): AutomationRecord[] {
  return selectAll(state)
    .filter((a) => a.scope === scope)
    .sort(byBaseThenName);
}

export function selectBase(state: AutomationsState, scope: FuelyAutomationScope): AutomationRecord | null {
  return selectAll(state).find((a) => a.scope === scope && a.isBase) ?? null;
}

export function selectCustoms(state: AutomationsState, scope: FuelyAutomationScope): AutomationRecord[] {
  return selectByScope(state, scope).filter((a) => !a.isBase);
}

/** The All base — the bot-level AI switch. */
export function selectAllBase(state: AutomationsState): AutomationRecord | null {
  return selectAll(state).find((a) => a.scope === 'All' && a.isBase) ?? null;
}

export type ScopeStatus = 'on' | 'off' | 'unknown';

/** A source is on when its base is enabled (customs only refine, they never turn a source on). */
export function selectScopeStatus(state: AutomationsState, scope: FuelyAutomationScope): ScopeStatus {
  const base = selectBase(state, scope);
  if (!base) return 'unknown';
  return base.enabled ? 'on' : 'off';
}

export function selectCustomsCount(state: AutomationsState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of selectAll(state)) if (!a.isBase) out[a.scope] = (out[a.scope] ?? 0) + 1;
  return out;
}

export const isSaving = (state: AutomationsState, id: string, typename: string): boolean =>
  state.saving.includes(saveKey(id, typename));

/** True while the list has been asked for and nothing has ever come back. */
export function isInitialLoad(state: AutomationsState): boolean {
  return state.loading && !state.loaded;
}
