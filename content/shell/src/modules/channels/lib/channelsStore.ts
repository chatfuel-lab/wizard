/**
 * The page's state: the channels the bot is connected to, and which write is
 * in flight.
 *
 * Pure. Every load answer carries the epoch AND the token it was asked under.
 * The epoch says which load owns the screen — a refresh that overtakes a slow
 * first load must not be overwritten by it. The token says whether anything
 * has been written since the load left: a mutation payload is the newest truth
 * by construction, so it replaces what is held and moves the token, and the
 * read that was already in flight when it landed is dropped on the way back.
 * Without that second number a disconnect could be undone on screen by an
 * answer to a question asked before it.
 *
 * There is no state here for the platform links themselves. The app mints one
 * at the moment somebody presses Connect and leaves for it immediately, so a
 * link is never a thing on screen to keep in sync.
 */
import type { Channels } from './channels';

export type ScopesState =
  { state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; channels: Channels; loadedAt: number };

export interface ChannelsState {
  epoch: number;
  /** Bumped by every load AND every write; a load answers under the one it left with. */
  token: number;
  /** A load is in flight — the first one, or a refresh over data already held. */
  refreshing: boolean;
  scopes: ScopesState;
  /** `connect:${platform}`, `refresh:${platform}` and `disconnect:${scopeId}` keys. */
  pending: readonly string[];
}

export type ChannelsAction =
  | { type: 'reset' }
  | { type: 'scopesLoaded'; epoch: number; token: number; channels: Channels; at: number }
  | { type: 'scopesFailed'; epoch: number; token: number; message: string }
  | { type: 'scopesReplaced'; channels: Channels; at: number }
  | { type: 'opStarted'; key: string }
  | { type: 'opFinished'; key: string };

export function initialChannelsState(): ChannelsState {
  return { epoch: 0, token: 0, refreshing: false, scopes: { state: 'loading' }, pending: [] };
}

export function channelsReducer(state: ChannelsState, action: ChannelsAction): ChannelsState {
  switch (action.type) {
    case 'reset':
      // Data already held stays on screen while the fresh read is in flight.
      return { ...state, epoch: state.epoch + 1, token: state.token + 1, refreshing: true };
    case 'scopesLoaded':
      // Another load owns the screen: this one is not even the newest question.
      if (action.epoch !== state.epoch) return state;
      // A write landed while this read was in flight — its answer is older than
      // what is held, so only the spinner it started is taken back.
      if (action.token !== state.token) return { ...state, refreshing: false };
      return {
        ...state,
        refreshing: false,
        scopes: { state: 'ready', channels: action.channels, loadedAt: action.at },
      };
    case 'scopesFailed':
      if (action.epoch !== state.epoch) return state;
      if (action.token !== state.token) return { ...state, refreshing: false };
      return { ...state, refreshing: false, scopes: { state: 'error', message: action.message } };
    case 'scopesReplaced':
      return {
        ...state,
        token: state.token + 1,
        scopes: { state: 'ready', channels: action.channels, loadedAt: action.at },
      };
    case 'opStarted':
      return state.pending.includes(action.key) ? state : { ...state, pending: [...state.pending, action.key] };
    case 'opFinished':
      return { ...state, pending: state.pending.filter((key) => key !== action.key) };
  }
}
