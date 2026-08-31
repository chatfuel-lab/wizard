import { describe, expect, it } from 'vitest';
import type { MessageNode } from '../types';
import {
  EMPTY_THREAD,
  applyAdded,
  applyChunk,
  applyChunks,
  applyInitial,
  applyOlderPage,
  applyOptimistic,
  applyRetry,
  applySendFailed,
  applySnapshot,
  hasActiveStream,
  visibleThread,
} from './threadStore';

const msg = (over: Partial<Record<keyof MessageNode, unknown>>): MessageNode =>
  ({
    __typename: 'CoworkerMessage',
    id: 'm-1',
    clientID: null,
    role: 'coworker',
    content: 'hello',
    clientActionType: null,
    time: '2026-08-11T12:00:00Z',
    attachments: [],
    toolCalls: [],
    ...over,
  }) as unknown as MessageNode;

describe('threadStore', () => {
  it('buffers chunks per messageID, creating the buffer on first sight', () => {
    let state = applyChunk(EMPTY_THREAD, 's-1', 'Hel');
    state = applyChunk(state, 's-1', 'lo');
    state = applyChunk(state, 's-2', 'World');
    expect(visibleThread(state).streams).toEqual([
      { messageID: 's-1', text: 'Hello' },
      { messageID: 's-2', text: 'World' },
    ]);
    expect(hasActiveStream(state)).toBe(true);
  });

  it('added() overwrites the stream buffer and ignores late chunks', () => {
    let state = applyChunk(EMPTY_THREAD, 's-1', 'partial…');
    state = applyAdded(state, msg({ id: 's-1', content: 'The full authoritative text.' }));
    expect(visibleThread(state).streams).toEqual([]);
    expect(visibleThread(state).entries.map((e) => e.node.content)).toEqual(['The full authoritative text.']);
    const afterLateChunk = applyChunk(state, 's-1', 'zombie');
    expect(afterLateChunk).toBe(state); // finalized — untouched
  });

  it('reconciles an optimistic send by clientID when the echo lands', () => {
    let state = applyOptimistic(EMPTY_THREAD, 'c-1', 'create a booking', '2026-08-11T12:00:00Z');
    expect(visibleThread(state).entries[0]?.pending).toBe(true);
    state = applyAdded(
      state,
      msg({ id: 'm-9', clientID: 'c-1', role: 'user', content: 'create a booking', time: '2026-08-11T12:00:01Z' }),
    );
    const entries = visibleThread(state).entries;
    expect(entries).toHaveLength(1);
    expect(entries[0]?.pending).toBeUndefined();
    expect(entries[0]?.node.id).toBe('m-9');
  });

  it('folds a batch of chunks into one transition, and skips a finalized burst entirely', () => {
    const state = applyChunks(EMPTY_THREAD, [
      { messageID: 's-1', chunk: 'Hel' },
      { messageID: 's-1', chunk: 'lo ' },
      { messageID: 's-1', chunk: 'there' },
    ]);
    expect(visibleThread(state).streams).toEqual([{ messageID: 's-1', text: 'Hello there' }]);
    const settled = applyAdded(state, msg({ id: 's-1', content: 'Hello there' }));
    expect(applyChunks(settled, [{ messageID: 's-1', chunk: 'late' }])).toBe(settled);
  });

  it('marks a failed send but keeps it visible, and a retry puts it back in flight in place', () => {
    let state = applyOptimistic(EMPTY_THREAD, 'c-1', 'hi', '2026-08-11T12:00:00Z');
    state = applySendFailed(state, 'c-1');
    expect(visibleThread(state).entries[0]?.failed).toBe(true);

    state = applyRetry(state, 'c-1');
    const entries = visibleThread(state).entries;
    expect(entries).toHaveLength(1);
    expect(entries[0]?.failed).toBeUndefined();
    expect(entries[0]?.pending).toBe(true);
    expect(entries[0]?.node.content).toBe('hi');

    // Same clientID, so the server's echo still lands on the same row.
    state = applyAdded(state, msg({ id: 'm-7', clientID: 'c-1', role: 'user', content: 'hi' }));
    expect(visibleThread(state).entries).toHaveLength(1);
  });

  it('hides noise but keeps the empty message that carries a tool call', () => {
    let state = applyAdded(EMPTY_THREAD, msg({ id: 'm-1', content: 'real' }));
    state = applyAdded(state, msg({ id: 'm-2', content: '', toolCalls: [], attachments: [] }));
    state = applyAdded(
      state,
      msg({
        id: 'm-3',
        content: '',
        time: '2026-08-11T12:00:01Z',
        toolCalls: [{ __typename: 'CoworkerToolOther', toolID: 'chatfuel_gql-list_deals' }],
      }),
    );
    expect(visibleThread(state).entries.map((e) => e.node.id)).toEqual(['m-1', 'm-3']);
  });

  it('snapshot merge preserves pendings, older pages and unfinalized streams', () => {
    let state = applyInitial(EMPTY_THREAD, null, [msg({ id: 'm-2', time: '2026-08-11T11:59:00Z' })], 'm-2', 50);
    state = applyOlderPage(state, [msg({ id: 'm-1', time: '2026-08-11T11:00:00Z' })], 'm-1', 50);
    state = applyOptimistic(state, 'c-9', 'pending send', '2026-08-11T12:01:00Z');
    state = applyChunk(state, 's-5', 'strea');
    state = applySnapshot(state, null, [msg({ id: 'm-3', time: '2026-08-11T12:00:30Z' })]);
    const view = visibleThread(state);
    expect(view.entries.map((e) => e.node.id)).toEqual(['m-1', 'm-2', 'm-3', 'local-c-9']);
    expect(view.streams).toEqual([{ messageID: 's-5', text: 'strea' }]);
    expect(state.olderCursor).toBe('m-1'); // snapshot must NOT clobber paging
  });

  it('derives hasOlder from page fill, not hasNextPage (unreliable after page 1)', () => {
    const full = applyInitial(
      EMPTY_THREAD,
      null,
      Array.from({ length: 50 }, (_, i) =>
        msg({ id: `m-${i}`, time: `2026-08-11T11:00:${String(i % 60).padStart(2, '0')}Z` }),
      ),
      'c',
      50,
    );
    expect(full.hasOlder).toBe(true);
    const partial = applyOlderPage(full, [msg({ id: 'old-1' })], 'old-1', 50);
    expect(partial.hasOlder).toBe(false);
  });

  it('orders entries by time ascending and streams by arrival order', () => {
    let state = applyAdded(EMPTY_THREAD, msg({ id: 'b', time: '2026-08-11T12:02:00Z' }));
    state = applyAdded(state, msg({ id: 'a', time: '2026-08-11T12:01:00Z' }));
    state = applyChunk(state, 's-2', 'second');
    state = applyChunk(state, 's-1', 'first-started-later');
    const view = visibleThread(state);
    expect(view.entries.map((e) => e.node.id)).toEqual(['a', 'b']);
    expect(view.streams.map((s) => s.messageID)).toEqual(['s-2', 's-1']);
  });
});
