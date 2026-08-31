/**
 * The booking panel's own record.
 *
 * Why the panel does not just read the range store: `?b=<id>` may point at a
 * booking outside every loaded window (a link from Live Chat, a stale tab),
 * so opening always fetches `BookingGet`; the range store's copy, when there
 * is one, is the first paint (`seed`). Live events keep it fresh; a `remove`
 * for the open id sets `gone`, and the panel says so instead of showing a
 * booking that no longer exists (livechat's `contactStore` pattern).
 */
import type { BookingRecord } from '../types';
import type { LiveEvent } from './rangeStore';

export interface DetailState {
  bookingId: string | null;
  booking: BookingRecord | null;
  epoch: number;
  loading: boolean;
  error: string | null;
  /** The server no longer has it. */
  gone: boolean;
  /** A write is in flight (the panel's controls disable). */
  saving: boolean;
}

export type DetailAction =
  | { type: 'opened'; id: string; seed: BookingRecord | null }
  | { type: 'closed' }
  | { type: 'refetch' }
  | { type: 'loaded'; epoch: number; booking: BookingRecord }
  | { type: 'failed'; epoch: number; message: string; notFound: boolean }
  | { type: 'live'; event: LiveEvent }
  | { type: 'saveStarted' }
  | { type: 'written'; booking: BookingRecord }
  | { type: 'saveFailed' }
  | { type: 'errorCleared' };

export function initialDetailState(): DetailState {
  return { bookingId: null, booking: null, epoch: 0, loading: false, error: null, gone: false, saving: false };
}

export function detailReducer(state: DetailState, action: DetailAction): DetailState {
  switch (action.type) {
    case 'opened':
      return {
        bookingId: action.id,
        booking: action.seed,
        epoch: state.epoch + 1,
        loading: true,
        error: null,
        gone: false,
        saving: false,
      };
    case 'closed':
      return { ...initialDetailState(), epoch: state.epoch + 1 };
    case 'refetch':
      if (!state.bookingId) return state;
      return { ...state, epoch: state.epoch + 1, loading: true, error: null };
    case 'loaded':
      if (action.epoch !== state.epoch || action.booking.id !== state.bookingId) return state;
      return { ...state, booking: action.booking, loading: false, error: null, gone: false };
    case 'failed':
      if (action.epoch !== state.epoch) return state;
      return {
        ...state,
        loading: false,
        error: action.notFound ? null : action.message,
        gone: action.notFound || state.gone,
      };
    case 'live': {
      const event = action.event;
      if (!state.bookingId) return state;
      if (event.kind === 'remove') return event.id === state.bookingId ? { ...state, gone: true } : state;
      return event.booking.id === state.bookingId && !state.saving
        ? { ...state, booking: event.booking, gone: false }
        : state;
    }
    case 'saveStarted':
      return { ...state, saving: true, error: null };
    case 'written':
      if (action.booking.id !== state.bookingId) return { ...state, saving: false };
      return { ...state, booking: action.booking, saving: false, gone: false };
    case 'saveFailed':
      return { ...state, saving: false };
    case 'errorCleared':
      return state.error === null ? state : { ...state, error: null };
  }
}
