import { describe, expect, it } from 'vitest';
import type { MessageNode } from '../types';
import { messageDirection, senderLabel } from './direction';

const from = (typename: string, name: string): Pick<MessageNode, 'sender'> =>
  ({ sender: { __typename: typename, id: 's', name, profilePicture: null } }) as Pick<MessageNode, 'sender'>;

/* The wire-format strings this parses. */
const CONTACT_MOCK = 'contact wa_1000000000000001_1000000000000002_100000000000 sender mock name';
const AUTOMATION_MOCK = 'automation executor sender mock name';

describe('messageDirection', () => {
  it('reads the contact off the sender typename and nothing else', () => {
    expect(messageDirection(from('ContactMessageSender', CONTACT_MOCK))).toBe('in');
    expect(messageDirection(from('AdminMessageSender', 'Ada'))).toBe('out');
    expect(messageDirection(from('AutomationMessageSender', AUTOMATION_MOCK))).toBe('out');
    expect(messageDirection(from('WhatsappBusinessAppSender', 'Shop'))).toBe('out');
  });
});

describe('senderLabel', () => {
  /* The bug: every inbound bubble carried the server's placeholder over it. */
  it('never prints the contact or automation mock names', () => {
    expect(senderLabel(from('ContactMessageSender', CONTACT_MOCK))).toBeUndefined();
    expect(senderLabel(from('AutomationMessageSender', AUTOMATION_MOCK))).toBeUndefined();
    expect(senderLabel(from('ContactMessageSender', 'Maria'))).toBeUndefined();
  });

  it('names an operator, and only an operator', () => {
    expect(senderLabel(from('AdminMessageSender', 'Ada'))).toBe('Ada');
    expect(senderLabel(from('AdminMessageSender', '  '))).toBeUndefined();
    expect(senderLabel(from('InstagramAppSender', 'demoshop'))).toBeUndefined();
    expect(senderLabel(from('WhatsappBusinessAppSender', 'Shop'))).toBeUndefined();
  });
});
