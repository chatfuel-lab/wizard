import { createContext, useContext } from 'react';
import type { ApiClient } from './types';

export interface DealsContextValue {
  client: ApiClient;
  botId: string;
}

export const DealsContext = createContext<DealsContextValue | null>(null);

export function useDeals(): DealsContextValue {
  const value = useContext(DealsContext);
  if (!value) throw new Error('useDeals must be used inside <DealsApp>');
  return value;
}
