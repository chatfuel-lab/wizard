import { createContext, useContext } from 'react';
import type { AutomationsStore } from './hooks/useAutomationsStore';

/**
 * The one store (every automation of the bot, live) — see
 * `lib/automationsStore.ts`. Provided in `AutomationsApp`; every view and hook
 * below reads it here. Selectors are pure functions over `state`.
 */
export const AutomationsStoreContext = createContext<AutomationsStore | null>(null);

export function useAutomationRecords(): AutomationsStore {
  const value = useContext(AutomationsStoreContext);
  if (!value) throw new Error('useAutomationRecords must be used inside <AutomationsApp>');
  return value;
}
