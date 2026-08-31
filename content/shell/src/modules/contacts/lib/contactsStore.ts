/**
 * The contacts list, as one reducer.
 *
 * Three properties are worth the file:
 *
 * 1. **The plan IS the variables.** `state.plan` is the whole routing decision
 *    (`lib/queryPlan.ts`); the list query, the count query and the subscription
 *    are all built from that one object, so they cannot drift apart.
 * 2. **The epoch is in state, and it is the request.** `reset` and `refetch`
 *    both bump it — only `reset` blanks the rows; every response carries the
 *    epoch it was asked under and is dropped if stale.
 *    In state rather than in a ref so the guard is something a test asserts.
 *    `liveBatch` is the exception — it is guarded by `loading`, because gating
 *    it on the epoch would make the subscription effect depend on the epoch
 *    and tear the socket down on every refetch.
 * 3. **One record cache, one order.** Rows live in `byId`; `order` is ids. A
 *    live echo, a page append and an optimistic edit all write the same cache,
 *    so two surfaces can never show two versions of one contact.
 *
 * The reducer never reads the clock: `now` arrives in the action, so every
 * assertion about flashes and arrivals is exact.
 */
import { ContactListUpdateAction } from '~api/generated/contacts/graphql';
import type { ContactRow } from '../types';
import type { ClientFilters, QueryPlan } from './queryPlan';
import { platformEnumOf } from './platforms';

/** How many rows a page asks for. The API accepts up to 500 and fails at 1000. */
export const PAGE_SIZE = 50;

/** Pages the sentinel may pull before it stops and asks for a click. */
export const AUTO_PAGE_CAP = 6;

/** How long a rolled-back row stays marked. */
export const FLASH_MS = 1400;

/** How long a live arrival stays marked. */
export const ARRIVED_MS = 2000;

export interface PendingEdit {
  /** The fields to put back if the mutation fails. */
  inverse: Partial<ContactRow>;
  /** The fields the optimistic edit wrote — re-applied on top of a live echo. */
  applied: Partial<ContactRow>;
  startedAt: number;
}

export interface ContactsState {
  plan: QueryPlan;
  byId: Record<string, ContactRow>;
  order: string[];
  epoch: number;
  loading: boolean;
  /** A page beyond the first is on its way. */
  paging: boolean;
  error: string | null;
  hasNext: boolean;
  endCursor: string | null;
  pages: number;
  /** Server counts: what the caller may see, and what exists. */
  visibleCount: number | null;
  totalCount: number | null;
  selection: string[];
  pending: Record<string, PendingEdit>;
  flash: Record<string, number>;
  arrived: Record<string, number>;
  /** Bumped by every live batch, so a view can key an animation on it. */
  liveTick: number;
  /** Set when the server throttles the live feed; the view refetches then. */
  liveResumeAt: string | null;
}

export function initialState(plan: QueryPlan): ContactsState {
  return {
    plan,
    byId: {},
    order: [],
    epoch: 0,
    loading: true,
    paging: false,
    error: null,
    hasNext: false,
    endCursor: null,
    pages: 0,
    visibleCount: null,
    totalCount: null,
    selection: [],
    pending: {},
    flash: {},
    arrived: {},
    liveTick: 0,
    liveResumeAt: null,
  };
}

export interface PageResult {
  rows: ContactRow[];
  cursors: string[];
  hasNext: boolean;
  endCursor: string | null;
}

export type ContactsAction =
  | { type: 'reset'; plan: QueryPlan }
  | { type: 'refetch' }
  | { type: 'pageStarted'; epoch: number }
  | { type: 'pageLoaded'; epoch: number; append: boolean; result: PageResult }
  | { type: 'pageFailed'; epoch: number; message: string }
  | { type: 'countsLoaded'; epoch: number; visible: number | null; total: number | null }
  | { type: 'liveBatch'; updates: { action: ContactListUpdateAction; id: string; row: ContactRow }[]; now: number }
  | { type: 'liveStopped'; willResumeAt: string | null }
  | { type: 'rowPatched'; row: ContactRow }
  | { type: 'editStarted'; id: string; patch: Partial<ContactRow>; now: number }
  | { type: 'editSucceeded'; id: string; row: ContactRow | null }
  | { type: 'editFailed'; id: string; now: number }
  | { type: 'selectionSet'; ids: string[] }
  | { type: 'selectionToggled'; id: string }
  | { type: 'selectionCleared' }
  | { type: 'expire'; now: number };

const without = <T>(record: Record<string, T>, id: string): Record<string, T> => {
  if (!(id in record)) return record;
  const next = { ...record };
  delete next[id];
  return next;
};

/** Stamps older than `ttl` disappear. Returns the same object when nothing expired. */
function expireStamps(stamps: Record<string, number>, now: number, ttl: number): Record<string, number> {
  const live = Object.entries(stamps).filter(([, at]) => now - at < ttl);
  if (live.length === Object.keys(stamps).length) return stamps;
  return Object.fromEntries(live);
}

export function contactsReducer(state: ContactsState, action: ContactsAction): ContactsState {
  switch (action.type) {
    /* A new plan is a new request. Rows are dropped rather than kept: the
       previous ones answered a different question, and showing them under the
       new filter is the one thing a filtered list must never do. */
    case 'reset':
      return {
        ...initialState(action.plan),
        epoch: state.epoch + 1,
        /* Selection survives nothing — an id retired by the new filter would
           later fire a mutation against a row the user can no longer see. */
        selection: [],
      };

    case 'refetch':
      return { ...state, epoch: state.epoch + 1, loading: true, error: null, liveResumeAt: null };

    case 'pageStarted':
      if (action.epoch !== state.epoch) return state;
      return { ...state, paging: true, error: null };

    case 'pageLoaded': {
      if (action.epoch !== state.epoch) return state;
      const byId = { ...state.byId };
      const ids: string[] = [];
      for (const row of action.result.rows) {
        byId[row.id] = row;
        ids.push(row.id);
      }
      const order = action.append ? [...state.order, ...ids.filter((id) => !state.order.includes(id))] : ids;
      return {
        ...state,
        byId,
        order,
        loading: false,
        paging: false,
        error: null,
        hasNext: action.result.hasNext,
        endCursor: action.result.endCursor,
        pages: action.append ? state.pages + 1 : 1,
        /* A row that disappeared from a refetched first page cannot stay
           selected — the same rule as `reset`, applied to the narrower case. */
        selection: action.append ? state.selection : state.selection.filter((id) => order.includes(id)),
      };
    }

    case 'pageFailed':
      if (action.epoch !== state.epoch) return state;
      return { ...state, loading: false, paging: false, error: action.message };

    case 'countsLoaded':
      if (action.epoch !== state.epoch) return state;
      return { ...state, visibleCount: action.visible, totalCount: action.total };

    /* Guarded by `loading`, NOT by the epoch — see the file header. A batch
       that arrives while the first page is still in flight is dropped: the
       page it would patch is not there yet, and the page carries the truth. */
    case 'liveBatch': {
      if (state.loading) return state;
      const byId = { ...state.byId };
      let order = state.order;
      const arrived = { ...state.arrived };
      for (const update of action.updates) {
        if (update.action === ContactListUpdateAction.Remove) {
          delete byId[update.id];
          order = order.filter((id) => id !== update.id);
          continue;
        }
        const existing = byId[update.id];
        /* A row with an unanswered optimistic edit keeps the edited fields:
           the echo is the state before the mutation landed, and letting it win
           makes the cell flip back and then forward again. */
        byId[update.id] =
          existing && state.pending[update.id]
            ? ({ ...update.row, ...state.pending[update.id].applied } as ContactRow)
            : update.row;
        if (!existing) {
          if (update.action === ContactListUpdateAction.Add) {
            order = [update.id, ...order];
            arrived[update.id] = action.now;
          } else {
            /* An Update for a row we never loaded is cached but not shown:
               inserting it would put a row from page 12 above page 1. */
            continue;
          }
        }
      }
      return {
        ...state,
        byId,
        order,
        arrived: expireStamps(arrived, action.now, ARRIVED_MS),
        liveTick: state.liveTick + 1,
        selection: state.selection.filter((id) => id in byId),
      };
    }

    case 'liveStopped':
      return { ...state, liveResumeAt: action.willResumeAt };

    /* The record page writes back through here: one cache,
       so an edit made in the panel is visible in the row behind it. */
    case 'rowPatched': {
      if (!(action.row.id in state.byId)) return state;
      return { ...state, byId: { ...state.byId, [action.row.id]: action.row } };
    }

    case 'editStarted': {
      const current = state.byId[action.id];
      if (!current) return state;
      const inverse: Partial<ContactRow> = {};
      for (const key of Object.keys(action.patch) as (keyof ContactRow)[]) {
        (inverse as Record<string, unknown>)[key as string] = (current as Record<string, unknown>)[key as string];
      }
      return {
        ...state,
        byId: { ...state.byId, [action.id]: { ...current, ...action.patch } as ContactRow },
        pending: {
          ...state.pending,
          [action.id]: { inverse, applied: action.patch, startedAt: action.now },
        },
      };
    }

    case 'editSucceeded': {
      const pending = without(state.pending, action.id);
      if (!action.row) return { ...state, pending };
      return { ...state, pending, byId: { ...state.byId, [action.id]: action.row } };
    }

    /* One row, one inverse patch. Nothing else is read or written, so a failed
       edit can never revert a concurrent successful one. The flash is stamped
       even when the row has since gone. */
    case 'editFailed': {
      const entry = state.pending[action.id];
      const current = state.byId[action.id];
      return {
        ...state,
        byId:
          entry && current
            ? { ...state.byId, [action.id]: { ...current, ...entry.inverse } as ContactRow }
            : state.byId,
        pending: without(state.pending, action.id),
        flash: { ...expireStamps(state.flash, action.now, FLASH_MS), [action.id]: action.now },
      };
    }

    case 'selectionSet':
      return { ...state, selection: action.ids.filter((id) => id in state.byId) };

    case 'selectionToggled':
      return {
        ...state,
        selection: state.selection.includes(action.id)
          ? state.selection.filter((id) => id !== action.id)
          : [...state.selection, action.id],
      };

    case 'selectionCleared':
      return state.selection.length === 0 ? state : { ...state, selection: [] };

    case 'expire': {
      const flash = expireStamps(state.flash, action.now, FLASH_MS);
      const arrived = expireStamps(state.arrived, action.now, ARRIVED_MS);
      if (flash === state.flash && arrived === state.arrived) return state;
      return { ...state, flash, arrived };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

const matchesText = (row: ContactRow, text: string): boolean => {
  if (text === '') return true;
  const name = (row.name ?? '').toLowerCase();
  const phone = 'phone' in row && typeof row.phone === 'string' ? row.phone.toLowerCase() : '';
  const username = 'username' in row && typeof row.username === 'string' ? row.username.toLowerCase() : '';
  return name.includes(text) || phone.includes(text) || username.includes(text);
};

const matchesAssignee = (row: ContactRow, key: ClientFilters['assignee']): boolean => {
  if (key === 'Any') return true;
  const assignee = row.assignee;
  if (key === 'Unassigned') return !assignee;
  if (key === 'FuelyAI') return assignee?.__typename === 'FuelyAIAssignee';
  const userId = key.slice(2);
  return assignee?.__typename === 'PublicUserAccount' && assignee.id === userId;
};

const inWindow = (row: ContactRow, since: string | null, until: string | null): boolean => {
  if (since === null && until === null) return true;
  const at = row.lastConversationMessageTime;
  if (!at) return false;
  const time = Date.parse(at);
  if (Number.isNaN(time)) return false;
  if (since !== null && time < Date.parse(since)) return false;
  if (until !== null && time > Date.parse(until)) return false;
  return true;
};

/** Everything the server could not narrow, applied to what actually loaded. */
export function applyClientFilters(rows: readonly ContactRow[], filters: ClientFilters): ContactRow[] {
  return rows.filter((row) => {
    if (filters.platforms.length > 0) {
      const platform = platformEnumOf(row.__typename);
      if (platform === null || !filters.platforms.includes(platform)) return false;
    }
    if (filters.stages.length > 0) {
      const stage = row.salesStageV2;
      if (!stage || !filters.stages.includes(stage)) return false;
    }
    if (filters.unreadOnly && row.unreadMessagesCount === 0) return false;
    if (!matchesAssignee(row, filters.assignee)) return false;
    if (!matchesText(row, filters.text)) return false;
    if (!inWindow(row, filters.since, filters.until)) return false;
    return true;
  });
}

/** The rows a view renders: cache in server order, narrowed client-side. */
export function selectRows(state: ContactsState): ContactRow[] {
  const ordered = state.order.map((id) => state.byId[id]).filter((row): row is ContactRow => Boolean(row));
  return applyClientFilters(ordered, state.plan.clientFilters);
}

/**
 * Built from `selectRows`, not from `byId`: a row hidden by a client-side
 * filter is not on screen, and a bulk action must never touch it.
 */
export function selectSelectedRows(state: ContactsState): ContactRow[] {
  const selected = new Set(state.selection);
  return selectRows(state).filter((row) => selected.has(row.id));
}

/**
 * True when the sentinel may pull another page by itself. Past the cap the
 * list asks for a click instead of walking an address book of 40 000.
 */
export const canAutoPage = (state: ContactsState): boolean =>
  state.hasNext && !state.paging && !state.loading && state.pages < AUTO_PAGE_CAP;

export const needsManualPage = (state: ContactsState): boolean =>
  state.hasNext && !state.paging && state.pages >= AUTO_PAGE_CAP;

/**
 * What the header prints. Under client-side narrowing the server count
 * describes a wider set than the rows do, and saying so is the whole point.
 */
export interface CountSummary {
  shown: number;
  serverCount: number | null;
  /** True when rows were dropped after the server answered. */
  narrowed: boolean;
  hiddenByRestriction: number;
}

export function selectCounts(state: ContactsState): CountSummary {
  const shown = selectRows(state).length;
  const loaded = state.order.length;
  return {
    shown,
    serverCount: state.visibleCount,
    narrowed: shown !== loaded,
    hiddenByRestriction:
      state.totalCount !== null && state.visibleCount !== null ? Math.max(0, state.totalCount - state.visibleCount) : 0,
  };
}
