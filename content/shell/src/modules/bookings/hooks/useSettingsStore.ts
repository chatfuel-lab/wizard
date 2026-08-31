import { useCallback, useEffect, useMemo, useReducer } from 'react';
import {
  BookingConfigDocument,
  BookingConfigSetAppointmentsDocument,
  BookingConfigSetConfirmationDocument,
  BookingConfigSetLocaleDocument,
  BookingConfigSetNotificationChannelDocument,
  BookingTimezoneSetDocument,
} from '~api/generated/bookings/graphql';
import type { BookingsSettingsValue } from '../BookingsSettingsContext';
import { errorMessage } from '../lib/errors';
import type { LiveBus } from '../lib/liveBus';
import { initialSettingsState, settingsReducer } from '../lib/settingsStore';
import type { ApiClient, BookingConfig } from '../types';

/**
 * Loads `bot { timezone countryCode fuelyConfig.booking }` and reconciles
 * from every setter's response. Called by `BookingsApp` with props (10b).
 */
export function useSettingsStore(client: ApiClient, botId: string, bus: LiveBus): BookingsSettingsValue {
  const [state, dispatch] = useReducer(settingsReducer, undefined, initialSettingsState);

  useEffect(() => {
    if (state.epoch === 0) return;
    let cancelled = false;
    const epoch = state.epoch;
    client
      .query(BookingConfigDocument, { botID: botId })
      .then((data) => {
        if (cancelled || !data.bot?.fuelyConfig) return;
        dispatch({
          type: 'loaded',
          epoch,
          config: data.bot.fuelyConfig.booking,
          timezone: data.bot.timezone ?? null,
          countryCode: data.bot.countryCode ?? null,
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) dispatch({ type: 'failed', epoch, message: errorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, state.epoch]);

  useEffect(() => {
    dispatch({ type: 'reset' });
  }, [client, botId]);

  useEffect(() => bus.subscribe((event) => event.kind === 'reconnect' && dispatch({ type: 'reset' })), [bus]);

  const refresh = useCallback(() => dispatch({ type: 'reset' }), []);

  const write = useCallback(
    async (
      field: string,
      run: () => Promise<{ fuelyConfig?: { booking: BookingConfig } | null } | null | undefined>,
    ) => {
      dispatch({ type: 'saveStarted', field });
      try {
        const bot = await run();
        if (bot?.fuelyConfig) dispatch({ type: 'configWritten', field, config: bot.fuelyConfig.booking });
        else dispatch({ type: 'saveFailed', field });
      } catch (err) {
        dispatch({ type: 'saveFailed', field });
        throw err;
      }
    },
    [],
  );

  const value = useMemo<BookingsSettingsValue>(
    () => ({
      state,
      refresh,
      setNotificationChannel: (channel) =>
        write(
          'notificationChannel',
          async () =>
            (await client.mutate(BookingConfigSetNotificationChannelDocument, { botID: botId, channel }))
              .fuelyConfigBookingUpdateNotificationChannel,
        ),
      setConfirmation: (enabled, additionalInfo) =>
        write(
          'confirmation',
          async () =>
            (await client.mutate(BookingConfigSetConfirmationDocument, { botID: botId, enabled, additionalInfo }))
              .fuelyConfigBookingUpdateConfirmation,
        ),
      setAppointments: (update) =>
        write(
          'appointments',
          async () =>
            (await client.mutate(BookingConfigSetAppointmentsDocument, { botID: botId, update }))
              .fuelyConfigBookingUpdateAppointments,
        ),
      setLocale: (locale) =>
        write(
          'locale',
          async () =>
            (await client.mutate(BookingConfigSetLocaleDocument, { botID: botId, locale }))
              .fuelyConfigBookingUpdateLocale,
        ),
      setTimezone: async (timezone) => {
        dispatch({ type: 'saveStarted', field: 'timezone' });
        try {
          const data = await client.mutate(BookingTimezoneSetDocument, { botID: botId, timezone });
          dispatch({ type: 'timezoneWritten', timezone: data.botUpdateTimezone.timezone ?? timezone });
        } catch (err) {
          dispatch({ type: 'saveFailed', field: 'timezone' });
          throw err;
        }
      },
    }),
    [state, refresh, write, client, botId],
  );

  return value;
}
