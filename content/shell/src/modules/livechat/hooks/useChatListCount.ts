import { useEffect, useReducer } from 'react';
import { UNFILTERED_CHAT_ARGS, chatListCountVars, type ChatListFilter } from '~api/domain/livechat';
import { ChatListCountDocument } from '~api/generated/livechat/graphql';
import { useLivechat } from '../LivechatContext';
import { inboxCountReducer, initialInboxCountState } from '../lib/inboxCount';

export interface ChatListCountState {
  /** How many contacts match, or null while that is unknown. */
  count: number | null;
  loading: boolean;
}

/**
 * How many conversations the current filter matches, over `lib/inboxCount`.
 *
 * It asks the SERVER rather than counting the rows, and the difference is the
 * entire point: the list holds one page. `chats.length` is 50 whatever the
 * filter matches, and a number that says 50 next to an inbox of nine hundred is
 * not a smaller truth, it is a false one.
 *
 * The variables come from `chatListCountVars`, so the count is narrowed by
 * exactly the filter the rows below it were drawn from — the SDL gives the
 * count its own input type, and that is precisely the kind of seam where a
 * hand-built variable object drifts from the list's without anything noticing.
 *
 * Deliberately NOT live. The subscription reports membership changes, so this
 * number could be nudged as they arrive — but an Add for a contact already in
 * the window is not a new member, and a Remove for one below the loaded page
 * still is. Getting that wrong produces a count that drifts further from the
 * truth the longer the tab stays open, which is worse than one that is exact
 * whenever it is fetched. It refetches on a filter change and on reconnect.
 */
export function useChatListCount(filter: ChatListFilter = UNFILTERED_CHAT_ARGS): ChatListCountState {
  const { client, botId } = useLivechat();
  const [state, dispatch] = useReducer(inboxCountReducer, filter, initialInboxCountState);
  const { epoch } = state;
  const asked = state.filter;

  /* Declared before the read, exactly as `useChatListStore` does: in the commit
   * where the filter changes, the effect below is still looking at the previous
   * one and must not spend a round trip on it. */
  useEffect(() => {
    if (asked !== filter) dispatch({ type: 'refilter', filter });
  }, [filter, asked]);

  useEffect(() => {
    let cancelled = false;
    client
      .query(ChatListCountDocument, chatListCountVars(botId, asked))
      .then((data) => {
        if (!cancelled) {
          dispatch({ type: 'counted', epoch, count: data.bot?.contactChatsCountV2 ?? 0 });
        }
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'failed', epoch });
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, asked, epoch]);

  useEffect(() => client.onReconnect(() => dispatch({ type: 'refetch' })), [client]);

  return { count: state.count, loading: state.loading };
}
