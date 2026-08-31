import { useEffect, type Dispatch } from 'react';
import { DealsTableUpdatesDocument } from '~api/generated/deals/graphql';
import { useDeals } from '../DealsContext';
import type { DealsTableAction, DealsTableState, TableUpdateAction } from '../lib/dealsTableStore';

/**
 * The table's live channel — engine B only.
 *
 * It subscribes on `state.plan.vars`, the very object the connection query
 * builds from, so `contactsChatUpdates` and `contactChatsConnection` cannot
 * describe different sets. That is the filter-lock invariant from `table.md`,
 * held structurally: there is one arguments object, not two.
 *
 * `plan.live` is `false` for engine C and the effect returns immediately —
 * there is no subscription for `contactsConnection`, so an attribute search
 * simply goes stale until a refetch, and the caveat bar says so.
 *
 * Like the board's channel it does NOT depend on the epoch: a reconnect
 * refetch bumps the epoch, and tearing the socket down and back up on every
 * one of those is a loop waiting to happen. The last event of a subscription
 * being replaced is dropped by the reducer's `loading` guard instead.
 */
export function useDealsTableLive(state: DealsTableState, dispatch: Dispatch<DealsTableAction>): void {
  const { client, botId } = useDeals();
  const { plan } = state;

  useEffect(() => {
    if (!plan.live) return;
    let resumeTimer: ReturnType<typeof setTimeout> | undefined;
    const refetch = () => dispatch({ type: 'reset', plan });
    const unsubscribe = client.subscribe(
      DealsTableUpdatesDocument,
      { botID: botId, ...plan.vars },
      {
        next: (data) => {
          const update = data.contactsChatUpdates;
          if (!update) return;
          if (update.__typename === 'ContactListUpdateStopped') {
            // Throttled server-side — full refetch when it resumes.
            const delay = Math.max(0, Date.parse(update.willResumeAt) - Date.now());
            clearTimeout(resumeTimer);
            resumeTimer = setTimeout(refetch, delay);
            return;
          }
          if (update.__typename !== 'ContactsChatUpdatesBatch') return;
          dispatch({
            type: 'liveBatch',
            updates: update.updates.map((entry) => ({
              action: entry.action as TableUpdateAction,
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
  }, [client, botId, dispatch, plan]);
}
