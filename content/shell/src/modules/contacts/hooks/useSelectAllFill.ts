import { useEffect, useMemo, useState } from 'react';
import { MAX_BULK } from '../lib/bulk';
import { fillStep, isPageSelected, selectAllPlan, selectableIds, type SelectAllPlan } from '../lib/tableSelection';
import type { ContactsData } from './useContactsStore';

export interface SelectAllFillApi {
  /** How many rows the loop is filling towards; null when no fill is running. */
  fillTarget: number | null;
  setFillTarget: (target: number | null) => void;
  selectAll: SelectAllPlan;
  /** Whether "select everything that matches" is worth offering at all. */
  canSelectAll: boolean;
}

/**
 * "Select everything that matches" is a paging loop, because there is no
 * server-side selection: a selection is only real once the rows are loaded.
 * The effect pulls one page per pass until the target is reached, then makes
 * the selection and stops.
 */
export function useSelectAllFill(store: ContactsData): SelectAllFillApi {
  const { state, rows, counts } = store;
  const [fillTarget, setFillTarget] = useState<number | null>(null);

  useEffect(() => {
    if (fillTarget === null) return;
    const step = fillStep({
      loading: state.loading,
      paging: state.paging,
      loaded: state.order.length,
      target: fillTarget,
      hasNext: state.hasNext,
    });
    if (step === 'wait') return;
    if (step === 'finish') {
      store.setSelection(selectableIds(rows).slice(0, fillTarget));
      setFillTarget(null);
      return;
    }
    store.loadMore();
  }, [fillTarget, state.loading, state.paging, state.order.length, state.hasNext, rows, store]);

  const selectAll = useMemo(
    () => selectAllPlan(counts.serverCount, state.order.length, state.hasNext, MAX_BULK),
    [counts.serverCount, state.order.length, state.hasNext],
  );

  const canSelectAll =
    isPageSelected(rows, state.selection) &&
    (counts.serverCount === null ? state.hasNext : counts.serverCount > state.selection.length);

  return { fillTarget, setFillTarget, selectAll, canSelectAll };
}
