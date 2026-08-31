import { useCallback, useEffect, useMemo, useReducer } from 'react';
import {
  UNFILTERED_CHAT_ARGS,
  chatListQueryVars,
  chatListSubscriptionVars,
  type ChatListFilter,
} from '~api/domain/livechat';
import { ChatListDocument, ChatListUpdatesDocument } from '~api/generated/livechat/graphql';
import { useLivechat } from '../LivechatContext';
import {
  chatListReducer,
  initialChatListState,
  resumeDelay,
  selectChats,
  toPage,
  type ChatListUpdateAction,
  type ChatListVars,
} from '../lib/chatListStore';
import type { ConversationPatch, StageChange } from '../lib/conversationPatch';
import { messageOf } from '../lib/errors';
import type { ChatNode } from '../types';

export interface ChatListState {
  chats: ChatNode[];
  loading: boolean;
  error: string | null;
  /** There is another page below the last row. */
  hasMore: boolean;
  /** A page request is in flight. */
  loadingMore: boolean;
  loadMore: () => void;
  refetch: () => void;
  /**
   * A lifecycle mutation's answer, applied to the row it names. The thread
   * pane calls this; the row's own `Update` from the server follows and finds
   * nothing left to change.
   */
  applyConversation: (patch: ConversationPatch) => void;
  /** The contact's stage moved (won / lost from the thread). Same freshness rule. */
  applyStage: (change: StageChange) => void;
}

/**
 * The chat list over `lib/chatListStore`: the ChatList query, then a
 * ChatListUpdates subscription on the SAME filter — both built by the shared
 * variable builders, so the two cannot drift.
 *
 * The reads are keyed on `state.epoch`; the epoch bump IS the request, and
 * every response carries the epoch it was issued under.
 */
export function useChatListStore(filter: ChatListFilter = UNFILTERED_CHAT_ARGS): ChatListState {
  const { client, botId } = useLivechat();
  const vars = useMemo<ChatListVars>(() => ({ filter }), [filter]);
  const [state, dispatch] = useReducer(chatListReducer, vars, initialChatListState);
  const { epoch, endCursor, hasMore, loadingMore } = state;
  const openVars = state.vars;

  /* Declared before the effects that read `openVars`: in the commit where the
   * filter changes they are still looking at the old one and must not fire a
   * round of doomed requests before this dispatch lands. */
  useEffect(() => {
    if (openVars !== vars) dispatch({ type: 'reset', vars });
  }, [vars, openVars]);

  useEffect(() => {
    let cancelled = false;
    client
      .query(ChatListDocument, chatListQueryVars(botId, openVars.filter))
      .then((data) => {
        if (!cancelled) dispatch({ type: 'loaded', epoch, page: toPage(data) });
      })
      .catch((err: unknown) => {
        if (!cancelled) dispatch({ type: 'failed', epoch, message: messageOf(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, openVars, epoch]);

  /* Keyed on the filter the caller asked for rather than on the one in state,
   * unlike the read above: this is the effect that must tear down in the same
   * commit as the `reset` dispatch. A subscription left running one commit
   * longer delivers the previous filter's contacts into a list that has already
   * been cleared for the new one. It deliberately does not depend on the epoch,
   * so a reconnect refetch does not tear the WebSocket down and put it back up. */
  useEffect(() => {
    let resumeTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = client.subscribe(ChatListUpdatesDocument, chatListSubscriptionVars(botId, vars.filter), {
      next: (data) => {
        const update = data.contactsChatUpdates;
        if (!update) return;
        if (update.__typename === 'ContactListUpdateStopped') {
          // Server throttled this subscription — full refetch when it resumes.
          clearTimeout(resumeTimer);
          resumeTimer = setTimeout(() => dispatch({ type: 'refetch' }), resumeDelay(update.willResumeAt, Date.now()));
          return;
        }
        if (update.__typename !== 'ContactsChatUpdatesBatch') return;
        dispatch({
          type: 'live',
          updates: update.updates.map((entry) => ({
            action: entry.action as ChatListUpdateAction,
            node: entry.edge.node,
          })),
        });
      },
      error: (err) => dispatch({ type: 'liveFailed', message: messageOf(err) }),
    });
    const offReconnect = client.onReconnect(() => dispatch({ type: 'refetch' }));
    return () => {
      clearTimeout(resumeTimer);
      unsubscribe();
      offReconnect();
    };
  }, [client, botId, vars]);

  const refetch = useCallback(() => dispatch({ type: 'refetch' }), []);
  const applyConversation = useCallback(
    (patch: ConversationPatch) => dispatch({ type: 'conversationChanged', patch }),
    [],
  );
  const applyStage = useCallback(
    (change: StageChange) =>
      dispatch({
        type: 'stageChanged',
        id: change.contactId,
        salesStageV2: change.salesStageV2,
        updatedAt: change.updatedAt,
      }),
    [],
  );

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || !endCursor) return;
    dispatch({ type: 'pageRequested', epoch });
    client
      .query(ChatListDocument, chatListQueryVars(botId, openVars.filter, endCursor))
      .then((data) => dispatch({ type: 'pageLoaded', epoch, page: toPage(data) }))
      .catch(() => dispatch({ type: 'pageFailed', epoch }));
  }, [client, botId, openVars, epoch, endCursor, hasMore, loadingMore]);

  const chats = useMemo(() => selectChats(state), [state]);

  return {
    chats,
    loading: state.loading,
    error: state.error,
    hasMore,
    loadingMore,
    loadMore,
    refetch,
    applyConversation,
    applyStage,
  };
}
