import { describe, expect, it } from 'vitest';
import { AttrFilterDefaultOperator, ContactAssigneeFilterType, SalesStageV2, Sort } from '~api/generated/deals/graphql';
import {
  EMPTY_FILTER,
  activeFilterCount,
  isFilterEmpty,
  isNullary,
  isPredicateComplete,
  assigneeUserId,
  needsAttributeEngine,
  toAssigneeFilter,
  userAssigneeKey,
  usablePredicates,
  type AttrPredicate,
} from './dealsFilter';

const predicate = (over: Partial<AttrPredicate> = {}): AttrPredicate => ({
  id: 'p1',
  name: 'deal amount',
  operator: AttrFilterDefaultOperator.Gt,
  values: ['1000'],
  ...over,
});

describe('isFilterEmpty', () => {
  it('is true only for the empty filter', () => {
    expect(isFilterEmpty(EMPTY_FILTER)).toBe(true);
    expect(isFilterEmpty({ ...EMPTY_FILTER, assignee: 'Unassigned' })).toBe(false);
    expect(isFilterEmpty({ ...EMPTY_FILTER, stages: [SalesStageV2.Won] })).toBe(false);
    expect(isFilterEmpty({ ...EMPTY_FILTER, unreadOnly: true })).toBe(false);
    expect(isFilterEmpty({ ...EMPTY_FILTER, predicates: [predicate()] })).toBe(false);
  });

  it('ignores whitespace-only search text', () => {
    expect(isFilterEmpty({ ...EMPTY_FILTER, q: '   ' })).toBe(true);
  });
});

describe('activeFilterCount', () => {
  it('counts each narrowing once, and each predicate separately', () => {
    expect(activeFilterCount(EMPTY_FILTER)).toBe(0);
    expect(
      activeFilterCount({
        ...EMPTY_FILTER,
        assignee: 'FuelyAI',
        q: 'kaya',
        stages: [SalesStageV2.New, SalesStageV2.Won],
        unreadOnly: true,
        predicates: [predicate(), predicate({ id: 'p2' })],
      }),
    ).toBe(6);
  });

  it('does not count sort — it reorders, it does not narrow', () => {
    expect(activeFilterCount({ ...EMPTY_FILTER, sort: { attribute: 'x', direction: Sort.Asc } })).toBe(0);
  });
});

describe('predicates', () => {
  it('treats IS_EMPTY / IS_NOT_EMPTY as complete with no values', () => {
    expect(isNullary(AttrFilterDefaultOperator.IsEmpty)).toBe(true);
    expect(isNullary(AttrFilterDefaultOperator.IsNotEmpty)).toBe(true);
    expect(isNullary(AttrFilterDefaultOperator.Is)).toBe(false);
    expect(isPredicateComplete(predicate({ operator: AttrFilterDefaultOperator.IsEmpty, values: [] }))).toBe(true);
  });

  it('rejects a half-typed row so the editor cannot narrow the result set mid-edit', () => {
    expect(isPredicateComplete(predicate({ name: '  ' }))).toBe(false);
    expect(isPredicateComplete(predicate({ values: [] }))).toBe(false);
    expect(isPredicateComplete(predicate({ values: ['  '] }))).toBe(false);
  });

  it('usablePredicates drops the incomplete ones', () => {
    const filter = {
      ...EMPTY_FILTER,
      predicates: [predicate(), predicate({ id: 'p2', name: '' })],
    };
    expect(usablePredicates(filter).map((p) => p.id)).toEqual(['p1']);
  });
});

describe('needsAttributeEngine', () => {
  it('is false while only engine-B-expressible filters are set', () => {
    expect(needsAttributeEngine(EMPTY_FILTER)).toBe(false);
    expect(
      needsAttributeEngine({
        ...EMPTY_FILTER,
        assignee: 'Unassigned',
        q: 'kaya',
        stages: [SalesStageV2.Won],
        unreadOnly: true,
      }),
    ).toBe(false);
  });

  it('is true for a usable predicate or any sort', () => {
    expect(needsAttributeEngine({ ...EMPTY_FILTER, predicates: [predicate()] })).toBe(true);
    expect(needsAttributeEngine({ ...EMPTY_FILTER, sort: { attribute: 'x', direction: Sort.Desc } })).toBe(true);
  });

  it('is NOT triggered by a half-typed predicate — that would flip engines mid-keystroke', () => {
    expect(needsAttributeEngine({ ...EMPTY_FILTER, predicates: [predicate({ name: '' })] })).toBe(false);
  });
});

describe('assignee keys', () => {
  it('maps the three presets onto the API filter', () => {
    expect(toAssigneeFilter('Any')).toEqual({ type: ContactAssigneeFilterType.Any });
    expect(toAssigneeFilter('Unassigned')).toEqual({ type: ContactAssigneeFilterType.Unassigned });
    expect(toAssigneeFilter('FuelyAI')).toEqual({ type: ContactAssigneeFilterType.FuelyAi });
  });

  it('turns a person into AssigneeID + the UserAccountID', () => {
    // `contactSetAssignee` and this filter both want member.user.id, never member.id.
    expect(toAssigneeFilter(userAssigneeKey('u-2'))).toEqual({
      type: ContactAssigneeFilterType.AssigneeId,
      assigneeID: 'u-2',
    });
  });

  it('reads the id back out, and only for a person', () => {
    expect(assigneeUserId(userAssigneeKey('u-2'))).toBe('u-2');
    expect(assigneeUserId('Any')).toBeNull();
    expect(assigneeUserId('FuelyAI')).toBeNull();
  });

  it('counts a person as a narrowing, like the other non-default values', () => {
    expect(activeFilterCount({ ...EMPTY_FILTER, assignee: userAssigneeKey('u-2') })).toBe(1);
    expect(isFilterEmpty({ ...EMPTY_FILTER, assignee: userAssigneeKey('u-2') })).toBe(false);
  });
});
