import { useCallback, useEffect, useRef, useState } from 'react';
import { newClientId } from '~api';
import {
  CoworkerChatListDocument,
  CoworkerCreateDocument,
  CoworkerMessageClientActionType,
  CoworkerSendTextDocument,
  CoworkerSetStorageItemDocument,
  CoworkerUnsetStorageItemDocument,
  type CoworkerChatListQuery,
} from '~api/generated/coworker/graphql';
import { useCoworker } from '../CoworkerContext';
import { CONVERSATIONS_PAGE_SIZE } from '../lib/constants';
import {
  setPreview,
  sortRows,
  STORAGE_PINNED_KEY,
  STORAGE_PINNED_VALUE,
  upsertRow,
  visibleRows,
  type ChatRow,
} from '../lib/chatListStore';
import { STORAGE_TITLE_KEY } from '../lib/titles';

/** Where a first message came from — it decides `clientActionType`. */
export type MessageSource = 'typed' | 'suggestion';

type ListNode = CoworkerChatListQuery['currentUser']['coworkerConversationsConnection']['edges'][number]['node'];

export interface ConversationListState {
  /** Visible (dashboard-style filtered), sorted by updatedAt desc. */
  rows: ChatRow[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  /** Creates a conversation, keeps it visible locally, returns its id. */
  createConversation: () => Promise<string | null>;
  /**
   * The operator's own name for a chat, or null to go back to the server's.
   *
   * The API has no rename; this writes `frontendStateStorage` instead — see
   * `chatListStore.ts` for why that and not localStorage, and for the
   * fact that the assistant can read what is written there.
   */
  setTitle: (conversationId: string, title: string | null) => void;
  setPinned: (conversationId: string, pinned: boolean) => void;
  /**
   * Send the message that starts a chat — typed into the home's box, or picked
   * off one of its suggestion cards.
   *
   * It lives on the list hook and not on the thread's because its caller is the
   * home, which fires it at a conversation created one tick earlier and whose
   * thread is not mounted yet. The row it produces is also what makes that
   * conversation exist as far as the rail is concerned — a conversation with no
   * messages is hidden (guide.md). Resolves when the server has taken the
   * message, which is what lets the caller open the thread onto a conversation
   * that already has something in it.
   */
  sendMessage: (conversationId: string, text: string, source: MessageSource) => Promise<boolean>;
}

export function useConversationList(): ConversationListState {
  const { client, botId, events } = useCoworker();
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [localIds, setLocalIds] = useState<ReadonlySet<string>>(new Set<string>());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const loadingMore = useRef(false);

  const mergePage = useCallback((nodes: ListNode[], endCursor: string | null) => {
    setRows((prev) => {
      let next = prev;
      for (const node of nodes) {
        const { messagesConnection, ...state } = node;
        next = upsertRow(next, state);
        const first = messagesConnection.edges[0]?.node;
        if (first !== undefined) next = setPreview(next, state.id, first.content ?? '');
      }
      return next;
    });
    setCursor(endCursor);
    // hasNextPage is unreliable after page 1 — page until a short page.
    setHasMore(nodes.length >= CONVERSATIONS_PAGE_SIZE);
  }, []);

  const fetchFirstPage = useCallback(() => {
    client
      .query(CoworkerChatListDocument, { botID: botId, first: CONVERSATIONS_PAGE_SIZE })
      .then((data) => {
        const connection = data.currentUser.coworkerConversationsConnection;
        mergePage(
          connection.edges.map((edge) => edge.node),
          connection.pageInfo.endCursor ?? null,
        );
        setLoading(false);
        setError(null);
      })
      .catch((err: unknown) => {
        setLoading(false);
        setError(err instanceof Error ? err.message : String(err));
      });
  }, [client, botId, mergePage]);

  useEffect(() => {
    setRows([]);
    setLoading(true);
    fetchFirstPage();
  }, [fetchFirstPage]);

  // Live updates off the shared bus.
  useEffect(() => {
    const offEvent = events.onEvent((event) => {
      if (event.__typename === 'CoworkerConversationUpdated') {
        setRows((prev) => upsertRow(prev, event.conversation));
      } else if (event.__typename === 'CoworkerMessageAdded') {
        setRows((prev) => setPreview(prev, event.conversationID, event.message.content ?? ''));
      }
    });
    const offCreated = events.onCreated((conv) => {
      setRows((prev) => upsertRow(prev, conv));
    });
    const offReconnect = events.onReconnect(fetchFirstPage);
    return () => {
      offEvent();
      offCreated();
      offReconnect();
    };
  }, [events, fetchFirstPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || !cursor || loadingMore.current) return;
    loadingMore.current = true;
    client
      .query(CoworkerChatListDocument, { botID: botId, first: CONVERSATIONS_PAGE_SIZE, after: cursor })
      .then((data) => {
        const connection = data.currentUser.coworkerConversationsConnection;
        mergePage(
          connection.edges.map((edge) => edge.node),
          connection.pageInfo.endCursor ?? null,
        );
      })
      .catch(() => fetchFirstPage()) // dead cursor -> restart from the top (guide.md)
      .finally(() => {
        loadingMore.current = false;
      });
  }, [client, botId, cursor, hasMore, mergePage, fetchFirstPage]);

  const createConversation = useCallback(async (): Promise<string | null> => {
    try {
      const data = await client.mutate(CoworkerCreateDocument, { botID: botId });
      const conv = data.coworkerConversationCreate;
      setRows((prev) => upsertRow(prev, conv));
      setLocalIds((prev) => new Set(prev).add(conv.id));
      return conv.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [client, botId]);

  /* Set and unset are the same operation with two mutations behind it, because
     the API refuses an empty value (`InternalServerError "cannot set empty
     val"`) — clearing a key is unsetting it, never setting it to ''. Both
     answer with the whole ConvState, so the row updates from the response and
     needs no optimism. */
  const writeStorage = useCallback(
    (conversationID: string, key: string, value: string | null) => {
      const write =
        value === null
          ? client
              .mutate(CoworkerUnsetStorageItemDocument, { conversationID, key })
              .then((data) => data.coworkerConversationUnsetFrontendStorageItem)
          : client
              .mutate(CoworkerSetStorageItemDocument, { conversationID, key, value })
              .then((data) => data.coworkerConversationSetFrontendStorageItem);
      write
        .then((conv) => setRows((prev) => upsertRow(prev, conv)))
        .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
    },
    [client],
  );

  const setTitle = useCallback(
    (conversationId: string, title: string | null) => {
      const trimmed = title?.trim() ?? '';
      writeStorage(conversationId, STORAGE_TITLE_KEY, trimmed === '' ? null : trimmed);
    },
    [writeStorage],
  );

  const setPinned = useCallback(
    (conversationId: string, pinned: boolean) => {
      writeStorage(conversationId, STORAGE_PINNED_KEY, pinned ? STORAGE_PINNED_VALUE : null);
    },
    [writeStorage],
  );

  const sendMessage = useCallback(
    async (conversationId: string, text: string, source: MessageSource): Promise<boolean> => {
      try {
        const data = await client.mutate(CoworkerSendTextDocument, {
          conversationID: conversationId,
          clientID: newClientId(),
          text,
          /* `QuickReply` is the enum's one value and it means what it says: the
             text came off a chip the operator clicked. Typed text is not that,
             and mislabelling it would put a lie in the account's own history. */
          clientActionType: source === 'suggestion' ? CoworkerMessageClientActionType.QuickReply : null,
        });
        setRows((prev) => upsertRow(prev, data.coworkerConversationSendMessage));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return false;
      }
    },
    [client],
  );

  return {
    rows: sortRows(visibleRows(rows, localIds)),
    loading,
    error,
    hasMore,
    loadMore,
    createConversation,
    setTitle,
    setPinned,
    sendMessage,
  };
}
