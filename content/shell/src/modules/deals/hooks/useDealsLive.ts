import { useEffect, type Dispatch } from 'react';
import { DealsUpdatesDocument } from '~api/generated/deals/graphql';
import { useDeals } from '../DealsContext';
import type { BoardUpdateAction, DealsAction, DealsState } from '../lib/dealsStore';

/**
 * The board's live channel.
 *
 * It subscribes on `state.vars` — the very object the queries build from — so
 * its filter and field names cannot drift from theirs. That invariant used to
 * be held by remounting the whole subtree on every filter change.
 *
 * It deliberately does NOT depend on the epoch. A reconnect refetch bumps the
 * epoch, and tearing the WebSocket down and back up on every one of those is a
 * loop waiting to happen; the last event of a subscription being replaced is
 * dropped by the reducer's `loading` guard instead.
 */
export function useDealsLive(state: DealsState, dispatch: Dispatch<DealsAction>): void {
  const { client, botId } = useDeals();
  const { vars } = state;

  useEffect(() => {
    let resumeTimer: ReturnType<typeof setTimeout> | undefined;
    const refetch = () => dispatch({ type: 'reset', vars });
    const unsubscribe = client.subscribe(
      DealsUpdatesDocument,
      { botID: botId, assigneeFilter: vars.filter, fieldNames: vars.fieldNames },
      {
        next: (data) => {
          const update = data.contactsDealUpdates;
          if (!update) return;
          if (update.__typename === 'ContactListUpdateStopped') {
            // Throttled server-side — full refetch when it resumes.
            const delay = Math.max(0, Date.parse(update.willResumeAt) - Date.now());
            clearTimeout(resumeTimer);
            resumeTimer = setTimeout(refetch, delay);
            return;
          }
          if (update.__typename !== 'ContactsDealUpdatesBatch') return;
          dispatch({
            type: 'liveBatch',
            updates: update.updates.map((entry) => ({
              action: entry.action as BoardUpdateAction,
              node: entry.edge.node,
            })),
          });
        },
        error: () => {
          /* transport retries; the reconnect handler refetches */
        },
      },
    );
    const offReconnect = client.onReconnect(refetch);
    return () => {
      clearTimeout(resumeTimer);
      unsubscribe();
      offReconnect();
    };
  }, [client, botId, dispatch, vars]);
}
