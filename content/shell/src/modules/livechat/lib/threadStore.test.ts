import { describe, expect, it } from 'vitest';
import type { ConversationMessagesQuery } from '~api/generated/livechat/graphql';
import type { ConversationInfo, MessageNode } from '../types';
import {
  fresher,
  initialThreadState,
  isTypingMessage,
  selectEntries,
  selectMarkReadTarget,
  selectTyping,
  threadReducer,
  toPage,
  type LoadedThreadPage,
  type ThreadAction,
  type ThreadState,
} from './threadStore';

/** Fixed epoch — the reducer never reads the clock, so neither does the test. */
const BASE = Date.UTC(2026, 7, 13, 12, 0);

/** What an optimistic template row carries: the same content the echo will. */
const TEMPLATE_CONTENT = {
  header: null,
  body: 'Hi Jonas, your order is on its way.',
  footer: null,
  actions: [{ title: 'Track order', href: 'https://shop.example/track/4471' }],
};
const iso = (minutesAgo: number) => new Date(BASE - minutesAgo * 60_000).toISOString();

const CONVERSATION = {
  __typename: 'Conversation',
  id: 'conv-1',
  platform: 'widget',
  status: 'open',
  read: false,
  updatedAt: iso(0),
} as unknown as ConversationInfo;

interface NodeOverrides {
  id?: string | null;
  sentTime?: string;
  updatedAt?: string;
  typename?: string;
  text?: string;
}

const node = (clientId: string, minutesAgo = 0, over: NodeOverrides = {}): MessageNode =>
  ({
    __typename: over.typename ?? 'WebWidgetTextMessage',
    id: over.id === undefined ? `m-${clientId}` : over.id,
    clientId,
    sentTime: over.sentTime ?? iso(minutesAgo),
    updatedAt: over.updatedAt ?? iso(minutesAgo),
    sender: { __typename: 'ContactMessageSender', id: 's1', name: 'Maria', profilePicture: null },
    errors: null,
    text: over.text ?? clientId,
    status: 'sent',
  }) as unknown as MessageNode;

const typing = (until: string): MessageNode =>
  ({
    __typename: 'SystemTypingMessage',
    id: null,
    clientId: 'typing-1',
    sentTime: iso(0),
    updatedAt: iso(0),
    sender: { __typename: 'ContactMessageSender', id: 's1', name: 'Maria', profilePicture: null },
    errors: null,
    until,
  }) as unknown as MessageNode;

const page = (nodes: MessageNode[], over: Partial<LoadedThreadPage> = {}): LoadedThreadPage => ({
  conversation: CONVERSATION,
  nodes,
  hasNext: false,
  endCursor: null,
  ...over,
});

const run = (state: ThreadState, ...actions: ThreadAction[]): ThreadState => actions.reduce(threadReducer, state);

describe('toPage', () => {
  it('shapes a ConversationMessages response, tolerating a missing bot', () => {
    const data = {
      bot: {
        conversation: {
          ...CONVERSATION,
          messages: {
            edges: [{ node: node('a', 10) }, { node: node('b', 6) }],
            pageInfo: { hasNextPage: true, endCursor: 'cursor-b' },
          },
        },
      },
    } as unknown as ConversationMessagesQuery;
    const shaped = toPage(data);
    expect(shaped.conversation?.id).toBe('conv-1');
    expect(shaped.nodes.map((entry) => entry.clientId)).toEqual(['a', 'b']);
    expect(shaped.hasNext).toBe(true);
    expect(shaped.endCursor).toBe('cursor-b');
    expect(toPage({} as ConversationMessagesQuery)).toEqual({
      conversation: null,
      nodes: [],
      hasNext: false,
      endCursor: null,
    });
  });
});

/** conv-1 open, three messages: a(10m) b(6m) c(2m), newest-first as the server sends them. */
const loaded = (): ThreadState =>
  run(initialThreadState('conv-1'), {
    type: 'loaded',
    epoch: 0,
    page: page([node('c', 2), node('b', 6), node('a', 10)]),
  });

const ids = (state: ThreadState) => selectEntries(state).map((entry) => entry.clientId);

describe('rule 1 — merge by clientId, keep the fresher updatedAt', () => {
  it('one entry per clientId even when the id changes underneath it', () => {
    // Message.id is nullable and the server may not have issued one when the
    // echo went out; keying on it would show the same message twice.
    const state = run(
      loaded(),
      { type: 'live', node: node('d', 1, { id: null }), now: BASE },
      { type: 'live', node: node('d', 1, { id: 'm-d', updatedAt: iso(0) }), now: BASE },
    );
    expect(ids(state)).toEqual(['a', 'b', 'c', 'd']);
    expect(state.byClientId.d!.id).toBe('m-d');
  });

  it('an older messageUpdated never overwrites a newer record', () => {
    const newer = node('c', 2, { updatedAt: iso(0), text: 'edited' });
    const older = node('c', 2, { updatedAt: iso(5), text: 'stale' });
    const state = run(loaded(), { type: 'live', node: newer, now: BASE }, { type: 'live', node: older, now: BASE });
    expect(state.byClientId.c).toBe(newer);
  });

  it('the echo can beat the mutation response: it retires the optimistic copy', () => {
    const sent = run(loaded(), {
      type: 'sendStarted',
      clientId: 'out-1',
      text: 'on its way',
      sentTime: iso(0),
    });
    expect(selectEntries(sent).at(-1)).toMatchObject({ node: null, localText: 'on its way' });

    // The subscription echo arrives BEFORE the mutation resolves.
    const echoed = threadReducer(sent, { type: 'live', node: node('out-1', 0), now: BASE });
    expect(echoed.pending['out-1']).toBeUndefined();
    expect(ids(echoed)).toEqual(['a', 'b', 'c', 'out-1']);
    expect(selectEntries(echoed).at(-1)!.node).not.toBeNull();
  });

  it('a rejection after the echo does not mark a delivered message failed', () => {
    const state = run(
      loaded(),
      { type: 'sendStarted', clientId: 'out-1', text: 'hi', sentTime: iso(0) },
      { type: 'live', node: node('out-1', 0), now: BASE },
      { type: 'sendFailed', clientId: 'out-1' },
    );
    expect(selectEntries(state).at(-1)!.failed).toBeUndefined();
  });

  it('a rejection before any echo marks exactly that send failed', () => {
    const state = run(
      loaded(),
      { type: 'sendStarted', clientId: 'out-1', text: 'hi', sentTime: iso(0) },
      { type: 'sendStarted', clientId: 'out-2', text: 'there', sentTime: iso(0) },
      { type: 'sendFailed', clientId: 'out-1' },
    );
    expect(state.pending['out-1']!.failed).toBe(true);
    expect(state.pending['out-2']!.failed).toBe(false);
  });

  /* The sentence under the row is the mutation's own verdict, carried on the
     action so the reducer stays ignorant of error classes; an action without
     one leaves the row failed with no sentence, and the view has a default. */
  it('carries the failure sentence through to the entry', () => {
    const state = run(
      loaded(),
      { type: 'sendStarted', clientId: 'out-1', text: 'hi', sentTime: iso(0) },
      { type: 'sendFailed', clientId: 'out-1', failure: 'Not sent — the server answered InternalServerError.' },
    );
    const entry = selectEntries(state).find((row) => row.clientId === 'out-1');
    expect(entry).toMatchObject({ failed: true, failure: 'Not sent — the server answered InternalServerError.' });
    const bare = run(
      loaded(),
      { type: 'sendStarted', clientId: 'out-2', text: 'hi', sentTime: iso(0) },
      { type: 'sendFailed', clientId: 'out-2' },
    );
    expect(selectEntries(bare).find((row) => row.clientId === 'out-2')).not.toHaveProperty('failure');
  });

  /* An attachment is its own message with its own clientId, and its optimistic
     row has to show the file rather than an empty bubble — the operator who has
     just sent a photo is looking for the photo. */
  it('carries an optimistic attachment through to the entry', () => {
    const state = run(loaded(), {
      type: 'sendStarted',
      clientId: 'out-1',
      text: '',
      sentTime: iso(0),
      attachment: { kind: 'image', name: 'invoice.png', previewUrl: 'blob:one' },
    });
    expect(selectEntries(state).at(-1)).toMatchObject({
      node: null,
      localText: '',
      attachment: { kind: 'image', name: 'invoice.png', previewUrl: 'blob:one' },
    });
  });

  it('leaves a text send with no attachment at all', () => {
    const state = run(loaded(), {
      type: 'sendStarted',
      clientId: 'out-1',
      text: 'hi',
      sentTime: iso(0),
    });
    expect(selectEntries(state).at(-1)).not.toHaveProperty('attachment');
  });

  it('carries an optimistic template through to the entry, and the echo retires it', () => {
    /* A template send takes exactly the path text takes — same clientId key,
       same merge — so two tabs sending the same one land on one row. */
    const started = run(loaded(), {
      type: 'sendStarted',
      clientId: 'tpl-1',
      text: '',
      sentTime: iso(0),
      template: { name: 'order_update', content: TEMPLATE_CONTENT },
    });
    const entry = selectEntries(started).find((row) => row.clientId === 'tpl-1');
    expect(entry?.node).toBeNull();
    expect(entry?.template).toEqual({ name: 'order_update', content: TEMPLATE_CONTENT });
    expect(entry?.attachment).toBeUndefined();

    const echoed = threadReducer(started, {
      type: 'live',
      node: node('tpl-1', 0, { typename: 'WhatsAppOutTemplateMessage' }),
      now: BASE,
    });
    expect(echoed.pending['tpl-1']).toBeUndefined();
    const after = selectEntries(echoed).find((row) => row.clientId === 'tpl-1');
    expect(after?.node?.__typename).toBe('WhatsAppOutTemplateMessage');
    expect(after?.template).toBeUndefined();
  });

  it('the echo retires an optimistic attachment the same way it retires text', () => {
    const state = run(
      loaded(),
      {
        type: 'sendStarted',
        clientId: 'out-1',
        text: '',
        sentTime: iso(0),
        attachment: { kind: 'document', name: 'terms.pdf', previewUrl: null },
      },
      { type: 'live', node: node('out-1', 0), now: BASE },
    );
    expect(state.pending['out-1']).toBeUndefined();
    expect(selectEntries(state).at(-1)!.node).not.toBeNull();
  });

  it('merging is idempotent', () => {
    const once = threadReducer(loaded(), { type: 'live', node: node('d', 1), now: BASE });
    const twice = threadReducer(once, { type: 'live', node: node('d', 1), now: BASE });
    expect(twice).toBe(once);
    expect(ids(twice)).toEqual(ids(once));
  });

  it('merging in either order gives the same result', () => {
    const first = node('c', 2, { updatedAt: iso(1), text: 'first' });
    const second = node('c', 2, { updatedAt: iso(0), text: 'second' });
    const third = node('c', 2, { updatedAt: iso(3), text: 'third' });
    const forwards = run(
      loaded(),
      { type: 'live', node: first, now: BASE },
      { type: 'live', node: second, now: BASE },
      { type: 'live', node: third, now: BASE },
    );
    const backwards = run(
      loaded(),
      { type: 'live', node: third, now: BASE },
      { type: 'live', node: second, now: BASE },
      { type: 'live', node: first, now: BASE },
    );
    expect(forwards.byClientId).toEqual(backwards.byClientId);
    expect(forwards.order).toEqual(backwards.order);
  });

  it('fresher is total and symmetric even at the same instant', () => {
    const withId = node('x', 0, { id: 'm-x' });
    const withoutId = node('x', 0, { id: null });
    expect(fresher(withId, withoutId)).toBe(withId);
    expect(fresher(withoutId, withId)).toBe(withId);
    expect(fresher(withId, withId)).toBe(withId);
  });

  it('a typing message never enters the map', () => {
    const state = threadReducer(loaded(), {
      type: 'live',
      node: typing(new Date(BASE + 3_000).toISOString()),
      now: BASE,
    });
    expect(ids(state)).toEqual(['a', 'b', 'c']);
    expect(selectTyping(state, BASE)).toBe(true);
    expect(isTypingMessage(typing(iso(0)))).toBe(true);
  });

  it('an already-expired typing hint is not a hint', () => {
    const state = threadReducer(loaded(), {
      type: 'live',
      node: typing(iso(5)),
      now: BASE,
    });
    expect(state.typingUntil).toBeNull();
    expect(selectTyping(state, BASE)).toBe(false);
  });

  it('the typing indicator decays without the reducer reading a clock', () => {
    const until = new Date(BASE + 3_000).toISOString();
    const state = threadReducer(loaded(), { type: 'live', node: typing(until), now: BASE });
    expect(selectTyping(state, BASE + 1_000)).toBe(true);
    expect(selectTyping(state, BASE + 4_000)).toBe(false);
    expect(threadReducer(state, { type: 'typingExpired' }).typingUntil).toBeNull();
  });
});

describe('ordering', () => {
  it('is ascending by sentTime whatever order the records arrive in', () => {
    const state = run(
      initialThreadState('conv-1'),
      { type: 'loaded', epoch: 0, page: page([node('b', 6)]) },
      { type: 'live', node: node('c', 2), now: BASE },
      { type: 'live', node: node('a', 10), now: BASE },
    );
    expect(ids(state)).toEqual(['a', 'b', 'c']);
  });

  it('messages stamped at the same instant keep a fixed order across re-sorts', () => {
    // The previous comparator answered "after" for equal times, so V8 swapped
    // equal-timestamped messages every time anything touched the thread.
    const same = iso(4);
    const first = run(
      initialThreadState('conv-1'),
      { type: 'loaded', epoch: 0, page: page([node('y', 0, { sentTime: same })]) },
      { type: 'live', node: node('x', 0, { sentTime: same }), now: BASE },
    );
    const second = run(first, { type: 'live', node: node('z', 0, { sentTime: same }), now: BASE });
    const third = run(second, {
      type: 'live',
      node: node('y', 0, { sentTime: same, updatedAt: iso(0) }),
      now: BASE,
    });
    expect(ids(first)).toEqual(['x', 'y']);
    expect(ids(second)).toEqual(['x', 'y', 'z']);
    expect(ids(third)).toEqual(['x', 'y', 'z']);
  });

  it('an optimistic send sorts by its local clock and re-sorts on the echo', () => {
    const sent = run(loaded(), {
      type: 'sendStarted',
      clientId: 'out-1',
      text: 'later',
      sentTime: iso(-5),
    });
    expect(ids(sent)).toEqual(['a', 'b', 'c', 'out-1']);
    // The server stamped it earlier than the local clock claimed.
    const echoed = threadReducer(sent, { type: 'live', node: node('out-1', 4), now: BASE });
    expect(ids(echoed)).toEqual(['a', 'b', 'out-1', 'c']);
  });
});

describe('epoch', () => {
  it('drops every request-shaped action issued under a spent epoch', () => {
    const state = threadReducer(loaded(), { type: 'opened', conversationId: 'conv-2' });
    const stale: ThreadAction[] = [
      { type: 'loaded', epoch: 0, page: page([node('z', 0)]) },
      { type: 'olderLoaded', epoch: 0, page: page([node('z', 0)]) },
      { type: 'olderRequested', epoch: 0 },
      { type: 'olderFailed', epoch: 0 },
      { type: 'failed', epoch: 0, message: 'stale' },
    ];
    for (const action of stale) expect(threadReducer(state, action)).toBe(state);
  });

  it('an older page that resolves after a conversation switch stays out of the new thread', () => {
    // The defect this pins: the response merged into whatever thread was open
    // by the time it landed, so conversation A's history appeared in B.
    const paging = run(loaded(), { type: 'olderRequested', epoch: 0 });
    const switched = threadReducer(paging, { type: 'opened', conversationId: 'conv-2' });
    const late = threadReducer(switched, {
      type: 'olderLoaded',
      epoch: 0,
      page: page([node('old-1', 400)]),
    });
    expect(late).toBe(switched);
    expect(ids(late)).toEqual([]);
  });

  it('opening the same conversation again is not a request', () => {
    const state = loaded();
    expect(threadReducer(state, { type: 'opened', conversationId: 'conv-1' })).toBe(state);
  });

  it('opening a different conversation clears everything and bumps the epoch', () => {
    const state = threadReducer(loaded(), { type: 'opened', conversationId: 'conv-2' });
    expect(state.epoch).toBe(1);
    expect(state.conversationId).toBe('conv-2');
    expect(state.conversation).toBeNull();
    expect(state.byClientId).toEqual({});
    expect(state.loading).toBe(true);
  });

  it('closing the thread stops loading', () => {
    const state = threadReducer(loaded(), { type: 'opened', conversationId: null });
    expect(state.loading).toBe(false);
  });
});

describe('rule 4 — the reconnect refetch', () => {
  it('bumps the epoch, keeps the thread on screen, and invalidates what is in flight', () => {
    const state = threadReducer(loaded(), { type: 'refetch' });
    expect(state.epoch).toBe(1);
    expect(ids(state)).toEqual(['a', 'b', 'c']);
    expect(state.conversation).not.toBeNull();
    expect(threadReducer(state, { type: 'loaded', epoch: 0, page: page([]) })).toBe(state);
  });

  it('merges the response instead of replacing the thread with it', () => {
    // The window this closes: a message that arrives while the query is in
    // flight is not on the page the query answers with, and the old code built
    // a fresh map from that page — so the message was simply gone.
    const state = run(
      loaded(),
      { type: 'refetch' },
      { type: 'live', node: node('d', 0), now: BASE },
      { type: 'loaded', epoch: 1, page: page([node('c', 2), node('b', 6), node('a', 10)]) },
    );
    expect(ids(state)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('keeps history the operator has already paged in', () => {
    const state = run(
      initialThreadState('conv-1'),
      { type: 'loaded', epoch: 0, page: page([node('c', 2)], { hasNext: true, endCursor: 'c1' }) },
      { type: 'olderRequested', epoch: 0 },
      { type: 'olderLoaded', epoch: 0, page: page([node('a', 40)]) },
      { type: 'refetch' },
      { type: 'loaded', epoch: 1, page: page([node('c', 2)]) },
    );
    expect(ids(state)).toEqual(['a', 'c']);
  });

  it('keeps a send the server has not answered yet', () => {
    const state = run(
      loaded(),
      { type: 'sendStarted', clientId: 'out-1', text: 'still going', sentTime: iso(0) },
      { type: 'refetch' },
      { type: 'loaded', epoch: 1, page: page([node('c', 2), node('b', 6), node('a', 10)]) },
    );
    expect(ids(state)).toEqual(['a', 'b', 'c', 'out-1']);
    expect(state.pending['out-1']!.text).toBe('still going');
  });
});

describe('rule 5 — paging upward into history', () => {
  it('walks backwards from the oldest loaded message', () => {
    const first = run(initialThreadState('conv-1'), {
      type: 'loaded',
      epoch: 0,
      page: page([node('c', 2), node('b', 6)], { hasNext: true, endCursor: 'cursor-b' }),
    });
    expect(first.hasOlder).toBe(true);
    expect(first.olderCursor).toBe('cursor-b');

    const requested = threadReducer(first, { type: 'olderRequested', epoch: 0 });
    expect(requested.loadingOlder).toBe(true);
    // The button cannot fire a second time for the same page.
    expect(threadReducer(requested, { type: 'olderRequested', epoch: 0 })).toBe(requested);

    const paged = threadReducer(requested, {
      type: 'olderLoaded',
      epoch: 0,
      page: page([node('a', 10)], { hasNext: true, endCursor: 'cursor-a' }),
    });
    expect(ids(paged)).toEqual(['a', 'b', 'c']);
    expect(paged.olderCursor).toBe('cursor-a');
    expect(paged.loadingOlder).toBe(false);
  });

  it('refuses to page when there is nothing older or no cursor', () => {
    const noCursor = run(initialThreadState('conv-1'), {
      type: 'loaded',
      epoch: 0,
      page: page([node('c', 2)], { hasNext: true, endCursor: null }),
    });
    expect(threadReducer(noCursor, { type: 'olderRequested', epoch: 0 })).toBe(noCursor);
    const noOlder = loaded();
    expect(threadReducer(noOlder, { type: 'olderRequested', epoch: 0 })).toBe(noOlder);
  });

  it('an empty page ends the walk and does not adopt its null cursor', () => {
    // Adopting it would restart `after` at the newest message and page the
    // same history round and round.
    const first = run(initialThreadState('conv-1'), {
      type: 'loaded',
      epoch: 0,
      page: page([node('c', 2)], { hasNext: true, endCursor: 'cursor-c' }),
    });
    const paged = threadReducer(first, {
      type: 'olderLoaded',
      epoch: 0,
      page: page([], { hasNext: true, endCursor: null }),
    });
    expect(paged.hasOlder).toBe(false);
    expect(paged.olderCursor).toBe('cursor-c');
  });

  it('a failed page re-arms the button without touching the thread', () => {
    const requested = run(
      initialThreadState('conv-1'),
      { type: 'loaded', epoch: 0, page: page([node('c', 2)], { hasNext: true, endCursor: 'x' }) },
      { type: 'olderRequested', epoch: 0 },
      { type: 'olderFailed', epoch: 0 },
    );
    expect(requested.loadingOlder).toBe(false);
    expect(requested.hasOlder).toBe(true);
    expect(ids(requested)).toEqual(['c']);
  });
});

describe('mark-read', () => {
  it('follows the newest message, not the one the first page ended on', () => {
    // The defect this pins: the target was stamped once by the initial load, so
    // every message that arrived while the thread was open stayed unread.
    const state = loaded();
    expect(selectMarkReadTarget(state, true)).toBe('m-c');
    const later = threadReducer(state, { type: 'live', node: node('d', 0), now: BASE });
    expect(selectMarkReadTarget(later, true)).toBe('m-d');
  });

  it('skips messages the server has not issued an id for', () => {
    const state = run(
      loaded(),
      { type: 'live', node: node('d', 0, { id: null }), now: BASE },
      { type: 'sendStarted', clientId: 'out-1', text: 'hi', sentTime: iso(0) },
    );
    expect(selectMarkReadTarget(state, true)).toBe('m-c');
  });

  it('is null on an empty thread', () => {
    expect(selectMarkReadTarget(initialThreadState('conv-1'), true)).toBeNull();
  });

  it('has nothing to mark for an operator who may only look', () => {
    /* Mark-read is the one write nobody asks for: the effect fires the moment a
       thread is opened. Without the permission in it, a view-only operator
       clears the unread badge for everyone else. */
    expect(selectMarkReadTarget(loaded(), false)).toBeNull();
  });

  it('stays on the newest message after a page of older history lands', () => {
    /* `before:` is a MessageID and means "everything up to and including
       this one". The last-loaded page is the OLDEST — its cursor walks
       backwards — so a target that followed the last response would mark the
       thread read up to yesterday and leave today's messages unread. */
    const state = run(
      loaded(),
      { type: 'olderRequested', epoch: 0 },
      {
        type: 'olderLoaded',
        epoch: 0,
        page: page([node('z', 60), node('y', 90)], { endCursor: 'cur-y' }),
      },
    );
    expect(ids(state)).toEqual(['y', 'z', 'a', 'b', 'c']);
    expect(selectMarkReadTarget(state, true)).toBe('m-c');
  });
});

describe('a lifecycle answer', () => {
  it('changes the status of the open conversation without a refetch', () => {
    const state = threadReducer(loaded(), {
      type: 'conversationChanged',
      patch: { id: 'conv-1', status: 'closed' as never, updatedAt: iso(0) },
    });
    expect(state.conversation?.status).toBe('closed');
    expect(state.conversation?.updatedAt).toBe(iso(0));
    // Everything else — messages, cursor, epoch — is exactly as it was.
    expect(ids(state)).toEqual(['a', 'b', 'c']);
    expect(state.epoch).toBe(0);
  });

  it('is inert for another conversation, so a late answer cannot cross a switch', () => {
    const start = loaded();
    const state = threadReducer(start, {
      type: 'conversationChanged',
      patch: { id: 'conv-2', status: 'closed' as never, updatedAt: iso(0) },
    });
    expect(state).toBe(start);
  });

  it('is inert before the thread has loaded', () => {
    const start = initialThreadState('conv-1');
    const state = threadReducer(start, {
      type: 'conversationChanged',
      patch: { id: 'conv-1', status: 'closed' as never, updatedAt: iso(0) },
    });
    expect(state).toBe(start);
  });

  it('never rolls a fresher record back', () => {
    const start = loaded();
    const state = threadReducer(start, {
      type: 'conversationChanged',
      patch: { id: 'conv-1', status: 'closed' as never, updatedAt: iso(5) },
    });
    // CONVERSATION is stamped iso(0); an answer from five minutes earlier loses.
    expect(state).toBe(start);
  });
});

describe('errors', () => {
  it('a load failure stops the spinner and is reported', () => {
    const state = threadReducer(initialThreadState('conv-1'), {
      type: 'failed',
      epoch: 0,
      message: 'boom',
    });
    expect(state.loading).toBe(false);
    expect(state.error).toBe('boom');
  });

  it('a dropped live channel is not a load failure', () => {
    const state = threadReducer(loaded(), { type: 'liveFailed', message: 'socket closed' });
    expect(state.error).toBe('socket closed');
    expect(state.loading).toBe(false);
    expect(ids(state)).toEqual(['a', 'b', 'c']);
  });
});
