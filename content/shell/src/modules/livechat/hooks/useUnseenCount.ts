import { useEffect, useReducer } from 'react';
import { UnseenOpenDialogsCountChangedDocument, UnseenOpenDialogsCountDocument } from '~api/generated/livechat/graphql';
import { useLivechat } from '../LivechatContext';
import { initialUnseenState, unseenReducer } from '../lib/unseenStore';

/**
 * Unread badge: initial query, live counter, and a refetch on reconnect — the
 * third of the three things that have to come back after a dropped socket.
 *
 * The query is keyed on the epoch, which only a refetch bumps. A response
 * issued before the reconnect can therefore no longer land on top of a count
 * the live channel has since pushed, and a push still costs no round trip.
 */
export function useUnseenCount(): number {
  const { client, botId } = useLivechat();
  const [state, dispatch] = useReducer(unseenReducer, initialUnseenState);
  const { epoch } = state;

  useEffect(() => {
    let cancelled = false;
    client
      .query(UnseenOpenDialogsCountDocument, { botID: botId })
      .then((data) => {
        if (!cancelled) dispatch({ type: 'counted', epoch, count: data.bot?.unseenOpenDialogsCount ?? 0 });
      })
      .catch(() => {
        /* badge is best-effort */
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, epoch]);

  useEffect(() => {
    const unsubscribe = client.subscribe(
      UnseenOpenDialogsCountChangedDocument,
      { botID: botId },
      { next: (data) => dispatch({ type: 'pushed', count: data.unseenOpenDialogsCountChanged ?? 0 }) },
    );
    const offReconnect = client.onReconnect(() => dispatch({ type: 'refetch' }));
    return () => {
      unsubscribe();
      offReconnect();
    };
  }, [client, botId]);

  return state.count;
}
