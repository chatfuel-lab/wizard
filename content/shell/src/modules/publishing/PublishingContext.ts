import { createContext, useContext } from 'react';
import type { ApiClient } from './types';

export interface PublishingContextValue {
  client: ApiClient;
  botId: string;
}

export const PublishingContext = createContext<PublishingContextValue | null>(null);

export function usePublishing(): PublishingContextValue {
  const value = useContext(PublishingContext);
  if (!value) throw new Error('usePublishing must be used inside PublishingApp');
  return value;
}
