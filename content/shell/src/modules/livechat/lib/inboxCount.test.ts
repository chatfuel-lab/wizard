import { describe, expect, it } from 'vitest';
import { UNFILTERED_CHAT_ARGS, type ChatListFilter } from '~api/domain/livechat';
import { EMPTY_INBOX_FILTER, toChatListFilter, withUnreadOnly } from './inboxFilter';
import { inboxCountReducer, initialInboxCountState, type InboxCountState } from './inboxCount';

const UNREAD: ChatListFilter = toChatListFilter(withUnreadOnly(EMPTY_INBOX_FILTER, true));

/** Reduce a sequence, so a test reads as the story it is about. */
const run = (state: InboxCountState, ...actions: Parameters<typeof inboxCountReducer>[1][]) =>
  actions.reduce(inboxCountReducer, state);

describe('inboxCountReducer', () => {
  it('starts not knowing, and asking', () => {
    const state = initialInboxCountState(UNFILTERED_CHAT_ARGS);
    expect(state.count).toBeNull();
    expect(state.loading).toBe(true);
  });

  it('takes the answer to the question it asked', () => {
    const state = run(initialInboxCountState(UNFILTERED_CHAT_ARGS), {
      type: 'counted',
      epoch: 0,
      count: 1204,
    });
    expect(state.count).toBe(1204);
    expect(state.loading).toBe(false);
  });

  it('drops a response issued under an older epoch', () => {
    /* The race this exists for: a slow unfiltered count and a fast filtered
       one, landing in the wrong order. */
    const state = run(
      initialInboxCountState(UNFILTERED_CHAT_ARGS),
      { type: 'refilter', filter: UNREAD },
      { type: 'counted', epoch: 1, count: 3 },
      { type: 'counted', epoch: 0, count: 1204 },
    );
    expect(state.count).toBe(3);
  });

  it('clears the number when the filter changes', () => {
    /* 1204 beside three visible rows reads as a broken list; an empty slot
       reads as "still counting", which is the truth. */
    const state = run(
      initialInboxCountState(UNFILTERED_CHAT_ARGS),
      { type: 'counted', epoch: 0, count: 1204 },
      { type: 'refilter', filter: UNREAD },
    );
    expect(state.count).toBeNull();
    expect(state.loading).toBe(true);
    expect(state.filter).toBe(UNREAD);
  });

  it('keeps the number across a reconnect refetch', () => {
    /* Same filter, asked again. The old answer is still the best one anyone
       has, so nothing on screen flickers while the new one is in flight. */
    const state = run(
      initialInboxCountState(UNFILTERED_CHAT_ARGS),
      { type: 'counted', epoch: 0, count: 1204 },
      { type: 'refetch' },
    );
    expect(state.count).toBe(1204);
    expect(state.loading).toBe(true);
  });

  it('bumps the epoch on both kinds of ask, so neither can take the other’s answer', () => {
    const start = initialInboxCountState(UNFILTERED_CHAT_ARGS);
    expect(inboxCountReducer(start, { type: 'refetch' }).epoch).toBe(1);
    expect(inboxCountReducer(start, { type: 'refilter', filter: UNREAD }).epoch).toBe(1);
  });

  it('does not resurrect a pre-reconnect answer after the refetch', () => {
    const state = run(
      initialInboxCountState(UNFILTERED_CHAT_ARGS),
      { type: 'refetch' },
      { type: 'counted', epoch: 1, count: 7 },
      { type: 'counted', epoch: 0, count: 1204 },
    );
    expect(state.count).toBe(7);
  });

  it('leaves the last known number in place when a request fails', () => {
    const state = run(
      initialInboxCountState(UNFILTERED_CHAT_ARGS),
      { type: 'counted', epoch: 0, count: 1204 },
      { type: 'refetch' },
      { type: 'failed', epoch: 1 },
    );
    expect(state.count).toBe(1204);
    expect(state.loading).toBe(false);
  });

  it('stays unknown when the first request fails', () => {
    const state = run(initialInboxCountState(UNFILTERED_CHAT_ARGS), { type: 'failed', epoch: 0 });
    expect(state.count).toBeNull();
    expect(state.loading).toBe(false);
  });

  it('ignores a failure from a superseded request', () => {
    /* Otherwise a filter change that outran a doomed request would clear
       `loading` and the slot would settle as "counted nothing" forever. */
    const state = run(
      initialInboxCountState(UNFILTERED_CHAT_ARGS),
      { type: 'refilter', filter: UNREAD },
      { type: 'failed', epoch: 0 },
    );
    expect(state.loading).toBe(true);
  });

  it('counts zero as a real answer, not as unknown', () => {
    const state = run(initialInboxCountState(UNREAD), { type: 'counted', epoch: 0, count: 0 });
    expect(state.count).toBe(0);
    expect(state.loading).toBe(false);
  });
});
