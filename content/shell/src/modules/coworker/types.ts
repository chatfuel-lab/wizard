import type { ModuleClient } from '~api';
import type {
  CoworkerConvStateFragment,
  CoworkerMsgFragment,
  CoworkerUpdatesSubscription,
} from '~api/generated/coworker/graphql';

/**
 * The injected client, under the module's local name. Satisfied by the real
 * ChatfuelClient (~api) — this module never constructs one.
 */
export type ApiClient = ModuleClient;

/** Conversation state without messages (list rows, mutation results, events). */
export type ConvState = CoworkerConvStateFragment;

/** The one flat message type (role ∈ coworker | user). */
export type MessageNode = CoworkerMsgFragment;

type PendingAction = NonNullable<ConvState['pendingAction']>;
export type ApprovalRequest = Extract<PendingAction, { __typename: 'CoworkerToolApprovalRequest' }>;
export type RejectedMessage = Extract<PendingAction, { __typename: 'CoworkerUserMessageRejected' }>;

/** One event off the bot-scoped coworkerAnyConversationUpdated subscription. */
export type CoworkerEvent = CoworkerUpdatesSubscription['coworkerAnyConversationUpdated'];

export type ToolCall = MessageNode['toolCalls'][number];
