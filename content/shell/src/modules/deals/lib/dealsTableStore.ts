/**
 * The table as one pure reducer, plus the small pure edits its toolbar makes.
 *
 * It is a sibling of `dealsStore.ts`, not a slot inside it: the board holds six
 * ordered columns keyed by `lastSalesStageUpdateTime`, the table holds one list
 * keyed by `lastConversationMessageTime`, and the two share their merge logic
 * through `boardMerge.ts` — whose `insertSorted` / `removeFromAll` already take
 * a `timeOf` callback, so a different sort key is a parameter rather than a
 * fork.
 *
 * Three things worth knowing:
 *
 * - **The plan is the vars.** `state.plan` holds the whole routing decision, so
 *   the queries and the subscription build from one object and cannot describe
 *   different sets. Changing a filter replaces the plan and bumps the epoch;
 *   responses carry the epoch they were issued under and are dropped if it has
 *   moved on.
 * - **`liveBatch` is guarded by `loading`, not by the epoch** — same reason as
 *   the board: epoch-gating it would make the subscription effect depend on the
 *   epoch, and the socket would tear down on every reconnect-driven refetch.
 * - **A live row that sorts past the loaded window is cached but not shown.**
 *   The board can insert anywhere because a column is short; a table that has
 *   loaded 3 of 40 pages would otherwise show a row from page 12 above the rows
 *   it has, and then show it again when page 12 arrives.
 *
 * The reducer never reads the clock: `now` arrives in the action.
 */
import type { SalesStageV2 } from '~api/generated/deals/graphql';
import type { DealsTableRow } from '../types';
import { insertSorted, removeFromAll, type TimeOf } from './boardMerge';
import type { AttrPredicate } from './dealsFilter';
import { applyClientFilters, countGapCaveat, stageTotal, type Caveat, type QueryPlan } from './queryPlan';
import { pruneSelection } from './tableSelection';

/** Rows per request. Bigger than the board's page: a row is a line, not a card. */
export const TABLE_PAGE_SIZE = 25;

/**
 * How many pages the scroll sentinel may fetch before it stops and a button
 * takes over. Without a cap, one flick of an inertial scroll walks a 40,000-row
 * bot page by page — and there is no virtualization here, so every one of those
 * rows stays in the DOM.
 */
export const AUTO_PAGE_CAP = 6;

/** Everything needed to put one row's stage back. */
export interface PendingStage {
  from: SalesStageV2 | null;
  to: SalesStageV2;
}

/** The fields `contactSetSalesStage` answers with. */
export interface StagePatch {
  salesStageV2?: SalesStageV2 | null;
  lastSalesStageUpdateTime?: string | null;
  updatedAt: string;
}

export interface LoadedRows {
  nodes: readonly DealsTableRow[];
  hasNext: boolean;
  endCursor: string | null;
}

export type TableUpdateAction = 'Add' | 'Update' | 'Remove';

export interface TableUpdate {
  action: TableUpdateAction;
  node: DealsTableRow;
}

export interface DealsTableState {
  plan: QueryPlan;
  byId: Record<string, DealsTableRow>;
  order: string[];
  hasNext: boolean;
  endCursor: string | null;
  /** Pages fetched past the first — what `AUTO_PAGE_CAP` counts. */
  pages: number;
  /** `contactChatsCountV2` under engine B, `contactsCount` under engine C. */
  serverCount: number | null;
  /** Engine B only: the per-stage totals the count gap is measured against. */
  totals: Record<SalesStageV2, number> | null;
  pending: Record<string, PendingStage>;
  /**
   * Row selection, ids only, in display order.
   *
   * It lives in the reducer rather than in the view for the same reason the
   * board's does (`dealsStore.ts`): `reset` and `liveBatch` are the only two
   * places that can prune it correctly. A selected id left behind by a
   * subscription `Remove` would later fire a mutation against a contact the
   * server has already retired — and that failure has no visible cause.
   */
  selection: string[];
  epoch: number;
  liveTick: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
}

export type DealsTableAction =
  | { type: 'reset'; plan: QueryPlan }
  | { type: 'loadMoreStarted'; epoch: number }
  | { type: 'pageLoaded'; epoch: number; page: LoadedRows; append: boolean }
  | { type: 'countLoaded'; epoch: number; count: number | null }
  | { type: 'totalsLoaded'; epoch: number; totals: Record<SalesStageV2, number> }
  | { type: 'liveBatch'; updates: readonly TableUpdate[] }
  | { type: 'stageChangeStarted'; epoch: number; id: string; to: SalesStageV2; now: string }
  | { type: 'stageChangeSucceeded'; id: string; patch: StagePatch }
  | { type: 'stageChangeFailed'; id: string }
  | { type: 'selectionSet'; ids: readonly string[] }
  | { type: 'selectionCleared' }
  | { type: 'failed'; epoch: number; message: string }
  | { type: 'errorCleared' };

export function initialTableState(plan: QueryPlan): DealsTableState {
  return {
    plan,
    byId: {},
    order: [],
    hasNext: false,
    endCursor: null,
    pages: 0,
    serverCount: null,
    totals: null,
    pending: {},
    selection: [],
    epoch: 0,
    liveTick: 0,
    loading: true,
    loadingMore: false,
    error: null,
  };
}

/** The table's sort key. Absent and unparseable both sort last. */
export function timeOfRow(row: DealsTableRow | undefined): number {
  const parsed = row?.lastConversationMessageTime ? Date.parse(row.lastConversationMessageTime) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

/** The single-list case of `removeFromAll`; identity survives a no-op. */
const ROWS = 'rows';
const drop = (order: string[], id: string): string[] => removeFromAll({ [ROWS]: order }, id)[ROWS] as string[];

const lookup =
  (byId: Record<string, DealsTableRow>): TimeOf =>
  (id) =>
    timeOfRow(byId[id]);

/**
 * True when the row belongs to a page that has not been fetched: it sorts
 * older than the oldest loaded row and there are more of those to come.
 */
export function beyondWindow(order: readonly string[], id: string, timeOf: TimeOf, hasNext: boolean): boolean {
  if (!hasNext || order.length === 0) return false;
  if (order.includes(id)) return false;
  return timeOf(id) < timeOf(order[order.length - 1] as string);
}

export function dealsTableReducer(state: DealsTableState, action: DealsTableAction): DealsTableState {
  switch (action.type) {
    /* A plan change, a reconnect or the header's refresh — the epoch bump IS
     * the request. `byId` survives because it caches records, not the list.
     * The selection does not: the rows it named are about to be replaced, and a
     * bulk action against a set nobody can still see is not one anybody asked
     * for. */
    case 'reset':
      return {
        ...state,
        plan: action.plan,
        order: [],
        hasNext: false,
        endCursor: null,
        pages: 0,
        serverCount: null,
        totals: null,
        pending: {},
        selection: [],
        epoch: state.epoch + 1,
        liveTick: 0,
        loading: true,
        loadingMore: false,
        error: null,
      };

    case 'loadMoreStarted':
      return action.epoch === state.epoch && !state.loadingMore ? { ...state, loadingMore: true } : state;

    case 'pageLoaded': {
      if (action.epoch !== state.epoch) return state;
      const { page, append } = action;
      const byId = { ...state.byId };
      for (const node of page.nodes) byId[node.id] = node;

      /* Optimistic stage changes the server has not answered yet survive the
       * load; everything else in the row is server truth. */
      for (const [id, move] of Object.entries(state.pending)) {
        const row = byId[id];
        if (row) byId[id] = { ...row, salesStageV2: move.to };
      }

      let order: string[];
      if (append) {
        const seen = new Set(state.order);
        order = [...state.order];
        for (const node of page.nodes) {
          if (seen.has(node.id)) continue;
          seen.add(node.id);
          order.push(node.id);
        }
      } else {
        order = page.nodes.map((node) => node.id);
      }

      return {
        ...state,
        byId,
        order,
        hasNext: page.hasNext,
        endCursor: page.endCursor,
        pages: append ? state.pages + 1 : 0,
        loading: false,
        loadingMore: false,
        error: null,
      };
    }

    case 'countLoaded':
      return action.epoch === state.epoch ? { ...state, serverCount: action.count } : state;

    case 'totalsLoaded':
      return action.epoch === state.epoch ? { ...state, totals: action.totals } : state;

    /* Ignored while a full load is in flight — the load supersedes it, and this
     * is also what swallows the last event of a subscription being torn down
     * after a filter change. */
    case 'liveBatch': {
      if (state.loading || !state.plan.live || action.updates.length === 0) return state;
      const byId = { ...state.byId };
      const pending = { ...state.pending };
      let order = state.order;
      let selection = state.selection;

      for (const { action: kind, node } of action.updates) {
        if (kind === 'Remove') {
          delete byId[node.id];
          delete pending[node.id];
          order = drop(order, node.id);
          /* The reason the selection lives in here: a mutation fired against an
           * id the server has already retired fails with nothing on screen to
           * explain it. */
          if (selection.includes(node.id)) {
            selection = selection.filter((id) => id !== node.id);
          }
          continue;
        }
        const move = pending[node.id];
        const current = byId[node.id];
        /* A row whose stage change is still in flight takes the update's
         * fields but keeps its optimistic stage: the echo may still carry the
         * pre-change value, and letting it through makes the cell flip twice. */
        byId[node.id] =
          move && current
            ? {
                ...node,
                salesStageV2: current.salesStageV2,
                lastSalesStageUpdateTime: current.lastSalesStageUpdateTime,
              }
            : node;
        const timeOf = lookup(byId);
        if (beyondWindow(order, node.id, timeOf, state.hasNext)) continue;
        order = insertSorted(order, node.id, timeOf);
      }

      return { ...state, byId, order, pending, selection, liveTick: state.liveTick + 1 };
    }

    case 'stageChangeStarted': {
      if (action.epoch !== state.epoch) return state;
      const current = state.byId[action.id];
      if (!current || current.salesStageV2 === action.to) return state;
      const from = current.salesStageV2 ?? null;
      const byId = {
        ...state.byId,
        [action.id]: {
          ...current,
          salesStageV2: action.to,
          lastSalesStageUpdateTime: action.now,
        },
      };
      /* Only the target moves on a second change of the same row: `from` stays
       * at the FIRST one, or a rollback would restore a stage it was never in. */
      const held = state.pending[action.id];
      return {
        ...state,
        byId,
        totals: shiftTotals(state.totals, from, action.to),
        pending: {
          ...state.pending,
          [action.id]: held ? { ...held, to: action.to } : { from, to: action.to },
        },
      };
    }

    case 'stageChangeSucceeded': {
      const pending = { ...state.pending };
      delete pending[action.id];
      const current = state.byId[action.id];
      if (!current) return { ...state, pending };
      return {
        ...state,
        pending,
        byId: {
          ...state.byId,
          [action.id]: {
            ...current,
            salesStageV2: action.patch.salesStageV2,
            lastSalesStageUpdateTime: action.patch.lastSalesStageUpdateTime,
            updatedAt: action.patch.updatedAt,
          },
        },
      };
    }

    /* One row, one inverse patch. Nothing else in the table is read or written,
     * so a failure cannot revert a concurrent success. */
    case 'stageChangeFailed': {
      const move = state.pending[action.id];
      if (!move) return state;
      const pending = { ...state.pending };
      delete pending[action.id];
      const current = state.byId[action.id];
      if (!current) return { ...state, pending };
      return {
        ...state,
        pending,
        totals: shiftTotals(state.totals, move.to, move.from),
        byId: { ...state.byId, [action.id]: { ...current, salesStageV2: move.from } },
      };
    }

    /* Pruned on the way in as well as on the way out: a checkbox can only ever
     * hand back rows the table is showing, but the context menu and the
     * keyboard set it from ids, and a restricted contact must not become
     * selectable through either. */
    case 'selectionSet': {
      const selection = pruneSelection(action.ids, state.byId);
      return selection.length === state.selection.length &&
        selection.every((id, index) => id === state.selection[index])
        ? state
        : { ...state, selection };
    }

    case 'selectionCleared':
      return state.selection.length === 0 ? state : { ...state, selection: [] };

    case 'failed':
      return action.epoch === state.epoch
        ? { ...state, loading: false, loadingMore: false, error: action.message }
        : state;

    case 'errorCleared':
      return state.error === null ? state : { ...state, error: null };
  }
}

/** Move one deal between stage totals, so the measured gap stays consistent. */
function shiftTotals(
  totals: Record<SalesStageV2, number> | null,
  from: SalesStageV2 | null,
  to: SalesStageV2 | null,
): Record<SalesStageV2, number> | null {
  if (totals === null) return null;
  const next = { ...totals };
  if (from) next[from] = Math.max(0, next[from] - 1);
  if (to) next[to] = (next[to] ?? 0) + 1;
  return next;
}

/** The list the table renders: server order, then whatever the server could not filter. */
export function selectRows(state: DealsTableState): DealsTableRow[] {
  const rows: DealsTableRow[] = [];
  for (const id of state.order) {
    const row = state.byId[id];
    if (row) rows.push(row);
  }
  return applyClientFilters(rows, state.plan.clientFilters);
}

/**
 * Selected rows, in display order — the list a bulk action actually runs on.
 *
 * Built from `selectRows` rather than from `byId`, so a row the client-side
 * filters are hiding can never be moved by a bar the user is reading over a
 * list it is not in.
 */
export function selectSelectedRows(state: DealsTableState): DealsTableRow[] {
  if (state.selection.length === 0) return [];
  const wanted = new Set(state.selection);
  return selectRows(state).filter((row) => wanted.has(row.id));
}

/** The plan's static caveats plus the one that has to be measured. */
export function selectCaveats(state: DealsTableState): Caveat[] {
  const gap = countGapCaveat(
    state.plan,
    state.serverCount,
    stageTotal(state.totals, state.plan.engine === 'chats' ? state.plan.vars.stages : []),
  );
  return gap === null ? state.plan.caveats : [...state.plan.caveats, gap];
}

/** Whether the scroll sentinel may fetch the next page itself. */
export function canAutoPage(state: DealsTableState): boolean {
  return state.hasNext && !state.loading && !state.loadingMore && state.pages < AUTO_PAGE_CAP;
}

/** Past the cap the sentinel is off and the user asks explicitly. */
export function needsManualPage(state: DealsTableState): boolean {
  return state.hasNext && !state.loading && state.pages >= AUTO_PAGE_CAP;
}

/* -------------------------------------------------------------------------
 * Toolbar edits — pure, because the toolbar itself cannot be tested here.
 * ---------------------------------------------------------------------- */

/** Stage chip toggle. The order stays canonical, so the URL is stable. */
export function toggleStage(
  stages: readonly SalesStageV2[],
  stage: SalesStageV2,
  all: readonly SalesStageV2[],
): SalesStageV2[] {
  const wanted = new Set(stages);
  if (wanted.has(stage)) wanted.delete(stage);
  else wanted.add(stage);
  const next = all.filter((each) => wanted.has(each));
  /* Every stage selected means the same set as none selected — collapse it, or
   * the URL carries six values that say nothing. */
  return next.length === all.length ? [] : next;
}

/** The smallest unused `p<n>`, so a predicate's id — and its `FilterID` — is deterministic. */
export function nextPredicateId(predicates: readonly AttrPredicate[]): string {
  const used = new Set(predicates.map((predicate) => predicate.id));
  let index = 1;
  while (used.has(`p${index}`)) index += 1;
  return `p${index}`;
}

export function addPredicate(predicates: readonly AttrPredicate[], draft: Omit<AttrPredicate, 'id'>): AttrPredicate[] {
  return [...predicates, { ...draft, id: nextPredicateId(predicates) }];
}

export function updatePredicate(
  predicates: readonly AttrPredicate[],
  id: string,
  patch: Partial<Omit<AttrPredicate, 'id'>>,
): AttrPredicate[] {
  return predicates.map((predicate) => (predicate.id === id ? { ...predicate, ...patch } : predicate));
}

export function removePredicate(predicates: readonly AttrPredicate[], id: string): AttrPredicate[] {
  return predicates.filter((predicate) => predicate.id !== id);
}

/**
 * Predicates are deliberately not in the URL — they are unbounded and would
 * make a link unshareable — so the shared filter model round-trips through
 * `dealsParams` and comes back with `predicates: []` every time. The table
 * therefore owns them, and adopts a non-empty list only when one actually
 * arrives from above, which can only be a saved view being applied.
 */
export function adoptPredicates(local: AttrPredicate[], incoming: readonly AttrPredicate[]): AttrPredicate[] {
  if (incoming.length === 0) return local;
  if (incoming.length === local.length && incoming.every((each, index) => each === local[index])) {
    return local;
  }
  return [...incoming];
}
