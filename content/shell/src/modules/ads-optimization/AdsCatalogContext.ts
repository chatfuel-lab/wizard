import { createContext, useContext } from 'react';
import type { Catalog } from './hooks/useCatalogStore';

export const AdsCatalogContext = createContext<Catalog | null>(null);

export function useCatalog(): Catalog {
  const value = useContext(AdsCatalogContext);
  if (!value) throw new Error('useCatalog must be used inside <AdsOptimizationApp>');
  return value;
}
