import { createContext, useContext } from 'react';
import type { ApiClient } from './types';

export interface BookingsContextValue {
  client: ApiClient;
  botId: string;
}

export const BookingsContext = createContext<BookingsContextValue | null>(null);

export function useBookings(): BookingsContextValue {
  const value = useContext(BookingsContext);
  if (!value) throw new Error('useBookings must be used inside <BookingsApp>');
  return value;
}
