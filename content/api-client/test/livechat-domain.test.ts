import { describe, expect, it } from 'vitest';
import {
  CHAT_LIST_PAGE_SIZE,
  UNFILTERED_CHAT_ARGS,
  chatListCountVars,
  chatListQueryVars,
  chatListSubscriptionVars,
  type ChatListFilter,
} from '../src/domain/livechat';
import { ContactAssigneeFilterType, SalesStageV2 } from '../src/generated/livechat/graphql';

/**
 * The three builders exist so a chat-list filter cannot reach the wire twice
 * with two different meanings. The comment in the module says so; this file is
 * what makes it fail a build instead.
 *
 * The check is deliberately structural rather than a list of expected fields.
 * A hand-written expectation is a fourth copy of the filter shape, and it goes
 * stale in exactly the situation the rule is about — somebody adds a field to
 * `ChatListFilter`, wires it into the query, and forgets the subscription. So
 * the assertions compare the builders against EACH OTHER and against the
 * filter's own keys, which means a new field is covered the moment it exists.
 */

const NARROWED: ChatListFilter = {
  assigneeFilter: { type: ContactAssigneeFilterType.AssigneeId, assigneeID: 'user-7' },
  unreadOnly: true,
  salesStageV2Filter: [SalesStageV2.New, SalesStageV2.Won],
  textInputFilter: 'ada',
};

/** Everything the filter narrows by — the keys all three builders have to carry. */
const filterKeys = (filter: ChatListFilter) => Object.keys(filter).sort();

describe('chat list variable builders', () => {
  it('puts every filter field on the query', () => {
    const vars = chatListQueryVars('bot-1', NARROWED);
    for (const key of filterKeys(NARROWED)) {
      expect(vars).toHaveProperty(key, NARROWED[key as keyof ChatListFilter]);
    }
  });

  it('puts the same fields, with the same values, on the subscription', () => {
    const query = chatListQueryVars('bot-1', NARROWED) as Record<string, unknown>;
    const live = chatListSubscriptionVars('bot-1', NARROWED) as Record<string, unknown>;
    for (const key of filterKeys(NARROWED)) expect(live[key]).toEqual(query[key]);
  });

  it('nests the same fields under the count filter, whose input type differs', () => {
    const query = chatListQueryVars('bot-1', NARROWED) as Record<string, unknown>;
    const count = chatListCountVars('bot-1', NARROWED);
    for (const key of filterKeys(NARROWED)) {
      expect((count.filter as Record<string, unknown>)[key]).toEqual(query[key]);
    }
  });

  it('gives the count no field the list cannot also express', () => {
    /* The SDL's count filter is a superset — it also takes a last-message time
       range. Sending one from here would make the number describe a set the
       rows below it are not drawn from, so the builder must widen and nothing
       more. */
    const count = chatListCountVars('bot-1', NARROWED);
    expect(Object.keys(count.filter).sort()).toEqual(filterKeys(NARROWED));
  });

  it('agrees on the unfiltered default too', () => {
    const query = chatListQueryVars('bot-1', UNFILTERED_CHAT_ARGS) as Record<string, unknown>;
    const live = chatListSubscriptionVars('bot-1', UNFILTERED_CHAT_ARGS) as Record<string, unknown>;
    const count = chatListCountVars('bot-1', UNFILTERED_CHAT_ARGS);
    for (const key of filterKeys(UNFILTERED_CHAT_ARGS)) {
      expect(live[key]).toEqual(query[key]);
      expect((count.filter as Record<string, unknown>)[key]).toEqual(query[key]);
    }
  });

  it('sends the bot id to all three', () => {
    expect(chatListQueryVars('bot-1', NARROWED).botID).toBe('bot-1');
    expect(chatListSubscriptionVars('bot-1', NARROWED).botID).toBe('bot-1');
    expect(chatListCountVars('bot-1', NARROWED).botID).toBe('bot-1');
  });

  it('pages the query only — a subscription and a count have no cursor', () => {
    const first = chatListQueryVars('bot-1', NARROWED);
    expect(first.first).toBe(CHAT_LIST_PAGE_SIZE);
    expect(first.after).toBeNull();
    expect(chatListQueryVars('bot-1', NARROWED, 'cursor-50').after).toBe('cursor-50');
    expect(chatListSubscriptionVars('bot-1', NARROWED)).not.toHaveProperty('after');
    expect(chatListCountVars('bot-1', NARROWED)).not.toHaveProperty('after');
  });

  it('copies the filter rather than aliasing it onto the wire', () => {
    const count = chatListCountVars('bot-1', NARROWED);
    expect(count.filter).not.toBe(NARROWED);
    expect(count.filter).toEqual(NARROWED);
  });
});
