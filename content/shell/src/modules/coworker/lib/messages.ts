import type { MessageNode } from '../types';

/**
 * What the wire actually means, one message at a time.
 *
 * The API has ONE message type and no per-message status, so everything a
 * thread needs to know about a row — is it worth showing, is it something the
 * assistant said or something it did, what is this tool called — is a rule
 * about `content` and `toolCalls` rather than a field. Those rules live here,
 * where a node-only vitest can reach them.
 */

/**
 * The three things a message can be.
 *
 * - `said`   — there is something to read: text, or an attachment, or both.
 * - `step`   — no content, one tool call. The assistant DID something.
 * - `noise`  — nothing at all. A failed tool result, or the invisible message
 *              a rejection leaves behind.
 *
 * The distinction between `step` and `noise` is the whole bug this replaces.
 * An earlier version of this module hid every message with no content, and the API emits an
 * empty message for the assistant's tool *request* and a second empty one
 * carrying `toolCalls` for its *result* — so a run that consulted a skill,
 * called two tools and navigated the dashboard showed the operator nothing at
 * all between their question and the answer. Half of that is genuinely noise
 * and stays hidden; the half carrying a call is the only record that the work
 * happened, and it renders as a step.
 *
 * `said` wins over `step` when a message somehow has both. The guide is
 * explicit that `toolCalls` is populated only on tool-result messages, whose
 * content is empty, and one of each has never been seen — but a
 * row with words in it has to show the words, and a rule that silently swaps
 * them for a tool chip would be the same class of bug as the one above.
 */
export type MessageKind = 'said' | 'step' | 'noise';

export function messageKind(msg: MessageNode): MessageKind {
  const hasText = Boolean(msg.content && msg.content.trim() !== '');
  const hasFiles = Boolean(msg.attachments && msg.attachments.length > 0);
  if (hasText || hasFiles) return 'said';
  return msg.toolCalls && msg.toolCalls.length > 0 ? 'step' : 'noise';
}

/** Sugar for the one question the reducer's visibility filter asks. */
export function isNoiseMessage(msg: MessageNode): boolean {
  return messageKind(msg) === 'noise';
}

/** Optimistic-reconciliation key: your own sends echo clientID (guide.md). */
export function entryKey(msg: Pick<MessageNode, 'id' | 'clientID'>): string {
  return msg.clientID ?? msg.id;
}

/** The message's text, trimmed of the trailing newline a stream tends to end on. */
export function messageText(msg: Pick<MessageNode, 'content'>): string {
  return (msg.content ?? '').replace(/\s+$/, '');
}
