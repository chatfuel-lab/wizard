import type { ApprovalRequest, MessageNode, RejectedMessage, ToolCall } from '../types';

/**
 * The seam between the parts of this module.
 *
 * Three of them meet inside one thread: the thread itself renders messages, the
 * run layer renders what the assistant DID, and the composer sends. Each owns
 * its own directory, so the props between them are declared here once, up
 * front.
 *
 * Every one of these components is presentational: the data and the mutations
 * come from `useCoworkerThread`, which the thread owns. That is deliberate —
 * two components independently deciding when a send is allowed is how the
 * "attachments while an approval is pending" rule gets enforced in one place
 * and forgotten in the other.
 */

/* --- run layer ------------------------------------------------- */

export interface RunStepViewProps {
  call: ToolCall;
  /** The message the call arrived on — the key for its outcome and its state. */
  messageId: string;
  conversationId: string;
  /** A narrow band; steps collapse harder there. */
  compact: boolean;
}

export interface QuickReplyBarProps {
  /** In the order the assistant offered them. */
  replies: readonly string[];
  onPick: (text: string) => void;
  /** An approval is pending, or a loop is running. */
  disabled: boolean;
}

export interface ApprovalCardProps {
  conversationId: string;
  request: ApprovalRequest;
  /** A response is in flight; the API resolves asynchronously. */
  responded: boolean;
  onRespond: (approved: boolean, denialMessage?: string) => void;
  compact: boolean;
}

export interface RejectedCardProps {
  rejected: RejectedMessage;
  onAbort: () => void;
  /** Re-sending REPLACES the rejected message; that is the API's own wording. */
  onResend: (text: string) => void;
}

/* --- composer --------------------------------------------------- */

export interface CoworkerComposerProps {
  conversationId: string | null;
  /** Text only. Attachments and audio are the composer's own mutations. */
  onSendText: (text: string) => void;
  /**
   * There is a run to interrupt: the send control becomes Stop.
   *
   * Not `isAgentLoopActive` raw. While an approval is pending the loop is
   * parked on a human and nothing is running — and `~ui`'s `Composer` swallows
   * Enter entirely while `onStop` is set, which in that state would take away
   * the operator's rejection, since typing IS how a batch is rejected. The
   * thread decides; the composer only draws it.
   */
  busy: boolean;
  onStop: () => void;
  /**
   * Set when sending is refused and why. The API rejects attachments outright
   * while an approval is pending, and a plain message there is an implicit
   * rejection of the whole batch — which the operator has to be told BEFORE
   * they type, not after.
   */
  blocked?: { text: boolean; attachments: boolean; reason: string };
  /**
   * Get a conversation to send into, creating one if there is none.
   *
   * Typed text does not need this — `onSendText` already handles the empty
   * case. Files do: every attachment mutation takes a `conversationID`, and
   * without a way to get one the paperclip and the microphone had to disappear
   * on the very screen where somebody is most likely to drag a file in.
   * Required, because a composer without it silently breaks exactly that
   * screen — a file dropped there would have no conversation to land in.
   */
  ensureConversation: () => Promise<string | null>;
}

/* --- thread ----------------------------------------------------- */

export interface MessageViewProps {
  message: MessageNode;
  conversationId: string;
  /** Same author as the message above, within the grouping window. */
  grouped: boolean;
  pending?: boolean;
  failed?: boolean;
  onRetry?: () => void;
  compact: boolean;
}
