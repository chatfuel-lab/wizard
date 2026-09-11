import { describe, expect, it } from 'vitest';
import { contactChatLink } from './CustomerSection';

/* The twin of the contacts module's own rule. The two may not import each
   other, so this test is what stops the copies drifting apart. */
describe('the Inbox link on a booking customer', () => {
  it('opens the conversation the contact already has', () => {
    expect(contactChatLink({ id: 'c 1', conversation: { id: 'conv 7' } })).toEqual({
      href: '/livechat?c=conv%207',
      label: 'Open in Inbox',
    });
  });

  it('asks the inbox to start one when the contact has never messaged', () => {
    expect(contactChatLink({ id: 'c 1', conversation: null })).toEqual({
      href: '/livechat?contact=c%201',
      label: 'Start a chat',
    });
  });
});
