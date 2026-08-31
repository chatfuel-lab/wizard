/**
 * The unseen-conversations badge.
 *
 * It lives beside the list because it is a summary of the same result set, and
 * because it is the third thing that has to refetch on reconnect — the thread
 * and the list being the other two. Its own defect was the mirror image of the
 * list's: with no epoch at all, the response to a pre-reconnect query would
 * land after the live channel had already pushed the true count and quietly
 * put the stale number back on the badge.
 */
export interface UnseenState {
  count: number;
  /** The request counter. Only a refetch bumps it, because the query effect is
   *  keyed on it and a live push must not cost a round trip. */
  epoch: number;
  /** The epoch whose response is still wanted, or null once something fresher landed. */
  awaiting: number | null;
}

export type UnseenAction =
  { type: 'refetch' } | { type: 'counted'; epoch: number; count: number } | { type: 'pushed'; count: number };

export const initialUnseenState: UnseenState = { count: 0, epoch: 0, awaiting: 0 };

export function unseenReducer(state: UnseenState, action: UnseenAction): UnseenState {
  switch (action.type) {
    case 'refetch': {
      const epoch = state.epoch + 1;
      return { ...state, epoch, awaiting: epoch };
    }

    case 'counted':
      return action.epoch === state.awaiting ? { ...state, count: action.count, awaiting: null } : state;

    /* The live counter is the freshest thing anyone knows, so it also retires
     * whatever query is still in flight. */
    case 'pushed':
      return { ...state, count: action.count, awaiting: null };
  }
}
