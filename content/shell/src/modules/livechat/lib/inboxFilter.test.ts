import { describe, expect, it } from 'vitest';
import { ContactAssigneeFilterType, SalesStageV2 } from '~api/generated/livechat/graphql';
import {
  EMPTY_INBOX_FILTER,
  STAGES,
  activeFilterCount,
  assigneeUserId,
  clearInboxFilter,
  describeInboxFilter,
  isInboxFilterEmpty,
  sameInboxFilter,
  toAssigneeFilter,
  toChatListFilter,
  toggleStage,
  userAssigneeKey,
  withAllStages,
  withAssignee,
  withQuery,
  withUnreadOnly,
  type InboxFilter,
} from './inboxFilter';

describe('assignee keys', () => {
  it('maps the three presets onto the API enum', () => {
    expect(toAssigneeFilter('Any')).toEqual({ type: ContactAssigneeFilterType.Any });
    expect(toAssigneeFilter('Unassigned')).toEqual({ type: ContactAssigneeFilterType.Unassigned });
    expect(toAssigneeFilter('FuelyAI')).toEqual({ type: ContactAssigneeFilterType.FuelyAi });
  });

  it('carries a real person as AssigneeID plus the id', () => {
    expect(toAssigneeFilter(userAssigneeKey('u-42'))).toEqual({
      type: ContactAssigneeFilterType.AssigneeId,
      assigneeID: 'u-42',
    });
  });

  it('reads the id back out, and null for the presets', () => {
    expect(assigneeUserId(userAssigneeKey('u-42'))).toBe('u-42');
    expect(assigneeUserId('Any')).toBeNull();
    expect(assigneeUserId('Unassigned')).toBeNull();
  });

  it('does not mistake a preset for a user id', () => {
    /* The `u:` prefix is what separates them, and 'Unassigned' starts with a
       'U' — a prefix test written case-insensitively would send the string
       "nassigned" to the server as a UserAccountID. */
    expect(assigneeUserId('Unassigned')).toBeNull();
    expect(toAssigneeFilter('Unassigned').assigneeID).toBeUndefined();
  });
});

describe('toChatListFilter', () => {
  it('sends null, not an empty string, for an empty search box', () => {
    expect(toChatListFilter(EMPTY_INBOX_FILTER).textInputFilter).toBeNull();
  });

  it('trims the query, so a trailing space is not a different question', () => {
    expect(toChatListFilter({ ...EMPTY_INBOX_FILTER, q: '  ada  ' }).textInputFilter).toBe('ada');
  });

  it('sends null for a query that is only whitespace', () => {
    expect(toChatListFilter({ ...EMPTY_INBOX_FILTER, q: '   ' }).textInputFilter).toBeNull();
  });

  it('copies the stage list rather than aliasing the UI state onto the wire', () => {
    const filter: InboxFilter = { ...EMPTY_INBOX_FILTER, stages: [SalesStageV2.Won] };
    const wire = toChatListFilter(filter);
    expect(wire.salesStageV2Filter).toEqual([SalesStageV2.Won]);
    expect(wire.salesStageV2Filter).not.toBe(filter.stages);
  });

  it('carries unreadOnly through untouched', () => {
    expect(toChatListFilter({ ...EMPTY_INBOX_FILTER, unreadOnly: true }).unreadOnly).toBe(true);
  });
});

describe('filter identity', () => {
  /* The property `useChatListStore` depends on: it keys its query, its subscription
     and its epoch on the filter's identity, so a transition that allocated
     when nothing changed would blank the list and re-establish the WebSocket
     on every render. */

  it('returns the very same object when a transition changes nothing', () => {
    const filter = EMPTY_INBOX_FILTER;
    expect(withAssignee(filter, 'Any')).toBe(filter);
    expect(withQuery(filter, '')).toBe(filter);
    expect(withUnreadOnly(filter, false)).toBe(filter);
    expect(withAllStages(filter)).toBe(filter);
    expect(clearInboxFilter(filter)).toBe(filter);
  });

  it('returns a new object when the filter really did change', () => {
    const filter = EMPTY_INBOX_FILTER;
    expect(withAssignee(filter, 'Unassigned')).not.toBe(filter);
    expect(withQuery(filter, 'a')).not.toBe(filter);
    expect(withUnreadOnly(filter, true)).not.toBe(filter);
    expect(toggleStage(filter, SalesStageV2.Won)).not.toBe(filter);
  });

  it('holds identity through a round trip back to the same value', () => {
    const once = withQuery(EMPTY_INBOX_FILTER, 'ada');
    expect(withQuery(once, 'ada')).toBe(once);
  });

  it('does not treat a whitespace-only edit as no change', () => {
    /* `q` is compared raw, not trimmed: the box has to show what was typed.
       The trim happens at the wire boundary instead. */
    const filter = withQuery(EMPTY_INBOX_FILTER, 'ada');
    expect(withQuery(filter, 'ada ')).not.toBe(filter);
    expect(toChatListFilter(withQuery(filter, 'ada ')).textInputFilter).toBe('ada');
  });

  it('clears to the shared empty filter', () => {
    expect(clearInboxFilter(withQuery(EMPTY_INBOX_FILTER, 'ada'))).toBe(EMPTY_INBOX_FILTER);
  });
});

describe('toggleStage', () => {
  it('reads an empty selection as all six, so unticking one means "all but this"', () => {
    const filter = toggleStage(EMPTY_INBOX_FILTER, SalesStageV2.Lost);
    expect(filter.stages).toHaveLength(5);
    expect(filter.stages).not.toContain(SalesStageV2.Lost);
  });

  it('collapses a full selection back to empty, so "everything" has one spelling', () => {
    const withoutLost = toggleStage(EMPTY_INBOX_FILTER, SalesStageV2.Lost);
    expect(toggleStage(withoutLost, SalesStageV2.Lost).stages).toEqual([]);
  });

  it('keeps canonical pipeline order however the stages were picked', () => {
    let filter = withAllStages(EMPTY_INBOX_FILTER);
    filter = toggleStage(filter, SalesStageV2.Won);
    filter = toggleStage(filter, SalesStageV2.New);
    /* Started from "all", removed two: what is left must still be in order. */
    expect(filter.stages).toEqual(STAGES.filter((stage) => stage !== SalesStageV2.Won && stage !== SalesStageV2.New));
  });

  it('never puts the same stage in twice', () => {
    const filter = toggleStage(toggleStage(EMPTY_INBOX_FILTER, SalesStageV2.Won), SalesStageV2.New);
    expect(new Set(filter.stages).size).toBe(filter.stages.length);
  });
});

describe('emptiness and the badge', () => {
  it('calls the default filter empty', () => {
    expect(isInboxFilterEmpty(EMPTY_INBOX_FILTER)).toBe(true);
    expect(activeFilterCount(EMPTY_INBOX_FILTER)).toBe(0);
  });

  it('does not count a whitespace-only query as a narrowing', () => {
    const filter = withQuery(EMPTY_INBOX_FILTER, '   ');
    expect(isInboxFilterEmpty(filter)).toBe(true);
    expect(activeFilterCount(filter)).toBe(0);
  });

  it('counts each dimension once, not each stage', () => {
    let filter = withAssignee(EMPTY_INBOX_FILTER, 'Unassigned');
    filter = withUnreadOnly(filter, true);
    filter = withQuery(filter, 'ada');
    filter = toggleStage(filter, SalesStageV2.Lost);
    expect(activeFilterCount(filter)).toBe(4);
    expect(isInboxFilterEmpty(filter)).toBe(false);
  });
});

describe('sameInboxFilter', () => {
  it('separates filters that differ only in stage order', () => {
    const a: InboxFilter = { ...EMPTY_INBOX_FILTER, stages: [SalesStageV2.New, SalesStageV2.Won] };
    const b: InboxFilter = { ...EMPTY_INBOX_FILTER, stages: [SalesStageV2.Won, SalesStageV2.New] };
    expect(sameInboxFilter(a, b)).toBe(false);
  });

  it('is true for equal values held in different objects', () => {
    expect(sameInboxFilter({ ...EMPTY_INBOX_FILTER }, { ...EMPTY_INBOX_FILTER })).toBe(true);
  });
});

describe('describeInboxFilter', () => {
  it('says nothing when nothing is narrowed', () => {
    expect(describeInboxFilter(EMPTY_INBOX_FILTER)).toBe('');
  });

  it('names the preset, the stages, the unread flag and the query', () => {
    let filter = withAssignee(EMPTY_INBOX_FILTER, 'Unassigned');
    filter = withUnreadOnly(filter, true);
    filter = withQuery(filter, 'ada');
    filter = toggleStage(filter, SalesStageV2.Lost);
    const text = describeInboxFilter(filter);
    expect(text).toContain('Unassigned');
    expect(text).toContain('unread only');
    expect(text).toContain('ada');
    expect(text).toContain('New');
  });

  it('resolves a teammate through the supplied lookup', () => {
    const filter = withAssignee(EMPTY_INBOX_FILTER, userAssigneeKey('u-42'));
    expect(describeInboxFilter(filter, (id) => (id === 'u-42' ? 'Ada' : id))).toBe('Ada');
  });

  it('falls back rather than printing a raw id when the lookup misses', () => {
    const filter = withAssignee(EMPTY_INBOX_FILTER, userAssigneeKey('u-42'));
    expect(describeInboxFilter(filter)).toBe('one teammate');
    expect(describeInboxFilter(filter)).not.toContain('u-42');
  });
});
