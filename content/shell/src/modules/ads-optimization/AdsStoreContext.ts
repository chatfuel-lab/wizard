import { createContext, useContext } from 'react';
import type { EventSetsStore } from './hooks/useEventSetsStore';

export const AdsStoreContext = createContext<EventSetsStore | null>(null);

export function useEventSets(): EventSetsStore {
  const value = useContext(AdsStoreContext);
  if (!value) throw new Error('useEventSets must be used inside <AdsOptimizationApp>');
  return value;
}
