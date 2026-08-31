import { createContext, useContext } from 'react';
import type { DraftRegistry } from './lib/drafts';

/** The draft registry (see `lib/drafts.ts`). Provided in `AutomationsApp`. */
export const AutomationsDraftContext = createContext<DraftRegistry | null>(null);

export function useDrafts(): DraftRegistry {
  const value = useContext(AutomationsDraftContext);
  if (!value) throw new Error('useDrafts must be used inside <AutomationsApp>');
  return value;
}
