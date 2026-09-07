import { createContext, useContext } from 'react';
import type { Navigate } from '../types';
import type { ApiClient } from './types';

export interface BroadcastsContextValue {
  client: ApiClient;
  botId: string;
  /** Somewhere else in the app — how "Connect WhatsApp" reaches the channels module. */
  navigate: Navigate;
  /** The ids in this deployment's registry; absent in an embed. */
  installedModules: readonly string[];
}

export const BroadcastsContext = createContext<BroadcastsContextValue | null>(null);

export function useBroadcasts(): BroadcastsContextValue {
  const value = useContext(BroadcastsContext);
  if (!value) throw new Error('useBroadcasts must be used inside BroadcastsApp');
  return value;
}
