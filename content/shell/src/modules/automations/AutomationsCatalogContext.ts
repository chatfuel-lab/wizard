import { createContext, useContext } from 'react';
import type { CatalogValue } from './hooks/useBootstrap';

/**
 * Connected channels, team, attribute catalog, knowledge-base facts (see
 * `hooks/useBootstrap.ts`). Provided in `AutomationsApp`.
 */
export const AutomationsCatalogContext = createContext<CatalogValue | null>(null);

export function useCatalog(): CatalogValue {
  const value = useContext(AutomationsCatalogContext);
  if (!value) throw new Error('useCatalog must be used inside <AutomationsApp>');
  return value;
}
