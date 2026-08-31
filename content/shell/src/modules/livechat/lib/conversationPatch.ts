import type { ConversationStatus, SalesStageV2 } from '~api/generated/livechat/graphql';

/**
 * What a lifecycle mutation answers with, and how it lands on state.
 *
 * `TakeOverConversation`, `CloseConversationToFlow` and `MarkConversationRead`
 * all answer with a `Conversation` — id, the field they changed, and
 * `updatedAt` — and nothing else. On a live socket that answer is followed by
 * the list's own `Update` event and the thread's refetch, so the answer could
 * be ignored and the screen would still catch up. It is not ignored, for two
 * reasons: the operator who pressed the button is looking at the button, and a
 * status that changes a round trip later than the click reads as a miss; and a
 * deployment with no socket in front of it gets no event at all, so applying
 * the answer is the only path by which "Take over" changes anything there.
 *
 * Both stores apply it through `applyConversationPatch` so the one rule about
 * it lives once: an answer never overwrites something fresher. A mark-read
 * that was issued before a new message arrived can land after the `Update`
 * that carried the message, and applying it then would mark unread mail read.
 */
export interface ConversationPatch {
  id: string;
  status?: ConversationStatus;
  read?: boolean;
  updatedAt: string;
}

/** The contact's sales stage moved — "close as won / lost" answered from the thread. */
export interface StageChange {
  contactId: string;
  salesStageV2: SalesStageV2;
  updatedAt: string;
}

/** The subset of a `Conversation` both stores hold. */
export interface PatchableConversation {
  id: string;
  status: ConversationStatus;
  read?: boolean | null;
  updatedAt: string;
}

/**
 * The conversation with the patch applied, or the very same object when the
 * patch is for another conversation, older than what is held, or changes
 * nothing — identity is the reducers' "did anything happen" signal.
 */
export function applyConversationPatch<T extends PatchableConversation>(conversation: T, patch: ConversationPatch): T {
  if (conversation.id !== patch.id) return conversation;
  if (patch.updatedAt < conversation.updatedAt) return conversation;
  const next = { ...conversation, updatedAt: patch.updatedAt };
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.read !== undefined) next.read = patch.read;
  const same =
    next.status === conversation.status && next.read === conversation.read && next.updatedAt === conversation.updatedAt;
  return same ? conversation : next;
}
