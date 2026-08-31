import { useCallback, useEffect, useRef } from 'react';
import { useToast } from '~ui';
import { ConversationStatus, SalesStageV2 } from '~api/generated/livechat/graphql';
import { messageOf } from '../lib/errors';
import type { FlowOption } from '../lib/flowPicker';
import type { ConversationInfo } from '../types';

export interface UseThreadActionsOptions {
  conversation: ConversationInfo | null;
  canEdit: boolean;
  /** Who the thread is with — the confirmations name them. */
  name: string;
  /** Bumped by the palette's "Take over" — the same call as the header button. */
  takeOverRequest: number;
  takeOver: () => Promise<void>;
  closeToFlow: (flowId: string) => Promise<void>;
  setSalesStage: (stage: SalesStageV2) => Promise<void>;
  onFlowPickerOpenChange: (open: boolean) => void;
}

export interface ThreadActions {
  handOver: (flow: FlowOption) => Promise<void>;
  closeAs: (stage: SalesStageV2) => Promise<void>;
  /** Resolves to the toast's id when the take-over failed and one was shown. */
  onTakeOver: () => Promise<unknown>;
}

/**
 * The thread pane's finishing moves — hand over to a flow, close as won or
 * lost, take over from the bot — each wrapped with its toast.
 *
 * `handOver` and `closeAs` are plain arrows, fresh per render, exactly as
 * they were inside the pane: nothing keys on their identity — they are
 * pressed, not depended on. `onTakeOver` is memoized because the take-over
 * latch below depends on it.
 */
export function useThreadActions({
  conversation,
  canEdit,
  name,
  takeOverRequest,
  takeOver,
  closeToFlow,
  setSalesStage,
  onFlowPickerOpenChange,
}: UseThreadActionsOptions): ThreadActions {
  const toast = useToast();

  /* Failure stays in the picker's dialog, where the button is; success is a
     toast, because the picker is gone by then and the header saying "Closed"
     does not say which flow has the contact now. */
  const handOver = async (flow: FlowOption) => {
    await closeToFlow(flow.id);
    onFlowPickerOpenChange(false);
    toast.show({
      tone: 'success',
      title: 'Conversation closed',
      description: `${flow.name} is running for ${name}.`,
    });
  };

  /* Won and lost are outcomes, not conversation states: they set the
     contact's sales stage — the field the deals board is built on — and leave
     the conversation as it is. Offered under the same "Close" because that is
     where an operator looks when a conversation is done, whatever it turned
     into. The toast is the only confirmation there is: nothing in the thread
     changes, and a menu that closed with no answer reads as a menu that did
     nothing. */
  const closeAs = async (stage: SalesStageV2) => {
    try {
      await setSalesStage(stage);
      toast.show({
        tone: 'success',
        title: stage === SalesStageV2.Won ? 'Marked as won' : 'Marked as lost',
        description: `${name} is now in ${stage === SalesStageV2.Won ? 'Won' : 'Lost'}.`,
      });
    } catch (err) {
      toast.show({
        tone: 'danger',
        title: 'The stage did not change',
        description: messageOf(err),
      });
    }
  };

  const onTakeOver = useCallback(
    () =>
      takeOver().catch((err: unknown) =>
        toast.show({
          tone: 'danger',
          title: 'Could not take over',
          description: messageOf(err),
        }),
      ),
    [takeOver, toast],
  );

  /* The palette's "Take over", honoured once per bump. Seeded with the current
     count so a mount never fires for a bump that happened before it, and
     compared rather than re-run so a status change afterwards — the answer
     itself flips it to open — does not ask twice. */
  const honouredTakeOver = useRef(takeOverRequest);
  useEffect(() => {
    if (takeOverRequest === honouredTakeOver.current) return;
    honouredTakeOver.current = takeOverRequest;
    if (conversation?.status === ConversationStatus.Automated && canEdit) void onTakeOver();
  }, [takeOverRequest, conversation?.status, canEdit, onTakeOver]);

  return { handOver, closeAs, onTakeOver };
}
