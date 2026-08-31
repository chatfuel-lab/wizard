import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DealsColumnDocument,
  DealsTotalsDocument,
  type ContactAssigneeFilter,
  type SalesStageV2,
} from '~api/generated/deals/graphql';
import { useDeals } from '../DealsContext';
import { emptyTotals, windowFilterArgs, type DateWindow, type ForecastRow, type StageTotals } from '../lib/forecast';
import { STAGES } from '../lib/stages';
import type { DealCard } from '../types';

/**
 * Every read the forecast makes, and the seam between its two kinds of number.
 *
 * `DealsTotals` is called **twice** — once per window — which is the whole of
 * period-over-period: `DealsByStagesFilter` already carries
 * `salesStageUpdatedAfter` / `Before`, so no new operation exists for this.
 * Those counts are server truth.
 *
 * The rows are a different thing entirely. `contactDealsConnection` takes no
 * time arguments, so rows arrive unwindowed, most-recently-moved first, and are
 * narrowed to the window client-side (`rowsInWindow`). They exist only because
 * there is no aggregation API: every money figure on this view is a sum over
 * them, which is why `loadRest` is offered and why nothing here ever renders a
 * sum without its coverage.
 */

/** Bigger than the board's page: a rollup over 10 rows of 128 says almost nothing. */
const ROWS_PAGE = 50;

/** `loadRest` stops here rather than paging a 50 000-deal bot forever. */
const MAX_PAGES_PER_STAGE = 20;

export interface StageRowsState {
  nodes: ForecastRow[];
  hasNext: boolean;
  endCursor: string | null;
}

export type RowsByStage = Record<SalesStageV2, StageRowsState>;

export interface DealStatsState {
  loading: boolean;
  /** A `loadRest` pass is in flight. */
  loadingMore: boolean;
  error: string | null;
  /** Server truth for the window. */
  totals: StageTotals;
  /** The same, for the preceding window — null when the window is unbounded. */
  previousTotals: StageTotals | null;
  rows: RowsByStage;
  /** At least one stage has another page the sums are missing. */
  hasMore: boolean;
  loadedRows: number;
  /** Ids of every loaded row — what a CSV export by ids can actually cover. */
  loadedIds: string[];
  refetch: () => void;
  loadRest: () => void;
}

function emptyRows(): RowsByStage {
  const rows = {} as RowsByStage;
  for (const stage of STAGES) rows[stage] = { nodes: [], hasNext: false, endCursor: null };
  return rows;
}

const messageOf = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** `TotalsByStages` carries a `__typename` beside the six counts — read, don't spread. */
function toTotals(source: Partial<Record<SalesStageV2, number>> | undefined | null): StageTotals {
  const totals = emptyTotals();
  for (const stage of STAGES) totals[stage] = source?.[stage] ?? 0;
  return totals;
}

export function useDealStats(
  assigneeFilter: ContactAssigneeFilter,
  fieldNames: string[],
  window: DateWindow,
  previous: DateWindow | null,
): DealStatsState {
  const { client, botId } = useDeals();
  const [nonce, setNonce] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState<StageTotals>(emptyTotals);
  const [previousTotals, setPreviousTotals] = useState<StageTotals | null>(null);
  const [rows, setRows] = useState<RowsByStage>(emptyRows);

  /* The epoch guard the board keeps in its reducer, in the smallest form a
   * hook can have: a window change mid-flight must drop the old responses
   * rather than let them overwrite the new ones. */
  const epochRef = useRef(0);
  /* `loadRest` needs the current cursors without depending on `rows`, or every
   * page it loads would rebuild the callback and re-arm the button mid-flight. */
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const busyRef = useRef(false);

  const { after, before } = window;
  const previousAfter = previous?.after ?? null;
  const previousBefore = previous?.before ?? null;

  useEffect(() => {
    const epoch = epochRef.current + 1;
    epochRef.current = epoch;
    const live = () => epochRef.current === epoch;

    setLoading(true);
    setError(null);

    const totalsFor = (bounds: DateWindow) =>
      client.query(DealsTotalsDocument, {
        botID: botId,
        filter: { assigneeFilter, ...windowFilterArgs(bounds) },
      });

    Promise.all([
      totalsFor({ after, before }),
      previousAfter === null && previousBefore === null
        ? Promise.resolve(null)
        : totalsFor({ after: previousAfter, before: previousBefore }),
      Promise.all(
        STAGES.map((stage) =>
          client.query(DealsColumnDocument, {
            botID: botId,
            first: ROWS_PAGE,
            assigneeFilter,
            stage,
            fieldNames,
          }),
        ),
      ),
    ])
      .then(([current, prior, columns]) => {
        if (!live()) return;
        setTotals(toTotals(current.bot?.contactDealsByStages));
        setPreviousTotals(prior === null ? null : toTotals(prior.bot?.contactDealsByStages));
        const loaded = emptyRows();
        columns.forEach((data, index) => {
          const connection = data.bot?.contactDealsConnection;
          loaded[STAGES[index]!] = {
            nodes: (connection?.edges ?? []).map((edge) => edge.node as DealCard),
            hasNext: Boolean(connection?.pageInfo.hasNextPage),
            endCursor: connection?.pageInfo.endCursor ?? null,
          };
        });
        setRows(loaded);
        setLoading(false);
      })
      .catch((err) => {
        if (!live()) return;
        setError(messageOf(err));
        setLoading(false);
      });
  }, [client, botId, assigneeFilter, fieldNames, after, before, previousAfter, previousBefore, nonce]);

  const refetch = useCallback(() => setNonce((value) => value + 1), []);

  /**
   * Page every stage to the end. This is the "load the rest" the coverage
   * string offers — and it is also what makes a CSV export by ids cover the
   * whole pipeline rather than the first page of it.
   */
  const loadRest = useCallback(() => {
    const epoch = epochRef.current;
    if (busyRef.current) return;
    busyRef.current = true;
    setLoadingMore(true);

    const pageStage = async (stage: SalesStageV2, cursor: string | null): Promise<void> => {
      let next = cursor;
      for (let page = 0; page < MAX_PAGES_PER_STAGE && next !== null; page += 1) {
        const data = await client.query(DealsColumnDocument, {
          botID: botId,
          first: ROWS_PAGE,
          after: next,
          assigneeFilter,
          stage,
          fieldNames,
        });
        if (epochRef.current !== epoch) return;
        const connection = data.bot?.contactDealsConnection;
        const nodes = (connection?.edges ?? []).map((edge) => edge.node as DealCard);
        const hasNext = Boolean(connection?.pageInfo.hasNextPage);
        const endCursor = connection?.pageInfo.endCursor ?? null;
        next = hasNext ? endCursor : null;
        setRows((current) => {
          const existing = current[stage];
          const seen = new Set(existing.nodes.map((node) => node.id));
          return {
            ...current,
            [stage]: {
              nodes: [...existing.nodes, ...nodes.filter((node) => !seen.has(node.id))],
              hasNext: next !== null,
              endCursor: endCursor ?? existing.endCursor,
            },
          };
        });
      }
    };

    const current = rowsRef.current;
    void Promise.all(
      STAGES.map((stage) => (current[stage].hasNext ? pageStage(stage, current[stage].endCursor) : Promise.resolve())),
    )
      .catch((err) => {
        if (epochRef.current === epoch) setError(messageOf(err));
      })
      .finally(() => {
        busyRef.current = false;
        if (epochRef.current === epoch) setLoadingMore(false);
      });
  }, [client, botId, assigneeFilter, fieldNames]);

  const derived = useMemo(() => {
    let loadedRows = 0;
    let hasMore = false;
    const loadedIds: string[] = [];
    for (const stage of STAGES) {
      const state = rows[stage];
      loadedRows += state.nodes.length;
      hasMore = hasMore || state.hasNext;
      for (const node of state.nodes) loadedIds.push(node.id);
    }
    return { loadedRows, hasMore, loadedIds };
  }, [rows]);

  return {
    loading,
    loadingMore,
    error,
    totals,
    previousTotals,
    rows,
    refetch,
    loadRest,
    ...derived,
  };
}
