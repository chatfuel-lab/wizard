import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { newClientId } from '~api';
import { useTestChat, type TestChatApi, type TestChatTransport } from '~ui';
import {
  AutomationsPreviewMessageAddedDocument,
  AutomationsPreviewMessagesDocument,
  AutomationsPreviewMessageUpdatedDocument,
  AutomationsPreviewStartForAutomationDocument,
} from '~api/generated/automations/graphql';
import { useAutomations } from '../AutomationsContext';
import type { PreviewPlatform } from '../lib/automationsParams';
import { errorMessage } from '../lib/errors';
import {
  commentPreviewFor,
  parsePreviewPlatform,
  readCommentNodes,
  sendDocumentFor,
  targetKey,
  toRow,
  type PreviewTarget,
} from '../lib/preview';
import type { PreviewMessageNode, PreviewSession } from '../types';

/** The comment on the post, for a comment scope's test. */
export interface PreviewComment {
  text: string;
  /** Sent, and the server has not answered the mutation yet. */
  sending: boolean;
  /** The mutation was refused — the sentence to show under the field. */
  error: string | null;
}

export interface PreviewSessionApi extends TestChatApi<PreviewSession> {
  /** The session's platform — what the send document is picked by. */
  platform: PreviewPlatform | null;
  /** `ready` and the platform is known. */
  canSend: boolean;
  /** Why sending is off when the session itself is fine. */
  sendBlocked: string | null;
  /** This target's test is a comment on a post (Instagram · Posts & Reels, Facebook · Post comments). */
  commentMode: boolean;
  /** The tester's comment on this attempt, once one was sent. */
  comment: PreviewComment | null;
  /** The automation's public reply under it, once it arrived. */
  publicReply: string | null;
  /** Row keys that belong on the post rather than in the DM thread. */
  postRowKeys: ReadonlySet<string>;
  /** Leave the comment. `postText` is the post's own text, which the AI reads as context. */
  sendComment: (text: string, postText: string) => Promise<void>;
  /** Forget this attempt's comment and reply — a restart's other half. */
  resetComment: () => void;
}

/**
 * One preview session pinned to one automation
 * (`previewResponsesStartForFuelyAutomation` — enabled and filters bypassed,
 * the All base refused).
 *
 * The lifecycle is `~ui`'s `useTestChat`; what stays here is the requests it
 * makes, which are this module's own generated documents. Changing the target
 * drops the session and its subscriptions; a late reply of a previous start is
 * ignored by generation.
 *
 * A comment scope adds a second way in: `sendComment`. Every batch of wire
 * messages — history, subscription, send results — is read for the comment and
 * its public reply (`readCommentNodes`), so the panel can draw those on the
 * post and keep them out of the DM thread.
 *
 * There is no `restore`: only flows have a session readback
 * (`Flow.previewResponsesSession`). An automation session's id lives in memory
 * and a reload starts over.
 */
export function usePreviewSession(target: PreviewTarget | null): PreviewSessionApi {
  const { client, botId } = useAutomations();
  const commentPreview = commentPreviewFor(target?.scope);

  const [comment, setComment] = useState<PreviewComment | null>(null);
  const [publicReply, setPublicReply] = useState<string | null>(null);
  const [postRowKeys, setPostRowKeys] = useState<ReadonlySet<string>>(() => new Set());
  /* An attempt counter: a reply that lands after a reset belongs to the attempt
     before it and is dropped. */
  const attempt = useRef(0);

  const observe = useCallback((nodes: readonly PreviewMessageNode[]) => {
    const found = readCommentNodes(nodes);
    if (found.keys.length > 0) {
      setPostRowKeys((prev) => {
        const next = new Set(prev);
        for (const key of found.keys) next.add(key);
        return next;
      });
    }
    if (found.reply !== null) setPublicReply(found.reply);
  }, []);

  const resetComment = useCallback(() => {
    attempt.current += 1;
    setComment(null);
    setPublicReply(null);
  }, []);

  // A new target is a new life for the comment too.
  const key = targetKey(target);
  useEffect(() => {
    resetComment();
    setPostRowKeys(new Set());
  }, [key, resetComment]);

  const transport = useMemo<TestChatTransport<PreviewSession, PreviewMessageNode>>(
    () => ({
      targetKey: targetKey(target),
      newClientId,
      errorMessage,
      toRow,
      start: () =>
        client
          .mutate(AutomationsPreviewStartForAutomationDocument, { botID: botId, automationID: target?.id ?? '' })
          .then((data) => data.previewResponsesStartForFuelyAutomation),
      loadPage: (session, first) =>
        client
          .query(AutomationsPreviewMessagesDocument, {
            botID: botId,
            conversationID: session.conversationID,
            first,
          })
          .then((data) => {
            const nodes = (data.bot?.conversation?.messages?.edges ?? []).map((edge) => edge.node);
            observe(nodes);
            return nodes;
          }),
      subscribe: (session, handlers) => {
        const vars = { botID: botId, conversationID: session.conversationID };
        const offAdded = client.subscribe(AutomationsPreviewMessageAddedDocument, vars, {
          next: (data) => {
            if (!data.messageAdded) return;
            observe([data.messageAdded]);
            handlers.next([data.messageAdded]);
          },
          error: handlers.error,
        });
        const offUpdated = client.subscribe(AutomationsPreviewMessageUpdatedDocument, vars, {
          next: (data) => {
            if (!data.messageUpdated) return;
            observe([data.messageUpdated]);
            handlers.next([data.messageUpdated]);
          },
          error: handlers.error,
        });
        return () => {
          offAdded();
          offUpdated();
        };
      },
      onReconnect: (reload) => client.onReconnect(reload),
      sendText: async (session, text, clientId) => {
        const platform = parsePreviewPlatform(session.platform);
        if (!platform) return null;
        const { document, resultKey } = sendDocumentFor(platform);
        const data = await client.mutate(document, {
          botID: botId,
          conversationID: session.conversationID,
          message: { text, clientId },
        });
        return data?.[resultKey] ?? null;
      },
    }),
    [client, botId, target, observe],
  );

  const chat = useTestChat(transport);
  const platform = chat.session ? parsePreviewPlatform(chat.session.platform) : null;
  const unknownPlatform = chat.session !== null && platform === null;
  const session = chat.session;

  const sendComment = useCallback(
    async (text: string, postText: string) => {
      if (!commentPreview || !session) return;
      const mine = attempt.current;
      const clientId = newClientId();
      /* Its key is known before the answer: keep it out of the DM thread from
         the first event, which can beat the mutation's own answer. */
      setPostRowKeys((prev) => new Set(prev).add(clientId));
      setComment({ text, sending: true, error: null });
      try {
        const data = await client.mutate(commentPreview.document, {
          botID: botId,
          conversationID: session.conversationID,
          comment: { text, clientId, [commentPreview.postField]: postText } as never,
        });
        const node = data?.[commentPreview.resultKey];
        if (node) observe([node]);
        if (attempt.current === mine) setComment({ text, sending: false, error: null });
      } catch (err) {
        if (attempt.current === mine) setComment({ text, sending: false, error: errorMessage(err) });
      }
    },
    [client, botId, commentPreview, session, observe],
  );

  return useMemo(
    () => ({
      ...chat,
      platform,
      canSend: chat.ready && platform !== null,
      sendBlocked: unknownPlatform
        ? `Unknown platform "${String(chat.session?.platform)}" — sending is disabled.`
        : null,
      commentMode: commentPreview !== null,
      comment,
      publicReply,
      postRowKeys,
      sendComment,
      resetComment,
    }),
    [chat, platform, unknownPlatform, commentPreview, comment, publicReply, postRowKeys, sendComment, resetComment],
  );
}
