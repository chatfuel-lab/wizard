import { useCallback, useEffect, type Dispatch } from 'react';
import { DealsColumnDocument, DealsTotalsDocument, type SalesStageV2 } from '~api/generated/deals/graphql';
import { useDeals } from '../DealsContext';
import { PAGE_SIZE, TOTALS_DEBOUNCE_MS } from '../lib/constants';
import type { DealsAction, DealsState, LoadedPage } from '../lib/dealsStore';
import { STAGES } from '../lib/stages';
import type { DealCard } from '../types';

export interface DealsDataActions {
  refetchAll: () => void;
  loadMore: (stage: SalesStageV2) => void;
}

const messageOf = (err: unknown): string => (err instanceof Error ? err.message : String(err));

interface Connection {
  edges: ReadonlyArray<{ node: DealCard }>;
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
}

const toPage = (stage: SalesStageV2, connection: Connection | undefined): LoadedPage => ({
  stage,
  nodes: (connection?.edges ?? []).map((edge) => edge.node),
  hasNext: Boolean(connection?.pageInfo.hasNextPage),
  endCursor: connection?.pageInfo.endCursor ?? null,
});

/**
 * Every read the board makes.
 *
 * The epoch bump IS the request: `refetchAll` only dispatches `reset`, and the
 * load effect keyed on `state.epoch` issues the six column queries. Responses
 * carry the epoch they were issued under, so a filter change mid-flight lets
 * the reducer drop them rather than racing the new ones.
 */
export function useDealsData(state: DealsState, dispatch: Dispatch<DealsAction>): DealsDataActions {
  const { client, botId } = useDeals();
  const { epoch, vars, liveTick, paging } = state;
  const { filter, fieldNames } = vars;

  const refetchAll = useCallback(() => dispatch({ type: 'reset', vars }), [dispatch, vars]);

  const refreshTotals = useCallback(() => {
    client
      .query(DealsTotalsDocument, { botID: botId, filter: { assigneeFilter: filter } })
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
        /* totals are decoration */
      });
  }, [client, botId, dispatch, epoch, filter]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      STAGES.map((stage) =>
        client.query(DealsColumnDocument, {
          botID: botId,
          first: PAGE_SIZE,
          assigneeFilter: filter,
          stage,
          fieldNames,
        }),
      ),
    )
      .then((results) => {
        if (cancelled) return;
        dispatch({
          type: 'columnsLoaded',
          epoch,
          pages: results.map((data, index) => toPage(STAGES[index]!, data.bot?.contactDealsConnection)),
        });
      })
      .catch((err) => {
        if (!cancelled) dispatch({ type: 'failed', epoch, message: messageOf(err) });
      });
    refreshTotals();
    return () => {
      cancelled = true;
    };
  }, [client, botId, dispatch, epoch, fieldNames, filter, refreshTotals]);

  /* The debounce IS the effect's cleanup: a fresh batch re-runs the effect,
   * which cancels the previous timer. No ref, and nothing to clear on unmount. */
  useEffect(() => {
    if (liveTick === 0) return;
    const timer = setTimeout(refreshTotals, TOTALS_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [liveTick, refreshTotals]);

  const loadMore = useCallback(
    (stage: SalesStageV2) => {
      const info = paging[stage];
      const after = info.endCursor;
      // The sentinel can fire again before a page lands; the reducer guards too,
      // but a duplicate request would still cost a round trip.
      if (!after || !info.hasNext || info.loading) return;
      dispatch({ type: 'pageRequested', epoch, stage });
      client
        .query(DealsColumnDocument, {
          botID: botId,
          first: PAGE_SIZE,
          after,
          assigneeFilter: filter,
          stage,
          fieldNames,
        })
        .then((data) => {
          dispatch({ type: 'pageLoaded', epoch, page: toPage(stage, data.bot?.contactDealsConnection) });
        })
        .catch(() => refetchAll()); // stale cursor and friends → clean restart
    },
    [client, botId, dispatch, epoch, fieldNames, filter, paging, refetchAll],
  );

  return { refetchAll, loadMore };
}
