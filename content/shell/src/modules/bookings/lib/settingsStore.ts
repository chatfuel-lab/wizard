/**
 * The bot's booking configuration and time zone. Read once, reconciled from
 * every setter's response (each `fuelyConfigBooking*` mutation answers with
 * the whole `Bot { fuelyConfig { booking } }`), nothing optimistic — a
 * settings row shows its own saving state.
 */
import type { BookingConfig } from '../types';

export interface SettingsState {
  config: BookingConfig | null;
  timezone: string | null;
  countryCode: string | null;
  epoch: number;
  loading: boolean;
  error: string | null;
  /** Field ids currently being written; the row disables itself. */
  saving: string[];
}

export type SettingsAction =
  | { type: 'reset' }
  | { type: 'loaded'; epoch: number; config: BookingConfig; timezone: string | null; countryCode: string | null }
  | { type: 'failed'; epoch: number; message: string }
  | { type: 'saveStarted'; field: string }
  | { type: 'configWritten'; field: string; config: BookingConfig }
  | { type: 'timezoneWritten'; timezone: string | null }
  | { type: 'saveFailed'; field: string }
  | { type: 'errorCleared' };

export function initialSettingsState(): SettingsState {
  return { config: null, timezone: null, countryCode: null, epoch: 0, loading: false, error: null, saving: [] };
}

export function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'reset':
      return { ...state, epoch: state.epoch + 1, loading: true, error: null };
    case 'loaded':
      if (action.epoch !== state.epoch) return state;
      return {
        ...state,
        loading: false,
        error: null,
        config: action.config,
        timezone: action.timezone,
        countryCode: action.countryCode,
      };
    case 'failed':
      if (action.epoch !== state.epoch) return state;
      return { ...state, loading: false, error: action.message };
    case 'saveStarted':
      return state.saving.includes(action.field) ? state : { ...state, saving: [...state.saving, action.field] };
    case 'configWritten':
      return { ...state, config: action.config, saving: state.saving.filter((f) => f !== action.field) };
    case 'timezoneWritten':
      return { ...state, timezone: action.timezone, saving: state.saving.filter((f) => f !== 'timezone') };
    case 'saveFailed':
      return { ...state, saving: state.saving.filter((f) => f !== action.field) };
    case 'errorCleared':
      return state.error === null ? state : { ...state, error: null };
  }
}
