import { createContext, useContext } from 'react';
import type { ApiClient } from './types';

export interface LivechatContextValue {
  client: ApiClient;
  botId: string;
}

export const LivechatContext = createContext<LivechatContextValue | null>(null);

export function useLivechat(): LivechatContextValue {
  const value = useContext(LivechatContext);
  if (!value) throw new Error('useLivechat must be used inside <LivechatApp>');
  return value;
}
