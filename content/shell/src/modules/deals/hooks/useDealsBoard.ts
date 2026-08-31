import { useCallback, useEffect, useMemo, useReducer } from 'react';
import type { ContactAssigneeFilter, SalesStageV2 } from '~api/generated/deals/graphql';
import { AUTO_PAGE_CAP } from '../lib/constants';
import {
  dealsReducer,
  initialDealsState,
  selectColumns,
  selectSelectedCards,
  shouldAutoPage,
  type ColumnState,
  type DealsQueryVars,
} from '../lib/dealsStore';
import type { DealCard } from '../types';
import { useDealMutations, type MoveReport } from './useDealMutations';
import { useDealsData } from './useDealsData';
import { useDealsLive } from './useDealsLive';

export type { ColumnState };

export interface DealsBoardState {
  columns: Record<SalesStageV2, ColumnState>;
  /** The one record cache — what a drag payload resolves ids against. */
  byId: Record<string, DealCard>;
  selection: string[];
  selectedCards: DealCard[];
  /** id → the timestamp of a rollback, so exactly that card flashes. */
  flash: Record<string, number>;
  loading: boolean;
  /** A load failure. Mutation failures are toasts, not this. */
  error: string | null;
  refetchAll: () => void;
  loadMore: (stage: SalesStageV2) => void;
  /** Fetch the next page only while the column is under the auto-page cap. */
  autoPage: (stage: SalesStageV2) => void;
  moveDeal: (card: DealCard, to: SalesStageV2) => Promise<MoveReport>;
  moveDeals: (cards: readonly DealCard[], to: SalesStageV2) => Promise<MoveReport>;
  toggleSelect: (id: string) => void;
  setSelection: (ids: readonly string[]) => void;
  clearSelection: () => void;
  clearFlash: (id: string) => void;
}

/**
 * The board, assembled: one pure reducer (`lib/dealsStore.ts`) and three thin
 * hooks over it — reads, the live channel, and optimistic writes.
 *
 * `fieldNames` comes from `useDealFields` and is *not* awaited: names that do
 * not exist yet are omitted from the response rather than erroring, so the
 * board loads on the configured names and resets once if the catalog resolves
 * an alias.
 */
export function useDealsBoard(assigneeFilter: ContactAssigneeFilter, fieldNames: string[]): DealsBoardState {
  const vars = useMemo<DealsQueryVars>(() => ({ filter: assigneeFilter, fieldNames }), [assigneeFilter, fieldNames]);
  const [state, dispatch] = useReducer(dealsReducer, vars, initialDealsState);
  const { refetchAll, loadMore } = useDealsData(state, dispatch);
  useDealsLive(state, dispatch);
  const { moveDeal, moveDeals } = useDealMutations(state, dispatch);

  /* A filter or field-name change is a reset, not a remount. Declared after the
   * hooks above on purpose: in the commit where the props change, `state.vars`
   * is still the old object, so their effects do not fire a round of doomed
   * requests before this dispatch lands. */
  useEffect(() => {
    if (state.vars !== vars) dispatch({ type: 'reset', vars });
  }, [vars, state.vars]);

  /* Narrow deps on purpose: a selection toggle or a flash must not rebuild all
   * six columns while the drag's rAF loop is running. */
  const { byId, order, totals, paging, selection, flash } = state;
  const columns = useMemo(
    () => selectColumns(state),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
    [byId, order, totals, paging],
  );
  const selectedCards = useMemo(
    () => selectSelectedCards(state),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
    [byId, order, selection],
  );

  const autoPage = useCallback(
    (stage: SalesStageV2) => {
      if (shouldAutoPage(state, stage, AUTO_PAGE_CAP)) loadMore(stage);
    },
    [state, loadMore],
  );

  const toggleSelect = useCallback((id: string) => dispatch({ type: 'selectionToggled', id }), []);
  const setSelection = useCallback((ids: readonly string[]) => dispatch({ type: 'selectionSet', ids }), []);
  const clearSelection = useCallback(() => dispatch({ type: 'selectionCleared' }), []);
  const clearFlash = useCallback((id: string) => dispatch({ type: 'flashCleared', id }), []);

  return {
    columns,
    byId,
    selection,
    selectedCards,
    flash,
    loading: state.loading,
    error: state.error,
    refetchAll,
    loadMore,
    autoPage,
    moveDeal,
    moveDeals,
    toggleSelect,
    setSelection,
    clearSelection,
    clearFlash,
  };
}
