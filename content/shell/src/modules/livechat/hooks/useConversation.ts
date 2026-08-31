import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { MESSAGES_PAGE_SIZE } from '~api/domain/livechat';
import {
  ConversationMessagesDocument,
  MarkConversationReadDocument,
  MessageAddedDocument,
  MessageUpdatedDocument,
  type ConversationStatus,
  type SalesStageV2,
} from '~api/generated/livechat/graphql';
import { useLivechat } from '../LivechatContext';
import type { ConversationPatch, StageChange } from '../lib/conversationPatch';
import { messageOf } from '../lib/errors';
import {
  initialThreadState,
  selectEntries,
  selectMarkReadTarget,
  selectTyping,
  threadReducer,
  toPage,
  type MessageEntry,
} from '../lib/threadStore';
import type { ConversationInfo } from '../types';
import { useConversationLifecycle } from './useConversationLifecycle';
import { useConversationSend, type SendAttachmentInput, type SendTemplateInput } from './useConversationSend';

export interface ConversationState {
  conversation: ConversationInfo | null;
  /** Ascending by sentTime (oldest first). */
  entries: MessageEntry[];
  loading: boolean;
  error: string | null;
  /** True while a typing indicator should show (SystemTypingMessage.until). */
  typing: boolean;
  hasOlder: boolean;
  /** A history page is in flight. The pane shows a spinner instead of the button. */
  loadingOlder: boolean;
  loadOlder: () => void;
  send: (text: string) => void;
  sendAttachment: (input: SendAttachmentInput) => void;
  /** A filled WhatsApp template, by its temporary id. Same path as text. */
  sendTemplate: (input: SendTemplateInput) => void;
  takeOver: () => Promise<void>;
  /** Close the live chat by handing the contact to a flow. Rejects on failure. */
  closeToFlow: (flowId: string) => Promise<void>;
  /**
   * "Close as won / lost". Not a conversation state — the CONTACT's sales
   * stage, the field the deals board moves cards by. The conversation stays
   * as it was. Rejects on failure; resolves to nothing while no thread is open.
   */
  setSalesStage: (stage: SalesStageV2) => Promise<void>;
}

export interface UseConversationOptions {
  /**
   * A lifecycle answer — take-over, close, mark-read — after the thread has
   * applied it. The list holds the same conversation and has no other way to
   * hear about it before the server's `Update` arrives; see
   * `lib/conversationPatch.ts` for why it should not wait.
   */
  onConversationChanged?: (patch: ConversationPatch) => void;
  /** The contact's stage moved. The list row is the contact; it wants to know. */
  onStageChanged?: (change: StageChange) => void;
  /**
   * Whether this operator may write to the conversation — Live chat: Edit.
   * Mark-read is a write, and it is the one write nobody asks for: it fires
   * from an effect the moment a thread is looked at. A reader who may only
   * look would otherwise clear the badge for the whole team. Absent means no,
   * so a caller that has not thought about the permission grants none.
   */
  canEdit?: boolean;
}

/**
 * One open thread over `lib/threadStore`: query the newest-first page,
 * subscribe MessageAdded + MessageUpdated for THIS conversation only,
 * unsubscribe on close or switch.
 *
 * The reads are keyed on `state.epoch` — the epoch bump IS the request, so
 * `refetch` is a dispatch and every response carries the epoch it was issued
 * under. Keying them on state rather than on the props is also what stops a
 * conversation switch from firing a round of doomed requests for the
 * conversation being left, in the commit before the switch has landed.
 */
export function useConversation(
  conversationId: string | null,
  options: UseConversationOptions = {},
): ConversationState {
  const { client, botId } = useLivechat();
  const [state, dispatch] = useReducer(threadReducer, conversationId, initialThreadState);
  const { epoch, conversation, hasOlder, olderCursor, loadingOlder, typingUntil } = state;
  const openId = state.conversationId;

  /* Read through a ref: the caller builds it inline, and an effect keyed on a
   * fresh closure per render would re-run mark-read on every keystroke. */
  const onChangedRef = useRef(options.onConversationChanged);
  onChangedRef.current = options.onConversationChanged;

  /* One door for every lifecycle answer: the thread first, then whoever else
   * holds this conversation. */
  const applyAnswer = useCallback(
    (answer: { id: string; status?: ConversationStatus; read?: boolean | null; updatedAt: string }) => {
      const patch: ConversationPatch = { id: answer.id, updatedAt: answer.updatedAt };
      if (answer.status !== undefined) patch.status = answer.status;
      if (answer.read !== undefined && answer.read !== null) patch.read = answer.read;
      dispatch({ type: 'conversationChanged', patch });
      onChangedRef.current?.(patch);
    },
    [],
  );

  /* Declared before the effects that read `openId` so that in the commit where
   * the prop changes they are still looking at the old conversation and do not
   * fire a round of doomed requests before this dispatch lands. */
  useEffect(() => {
    if (openId !== conversationId) dispatch({ type: 'opened', conversationId });
  }, [conversationId, openId]);

  // Reads: one effect, re-run by every epoch bump.
  useEffect(() => {
    if (!openId) return;
    let cancelled = false;
    client
      .query(ConversationMessagesDocument, {
        botID: botId,
        conversationID: openId,
        first: MESSAGES_PAGE_SIZE,
      })
      .then((data) => {
        if (!cancelled) dispatch({ type: 'loaded', epoch, page: toPage(data) });
      })
      .catch((err: unknown) => {
        if (!cancelled) dispatch({ type: 'failed', epoch, message: messageOf(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, openId, epoch]);

  /* The live channel. MessageAdded/MessageUpdated select the exact same
   * fragments as the ConversationMessages nodes, so payloads are
   * MessageNode-shaped.
   *
   * Keyed on the PROP rather than on `state.conversationId`, unlike the reads
   * above: this is the one effect that must tear down in the same commit as the
   * `opened` dispatch. A subscription left running one commit longer delivers
   * the old conversation's messages into a thread that has already been
   * cleared for the new one. It deliberately does not depend on the epoch —
   * a reconnect refetch bumps that, and tearing the WebSocket down and back up
   * on every one of those is a loop waiting to happen. */
  useEffect(() => {
    if (!conversationId) return;
    const vars = { botID: botId, conversationID: conversationId };
    const onError = (err: unknown) => dispatch({ type: 'liveFailed', message: messageOf(err) });
    const offAdded = client.subscribe(MessageAddedDocument, vars, {
      next: (data) => {
        if (data.messageAdded) {
          dispatch({ type: 'live', node: data.messageAdded, now: Date.now() });
        }
      },
      error: onError,
    });
    const offUpdated = client.subscribe(MessageUpdatedDocument, vars, {
      next: (data) => {
        if (data.messageUpdated) {
          dispatch({ type: 'live', node: data.messageUpdated, now: Date.now() });
        }
      },
      error: onError,
    });
    const offReconnect = client.onReconnect(() => dispatch({ type: 'refetch' }));
    return () => {
      offAdded();
      offUpdated();
      offReconnect();
    };
  }, [client, botId, conversationId]);

  /* Mark-read follows the newest message that has an id, whatever put it there.
   * Keyed on that id rather than fired once after the load: a conversation the
   * operator is looking at while replies keep arriving is read, and the old
   * once-per-open call left it unread from the second message on. */
  const markReadTarget = selectMarkReadTarget(state, options.canEdit ?? false);
  useEffect(() => {
    if (!openId || !markReadTarget) return;
    client
      .mutate(MarkConversationReadDocument, {
        botID: botId,
        conversationID: openId,
        before: markReadTarget,
      })
      /* The answer clears the row's badge in the list — which is the visible
         half of "opening a chat reads it", and the half the server's own
         Update event delivers a round trip later. */
      .then((data) => {
        if (data.conversationReadMessages) applyAnswer(data.conversationReadMessages);
      })
      .catch(() => {
        /* read markers are best-effort */
      });
  }, [client, botId, openId, markReadTarget, applyAnswer]);

  // Typing indicator decay: one timer, cancelled by the next bump.
  useEffect(() => {
    if (typingUntil === null) return;
    const remaining = typingUntil - Date.now();
    if (remaining <= 0) return;
    const timer = setTimeout(() => dispatch({ type: 'typingExpired' }), remaining);
    return () => clearTimeout(timer);
  }, [typingUntil]);

  const loadOlder = useCallback(() => {
    if (!openId || loadingOlder || !hasOlder || !olderCursor) return;
    dispatch({ type: 'olderRequested', epoch });
    client
      .query(ConversationMessagesDocument, {
        botID: botId,
        conversationID: openId,
        first: MESSAGES_PAGE_SIZE,
        after: olderCursor,
      })
      .then((data) => {
        const page = toPage(data);
        if (!page.conversation) dispatch({ type: 'olderFailed', epoch });
        else dispatch({ type: 'olderLoaded', epoch, page });
      })
      // Stale cursor and friends → clean restart (pagination.md). Cheap now:
      // the refetch merges, so the history already on screen survives it.
      .catch(() => dispatch({ type: 'refetch' }));
  }, [client, botId, openId, epoch, hasOlder, olderCursor, loadingOlder]);

  /* Composed after the `opened` sync effect above, so that effect stays the
     first to run on a conversation switch — the child hooks hold callbacks
     only, no effects. */
  const { send, sendAttachment, sendTemplate } = useConversationSend(openId, conversation, dispatch);
  const { takeOver, closeToFlow, setSalesStage } = useConversationLifecycle(
    openId,
    conversation,
    dispatch,
    applyAnswer,
    options.onStageChanged,
  );

  const entries = useMemo(() => selectEntries(state), [state]);

  return {
    conversation,
    entries,
    loading: state.loading,
    error: state.error,
    typing: selectTyping(state, Date.now()),
    hasOlder,
    loadingOlder,
    loadOlder,
    send,
    sendAttachment,
    sendTemplate,
    takeOver,
    closeToFlow,
    setSalesStage,
  };
}
