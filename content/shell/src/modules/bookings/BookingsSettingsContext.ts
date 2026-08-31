import { createContext, useContext } from 'react';
import type {
  DashboardLocale,
  FuelyBookingNotificationChannel,
  FuelyConfigBookingAppointmentsUpdateInput,
} from '~api/generated/bookings/graphql';
import type { SettingsState } from './lib/settingsStore';

export interface BookingsSettingsValue {
  state: SettingsState;
  refresh: () => void;
  /** Each resolves after the store has reconciled from the response; rejects with the API error. */
  setNotificationChannel: (channel: FuelyBookingNotificationChannel) => Promise<void>;
  setConfirmation: (enabled: boolean, additionalInfo: string | null) => Promise<void>;
  setAppointments: (update: FuelyConfigBookingAppointmentsUpdateInput) => Promise<void>;
  setLocale: (locale: DashboardLocale) => Promise<void>;
  setTimezone: (timezone: string) => Promise<void>;
}

/**
 * The bot's booking configuration and time zone (see `lib/settingsStore.ts`).
 * Provided by `BookingsApp` because the workspace needs `timezone` to know
 * which wall clock to render before any section mounts.
 */
export const BookingsSettingsContext = createContext<BookingsSettingsValue | null>(null);

export function useSettings(): BookingsSettingsValue {
  const value = useContext(BookingsSettingsContext);
  if (!value) throw new Error('useSettings must be used inside <BookingsApp>');
  return value;
}
