import { describe, expect, it } from 'vitest';
import {
  historyCursor,
  historyExhausted,
  mergeMessages,
  messageDirection,
  messageKind,
  messageSenderName,
  messageTimeLabel,
  recentMessages,
  toRecordMessage,
  toRecordMessages,
  type MessageEdgeLike,
} from './contactMessages';

const edge = (
  cursor: string,
  overrides: Partial<MessageEdgeLike['node']> & { __typename?: string } = {},
): MessageEdgeLike => ({
  cursor,
  node: {
    __typename: 'WhatsAppInTextMessage',
    id: cursor,
    sentTime: '2026-08-18T10:00:00.000Z',
    sender: { __typename: 'ContactMessageSender', id: 'ct-1', name: 'Anna' } as never,
    ...overrides,
  },
});

describe('messageDirection', () => {
  it('reads the sender, because WebWidget typenames carry no In or Out', () => {
    expect(messageDirection({ __typename: 'ContactMessageSender' })).toBe('in');
    expect(messageDirection({ __typename: 'AdminMessageSender' })).toBe('out');
    expect(messageDirection({ __typename: 'AutomationMessageSender' })).toBe('out');
  });
});

describe('messageSenderName', () => {
  it('prints a colleague and nobody else', () => {
    expect(messageSenderName({ __typename: 'AdminMessageSender', name: 'Mira' })).toBe('Mira');
    expect(messageSenderName({ __typename: 'ContactMessageSender', name: 'contact wa_… mock name' })).toBeNull();
    expect(messageSenderName({ __typename: 'AutomationMessageSender', name: 'automation executor' })).toBeNull();
  });

  it('prints nothing for a blank name', () => {
    expect(messageSenderName({ __typename: 'AdminMessageSender', name: '  ' })).toBeNull();
  });
});

describe('messageKind', () => {
  it('names the media types a record page does not unpack', () => {
    expect(messageKind('WhatsAppInImageMessage')).toEqual({ system: false, label: 'Image message' });
    expect(messageKind('InstagramOutVideoMessage')).toEqual({ system: false, label: 'Video message' });
    expect(messageKind('TikTokInAudioMessage')).toEqual({ system: false, label: 'Audio message' });
    expect(messageKind('WebWidgetTextMessage')).toEqual({ system: false, label: 'Text message' });
  });

  it('spaces a long compound typename into words', () => {
    expect(messageKind('WhatsAppInContinueFlowButtonClickMessage').label).toBe('Continue flow button click message');
  });

  it('renders a typename it has never seen instead of crashing', () => {
    expect(messageKind('FooBarMessage')).toEqual({ system: false, label: 'Foo bar message' });
    expect(messageKind('Message')).toEqual({ system: false, label: 'Message' });
    expect(messageKind('')).toEqual({ system: false, label: 'Message' });
  });

  it('treats a System typename as a line about the conversation, not a bubble', () => {
    expect(messageKind('SystemConversationClosedMessage')).toEqual({
      system: true,
      label: 'Conversation closed',
    });
  });

  it('only strips In and Out when a new word starts after them', () => {
    expect(messageKind('SystemInternalNoteMessage').label).toBe('Internal note');
    expect(messageKind('WhatsAppOutTemplateMessage').label).toBe('Template message');
  });
});

describe('toRecordMessage', () => {
  it('keys on the message id when there is one', () => {
    expect(toRecordMessage(edge('c1', { id: 'm-1' })).id).toBe('m-1');
  });

  it('falls back to the cursor, because Message.id is nullable in this schema', () => {
    expect(toRecordMessage(edge('c1', { id: null })).id).toBe('c1');
  });

  it('never produces NaN from an unreadable sentTime', () => {
    const message = toRecordMessage(edge('c1', { sentTime: 'whenever' }));
    expect(message.at).toBe(0);
    expect(Number.isNaN(message.at)).toBe(false);
  });

  it('carries text only where the operation unpacks it', () => {
    expect(toRecordMessage(edge('c1', { text: 'Hello' })).text).toBe('Hello');
    expect(toRecordMessage(edge('c1', { __typename: 'WhatsAppInImageMessage' })).text).toBeNull();
    expect(toRecordMessage(edge('c1', { text: '' })).text).toBeNull();
  });

  it('maps a list of edges without dropping any', () => {
    expect(toRecordMessages([edge('c1'), edge('c2')])).toHaveLength(2);
    expect(toRecordMessages(null)).toEqual([]);
  });
});

describe('mergeMessages', () => {
  const at = (cursor: string, iso: string) => toRecordMessage(edge(cursor, { sentTime: iso }));

  it('sorts oldest first, whatever order the connection returned', () => {
    const merged = mergeMessages([], [at('c2', '2026-08-18T10:05:00Z'), at('c1', '2026-08-18T10:00:00Z')]);
    expect(merged.map((message) => message.id)).toEqual(['c1', 'c2']);
  });

  it('deduplicates, with the newer answer winning', () => {
    const first = at('c1', '2026-08-18T10:00:00Z');
    const second = { ...at('c1', '2026-08-18T10:00:00Z'), text: 'edited' };
    expect(mergeMessages([first], [second])).toEqual([second]);
  });

  it('keeps a stable order for two messages sent in the same millisecond', () => {
    const a = at('a', '2026-08-18T10:00:00Z');
    const b = at('b', '2026-08-18T10:00:00Z');
    expect(mergeMessages([b], [a]).map((message) => message.id)).toEqual(['a', 'b']);
  });
});

describe('historyCursor', () => {
  it('is the cursor of the oldest message held', () => {
    const messages = mergeMessages(
      [],
      [
        toRecordMessage(edge('new', { sentTime: '2026-08-18T10:05:00Z' })),
        toRecordMessage(edge('old', { sentTime: '2026-08-18T09:00:00Z' })),
      ],
    );
    expect(historyCursor(messages)).toBe('old');
  });

  it('is null when there is nothing to page from', () => {
    expect(historyCursor([])).toBeNull();
  });
});

describe('historyExhausted', () => {
  it('retires the button when an answer added nothing', () => {
    const one = toRecordMessages([edge('c1')]);
    expect(historyExhausted(one, one)).toBe(true);
  });

  it('keeps it while history is still arriving', () => {
    const one = toRecordMessages([edge('c1')]);
    const two = mergeMessages(one, toRecordMessages([edge('c2', { sentTime: '2026-08-18T09:00:00Z' })]));
    expect(historyExhausted(one, two)).toBe(false);
  });
});

describe('messageTimeLabel', () => {
  it('prints nothing rather than 1970 for an unreadable instant', () => {
    expect(messageTimeLabel(0)).toBe('');
    expect(messageTimeLabel(Number.NaN)).toBe('');
  });

  it('prints a time for a real one', () => {
    expect(messageTimeLabel(Date.parse('2026-08-18T10:00:00Z')).length).toBeGreaterThan(0);
  });
});

describe('recentMessages', () => {
  it('takes the newest few, in order', () => {
    const messages = mergeMessages(
      [],
      [
        toRecordMessage(edge('a', { sentTime: '2026-08-18T09:00:00Z' })),
        toRecordMessage(edge('b', { sentTime: '2026-08-18T10:00:00Z' })),
        toRecordMessage(edge('c', { sentTime: '2026-08-18T11:00:00Z' })),
      ],
    );
    expect(recentMessages(messages, 2).map((message) => message.id)).toEqual(['b', 'c']);
    expect(recentMessages(messages, 10)).toHaveLength(3);
    expect(recentMessages(messages, 0)).toEqual([]);
  });
});
