import { useMemo } from 'react';
import { newClientId } from '~api';
import { useTestChat, type TestChatApi, type TestChatTransport } from '~ui';
import {
  FlowTestMessageAddedDocument,
  FlowTestMessagesDocument,
  FlowTestMessageUpdatedDocument,
  FlowTestSessionReadbackDocument,
  FlowTestStartDocument,
} from '~api/generated/flow-builder/graphql';
import { useFlowBuilder } from '../FlowBuilderContext';
import { clickDocumentFor, clickInput, sendDocumentFor } from '../lib/testDocs';
import { testErrorMessage } from '../lib/testDock';
import { toRow, type ClickKind } from '../lib/testRows';
import type { TestMessageNode, TestSession } from '../types';

export interface FlowTestApi extends TestChatApi<TestSession> {
  /** `ready`, the role allows writing, and the platform has a send mutation. */
  canSend: boolean;
  /** Why the composer is shut when the session itself is fine. */
  sendBlocked: string | null;
  /** The block this run began at, when the session named one and it still exists. */
  startingBlockId: string | null;
}

/**
 * The Test dock's five requests, over `~ui`'s session machine.
 *
 * `previewResponsesStartInFlow` runs the flow from its starting point the
 * moment it answers, so the first bot messages arrive with nobody having typed;
 * `Flow.previewResponsesSession` is the readback that lets a reload rejoin that
 * conversation instead of starting a second one. Both are flow-only — the
 * automations twin has neither.
 */
export function useFlowTest(flowId: string, platform: string, canSend: boolean): FlowTestApi {
  const { client, botId } = useFlowBuilder();

  const transport = useMemo<TestChatTransport<TestSession, TestMessageNode>>(
    () => ({
      targetKey: flowId ? `flow:${flowId}` : '',
      newClientId,
      errorMessage: testErrorMessage,
      toRow,
      start: () =>
        client.mutate(FlowTestStartDocument, { flowID: flowId }).then((data) => data.previewResponsesStartInFlow),
      restore: () =>
        client
          .query(FlowTestSessionReadbackDocument, { botID: botId, flowID: flowId })
          .then((data) => data.bot?.flow?.previewResponsesSession ?? null),
      loadPage: (session, first) =>
        client
          .query(FlowTestMessagesDocument, {
            botID: botId,
            conversationID: session.conversationID,
            first,
          })
          .then((data) => (data.bot?.conversation?.messages?.edges ?? []).map((edge) => edge.node)),
      subscribe: (session, handlers) => {
        const vars = { botID: botId, conversationID: session.conversationID };
        const offAdded = client.subscribe(FlowTestMessageAddedDocument, vars, {
          next: (data) => {
            if (data.messageAdded) handlers.next([data.messageAdded]);
          },
          error: handlers.error,
        });
        const offUpdated = client.subscribe(FlowTestMessageUpdatedDocument, vars, {
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
        const send = sendDocumentFor(platform);
        if (!send) return null;
        const data = await client.mutate(send.document, {
          botID: botId,
          conversationID: session.conversationID,
          message: { text, clientId },
        });
        return data?.[send.resultKey] ?? null;
      },
      sendAction: async (session, row, action, clientId) => {
        /* A click is addressed by the message id plus the title; `act` in the
           hook already refuses a row without an id, and a URL or phone button
           never gets here — the browser acts on those. */
        if (!row.id || !action.click) return null;
        const kind = action.click as ClickKind;
        const click = clickDocumentFor(kind);
        const data = await client.mutate(click.document, {
          botID: botId,
          conversationID: session.conversationID,
          click: clickInput(kind, row.id, action.title, clientId),
        });
        return data?.[click.resultKey] ?? null;
      },
    }),
    [client, botId, flowId, platform],
  );

  const chat = useTestChat(transport);
  const session = chat.session;
  const sendable = sendDocumentFor(platform) !== null;

  return useMemo(
    () => ({
      ...chat,
      canSend: chat.ready && canSend && sendable,
      sendBlocked: !sendable
        ? `This flow's channel (${platform || 'unknown'}) has no test sending.`
        : canSend
          ? null
          : 'Sending needs the Inbox: Edit permission.',
      startingBlockId: session?.startingBlock?.id ?? null,
    }),
    [chat, canSend, platform, sendable, session],
  );
}
