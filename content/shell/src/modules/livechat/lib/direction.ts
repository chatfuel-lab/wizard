import type { MessageNode } from '../types';

/**
 * The only uniform direction rule across all ~70 message typenames:
 * sender.__typename === 'ContactMessageSender' means the contact wrote it
 * (WebWidget typenames carry no In/Out prefix, so the name alone is not
 * enough).
 */
export const messageDirection = (message: { sender: { __typename: string } }): 'in' | 'out' =>
  message.sender.__typename === 'ContactMessageSender' ? 'in' : 'out';

/**
 * The name to print above a bubble, or nothing.
 *
 * `sender.name` is NOT a display name on every sender. In practice: a contact's
 * is `"contact wa_1309306774634883_… sender mock name"` and the automation's
 * is `"automation executor sender mock name"` — server placeholders, not
 * words for a reader. Only an `AdminMessageSender` (an operator) carries a
 * real name, and it is the one worth printing: in a shared inbox, WHICH
 * colleague answered is information. The contact needs no name above their
 * bubbles at all — the thread header names them — and the automation is
 * already told by the bubble's side.
 *
 * Read through the sender's typename, the same discipline as the direction
 * above: it is the one field that says what a sender is.
 */
export const senderLabel = (message: Pick<MessageNode, 'sender'>): string | undefined => {
  if (message.sender.__typename !== 'AdminMessageSender') return undefined;
  const name = message.sender.name.trim();
  return name || undefined;
};
