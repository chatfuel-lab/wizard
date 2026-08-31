import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  initialSessionState,
  isReady,
  markFailed,
  mergeRows,
  optimisticRow,
  sessionReducer,
  splitTyping,
  visibleAfter,
  type TestChatAction,
  type TestChatRow,
  type TestChatSession,
  type TestChatStatus,
} from '../lib/chat/testChat';

/**
 * Everything the hook needs from the outside, and the whole of it.
 *
 * `~ui` may import react and nothing else, which is exactly the right
 * constraint here: a test chat is one state machine over five requests, and the
 * requests are the only part that differs between the flow builder and
 * Automations. The host implements this; the machine above it is shared.
 *
 * The object may be rebuilt on every render — the hook holds it in a ref and
 * keys its effects on `targetKey` and the session's `conversationID`, so a
 * fresh identity does not tear a subscription down.
 */
export interface TestChatTransport<S extends TestChatSession, N> {
  /**
   * What is being tested, as a string. Changing it is a new life: the session
   * is dropped, the thread is emptied, its subscriptions are torn down, and a
   * start already in flight can no longer land. Empty means nothing is
   * testable yet.
   */
  targetKey: string;
  /** Mint a session. */
  start(): Promise<S>;
  /**
   * The session this reader already has for this target, if the API offers a
   * readback. Flows do; automations do not. Answering null means "none" and is
   * not an error.
   */
  restore?(): Promise<S | null>;
  /** One page of history, newest-first on the wire. Order does not matter — `mergeRows` sorts. */
  loadPage(session: S, first: number): Promise<readonly N[]>;
  /** Live messages. Returns its own teardown. */
  subscribe(session: S, handlers: { next(nodes: readonly N[]): void; error(err: unknown): void }): () => void;
  /** The transport reconnected and events were missed — reload. Returns a teardown. */
  onReconnect?(reload: () => void): () => void;
  /** Send a text as the contact; resolve with the echo if the mutation returns one. */
  sendText(session: S, text: string, clientId: string): Promise<N | null | undefined>;
  /** Press a button or a list row. Absent = the surface has no clickable messages. */
  sendAction?(session: S, row: TestChatRow, action: TestChatAction, clientId: string): Promise<N | null | undefined>;
  /** One wire message → one row. Pure, and the host's own typename switch. */
  toRow(node: N): TestChatRow;
  /** Anything thrown, as a sentence for a person. */
  errorMessage(err: unknown, fallback?: string): string;
  /** A fresh id per send; defaults to `crypto.randomUUID()`. */
  newClientId?(): string;
}

export interface TestChatApi<S extends TestChatSession> {
  status: TestChatStatus;
  session: S | null;
  /** True while a readback is deciding whether there is a session to adopt. */
  restoring: boolean;
  /** Visible rows, oldest first — the watermark applied, the typing hint taken out. */
  rows: TestChatRow[];
  typing: boolean;
  /** Start failure, as a sentence. An empty state, never a toast. */
  error: string | null;
  /** History / subscription failure. Shown above the thread, the thread stays. */
  threadError: string | null;
  threadLoading: boolean;
  /** A session is minted and nothing is in flight. */
  ready: boolean;
  /** Mint a session; a restart when one exists — the old rows go behind the watermark. */
  start(): void;
  restart(): void;
  send(text: string): Promise<void>;
  act(row: TestChatRow, action: TestChatAction): Promise<void>;
  reload(): void;
}

/** How much history one load asks for. A test conversation is short. */
const PAGE = 50;

/**
 * One test-chat session and its thread.
 *
 * Order of operations is what practice taught: subscribe FIRST — the
 * subscription takes 1-3 s to become active and events emitted before that are
 * lost — then load the history once, so a reply that raced the subscribe is not
 * missed either. A reconnect reloads.
 *
 * Nothing starts on its own. A session is a real conversation the production
 * pipeline answers, so a person presses Start; the only exception is `restore`,
 * which adopts a session that already exists rather than making one.
 */
export function useTestChat<S extends TestChatSession, N>(transport: TestChatTransport<S, N>): TestChatApi<S> {
  const ref = useRef(transport);
  ref.current = transport;
  const { targetKey } = transport;

  const [state, dispatch] = useReducer(sessionReducer<S>, undefined, initialSessionState<S>);
  const [restoring, setRestoring] = useState(false);
  const [all, setAll] = useState<TestChatRow[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  /* The one counter. `start` and `reset` hand it to the reducer; an answer
     carries the number it was issued under and the reducer drops it if the
     counter moved on. A ref, not state: the number must be known before the
     request is fired, and a dispatch cannot be read back synchronously. */
  const generation = useRef(0);

  const conversationId = state.session?.conversationID ?? null;

  // A new target is a new life: no session, no watermark, no rows, and the old
  // start cannot land. Then ask for a session that already exists, if any.
  useEffect(() => {
    const gen = (generation.current += 1);
    dispatch({ type: 'reset', generation: gen });
    setAll([]);
    setThreadError(null);
    setThreadLoading(false);
    const restore = ref.current.restore;
    if (!targetKey || !restore) {
      setRestoring(false);
      return;
    }
    setRestoring(true);
    let live = true;
    restore()
      .then((session) => {
        if (!live || generation.current !== gen || !session) return;
        dispatch({ type: 'started', generation: gen, session });
      })
      /* A readback that fails is not a failure to report: it only means this
         reader starts over, which is what the empty state already offers. */
      .catch(() => undefined)
      .finally(() => {
        if (live) setRestoring(false);
      });
    return () => {
      live = false;
    };
  }, [targetKey]);

  const start = useCallback(() => {
    if (!ref.current.targetKey) return;
    const gen = (generation.current += 1);
    dispatch({ type: 'start', generation: gen });
    ref.current
      .start()
      .then((session) => dispatch({ type: 'started', generation: gen, session }))
      .catch((err: unknown) =>
        dispatch({
          type: 'failed',
          generation: gen,
          message: ref.current.errorMessage(err, 'Could not start the test.'),
        }),
      );
  }, []);

  const accept = useCallback((nodes: readonly N[]) => {
    if (nodes.length === 0) return;
    const rows = nodes.map((node) => ref.current.toRow(node));
    setAll((prev) => mergeRows(prev, rows));
    setNow(Date.now());
  }, []);

  const sessionRef = useRef(state.session);
  sessionRef.current = state.session;

  const load = useCallback(
    (gen: number) => {
      const session = sessionRef.current;
      if (!session) return;
      setThreadLoading(true);
      ref.current
        .loadPage(session, PAGE)
        .then((nodes) => {
          if (generation.current !== gen) return;
          accept(nodes);
          setThreadError(null);
        })
        .catch((err: unknown) => {
          if (generation.current === gen) setThreadError(ref.current.errorMessage(err));
        })
        .finally(() => {
          if (generation.current === gen) setThreadLoading(false);
        });
    },
    [accept],
  );

  // Open / close: subscriptions first, then the history; cleanup on change and unmount.
  useEffect(() => {
    if (!conversationId) return;
    const session = sessionRef.current;
    if (!session) return;
    const gen = generation.current;
    const onError = (err: unknown) => {
      if (generation.current === gen) setThreadError(ref.current.errorMessage(err));
    };
    const off = ref.current.subscribe(session, {
      next: (nodes) => {
        if (generation.current === gen) accept(nodes);
      },
      error: onError,
    });
    load(gen);
    const offReconnect = ref.current.onReconnect?.(() => load(gen));
    return () => {
      off();
      offReconnect?.();
    };
  }, [conversationId, accept, load]);

  // The typing hint decays on its own: re-render when `until` passes.
  const { messages, typing, typingUntil } = useMemo(
    () => splitTyping(visibleAfter(all, state.visibleSince), now),
    [all, state.visibleSince, now],
  );
  useEffect(() => {
    if (typingUntil === null) return;
    const remaining = typingUntil - Date.now();
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setNow(Date.now()), remaining + 20);
    return () => window.clearTimeout(timer);
  }, [typingUntil]);

  /**
   * One send, whether it carries a text or a button press.
   *
   * The optimistic row is the same either way — a click echoes back as a
   * message of its own, and until it does the thing the reader pressed has to
   * be visible somewhere. A failure marks that row rather than raising: the
   * text is not lost, and the reason sits under it.
   */
  const post = useCallback(
    async (label: string, run: (session: S, clientId: string) => Promise<N | null | undefined>) => {
      const session = sessionRef.current;
      if (!session || !isReady(state)) return;
      const gen = generation.current;
      const clientId = (ref.current.newClientId ?? (() => crypto.randomUUID()))();
      setAll((prev) => mergeRows(prev, [optimisticRow(clientId, label)]));
      dispatch({ type: 'sendStarted' });
      try {
        const echo = await run(session, clientId);
        if (generation.current !== gen) return;
        if (echo) accept([echo]);
      } catch (err: unknown) {
        if (generation.current === gen) {
          setAll((prev) =>
            markFailed(
              prev,
              clientId,
              ref.current.errorMessage(err, 'Could not send — check the connection and try again.'),
            ),
          );
        }
      } finally {
        dispatch({ type: 'sendSettled' });
      }
    },
    [accept, state],
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      await post(trimmed, (session, clientId) => ref.current.sendText(session, trimmed, clientId));
    },
    [post],
  );

  const act = useCallback(
    async (row: TestChatRow, action: TestChatAction) => {
      const sendAction = ref.current.sendAction;
      if (!sendAction || !action.click || !row.id) return;
      await post(action.title, (session, clientId) => sendAction(session, row, action, clientId));
    },
    [post],
  );

  const reload = useCallback(() => load(generation.current), [load]);

  return useMemo(
    () => ({
      status: state.status,
      session: state.session,
      restoring,
      rows: messages,
      typing,
      error: state.error,
      threadError,
      threadLoading,
      ready: isReady(state),
      start,
      restart: start,
      send,
      act,
      reload,
    }),
    [state, restoring, messages, typing, threadError, threadLoading, start, send, act, reload],
  );
}
