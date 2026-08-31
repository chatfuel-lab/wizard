import { useCallback, useRef, type Dispatch } from 'react';
import {
  CloseConversationToFlowDocument,
  InboxSetSalesStageDocument,
  TakeOverConversationDocument,
  type ConversationStatus,
  type SalesStageV2,
} from '~api/generated/livechat/graphql';
import { useLivechat } from '../LivechatContext';
import type { StageChange } from '../lib/conversationPatch';
import type { ThreadAction } from '../lib/threadStore';
import type { ConversationInfo } from '../types';

/**
 * What a lifecycle mutation answers with, applied through the facade's one
 * door — `applyAnswer` in `useConversation`, which patches the thread and
 * tells whoever else holds this conversation.
 */
export type ApplyLifecycleAnswer = (answer: {
  id: string;
  status?: ConversationStatus;
  read?: boolean | null;
  updatedAt: string;
}) => void;

export interface ConversationLifecycle {
  takeOver: () => Promise<void>;
  closeToFlow: (flowId: string) => Promise<void>;
  setSalesStage: (stage: SalesStageV2) => Promise<void>;
}

/**
 * The lifecycle mutations of the open thread: take over from the bot, close
 * by handing the contact to a flow, and "close as won / lost" — which is the
 * CONTACT's sales stage, not a conversation state.
 *
 * Callbacks only, deliberately no effects: `useConversation` composes this
 * over its own reducer, and its `opened` sync effect must stay the first
 * effect to run on a conversation switch. Take-over and close both report
 * through `applyAnswer`, so the list hears about them the same way mark-read
 * is heard.
 */
export function useConversationLifecycle(
  openId: string | null,
  conversation: ConversationInfo | null,
  dispatch: Dispatch<ThreadAction>,
  applyAnswer: ApplyLifecycleAnswer,
  onStageChanged?: (change: StageChange) => void,
): ConversationLifecycle {
  const { client, botId } = useLivechat();

  /* Read through a ref: the caller builds it inline, and a callback keyed on
   * that fresh closure would re-key its consumers on every render. */
  const onStageRef = useRef(onStageChanged);
  onStageRef.current = onStageChanged;

  /* The answer lands first, so the header says "Open" the moment the button
   * is released; the refetch that follows is for what the answer does not
   * carry — the system line the hand-over writes into the thread arrives on
   * the live channel, and a reconnect-blinked socket may have missed it. */
  const takeOver = useCallback(async () => {
    if (!openId) return;
    const data = await client.mutate(TakeOverConversationDocument, {
      botID: botId,
      conversationID: openId,
    });
    if (data.conversationStart) applyAnswer(data.conversationStart);
    dispatch({ type: 'refetch' });
  }, [client, botId, openId, applyAnswer, dispatch]);

  /* There is no plain close. `conversationFinishSendToFlow` closes the live
   * chat and starts the flow for the contact in one call, so the answer's
   * status is `closed` and the composer greys out on the same render. */
  const closeToFlow = useCallback(
    async (flowId: string) => {
      if (!openId) return;
      const data = await client.mutate(CloseConversationToFlowDocument, {
        botID: botId,
        conversationID: openId,
        flowID: flowId,
      });
      if (data.conversationFinishSendToFlow) applyAnswer(data.conversationFinishSendToFlow);
    },
    [client, botId, openId, applyAnswer],
  );

  /* The contact's id comes off the loaded conversation, never off the thread's
   * own id: the two are the same string today and need not stay one. */
  const setSalesStage = useCallback(
    async (stage: SalesStageV2) => {
      const contactId = conversation?.contact?.id;
      if (!contactId) return;
      const data = await client.mutate(InboxSetSalesStageDocument, { contactID: contactId, stage });
      const answer = data.contactSetSalesStage;
      /* The field is nullable in the schema; a null here would mean the server
         cleared the stage, which this mutation cannot do. Report what it says. */
      if (answer?.salesStageV2) {
        onStageRef.current?.({ contactId: answer.id, salesStageV2: answer.salesStageV2, updatedAt: answer.updatedAt });
      }
    },
    [client, conversation],
  );

  return { takeOver, closeToFlow, setSalesStage };
}
