import { createContext, useContext } from 'react';
import type { Selection } from '../types';

export interface SelectionContextValue {
  selection: Selection | null;
  select: (selection: Selection | null) => void;
}

/**
 * Canvas ↔ inspector selection, provided by FlowEditor. A context (not node
 * data) so BlockNode stays memoizable — node data never has to carry
 * callbacks.
 */
export const SelectionContext = createContext<SelectionContextValue>({
  selection: null,
  select: () => undefined,
});

export function useSelection(): SelectionContextValue {
  return useContext(SelectionContext);
}
