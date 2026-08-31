import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  DealSetStageDocument,
  DealsAttributeSearchDocument,
  DealsSegmentCountDocument,
  DealsTableChatsDocument,
  DealsTableCountDocument,
  DealsTotalsDocument,
  type SalesStageV2,
} from '~api/generated/deals/graphql';
import { useDeals } from '../DealsContext';
import { TOTALS_DEBOUNCE_MS } from '../lib/constants';
import {
  TABLE_PAGE_SIZE,
  canAutoPage,
  dealsTableReducer,
  initialTableState,
  needsManualPage,
  selectCaveats,
  selectRows,
  selectSelectedRows,
  type LoadedRows,
} from '../lib/dealsTableStore';
import { countFilterOf, type Caveat, type QueryPlan } from '../lib/queryPlan';
import { STAGES } from '../lib/stages';
import { EMPTY_STAGE_REPORT, movableRows, type StageChange, type StageChangeReport } from '../lib/tableSelection';
import type { DealsTableRow } from '../types';
import { useDealsTableLive } from './useDealsTableLive';

export interface DealsTableApi {
  rows: DealsTableRow[];
  /** The one record cache — what an id from a menu or a hotkey resolves against. */
  byId: Record<string, DealsTableRow>;
  selection: string[];
  /** The selected rows, in display order. */
  selectedRows: DealsTableRow[];
  /** The server's own number — `contactChatsCountV2` or `contactsCount`. */
  count: number | null;
  caveats: Caveat[];
  loading: boolean;
  loadingMore: boolean;
  /** The scroll sentinel may fetch the next page itself. */
  autoPage: boolean;
  /** Past the cap: the next page needs a click. */
  manualPage: boolean;
  /** Bumped by every applied live batch — what the row-enter animation keys on. */
  liveTick: number;
  /** A load failure. Mutation failures are toasts, not this. */
  error: string | null;
  refetch: () => void;
  loadMore: () => void;
  setSelection: (ids: readonly string[]) => void;
  clearSelection: () => void;
  /**
   * Optimistic stage change for one row or a whole selection. There is no bulk
   * mutation in this API, so it is N sequential round trips and a partial
   * failure is an ordinary outcome — hence a report rather than a void.
   */
  setStage: (ids: readonly string[], to: SalesStageV2) => Promise<StageChangeReport>;
}

const messageOf = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** The half of a `ContactConnection` both engines answer with. */
interface Connection {
  edges: ReadonlyArray<{ node: DealsTableRow }>;
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
}

const toPage = (connection: Connection | undefined): LoadedRows => ({
  nodes: (connection?.edges ?? []).map((edge) => edge.node),
  hasNext: Boolean(connection?.pageInfo.hasNextPage),
  endCursor: connection?.pageInfo.endCursor ?? null,
});

/**
 * The table, assembled: one pure reducer (`lib/dealsTableStore.ts`), one pure
 * routing decision (`lib/queryPlan.ts`), and this — the reads, the writes and
 * the live channel over them.
 *
 * The plan IS the request. `refetch` only dispatches `reset`, whose epoch bump
 * makes the load effect fire; every response carries the epoch it was issued
 * under, so a filter changed mid-flight lets the reducer drop the old answers
 * rather than racing the new ones. It is also why nothing here needs a
 * cancellation token beyond the effect's own `cancelled` flag.
 *
 * Which document is sent is never decided here — `plan.engine` decided it, and
 * `plan.vars` is already exactly that document's variables minus paging.
 */
export function useDealsTable(plan: QueryPlan): DealsTableApi {
  const { client, botId } = useDeals();
  const [state, dispatch] = useReducer(dealsTableReducer, plan, initialTableState);
  const { epoch, plan: active, endCursor, liveTick, loading, loadingMore } = state;

  useDealsTableLive(state, dispatch);

  const refetch = useCallback(() => dispatch({ type: 'reset', plan: active }), [active]);

  /** One page, from whichever engine the plan chose. */
  const fetchPage = useCallback(
    (after: string | null): Promise<LoadedRows> =>
      active.engine === 'chats'
        ? client
            .query(DealsTableChatsDocument, {
              botID: botId,
              first: TABLE_PAGE_SIZE,
              after,
              ...active.vars,
            })
            .then((data) => toPage(data.bot?.contactChatsConnection))
        : client
            .query(DealsAttributeSearchDocument, {
              botID: botId,
              first: TABLE_PAGE_SIZE,
              after,
              ...active.vars,
            })
            .then((data) => toPage(data.bot?.contactsConnection)),
    [client, botId, active],
  );

  /**
   * The count, and — under engine B only — the per-stage totals it is compared
   * against. `DealsTotals` is what turns "deals with no conversation" from a
   * guess into a measurement, so it is fetched even though nothing else on the
   * table needs it.
   */
  const refreshCounts = useCallback(() => {
    if (active.engine === 'chats') {
      client
        .query(DealsTableCountDocument, { botID: botId, filter: countFilterOf(active.vars) })
        .then((data) => dispatch({ type: 'countLoaded', epoch, count: data.bot?.contactChatsCountV2 ?? null }))
        .catch(() => {
          /* a missing count is a missing number, not an error state */
        });
      client
        .query(DealsTotalsDocument, {
          botID: botId,
          filter: { assigneeFilter: active.vars.assigneeFilter },
        })
        .then((data) => {
          const totals = data.bot?.contactDealsByStages;
          if (!totals) return;
          dispatch({
            type: 'totalsLoaded',
            epoch,
            totals: Object.fromEntries(STAGES.map((stage) => [stage, totals[stage] ?? 0])) as Record<
              SalesStageV2,
              number
            >,
          });
        })
        .catch(() => {
          /* without totals the gap is simply not stated */
        });
      return;
    }
    client
      .query(DealsSegmentCountDocument, {
        botID: botId,
        platforms: active.vars.platforms,
        segment: active.vars.segment,
      })
      .then((data) => dispatch({ type: 'countLoaded', epoch, count: data.bot?.contactsCount ?? null }))
      .catch(() => {
        /* as above */
      });
  }, [client, botId, epoch, active]);

  useEffect(() => {
    let cancelled = false;
    fetchPage(null)
      .then((page) => {
        if (!cancelled) dispatch({ type: 'pageLoaded', epoch, page, append: false });
      })
      .catch((err) => {
        if (!cancelled) dispatch({ type: 'failed', epoch, message: messageOf(err) });
      });
    refreshCounts();
    return () => {
      cancelled = true;
    };
  }, [epoch, fetchPage, refreshCounts]);

  /* The debounce IS the effect's cleanup: a fresh batch re-runs the effect,
   * which cancels the previous timer. No ref, nothing to clear on unmount. */
  useEffect(() => {
    if (liveTick === 0) return;
    const timer = setTimeout(refreshCounts, TOTALS_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [liveTick, refreshCounts]);

  const loadMore = useCallback(() => {
    if (endCursor === null || loading || loadingMore) return;
    dispatch({ type: 'loadMoreStarted', epoch });
    fetchPage(endCursor)
      .then((page) => dispatch({ type: 'pageLoaded', epoch, page, append: true }))
      .catch((err) => dispatch({ type: 'failed', epoch, message: messageOf(err) }));
  }, [endCursor, loading, loadingMore, epoch, fetchPage]);

  const setSelection = useCallback((ids: readonly string[]) => dispatch({ type: 'selectionSet', ids }), []);
  const clearSelection = useCallback(() => dispatch({ type: 'selectionCleared' }), []);

  /* Read through refs rather than captured in the closure, so `setStage` is
   * referentially stable. The undo runner is stored in `DealsUndoContext` for
   * up to a minute and invoked long after the render that built it: a captured
   * `epoch` would be the one from before the next refetch, and the compensating
   * move would then be dropped by the reducer's epoch guard. */
  const liveRef = useRef({ epoch, byId: state.byId });
  liveRef.current = { epoch, byId: state.byId };

  /**
   * Optimistic stage change, by id.
   *
   * Nothing is captured but ids: the inverse patch lives in the reducer, which
   * is what makes the rollback correct under StrictMode's double invocation and
   * stops one failure from reverting another row's success.
   *
   * **Optimism is batched, the network is sequential** — every
   * `stageChangeStarted` goes out first so a bulk move lands as one visual
   * change, and the mutations then run one at a time, exactly as the board's
   * `useDealMutations` does. A failure is reported rather than dispatched as
   * `failed`: that field is the load error the table renders as an Alert, and a
   * mutation that did not stick belongs in a toast next to its Undo.
   */
  const setStage = useCallback(
    async (ids: readonly string[], to: SalesStageV2): Promise<StageChangeReport> => {
      const { epoch: current, byId } = liveRef.current;
      const targets = movableRows(ids, byId, to);
      if (targets.length === 0) return EMPTY_STAGE_REPORT;

      const now = new Date().toISOString();
      for (const row of targets) {
        dispatch({ type: 'stageChangeStarted', epoch: current, id: row.id, to, now });
      }

      const moved: StageChange[] = [];
      const failed: DealsTableRow[] = [];
      let message: string | null = null;

      for (const row of targets) {
        try {
          const data = await client.mutate(DealSetStageDocument, {
            contactID: row.id,
            stage: to,
          });
          dispatch({ type: 'stageChangeSucceeded', id: row.id, patch: data.contactSetSalesStage });
          moved.push({ row, from: row.salesStageV2 ?? null });
        } catch (err) {
          dispatch({ type: 'stageChangeFailed', id: row.id });
          failed.push(row);
          message ??= messageOf(err);
        }
      }

      return { moved, failed, message };
    },
    [client],
  );

  /* Declared after the effects above on purpose: in the commit where `plan`
   * changes, `state.plan` is still the old object, so nothing fires a round of
   * doomed requests before this dispatch lands. */
  useEffect(() => {
    if (active !== plan) dispatch({ type: 'reset', plan });
  }, [plan, active]);

  const rows = useMemo(() => selectRows(state), [state]);
  const selectedRows = useMemo(() => selectSelectedRows(state), [state]);
  const caveats = useMemo(() => selectCaveats(state), [state]);

  return {
    rows,
    byId: state.byId,
    selection: state.selection,
    selectedRows,
    caveats,
    count: state.serverCount,
    loading: state.loading,
    loadingMore: state.loadingMore,
    autoPage: canAutoPage(state),
    manualPage: needsManualPage(state),
    liveTick: state.liveTick,
    error: state.error,
    refetch,
    loadMore,
    setSelection,
    clearSelection,
    setStage,
  };
}
