import { useMemo } from 'react';
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
import { parsePreviewPlatform, sendDocumentFor, targetKey, toRow, type PreviewTarget } from '../lib/preview';
import type { PreviewMessageNode, PreviewSession } from '../types';

export interface PreviewSessionApi extends TestChatApi<PreviewSession> {
  /** The session's platform — what the send document is picked by. */
  platform: PreviewPlatform | null;
  /** `ready` and the platform is known. */
  canSend: boolean;
  /** Why sending is off when the session itself is fine. */
  sendBlocked: string | null;
}

/**
 * One preview session pinned to one automation
 * (`previewResponsesStartForFuelyAutomation` — enabled and filters bypassed,
 * the All base refused).
 *
 * The lifecycle is `~ui`'s `useTestChat`; what stays here is the five requests
 * it makes, which are this module's own generated documents. Changing the
 * target drops the session and its subscriptions; a late reply of a previous
 * start is ignored by generation.
 *
 * There is no `restore`: only flows have a session readback
 * (`Flow.previewResponsesSession`). An automation session's id lives in memory
 * and a reload starts over.
 */
export function usePreviewSession(target: PreviewTarget | null): PreviewSessionApi {
  const { client, botId } = useAutomations();

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
          .then((data) => (data.bot?.conversation?.messages?.edges ?? []).map((edge) => edge.node)),
      subscribe: (session, handlers) => {
        const vars = { botID: botId, conversationID: session.conversationID };
        const offAdded = client.subscribe(AutomationsPreviewMessageAddedDocument, vars, {
          next: (data) => {
            if (data.messageAdded) handlers.next([data.messageAdded]);
          },
          error: handlers.error,
        });
        const offUpdated = client.subscribe(AutomationsPreviewMessageUpdatedDocument, vars, {
          next: (data) => {
            if (data.messageUpdated) handlers.next([data.messageUpdated]);
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
    [client, botId, target],
  );

  const chat = useTestChat(transport);
  const platform = chat.session ? parsePreviewPlatform(chat.session.platform) : null;
  const unknownPlatform = chat.session !== null && platform === null;

  return useMemo(
    () => ({
      ...chat,
      platform,
      canSend: chat.ready && platform !== null,
      sendBlocked: unknownPlatform
        ? `Unknown platform "${String(chat.session?.platform)}" — sending is disabled.`
        : null,
    }),
    [chat, platform, unknownPlatform],
  );
}
