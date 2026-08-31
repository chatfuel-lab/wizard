import { useEffect, useState } from 'react';
import { InboxFlowsListDocument, type InboxFlowsListQuery } from '~api/generated/livechat/graphql';
import { useLivechat } from '../LivechatContext';
import { messageOf } from '../lib/errors';

export interface InboxFlowsState {
  data: InboxFlowsListQuery | null;
  loading: boolean;
  error: string | null;
}

/**
 * The bot's flows, for the close-to-flow picker.
 *
 * Fetched the first time the picker opens and kept for the life of the pane,
 * not at mount: most conversations are never closed from here, and the flow
 * list is the one query in this module that has nothing to do with reading a
 * thread. Not refetched per open either — a bot's flows change on the scale
 * of days, and a picker that showed a spinner on every `e` would be teaching
 * the operator to wait for a list they saw a minute ago. A load that FAILED is
 * the exception: the next open asks again.
 *
 * The error is surfaced, unlike the team's: a picker with no flows in it has
 * to say whether that is because there are none for this channel or because
 * the request failed, and only the second is worth retrying.
 */
export function useInboxFlows(wanted: boolean): InboxFlowsState {
  const { client, botId } = useLivechat();
  const [state, setState] = useState<InboxFlowsState>({ data: null, loading: false, error: null });
  /* The request counter — the bump IS the request, as in every store here. It
   * moves when the picker is wanted and nothing is loaded, which after a
   * failure means "wanted again", and after a success never. */
  const [request, setRequest] = useState(0);
  const loaded = state.data !== null;

  useEffect(() => {
    if (wanted && !loaded) setRequest((count) => count + 1);
  }, [wanted, loaded]);

  useEffect(() => {
    if (request === 0) return;
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null }));
    client
      .query(InboxFlowsListDocument, { botID: botId })
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ data: null, loading: false, error: messageOf(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, request]);

  return state;
}
