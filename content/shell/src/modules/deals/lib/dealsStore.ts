import type { ContactAssigneeFilter, SalesStageV2 } from '~api/generated/deals/graphql';
import type { DealCard } from '../types';
import { insertSorted, removeFromAll, timeOfCard, type BoardOrder, type TimeOf } from './boardMerge';
import { STAGES } from './stages';

/**
 * The whole deals board as one pure reducer.
 *
 * Three properties the previous hook could not have, all of which are the
 * point of this file:
 *
 * - `byId` is the ONE place a contact exists; the views hold ordered ids. Two
 *   views of the same deal can therefore never drift apart, and switching
 *   between them costs no refetch.
 * - `pending` holds a PER-CARD inverse patch. A failed move rolls back exactly
 *   its own card, leaving concurrent successful moves and any subscription
 *   batch that landed in between untouched.
 * - `epoch` lives in state rather than in a ref, so the stale-response guard is
 *   something a test can actually assert. Every request-shaped action carries
 *   the epoch it was issued under and is dropped if that epoch has moved on.
 *
 * Everything the server reads lives in `vars`. Queries and the subscription
 * both build from that one object, which is what makes the filter-lock
 * invariant structural rather than a comment — the subscription's filter
 * cannot drift from the queries' because there is only one of them. Deal-field
 * names ride along for the same reason: the board fragment selects
 * `attributes(names:)`, so the subscription selects it too.
 *
 * `liveBatch` is the exception to epoch-carrying: it is guarded by `loading`
 * instead. Epoch-gating it would force the subscription effect to depend on the
 * epoch, and the WebSocket would then tear down and re-establish on every
 * reconnect-driven refetch. A batch dropped while a full load is in flight is
 * lost for nothing anyway — the load supersedes it.
 *
 * The reducer never reads the clock: `now` arrives in the action.
 */

export interface PageInfo {
  hasNext: boolean;
  endCursor: string | null;
  /** Pages applied since the last reset — what the auto-page cap counts. */
  pages: number;
  /** A page request is in flight for this column. */
  loading: boolean;
}

/** Everything needed to put one card back where it came from. */
export interface PendingMove {
  from: SalesStageV2;
  to: SalesStageV2;
  prevTime: string | null;
}

/** Everything a board request keys on. One object, so no half of it can go stale alone. */
export interface DealsQueryVars {
  filter: ContactAssigneeFilter;
  /** Deal-field attribute names; grows once if the catalog resolves an alias.
   *  Mutable only because codegen types the variable that way — never written. */
  fieldNames: string[];
}

export interface DealsState {
  vars: DealsQueryVars;
  byId: Record<string, DealCard>;
  order: BoardOrder;
  paging: Record<SalesStageV2, PageInfo>;
  totals: Record<SalesStageV2, number>;
  pending: Record<string, PendingMove>;
  /**
   * Board-wide multi-select, ids only.
   *
   * It lives in the reducer rather than in a component because `reset` and
   * `liveBatch` are the only two places that can prune it correctly: a selected
   * id left behind by a subscription `Remove` would later fire a mutation
   * against a contact that no longer exists.
   */
  selection: string[];
  /** id → the `now` a rollback happened, so exactly that card flashes. */
  flash: Record<string, number>;
  epoch: number;
  /** Bumped by every applied live batch; drives the debounced totals refresh. */
  liveTick: number;
  loading: boolean;
  error: string | null;
}

/** One column's server response — the shape both the first page and loadMore produce. */
export interface LoadedPage {
  stage: SalesStageV2;
  nodes: readonly DealCard[];
  hasNext: boolean;
  endCursor: string | null;
}

export type BoardUpdateAction = 'Add' | 'Update' | 'Remove';

export interface BoardUpdate {
  action: BoardUpdateAction;
  node: DealCard;
}

/** The fields contactSetSalesStage answers with. */
export interface MovePatch {
  salesStageV2?: SalesStageV2 | null;
  lastSalesStageUpdateTime?: string | null;
  updatedAt: string;
}

export type DealsAction =
  | { type: 'reset'; vars: DealsQueryVars }
  | { type: 'columnsLoaded'; epoch: number; pages: readonly LoadedPage[] }
  | { type: 'pageLoaded'; epoch: number; page: LoadedPage }
  | { type: 'totalsLoaded'; epoch: number; totals: Record<SalesStageV2, number> }
  | { type: 'liveBatch'; updates: readonly BoardUpdate[] }
  | { type: 'moveStarted'; epoch: number; card: DealCard; to: SalesStageV2; now: string }
  | { type: 'moveSucceeded'; id: string; patch: MovePatch }
  | { type: 'moveFailed'; id: string; now: number }
  | { type: 'pageRequested'; epoch: number; stage: SalesStageV2 }
  | { type: 'selectionToggled'; id: string }
  | { type: 'selectionSet'; ids: readonly string[] }
  | { type: 'selectionCleared' }
  | { type: 'flashCleared'; id: string }
  | { type: 'failed'; epoch: number; message: string }
  | { type: 'errorCleared' };

const emptyOrder = (): BoardOrder => Object.fromEntries(STAGES.map((stage) => [stage, []]));

const emptyPaging = (): Record<SalesStageV2, PageInfo> =>
  Object.fromEntries(
    STAGES.map((stage) => [stage, { hasNext: false, endCursor: null, pages: 0, loading: false }]),
  ) as Record<SalesStageV2, PageInfo>;

const emptyTotals = (): Record<SalesStageV2, number> =>
  Object.fromEntries(STAGES.map((stage) => [stage, 0])) as Record<SalesStageV2, number>;

export function initialDealsState(vars: DealsQueryVars): DealsState {
  return {
    vars,
    byId: {},
    order: emptyOrder(),
    paging: emptyPaging(),
    totals: emptyTotals(),
    pending: {},
    selection: [],
    flash: {},
    epoch: 0,
    liveTick: 0,
    loading: true,
    error: null,
  };
}

const lookup =
  (byId: Record<string, DealCard>): TimeOf =>
  (id) =>
    timeOfCard(byId[id]);

/** Remove then re-insert one id into `stage`, keeping the column sorted. */
function place(order: BoardOrder, stage: string, id: string, timeOf: TimeOf): BoardOrder {
  const without = removeFromAll(order, id);
  if (!(stage in without)) return without;
  return { ...without, [stage]: insertSorted(without[stage]!, id, timeOf) };
}

/**
 * Re-apply in-flight optimistic moves on top of a freshly fetched board. A
 * refetch (reconnect, or the willResumeAt resume) is server truth for
 * everything except the moves the server has not answered yet — those would
 * otherwise snap back to their old column and jump again on the response.
 */
function reapplyPending(order: BoardOrder, pending: Record<string, PendingMove>, timeOf: TimeOf): BoardOrder {
  let next = order;
  for (const [id, move] of Object.entries(pending)) next = place(next, move.to, id, timeOf);
  return next;
}

export function dealsReducer(state: DealsState, action: DealsAction): DealsState {
  switch (action.type) {
    /* A vars change, a reconnect or a manual refetch — the epoch bump IS the
     * request. `byId` survives: it caches records, not the board, and keeping it
     * is what makes the S7 view switch instant. Pending moves do not survive,
     * because the load that follows is the truth. */
    case 'reset':
      return {
        ...state,
        vars: action.vars,
        order: emptyOrder(),
        paging: emptyPaging(),
        totals: emptyTotals(),
        pending: {},
        selection: [],
        flash: {},
        epoch: state.epoch + 1,
        liveTick: 0,
        loading: true,
        error: null,
      };

    case 'columnsLoaded': {
      if (action.epoch !== state.epoch) return state;
      const byId = { ...state.byId };
      const paging = { ...state.paging };
      let order: BoardOrder = { ...state.order };
      for (const page of action.pages) {
        for (const node of page.nodes) byId[node.id] = node;
        order[page.stage] = page.nodes.map((node) => node.id);
        paging[page.stage] = {
          hasNext: page.hasNext,
          endCursor: page.endCursor,
          pages: 1,
          loading: false,
        };
      }
      order = reapplyPending(order, state.pending, lookup(byId));
      return { ...state, byId, order, paging, loading: false, error: null };
    }

    case 'pageLoaded': {
      if (action.epoch !== state.epoch) return state;
      const { page } = action;
      const byId = { ...state.byId };
      for (const node of page.nodes) byId[node.id] = node;
      const timeOf = lookup(byId);
      let ids = state.order[page.stage] ?? [];
      for (const node of page.nodes) ids = insertSorted(ids, node.id, timeOf);
      return {
        ...state,
        byId,
        order: { ...state.order, [page.stage]: ids },
        paging: {
          ...state.paging,
          [page.stage]: {
            hasNext: page.hasNext,
            endCursor: page.endCursor,
            pages: (state.paging[page.stage]?.pages ?? 0) + 1,
            loading: false,
          },
        },
      };
    }

    /* Marks the column busy so the paging sentinel cannot fire twice for the
     * same page while the first request is still out. A no-op when there is
     * nothing more to fetch. */
    case 'pageRequested': {
      if (action.epoch !== state.epoch) return state;
      const info = state.paging[action.stage];
      if (!info || info.loading || !info.hasNext) return state;
      return {
        ...state,
        paging: { ...state.paging, [action.stage]: { ...info, loading: true } },
      };
    }

    case 'totalsLoaded':
      return action.epoch === state.epoch ? { ...state, totals: action.totals } : state;

    /* Ignored while a full load is in flight: the load supersedes it, and this
     * is also what swallows the last event of a subscription that is being torn
     * down after a filter change. */
    case 'liveBatch': {
      if (state.loading || action.updates.length === 0) return state;
      const byId = { ...state.byId };
      const pending = { ...state.pending };
      let order = state.order;
      let selection = state.selection;
      for (const { action: kind, node } of action.updates) {
        if (kind === 'Remove') {
          delete byId[node.id];
          delete pending[node.id];
          order = removeFromAll(order, node.id);
          /* The reason selection lives here: a mutation fired against an id the
           * server has already retired would fail for a reason nobody can see. */
          if (selection.includes(node.id)) selection = selection.filter((id) => id !== node.id);
          continue;
        }
        const move = pending[node.id];
        /* A card whose move is still in flight takes the update's fields but
         * keeps its optimistic stage and sort key: the echo may still carry the
         * pre-move stage, and letting it through makes the card jump back and
         * then forward again. */
        const current = byId[node.id];
        byId[node.id] =
          move && current
            ? {
                ...node,
                salesStageV2: current.salesStageV2,
                lastSalesStageUpdateTime: current.lastSalesStageUpdateTime,
              }
            : node;
        if (move) continue;
        const stage = node.salesStageV2;
        order = stage ? place(order, stage, node.id, lookup(byId)) : removeFromAll(order, node.id);
      }
      return { ...state, byId, order, pending, selection, liveTick: state.liveTick + 1 };
    }

    case 'moveStarted': {
      if (action.epoch !== state.epoch) return state;
      const { card, to, now } = action;
      const source = state.byId[card.id] ?? card;
      const from = source.salesStageV2;
      if (!from || from === to) return state;
      const byId = {
        ...state.byId,
        [card.id]: { ...source, salesStageV2: to, lastSalesStageUpdateTime: now },
      };
      const totals = { ...state.totals };
      totals[from] = Math.max(0, totals[from] - 1);
      totals[to] = totals[to] + 1;
      /* Only the target moves on a second drag of the same card. `from` and
       * `prevTime` stay at the FIRST move's values, or a rollback would return
       * the card to an intermediate stage it was never really in. */
      const held = state.pending[card.id];
      return {
        ...state,
        byId,
        order: place(state.order, to, card.id, lookup(byId)),
        totals,
        pending: {
          ...state.pending,
          [card.id]: held ? { ...held, to } : { from, to, prevTime: source.lastSalesStageUpdateTime ?? null },
        },
      };
    }

    /* The server's lastSalesStageUpdateTime is the sort key, so the card can
     * only take its final position from the response. Totals already carry this
     * move's ±1 from moveStarted; the debounced refresh corrects them if the
     * server landed the card somewhere else. */
    case 'moveSucceeded': {
      const pending = { ...state.pending };
      delete pending[action.id];
      const current = state.byId[action.id];
      if (!current) return { ...state, pending };
      const { patch } = action;
      const byId = {
        ...state.byId,
        [action.id]: {
          ...current,
          salesStageV2: patch.salesStageV2,
          lastSalesStageUpdateTime: patch.lastSalesStageUpdateTime,
          updatedAt: patch.updatedAt,
        },
      };
      const order = patch.salesStageV2
        ? place(state.order, patch.salesStageV2, action.id, lookup(byId))
        : removeFromAll(state.order, action.id);
      return { ...state, byId, order, pending };
    }

    /* The whole reason this file exists: one card, one inverse patch. Nothing
     * else in the board is read or written. */
    case 'moveFailed': {
      const move = state.pending[action.id];
      if (!move) return state;
      const pending = { ...state.pending };
      delete pending[action.id];
      /* Stamped even when the record has gone: the flash is the only signal a
       * user gets that an optimistic move did not stick. */
      const flash = { ...state.flash, [action.id]: action.now };
      const current = state.byId[action.id];
      if (!current) return { ...state, pending, flash };
      const byId = {
        ...state.byId,
        [action.id]: { ...current, salesStageV2: move.from, lastSalesStageUpdateTime: move.prevTime },
      };
      const totals = { ...state.totals };
      totals[move.to] = Math.max(0, totals[move.to] - 1);
      totals[move.from] = totals[move.from] + 1;
      return {
        ...state,
        byId,
        order: place(state.order, move.from, action.id, lookup(byId)),
        totals,
        pending,
        flash,
      };
    }

    case 'selectionToggled':
      return {
        ...state,
        selection: state.selection.includes(action.id)
          ? state.selection.filter((id) => id !== action.id)
          : [...state.selection, action.id],
      };

    case 'selectionSet':
      return { ...state, selection: [...action.ids] };

    case 'selectionCleared':
      return state.selection.length === 0 ? state : { ...state, selection: [] };

    case 'flashCleared': {
      if (state.flash[action.id] === undefined) return state;
      const flash = { ...state.flash };
      delete flash[action.id];
      return { ...state, flash };
    }

    case 'failed':
      return action.epoch === state.epoch ? { ...state, loading: false, error: action.message } : state;

    case 'errorCleared':
      return state.error === null ? state : { ...state, error: null };
  }
}

export interface ColumnState {
  cards: DealCard[];
  total: number;
  hasNext: boolean;
  endCursor: string | null;
  /** Pages applied since the last reset. */
  pages: number;
  /** A page request is in flight — the column renders skeletons below its cards. */
  loadingMore: boolean;
}

/** Rebuild the board the components consume. Ids with no record are skipped. */
export function selectColumns(state: DealsState): Record<SalesStageV2, ColumnState> {
  const columns = {} as Record<SalesStageV2, ColumnState>;
  for (const stage of STAGES) {
    const cards: DealCard[] = [];
    for (const id of state.order[stage] ?? []) {
      const card = state.byId[id];
      if (card) cards.push(card);
    }
    columns[stage] = {
      cards,
      total: state.totals[stage],
      hasNext: state.paging[stage].hasNext,
      endCursor: state.paging[stage].endCursor,
      pages: state.paging[stage].pages,
      loadingMore: state.paging[stage].loading,
    };
  }
  return columns;
}

/** Selected cards, in board order, skipping ids the board no longer holds. */
export function selectSelectedCards(state: DealsState): DealCard[] {
  const cards: DealCard[] = [];
  for (const stage of STAGES) {
    for (const id of state.order[stage] ?? []) {
      if (state.selection.includes(id)) {
        const card = state.byId[id];
        if (card) cards.push(card);
      }
    }
  }
  return cards;
}

/**
 * May the paging sentinel fetch another page on its own?
 *
 * The cap exists because an unbounded sentinel turns one scroll into a full
 * column download. Past it the column shows a button instead, so nothing
 * becomes unreachable.
 */
export function shouldAutoPage(state: DealsState, stage: SalesStageV2, cap: number): boolean {
  const info = state.paging[stage];
  return Boolean(info && info.hasNext && !info.loading && info.pages < cap && !state.loading);
}
