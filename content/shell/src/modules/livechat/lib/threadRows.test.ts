import { describe, expect, it } from 'vitest';
import type { MessageNode } from '../types';
import type { MessageEntry } from './threadStore';
import { firstUnreadClientId, toThreadRows } from './threadRows';

const BASE = Date.UTC(2026, 7, 13, 12, 0);
const iso = (minutesAgo: number) => new Date(BASE - minutesAgo * 60_000).toISOString();

type Who = 'contact' | 'operator';

const node = (typename: string, who: Who): MessageNode =>
  ({
    __typename: typename,
    id: 'm1',
    clientId: 'c1',
    sentTime: iso(0),
    updatedAt: iso(0),
    sender: {
      __typename: who === 'contact' ? 'ContactMessageSender' : 'AdminMessageSender',
      id: 's1',
      name: who,
      profilePicture: null,
    },
    errors: [],
    text: 'hi',
  }) as unknown as MessageNode;

const message = (clientId: string, minutesAgo: number, who: Who): MessageEntry => ({
  clientId,
  sentTime: iso(minutesAgo),
  node: node('WebWidgetTextMessage', who),
});

const systemLine = (clientId: string, minutesAgo: number): MessageEntry => ({
  clientId,
  sentTime: iso(minutesAgo),
  node: node('SystemLivechatOpenedManuallyMessage', 'operator'),
});

const pending = (clientId: string, minutesAgo: number): MessageEntry => ({
  clientId,
  sentTime: iso(minutesAgo),
  node: null,
  localText: 'on its way',
  failed: false,
});

describe('toThreadRows', () => {
  it('keys rows by clientId and parses the time once', () => {
    const rows = toThreadRows([message('a', 2, 'contact'), message('b', 1, 'operator')]);
    expect(rows.map((row) => row.id)).toEqual(['a', 'b']);
    expect(rows[0]!.at).toBe(BASE - 2 * 60_000);
    expect(rows[1]!.at).toBe(BASE - 60_000);
  });

  it('carries the entry through untouched', () => {
    const entry = message('a', 0, 'contact');
    expect(toThreadRows([entry])[0]!.entry).toBe(entry);
  });

  /* MessageList's default day label formats `at` through Intl.DateTimeFormat,
     which THROWS on NaN rather than returning something ugly — so one
     unreadable timestamp would take down the whole thread. */
  it('never produces NaN from an unreadable time', () => {
    const rows = toThreadRows([
      message('a', 5, 'contact'),
      { clientId: 'b', sentTime: 'not a time', node: null, localText: 'x' },
      message('c', 3, 'contact'),
    ]);
    expect(rows.map((row) => Number.isNaN(row.at))).toEqual([false, false, false]);
  });

  it('gives an unreadable time the previous row’s day rather than today’s', () => {
    const rows = toThreadRows([
      message('a', 5, 'contact'),
      { clientId: 'b', sentTime: '', node: null, localText: 'x' },
    ]);
    expect(rows[1]!.at).toBe(rows[0]!.at);
  });

  it('is empty for an empty thread', () => {
    expect(toThreadRows([])).toEqual([]);
  });
});

describe('firstUnreadClientId', () => {
  const thread = [
    message('a', 30, 'contact'),
    message('b', 25, 'operator'),
    message('c', 10, 'contact'),
    message('d', 5, 'contact'),
  ];

  it('anchors at the oldest message since the operator last spoke', () => {
    expect(firstUnreadClientId(thread, false)).toBe('c');
  });

  /* `read` is nullable: a null is the server declining to answer, which is not
     the same as "there are new messages". */
  it('draws no divider unless the conversation is explicitly unread', () => {
    expect(firstUnreadClientId(thread, true)).toBeNull();
    expect(firstUnreadClientId(thread, null)).toBeNull();
    expect(firstUnreadClientId(thread, undefined)).toBeNull();
  });

  it('anchors at the top when the contact has never had a reply', () => {
    expect(firstUnreadClientId([message('a', 9, 'contact'), message('b', 8, 'contact')], false)).toBe('a');
  });

  it('draws no divider when the operator spoke last', () => {
    expect(firstUnreadClientId([...thread, message('e', 1, 'operator')], false)).toBeNull();
  });

  /* A takeover marker is not something the operator read. Letting it end the
     run would put the divider below half the messages it belongs above. */
  it('steps over a system line without ending the run', () => {
    const withMarker = [
      message('a', 30, 'contact'),
      message('b', 25, 'operator'),
      message('c', 20, 'contact'),
      systemLine('sys', 15),
      message('d', 10, 'contact'),
    ];
    expect(firstUnreadClientId(withMarker, false)).toBe('c');
  });

  /* An optimistic send is outbound by definition — the operator is mid-reply,
     so nothing below it is unread. */
  it('treats a send still in flight as the operator speaking', () => {
    expect(firstUnreadClientId([...thread, pending('e', 0)], false)).toBeNull();
  });

  it('has nothing to anchor to in an empty thread', () => {
    expect(firstUnreadClientId([], false)).toBeNull();
  });
});
