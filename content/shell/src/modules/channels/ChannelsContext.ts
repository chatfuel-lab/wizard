import { createContext, useContext } from 'react';
import type { ApiClient } from './types';

export interface ChannelsContextValue {
  client: ApiClient;
  botId: string;
}

export const ChannelsContext = createContext<ChannelsContextValue | null>(null);

export function useChannels(): ChannelsContextValue {
  const value = useContext(ChannelsContext);
  if (!value) throw new Error('useChannels must be used inside ChannelsApp');
  return value;
}
