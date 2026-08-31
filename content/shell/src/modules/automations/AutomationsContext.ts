import { createContext, useContext } from 'react';
import type { ApiClient } from './types';

export interface AutomationsContextValue {
  client: ApiClient;
  botId: string;
}

export const AutomationsContext = createContext<AutomationsContextValue | null>(null);

export function useAutomations(): AutomationsContextValue {
  const value = useContext(AutomationsContext);
  if (!value) throw new Error('useAutomations must be used inside <AutomationsApp>');
  return value;
}
