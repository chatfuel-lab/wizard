import { createContext, useContext } from 'react';
import type { CoworkerEventBus, CoworkerRuntime } from './lib/runtime';
import type { ApiClient } from './types';

export interface CoworkerContextValue {
  client: ApiClient;
  botId: string;
  /** The ONE bot-scoped subscription, demultiplexed (hooks attach listeners). */
  events: CoworkerEventBus;
  /**
   * The shared runtime behind that bus. It also answers the assistant's
   * screen-context tool and executes its navigations — once, no matter how many
   * surfaces are mounted.
   */
  runtime: CoworkerRuntime;
}

export const CoworkerContext = createContext<CoworkerContextValue | null>(null);

export function useCoworker(): CoworkerContextValue {
  const value = useContext(CoworkerContext);
  if (!value) throw new Error('useCoworker must be used inside <CoworkerApp>');
  return value;
}
