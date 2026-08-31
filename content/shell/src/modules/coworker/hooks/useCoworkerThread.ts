import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { newClientId } from '~api';
import {
  CoworkerAbortRejectedMessageDocument,
  CoworkerMarkAllReadDocument,
  CoworkerMessageRole,
  CoworkerRespondToolApprovalDocument,
  CoworkerSendTextDocument,
  CoworkerStateDocument,
  CoworkerStopStreamingDocument,
} from '~api/generated/coworker/graphql';
import { useCoworker } from '../CoworkerContext';
import { CHUNK_FLUSH_MS, LOOP_STUCK_MS, MESSAGES_PAGE_SIZE, STALL_REFETCH_MS } from '../lib/constants';
import {
  EMPTY_THREAD,
  applyAdded,
  applyChunks,
  applyConversation,
  applyInitial,
  applyOlderPage,
  applyOptimistic,
  applyRetry,
  applySendFailed,
  applySnapshot,
  hasActiveStream,
  visibleThread,
  type ThreadState,
  type VisibleThread,
} from '../lib/threadStore';
import type { ConvState } from '../types';

/**
 * How alive the assistant looks, in the only four states an operator can act
 * on differently.
 *
 * `working` and `idle` are the ordinary two. The other two exist because this
 * API can go quiet in two different ways and they need two different answers:
 *
 * - `reconnecting` — the loop says it is running and nothing has arrived for
 *   15s. Usually a dropped socket, and the hook is already refetching. Say so
 *   quietly and let it fix itself.
 * - `stuck` — nothing for two minutes while the loop still reads active. The
 *   mutation was accepted and no event will follow. A spinner that spins
 *   forever is a lie; this state is what makes the thread say so and offer a
 *   way out.
 */
export type ThreadLiveness = 'idle' | 'working' | 'reconnecting' | 'stuck';

export interface CoworkerThreadState {
  conversation: ConvState | null;
  view: VisibleThread;
  loading: boolean;
  loadingOlder: boolean;
  error: string | null;
  liveness: ThreadLiveness;
  hasOlder: boolean;
  loadOlder: () => void;
  /** Re-read the whole conversation now — the way out of `stuck`. */
  refresh: () => void;
  send: (text: string) => void;
  /** Re-send a failed optimistic message, under its original clientID. */
  retry: (clientID: string) => void;
  respondApproval: (approved: boolean, denialMessage?: string) => void;
  /** True once a respond was fired and the pending action hasn't cleared yet. */
  approvalResponded: boolean;
  abortRejected: () => void;
  stop: () => void;
}

/**
 * One open coworker thread over the shared event bus: CoworkerState load,
 * chunk/added/state events through the pure reducer, the liveness guard, and
 * the async-contract actions. Everything mutates immediately server-side and
 * resolves via events — mutation responses only carry ConvState.
 *
 * Nothing here decides what a row looks like. The reducer says what exists,
 * `lib/threadRows.ts` says how it is arranged, and the pane renders it; this
 * hook is the part that talks to the network, and it is the only part that
 * cannot be tested in a node-only suite, so it is kept as thin as the contract
 * allows.
 */
export function useCoworkerThread(conversationId: string | null): CoworkerThreadState {
  const { client, events } = useCoworker();
  const [thread, setThread] = useState<ThreadState>(EMPTY_THREAD);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [silence, setSilence] = useState<'live' | 'quiet' | 'stuck'>('live');
  const [approvalResponded, setApprovalResponded] = useState(false);
  const loadingOlderRef = useRef(false);
  const generation = useRef(0);

  /* Two clocks, and they are not the same clock. `lastEventAt` moves only when
     the SERVER said something; `lastRefetchAt` is the throttle on our own
     polling. An earlier version had one, reset it before each refetch to avoid
     refetch-spam, and thereby guaranteed the silence counter could never reach
     the two-minute mark — the `stuck` state was unreachable and the rate-limit
     case spun forever, which is the exact failure it was written for. */
  const lastEventAt = useRef(Date.now());
  const lastRefetchAt = useRef(0);

  const acceptConversation = useCallback((conv: ConvState) => {
    setThread((prev) => applyConversation(prev, conv));
  }, []);

  const markAllRead = useCallback(() => {
    if (!conversationId) return;
    client.mutate(CoworkerMarkAllReadDocument, { conversationID: conversationId }).catch(() => {
      /* read markers are best-effort */
    });
  }, [client, conversationId]);

  const fetchState = useCallback(
    (mode: 'initial' | 'snapshot') => {
      if (!conversationId) return;
      const gen = generation.current;
      if (mode === 'initial') setLoading(true);
      lastRefetchAt.current = Date.now();
      client
        .query(CoworkerStateDocument, { conversationID: conversationId, first: MESSAGES_PAGE_SIZE })
        .then((data) => {
          if (generation.current !== gen) return;
          const conv = data.currentUser.coworkerGetConversation;
          if (!conv) {
            setLoading(false);
            setError('This conversation does not exist (or belongs to another user).');
            return;
          }
          const { messagesConnection, ...state } = conv;
          const nodes = messagesConnection.edges.map((edge) => edge.node);
          setThread((prev) =>
            mode === 'initial'
              ? applyInitial(prev, state, nodes, messagesConnection.pageInfo.endCursor ?? null, MESSAGES_PAGE_SIZE)
              : applySnapshot(prev, state, nodes),
          );
          setLoading(false);
          setError(null);
          /* Only the first load counts as a sign of life. A snapshot that came
             back identical is this client talking to itself, and treating it
             as an event is what made `stuck` unreachable before. Real activity
             arrives as CoworkerMessageAdded and moves the clock there. */
          if (mode === 'initial') {
            lastEventAt.current = Date.now();
            setSilence('live');
            /* Read markers AFTER the page that decides where the unread
               divider goes. Marking first is a race against our own query:
               the server clears `latestReadMessageIDFromAssistant`, the query
               returns the cleared value, and the divider the operator came
               back for is never drawn. */
            markAllRead();
          }
        })
        .catch((err: unknown) => {
          if (generation.current !== gen) return;
          setLoading(false);
          setError(err instanceof Error ? err.message : String(err));
        });
    },
    [client, conversationId, markAllRead],
  );

  /* Chunks accumulate here and are handed to React on a timer. See
     CHUNK_FLUSH_MS: a short answer arrives as hundreds of chunks, and one
     render each is that many passes over a virtualized list for text that
     fills smoothly either way. */
  const pendingChunks = useRef<{ messageID: string; chunk: string }[]>([]);
  const flushTimer = useRef<number | null>(null);

  const flushChunks = useCallback(() => {
    flushTimer.current = null;
    const batch = pendingChunks.current;
    if (batch.length === 0) return;
    pendingChunks.current = [];
    setThread((prev) => applyChunks(prev, batch));
  }, []);

  // Open/close lifecycle: reset, initial load, event-bus listeners.
  useEffect(() => {
    generation.current += 1;
    setThread(EMPTY_THREAD);
    setError(null);
    setSilence('live');
    setApprovalResponded(false);
    pendingChunks.current = [];
    lastEventAt.current = Date.now();
    lastRefetchAt.current = 0;
    if (!conversationId) return;

    fetchState('initial');

    const offEvent = events.onEvent((event) => {
      switch (event.__typename) {
        case 'CoworkerMessageStreamingChunk':
          if (event.conversationID !== conversationId) return;
          lastEventAt.current = Date.now();
          setSilence('live');
          pendingChunks.current.push({ messageID: event.messageID, chunk: event.chunk });
          if (flushTimer.current === null) {
            flushTimer.current = window.setTimeout(flushChunks, CHUNK_FLUSH_MS);
          }
          return;
        case 'CoworkerMessageAdded': {
          if (event.conversationID !== conversationId) return;
          lastEventAt.current = Date.now();
          setSilence('live');
          /* Ahead of the buffer, not beside it: `added` finalizes the id and a
             chunk still queued behind it would be dropped anyway, but only if
             the buffer is drained in the right order. */
          flushChunks();
          setThread((prev) => applyAdded(prev, event.message));
          if (event.message.role === CoworkerMessageRole.Coworker) markAllRead();
          return;
        }
        case 'CoworkerConversationUpdated':
          if (event.conversation.id !== conversationId) return;
          lastEventAt.current = Date.now();
          setSilence('live');
          setApprovalResponded(false); // any state change re-arms the banner
          acceptConversation(event.conversation);
          return;
        // CoworkerFrontendStateRequested is deliberately NOT handled here. The
        // assistant blocks ~10s for ONE reply to one requestID, and this hook
        // can be mounted more than once at a time (StrictMode, a remount
        // mid-grace-period). The runtime answers instead, exactly once. See
        // lib/runtime.ts.
        default:
          return;
      }
    });
    const offReconnect = events.onReconnect(() => fetchState('snapshot'));
    const offError = events.onError((message) => setError(message));
    return () => {
      offEvent();
      offReconnect();
      offError();
      if (flushTimer.current !== null) {
        window.clearTimeout(flushTimer.current);
        flushTimer.current = null;
      }
    };
  }, [conversationId, events, fetchState, flushChunks, markAllRead, acceptConversation]);

  /* The liveness guard: refetch after 15s of silence during a loop, and after
     the stuck window with no sign of life declare it stuck rather than keep
     animating. Both thresholds are measured against real events only. */
  const active = (thread.conversation?.isAgentLoopActive ?? false) || hasActiveStream(thread);
  useEffect(() => {
    if (!conversationId || !active) {
      setSilence('live');
      return;
    }
    const timer = window.setInterval(() => {
      const quiet = Date.now() - lastEventAt.current;
      if (quiet > LOOP_STUCK_MS) {
        setSilence('stuck');
        return;
      }
      if (quiet <= STALL_REFETCH_MS) return;
      setSilence('quiet');
      if (Date.now() - lastRefetchAt.current > STALL_REFETCH_MS) fetchState('snapshot');
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [conversationId, active, fetchState]);

  const loadOlder = useCallback(() => {
    if (!conversationId || loadingOlderRef.current) return;
    const { olderCursor, hasOlder } = thread;
    if (!hasOlder || !olderCursor) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    client
      .query(CoworkerStateDocument, {
        conversationID: conversationId,
        first: MESSAGES_PAGE_SIZE,
        after: olderCursor,
      })
      .then((data) => {
        const connection = data.currentUser.coworkerGetConversation?.messagesConnection;
        if (!connection) return;
        setThread((prev) =>
          applyOlderPage(
            prev,
            connection.edges.map((edge) => edge.node),
            connection.pageInfo.endCursor ?? null,
            MESSAGES_PAGE_SIZE,
          ),
        );
      })
      .catch(() => fetchState('initial')) // dead cursor -> restart from the top (guide.md)
      .finally(() => {
        loadingOlderRef.current = false;
        setLoadingOlder(false);
      });
  }, [client, conversationId, thread, fetchState]);

  /* One place that fires the mutation, for a first send and a retry alike, so
     the optimistic row and the clientID it is keyed by can never drift apart. */
  const dispatchSend = useCallback(
    (clientID: string, text: string) => {
      if (!conversationId) return;
      client
        .mutate(CoworkerSendTextDocument, { conversationID: conversationId, clientID, text })
        .then((data) => acceptConversation(data.coworkerConversationSendMessage))
        .catch((err: unknown) => {
          setThread((prev) => applySendFailed(prev, clientID));
          setError(err instanceof Error ? err.message : String(err));
        });
    },
    [client, conversationId, acceptConversation],
  );

  const send = useCallback(
    (text: string) => {
      if (!conversationId) return;
      const clientID = newClientId();
      setThread((prev) => applyOptimistic(prev, clientID, text, new Date().toISOString()));
      dispatchSend(clientID, text);
    },
    [conversationId, dispatchSend],
  );

  const retry = useCallback(
    (clientID: string) => {
      const entry = thread.messages.get(clientID);
      if (!entry?.failed) return;
      const text = entry.node.content ?? '';
      setThread((prev) => applyRetry(prev, clientID));
      dispatchSend(clientID, text);
    },
    [thread.messages, dispatchSend],
  );

  const respondApproval = useCallback(
    (approved: boolean, denialMessage?: string) => {
      const pending = thread.conversation?.pendingAction;
      if (!conversationId || pending?.__typename !== 'CoworkerToolApprovalRequest') return;
      setApprovalResponded(true);
      client
        .mutate(CoworkerRespondToolApprovalDocument, {
          conversationID: conversationId,
          clientID: newClientId(),
          messageID: pending.requestedInMsgID,
          approved,
          denialMessage: denialMessage || null,
        })
        .catch((err: unknown) => {
          setApprovalResponded(false);
          setError(err instanceof Error ? err.message : String(err));
        });
    },
    [client, conversationId, thread.conversation],
  );

  const abortRejected = useCallback(() => {
    if (!conversationId) return;
    client
      .mutate(CoworkerAbortRejectedMessageDocument, { conversationID: conversationId })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, [client, conversationId]);

  const stop = useCallback(() => {
    if (!conversationId) return;
    client
      .mutate(CoworkerStopStreamingDocument, { conversationID: conversationId })
      .then((data) => acceptConversation(data.coworkerConversationStopStreaming))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, [client, conversationId, acceptConversation]);

  const refresh = useCallback(() => fetchState('initial'), [fetchState]);

  /* Memoized because it allocates: the pane runs `buildThread` over it, and an
     array rebuilt on every render would rebuild the rows on every render too —
     including the ones caused by scrolling, which is when the list can least
     afford it. */
  const view = useMemo(() => visibleThread(thread), [thread]);

  const liveness: ThreadLiveness = !active
    ? 'idle'
    : silence === 'stuck'
      ? 'stuck'
      : silence === 'quiet'
        ? 'reconnecting'
        : 'working';

  return {
    conversation: thread.conversation,
    view,
    loading,
    loadingOlder,
    error,
    liveness,
    hasOlder: thread.hasOlder,
    loadOlder,
    refresh,
    send,
    retry,
    respondApproval,
    approvalResponded,
    abortRejected,
    stop,
  };
}
