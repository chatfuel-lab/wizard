import { describe, expect, it } from 'vitest';
import {
  UNFILTERED_CHAT_ARGS,
  chatListQueryVars,
  chatListSubscriptionVars,
  type ChatListFilter,
} from '~api/domain/livechat';
import { ContactAssigneeFilterType, SalesStageV2, type ChatListQuery } from '~api/generated/livechat/graphql';
import type { ChatNode } from '../types';
import {
  chatListReducer,
  initialChatListState,
  resumeDelay,
  selectChats,
  toPage,
  type ChatListAction,
  type ChatListState,
  type ChatListUpdate,
  type LoadedChatPage,
} from './chatListStore';

/** Fixed epoch — the reducer never reads the clock, so neither does the test. */
const BASE = Date.UTC(2026, 7, 13, 12, 0);
const iso = (minutesAgo: number) => new Date(BASE - minutesAgo * 60_000).toISOString();

const UNFILTERED = UNFILTERED_CHAT_ARGS;
const UNREAD_ONLY: ChatListFilter = { ...UNFILTERED_CHAT_ARGS, unreadOnly: true };

const chat = (id: string, minutesAgo: number, over: Partial<ChatNode> = {}): ChatNode =>
  ({
    __typename: 'WidgetContact',
    id,
    name: id.toUpperCase(),
    profilePictureUrl: null,
    updatedAt: iso(minutesAgo),
    unreadMessagesCount: 0,
    unhandledSwitchToHuman: false,
    lastConversationMessageTime: iso(minutesAgo),
    salesStageV2: null,
    assignee: null,
    conversation: null,
    ...over,
  }) as unknown as ChatNode;

const page = (nodes: ChatNode[], over: Partial<LoadedChatPage> = {}): LoadedChatPage => ({
  nodes,
  hasNext: false,
  endCursor: null,
  ...over,
});

const run = (state: ChatListState, ...actions: ChatListAction[]): ChatListState =>
  actions.reduce(chatListReducer, state);

const batch = (...updates: ChatListUpdate[]): ChatListAction => ({ type: 'live', updates });

/** a(1m) b(5m) c(20m) — newest first, which is the order the pane renders. */
const loaded = (): ChatListState =>
  run(initialChatListState({ filter: UNFILTERED }), {
    type: 'loaded',
    epoch: 0,
    page: page([chat('a', 1), chat('b', 5), chat('c', 20)]),
  });

const ids = (state: ChatListState) => selectChats(state).map((c) => c.id);

describe('rule 2 — one place builds both sets of filters', () => {
  it('the subscription runs on exactly the query filters, minus paging', () => {
    // This is the test that fails if someone adds a filter to one call site
    // and not the other. Divergence is invisible at runtime: the subscription
    // simply starts answering a different question than the query did, and its
    // events are somebody else's contacts arriving in this list.
    const query = chatListQueryVars('bot-1', UNREAD_ONLY);
    const { first, after, ...filters } = query;
    expect(first).toBeGreaterThan(0);
    expect(after).toBeNull();
    expect(chatListSubscriptionVars('bot-1', UNREAD_ONLY)).toEqual(filters);
  });

  it('carries every filter key, not only the ones the UI sets today', () => {
    const filter: ChatListFilter = {
      assigneeFilter: { type: ContactAssigneeFilterType.Unassigned },
      unreadOnly: true,
      salesStageV2Filter: [SalesStageV2.New],
      textInputFilter: 'berlin',
    };
    for (const vars of [
      chatListQueryVars('bot-1', filter) as Record<string, unknown>,
      chatListSubscriptionVars('bot-1', filter) as Record<string, unknown>,
    ]) {
      for (const key of Object.keys(filter)) {
        expect(vars[key]).toEqual(filter[key as keyof ChatListFilter]);
      }
    }
  });

  it('page two asks the same question as page one', () => {
    const first = chatListQueryVars('bot-1', UNREAD_ONLY);
    const second = chatListQueryVars('bot-1', UNREAD_ONLY, 'cursor-50');
    expect(second.after).toBe('cursor-50');
    expect({ ...second, after: null }).toEqual(first);
  });
});

describe('toPage', () => {
  it('shapes a ChatList response, tolerating a missing bot', () => {
    const data = {
      bot: {
        contactChatsConnection: {
          edges: [{ node: chat('a', 1) }, { node: chat('b', 5) }],
          pageInfo: { hasNextPage: true, endCursor: 'cursor-b' },
        },
      },
    } as unknown as ChatListQuery;
    const shaped = toPage(data);
    expect(shaped.nodes.map((node) => node.id)).toEqual(['a', 'b']);
    expect(shaped.hasNext).toBe(true);
    expect(shaped.endCursor).toBe('cursor-b');
    expect(toPage({} as ChatListQuery)).toEqual({ nodes: [], hasNext: false, endCursor: null });
  });
});

describe('rule 3 — the server sends no positions', () => {
  it('an Add for an unknown contact lands in time order, not at the end', () => {
    const state = chatListReducer(loaded(), batch({ action: 'Add', node: chat('d', 8) }));
    expect(ids(state)).toEqual(['a', 'b', 'd', 'c']);
  });

  it('an Update re-sorts the contact it touched', () => {
    const state = chatListReducer(loaded(), batch({ action: 'Update', node: chat('c', 0) }));
    expect(ids(state)).toEqual(['c', 'a', 'b']);
  });

  it('a contact that stops matching arrives as Remove, and only Remove drops', () => {
    // The trap: treating Update as a possible removal. A contact that no longer
    // matches the filter is never sent as an Update — it is sent as a Remove —
    // so an Update must always upsert, whatever it looks like.
    const removed = chatListReducer(loaded(), batch({ action: 'Remove', node: chat('b', 5) }));
    expect(ids(removed)).toEqual(['a', 'c']);
    const updated = chatListReducer(
      loaded(),
      batch({ action: 'Update', node: chat('b', 5, { unreadMessagesCount: 0 }) }),
    );
    expect(ids(updated)).toEqual(['a', 'b', 'c']);
  });

  it('applies a mixed batch in order', () => {
    const state = chatListReducer(
      loaded(),
      batch(
        { action: 'Remove', node: chat('a', 1) },
        { action: 'Add', node: chat('d', 0) },
        { action: 'Update', node: chat('c', 2) },
      ),
    );
    expect(ids(state)).toEqual(['d', 'c', 'b']);
  });

  it('falls back to updatedAt when a contact has never had a message', () => {
    const state = chatListReducer(
      loaded(),
      batch({
        action: 'Add',
        node: chat('d', 0, { lastConversationMessageTime: null, updatedAt: iso(3) }),
      }),
    );
    expect(ids(state)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('re-sorting an unchanged list is a fixed point', () => {
    // Object key order is insertion order, so without the id tie-break two
    // contacts stamped at the same second trade places on every batch — and
    // the row under the pointer stops being the row that gets clicked.
    const tied = run(initialChatListState({ filter: UNFILTERED }), {
      type: 'loaded',
      epoch: 0,
      page: page([chat('y', 4), chat('x', 4), chat('z', 4)]),
    });
    expect(ids(tied)).toEqual(['x', 'y', 'z']);
    const again = chatListReducer(tied, batch({ action: 'Update', node: chat('y', 4) }));
    expect(ids(again)).toEqual(['x', 'y', 'z']);
  });

  it('applying a batch twice is idempotent', () => {
    const updates: ChatListUpdate[] = [
      { action: 'Add', node: chat('d', 0) },
      { action: 'Remove', node: chat('b', 5) },
    ];
    const once = chatListReducer(loaded(), { type: 'live', updates });
    const twice = chatListReducer(once, { type: 'live', updates });
    expect(ids(twice)).toEqual(ids(once));
    expect(twice.byId).toEqual(once.byId);
  });

  it('is ignored while the first page is in flight', () => {
    // The load supersedes it, and this is also what swallows the last event of
    // a subscription being torn down after a filter change.
    const fresh = initialChatListState({ filter: UNFILTERED });
    expect(chatListReducer(fresh, batch({ action: 'Add', node: chat('d', 0) }))).toBe(fresh);
  });

  it('an empty batch changes nothing', () => {
    const state = loaded();
    expect(chatListReducer(state, { type: 'live', updates: [] })).toBe(state);
  });
});

describe('epoch', () => {
  it('drops every request-shaped action issued under a spent epoch', () => {
    const state = chatListReducer(loaded(), { type: 'reset', vars: { filter: UNREAD_ONLY } });
    const stale: ChatListAction[] = [
      { type: 'loaded', epoch: 0, page: page([chat('z', 0)]) },
      { type: 'pageLoaded', epoch: 0, page: page([chat('z', 0)]) },
      { type: 'pageRequested', epoch: 0 },
      { type: 'pageFailed', epoch: 0 },
      { type: 'failed', epoch: 0, message: 'stale' },
    ];
    for (const action of stale) expect(chatListReducer(state, action)).toBe(state);
  });

  it('a filter change clears the rows — they answer a different question', () => {
    const vars = { filter: UNREAD_ONLY };
    const state = chatListReducer(loaded(), { type: 'reset', vars });
    expect(state.epoch).toBe(1);
    expect(state.vars).toBe(vars);
    expect(ids(state)).toEqual([]);
    expect(state.loading).toBe(true);
  });

  it('page one replaces the window rather than merging into it', () => {
    // A contact the filter no longer matches must not survive a refetch by
    // living on in a record cache that the next re-sort would read.
    const state = run(
      loaded(),
      { type: 'refetch' },
      {
        type: 'loaded',
        epoch: 1,
        page: page([chat('a', 1)]),
      },
    );
    expect(ids(state)).toEqual(['a']);
    expect(state.byId.b).toBeUndefined();
  });
});

describe('rule 4 — willResumeAt and the reconnect refetch', () => {
  it('schedules the resume for the moment the server named', () => {
    expect(resumeDelay(new Date(BASE + 30_000).toISOString(), BASE)).toBe(30_000);
  });

  it('refetches now rather than never when the timestamp is past or unusable', () => {
    // The alternative to 0 here is NaN, and an inbox that silently stops moving.
    expect(resumeDelay(new Date(BASE - 30_000).toISOString(), BASE)).toBe(0);
    expect(resumeDelay('not a time', BASE)).toBe(0);
    expect(resumeDelay('', BASE)).toBe(0);
  });

  it('the refetch keeps the rows on screen and invalidates what is in flight', () => {
    // Blanking the inbox to a spinner every time a WebSocket blinks is the
    // reason this is a separate action from `reset`.
    const state = chatListReducer(loaded(), { type: 'refetch' });
    expect(state.epoch).toBe(1);
    expect(state.loading).toBe(false);
    expect(ids(state)).toEqual(['a', 'b', 'c']);
    expect(chatListReducer(state, { type: 'loaded', epoch: 0, page: page([]) })).toBe(state);
  });
});

describe('rule 5 — paging the list downward', () => {
  it('appends the next page and keeps the whole list sorted', () => {
    const first = run(initialChatListState({ filter: UNFILTERED }), {
      type: 'loaded',
      epoch: 0,
      page: page([chat('a', 1), chat('c', 20)], { hasNext: true, endCursor: 'cursor-c' }),
    });
    expect(first.hasMore).toBe(true);

    const requested = chatListReducer(first, { type: 'pageRequested', epoch: 0 });
    expect(requested.loadingMore).toBe(true);
    // A scroll sentinel cannot fire twice for the same page.
    expect(chatListReducer(requested, { type: 'pageRequested', epoch: 0 })).toBe(requested);

    const paged = chatListReducer(requested, {
      type: 'pageLoaded',
      epoch: 0,
      page: page([chat('d', 40), chat('e', 90)], { hasNext: false, endCursor: 'cursor-e' }),
    });
    expect(ids(paged)).toEqual(['a', 'c', 'd', 'e']);
    expect(paged.hasMore).toBe(false);
    expect(paged.loadingMore).toBe(false);
  });

  it('a live Add still sorts into the middle of a paged list', () => {
    const paged = run(
      initialChatListState({ filter: UNFILTERED }),
      { type: 'loaded', epoch: 0, page: page([chat('a', 1)], { hasNext: true, endCursor: 'k' }) },
      { type: 'pageRequested', epoch: 0 },
      { type: 'pageLoaded', epoch: 0, page: page([chat('c', 20)]) },
      batch({ action: 'Add', node: chat('b', 5) }),
    );
    expect(ids(paged)).toEqual(['a', 'b', 'c']);
  });

  it('refuses to page when there is nothing more or no cursor', () => {
    const done = loaded();
    expect(chatListReducer(done, { type: 'pageRequested', epoch: 0 })).toBe(done);
    const noCursor = run(initialChatListState({ filter: UNFILTERED }), {
      type: 'loaded',
      epoch: 0,
      page: page([chat('a', 1)], { hasNext: true, endCursor: null }),
    });
    expect(chatListReducer(noCursor, { type: 'pageRequested', epoch: 0 })).toBe(noCursor);
  });

  it('an empty page ends the walk and does not adopt its null cursor', () => {
    const first = run(initialChatListState({ filter: UNFILTERED }), {
      type: 'loaded',
      epoch: 0,
      page: page([chat('a', 1)], { hasNext: true, endCursor: 'cursor-a' }),
    });
    const paged = chatListReducer(first, {
      type: 'pageLoaded',
      epoch: 0,
      page: page([], { hasNext: true, endCursor: null }),
    });
    expect(paged.hasMore).toBe(false);
    expect(paged.endCursor).toBe('cursor-a');
  });

  it('a failed page re-arms the sentinel without touching the list', () => {
    const state = run(
      initialChatListState({ filter: UNFILTERED }),
      { type: 'loaded', epoch: 0, page: page([chat('a', 1)], { hasNext: true, endCursor: 'k' }) },
      { type: 'pageRequested', epoch: 0 },
      { type: 'pageFailed', epoch: 0 },
    );
    expect(state.loadingMore).toBe(false);
    expect(state.hasMore).toBe(true);
    expect(ids(state)).toEqual(['a']);
  });

  it('a refetch restarts paging from the top', () => {
    const state = run(
      initialChatListState({ filter: UNFILTERED }),
      { type: 'loaded', epoch: 0, page: page([chat('a', 1)], { hasNext: true, endCursor: 'k' }) },
      { type: 'refetch' },
    );
    expect(state.endCursor).toBeNull();
    expect(state.hasMore).toBe(false);
    expect(state.loadingMore).toBe(false);
  });
});

describe('errors', () => {
  it('a load failure stops the spinner and is reported', () => {
    const state = chatListReducer(initialChatListState({ filter: UNFILTERED }), {
      type: 'failed',
      epoch: 0,
      message: 'boom',
    });
    expect(state.loading).toBe(false);
    expect(state.error).toBe('boom');
  });

  it('a dropped live channel is not a load failure', () => {
    const state = chatListReducer(loaded(), { type: 'liveFailed', message: 'socket closed' });
    expect(state.error).toBe('socket closed');
    expect(state.loading).toBe(false);
    expect(ids(state)).toEqual(['a', 'b', 'c']);
  });
});

describe('rule 6 — a lifecycle answer lands on the row it names', () => {
  const conversation = (id: string, over: Record<string, unknown> = {}) =>
    ({
      __typename: 'Conversation',
      id,
      platform: 'widget',
      status: 'automated',
      read: false,
      updatedAt: iso(30),
      lastMessage: null,
      ...over,
    }) as unknown as NonNullable<ChatNode['conversation']>;

  const withConversations = (): ChatListState =>
    run(initialChatListState({ filter: UNFILTERED }), {
      type: 'loaded',
      epoch: 0,
      page: page([
        chat('a', 1, { conversation: conversation('a'), unreadMessagesCount: 2 }),
        chat('b', 5, { conversation: conversation('b') }),
      ]),
    });

  it('a take-over changes the status of exactly that row and moves nothing', () => {
    const state = chatListReducer(withConversations(), {
      type: 'conversationChanged',
      patch: { id: 'b', status: 'open' as never, updatedAt: iso(0) },
    });
    expect(state.byId.b!.conversation!.status).toBe('open');
    expect(state.byId.a!.conversation!.status).toBe('automated');
    expect(ids(state)).toEqual(['a', 'b']);
  });

  it('a mark-read clears the badge, because that is what read means for the count', () => {
    const state = chatListReducer(withConversations(), {
      type: 'conversationChanged',
      patch: { id: 'a', read: true, updatedAt: iso(0) },
    });
    expect(state.byId.a!.conversation!.read).toBe(true);
    expect(state.byId.a!.unreadMessagesCount).toBe(0);
  });

  it('never overwrites a fresher event with a late answer', () => {
    // A mark-read issued before a new message arrived can resolve after the
    // Update that carried the message. Applying it then reads unread mail.
    const before = withConversations();
    const fresh = chat('a', 0, {
      conversation: conversation('a', { read: false, updatedAt: iso(1) }),
      unreadMessagesCount: 3,
    });
    const updated = chatListReducer(before, batch({ action: 'Update', node: fresh }));
    const state = chatListReducer(updated, {
      type: 'conversationChanged',
      patch: { id: 'a', read: true, updatedAt: iso(5) },
    });
    expect(state).toBe(updated);
    expect(state.byId.a!.unreadMessagesCount).toBe(3);
  });

  it('a stage change lands on the contact row and nowhere else', () => {
    const state = chatListReducer(withConversations(), {
      type: 'stageChanged',
      id: 'b',
      salesStageV2: 'Won' as never,
      updatedAt: iso(0),
    });
    expect(state.byId.b!.salesStageV2).toBe('Won');
    expect(state.byId.a!.salesStageV2).not.toBe('Won');
    expect(ids(state)).toEqual(['a', 'b']);
  });

  it('a stale stage answer is ignored, and no change is the same object', () => {
    const before = withConversations();
    const fresh = chat('a', 0, { updatedAt: iso(1) });
    const updated = chatListReducer(before, batch({ action: 'Update', node: fresh }));
    expect(
      chatListReducer(updated, { type: 'stageChanged', id: 'a', salesStageV2: 'Lost' as never, updatedAt: iso(5) }),
    ).toBe(updated);
    expect(
      chatListReducer(updated, { type: 'stageChanged', id: 'ghost', salesStageV2: 'Lost' as never, updatedAt: iso(0) }),
    ).toBe(updated);
  });

  it('invents no row for a conversation the list does not hold', () => {
    // A brand-new conversation reaches the list as the server's Add, which
    // carries a name and a preview; three fields of a Conversation do not.
    const start = withConversations();
    const state = chatListReducer(start, {
      type: 'conversationChanged',
      patch: { id: 'zzz', status: 'open' as never, updatedAt: iso(0) },
    });
    expect(state).toBe(start);
  });

  it('is a no-op when nothing changes, so the pane does not re-render for it', () => {
    const start = withConversations();
    const state = chatListReducer(start, {
      type: 'conversationChanged',
      patch: { id: 'a', status: 'automated' as never, updatedAt: iso(30) },
    });
    expect(state).toBe(start);
  });
});
