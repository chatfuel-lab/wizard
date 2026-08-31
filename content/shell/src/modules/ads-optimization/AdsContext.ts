import { createContext, useContext } from 'react';
import type { ApiClient } from './types';

export interface AdsContextValue {
  client: ApiClient;
  botId: string;
}

export const AdsContext = createContext<AdsContextValue | null>(null);

export function useAds(): AdsContextValue {
  const value = useContext(AdsContext);
  if (!value) throw new Error('useAds must be used inside <AdsOptimizationApp>');
  return value;
}
