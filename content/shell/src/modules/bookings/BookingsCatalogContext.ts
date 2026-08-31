import { createContext, useContext, type Dispatch } from 'react';
import type { CatalogAction, CatalogState } from './lib/catalogStore';

export interface BookingsCatalogValue {
  state: CatalogState;
  dispatch: Dispatch<CatalogAction>;
  /** Full reload (epoch bump). */
  refresh: () => void;
}

/**
 * Services + specialists for every section (see `lib/catalogStore.ts`).
 * Provided by `BookingsApp`; the staff/services tracks dispatch the
 * `*Written` / `*Replaced` actions from their mutation payloads.
 */
export const BookingsCatalogContext = createContext<BookingsCatalogValue | null>(null);

export function useCatalog(): BookingsCatalogValue {
  const value = useContext(BookingsCatalogContext);
  if (!value) throw new Error('useCatalog must be used inside <BookingsApp>');
  return value;
}
