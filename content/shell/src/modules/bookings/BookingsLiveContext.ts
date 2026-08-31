import { createContext, useContext } from 'react';
import type { LiveBus } from './lib/liveBus';

export interface BookingsLiveValue {
  bus: LiveBus;
  /** Bumped by every event; the header's live dot pulses on it. */
  tick: number;
}

/**
 * The one live channel (see `lib/liveBus.ts`). Provided by `BookingsApp`;
 * every range store, the panel and the availability cache subscribe to the
 * bus below it.
 */
export const BookingsLiveContext = createContext<BookingsLiveValue | null>(null);

export function useBookingsLive(): BookingsLiveValue {
  const value = useContext(BookingsLiveContext);
  if (!value) throw new Error('useBookingsLive must be used inside <BookingsApp>');
  return value;
}
