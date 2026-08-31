import type { ChatListFilter } from '~api/domain/livechat';

/**
 * `ChatListCount` as a reducer — how many contacts the current filter matches.
 *
 * A count is a single number, which makes it look like it needs no state
 * machine at all. It needs one for the same reason the list does: the answer
 * arrives asynchronously and a filter can change while it is in flight. Two
 * requests raced, oldest-last, and the number under the filters describes a
 * question nobody asked any more. `tsc` cannot see it, and neither can a
 * node-only vitest looking at a component, so it lives here.
 *
 * The refilter/refetch split is the same one `chatListStore` draws, and for the
 * same reason:
 *
 * - **refilter** — the filter changed. The number on screen counts a different
 *   set, so it goes. A stale count beside fresh rows is worse than no count:
 *   "1,204" over three visible conversations reads as a broken list, where an
 *   empty slot reads as "still counting".
 * - **refetch** — same filter, asked again after a reconnect. The number is
 *   still the best answer anyone has, so it stays on screen until a better one
 *   lands and nothing flickers.
 *
 * Failure is not an error state. The count is decoration around a list that
 * renders perfectly well without it, so a failed count renders as absent.
 */
export interface InboxCountState {
  /** The count, or null while it is unknown. */
  count: number | null;
  filter: ChatListFilter;
  /** The request counter; every response carries the epoch it was issued under. */
  epoch: number;
  /** A request is outstanding. */
  loading: boolean;
}

export type InboxCountAction =
  | { type: 'refilter'; filter: ChatListFilter }
  | { type: 'refetch' }
  | { type: 'counted'; epoch: number; count: number }
  | { type: 'failed'; epoch: number };

export function initialInboxCountState(filter: ChatListFilter): InboxCountState {
  return { count: null, filter, epoch: 0, loading: true };
}

export function inboxCountReducer(state: InboxCountState, action: InboxCountAction): InboxCountState {
  switch (action.type) {
    case 'refilter':
      return { count: null, filter: action.filter, epoch: state.epoch + 1, loading: true };

    case 'refetch':
      return { ...state, epoch: state.epoch + 1, loading: true };

    case 'counted':
      return action.epoch === state.epoch ? { ...state, count: action.count, loading: false } : state;

    /* Keeps whatever number was already there. A dropped request does not make
       the previous answer untrue, and blanking the slot on a transient network
       blip would be the only visible consequence of an error nobody can act on. */
    case 'failed':
      return action.epoch === state.epoch ? { ...state, loading: false } : state;
  }
}
