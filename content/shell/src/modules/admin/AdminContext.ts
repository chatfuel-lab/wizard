import { createContext, useContext } from 'react';
import type { ModuleClient } from '~api';
import type { AdminStore } from './hooks/useAdminStore';

/** What every screen in the panel needs: the store, and the two things the shell owns. */
export interface AdminContextValue {
  client: ModuleClient;
  store: AdminStore;
  /** Point the whole app at a bot. Absent in an embed, and the action is then not offered. */
  selectBot?: (botId: string, workspaceId?: string) => void;
}

export const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const value = useContext(AdminContext);
  if (!value) throw new Error('useAdmin must be called inside AdminApp');
  return value;
}
