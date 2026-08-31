import { describe, expect, it } from 'vitest';
import {
  AttrFilterDefaultOperator,
  BoolOperator,
  ContactAssigneeFilterType,
  Platform,
  SalesStageV2,
  Sort,
} from '~api/generated/contacts/graphql';
import {
  ALL_PLATFORMS,
  EMPTY_FILTER,
  OPERATORS,
  activeFilterCount,
  addGroup,
  addPredicate,
  assigneeUserId,
  emptyPredicate,
  filterForAttribute,
  isFilterEmpty,
  isNullary,
  isPlatformSubset,
  isRangeOperator,
  isSingleValued,
  isUsablePredicate,
  removeGroup,
  removePredicate,
  toAssigneeFilter,
  updateGroup,
  updatePredicate,
  usableGroups,
  userAssigneeKey,
  usesChatOnlyFilters,
  usesSegmentOnlyFilters,
  type ContactsFilter,
} from './contactsFilter';

const withPredicate = (values: string[] = ['Pro']): ContactsFilter => ({
  ...EMPTY_FILTER,
  groups: [
    {
      id: 'g1',
      operator: BoolOperator.And,
      predicates: [{ id: 'p1', name: 'Plan', operator: AttrFilterDefaultOperator.Is, values }],
    },
  ],
});

describe('the empty filter', () => {
  it('is empty, and every platform selected means no platform filter', () => {
    expect(isFilterEmpty(EMPTY_FILTER)).toBe(true);
    expect(isPlatformSubset(EMPTY_FILTER)).toBe(false);
    expect(EMPTY_FILTER.platforms).toEqual([...ALL_PLATFORMS]);
    expect(activeFilterCount(EMPTY_FILTER)).toBe(0);
  });

  it('stops being empty when any half of the model is used', () => {
    expect(isFilterEmpty({ ...EMPTY_FILTER, q: 'anna' })).toBe(false);
    expect(isFilterEmpty({ ...EMPTY_FILTER, assignee: 'Unassigned' })).toBe(false);
    expect(isFilterEmpty({ ...EMPTY_FILTER, stages: [SalesStageV2.Won] })).toBe(false);
    expect(isFilterEmpty({ ...EMPTY_FILTER, unreadOnly: true })).toBe(false);
    expect(isFilterEmpty({ ...EMPTY_FILTER, since: '2026-01-01T00:00:00Z' })).toBe(false);
    expect(isFilterEmpty({ ...EMPTY_FILTER, platforms: [Platform.Whatsapp] })).toBe(false);
    expect(isFilterEmpty(withPredicate())).toBe(false);
    expect(isFilterEmpty({ ...EMPTY_FILTER, sort: { name: 'last seen', direction: Sort.Desc } })).toBe(false);
  });

  it('whitespace-only text is no filter at all', () => {
    expect(isFilterEmpty({ ...EMPTY_FILTER, q: '   ' })).toBe(true);
    expect(activeFilterCount({ ...EMPTY_FILTER, q: '   ' })).toBe(0);
  });
});

describe('activeFilterCount', () => {
  it('counts one per control, and one per usable predicate', () => {
    const filter: ContactsFilter = {
      ...withPredicate(),
      q: 'anna',
      assignee: 'FuelyAI',
      stages: [SalesStageV2.New],
      unreadOnly: true,
      since: '2026-01-01T00:00:00Z',
      platforms: [Platform.Whatsapp],
    };
    expect(activeFilterCount(filter)).toBe(7);
  });

  it('counts the date window once, whichever end is set', () => {
    expect(activeFilterCount({ ...EMPTY_FILTER, since: '2026-01-01T00:00:00Z' })).toBe(1);
    expect(activeFilterCount({ ...EMPTY_FILTER, until: '2026-02-01T00:00:00Z' })).toBe(1);
  });

  it('does not count sort — sort is not a filter', () => {
    expect(activeFilterCount({ ...EMPTY_FILTER, sort: { name: 'last seen', direction: Sort.Desc } })).toBe(0);
  });

  it('ignores predicates the server could not be asked about', () => {
    expect(activeFilterCount(withPredicate(['', '  ']))).toBe(0);
  });
});

describe('which engine a filter needs', () => {
  it('splits the model along the line the two engines draw', () => {
    expect(usesChatOnlyFilters(EMPTY_FILTER)).toBe(false);
    expect(usesChatOnlyFilters({ ...EMPTY_FILTER, q: 'anna' })).toBe(true);
    expect(usesChatOnlyFilters({ ...EMPTY_FILTER, assignee: userAssigneeKey('u1') })).toBe(true);
    expect(usesChatOnlyFilters({ ...EMPTY_FILTER, unreadOnly: true })).toBe(true);
    expect(usesChatOnlyFilters(withPredicate())).toBe(false);

    expect(usesSegmentOnlyFilters(EMPTY_FILTER)).toBe(false);
    expect(usesSegmentOnlyFilters(withPredicate())).toBe(true);
    expect(usesSegmentOnlyFilters({ ...EMPTY_FILTER, sort: { name: 'last seen', direction: Sort.Desc } })).toBe(true);
  });
});

describe('the operator table', () => {
  it('is partitioned: nullary, single-valued and list-valued cover it with no overlap', () => {
    for (const operator of OPERATORS) {
      expect(isNullary(operator) && isSingleValued(operator)).toBe(false);
    }
    expect(OPERATORS.filter(isNullary)).toEqual([
      AttrFilterDefaultOperator.IsEmpty,
      AttrFilterDefaultOperator.IsNotEmpty,
    ]);
    expect(OPERATORS.filter(isSingleValued)).toEqual([
      AttrFilterDefaultOperator.StartsWith,
      AttrFilterDefaultOperator.Gt,
      AttrFilterDefaultOperator.Lt,
    ]);
  });

  it('marks exactly the comparisons as ranges', () => {
    expect(OPERATORS.filter(isRangeOperator)).toEqual([AttrFilterDefaultOperator.Gt, AttrFilterDefaultOperator.Lt]);
  });
});

describe('usable predicates', () => {
  it('needs a name, and a value unless the operator is nullary', () => {
    const base = { id: 'p1', name: 'Plan', operator: AttrFilterDefaultOperator.Is, values: ['Pro'] };
    expect(isUsablePredicate(base)).toBe(true);
    expect(isUsablePredicate({ ...base, name: '  ' })).toBe(false);
    expect(isUsablePredicate({ ...base, values: ['  '] })).toBe(false);
    expect(isUsablePredicate({ ...base, operator: AttrFilterDefaultOperator.IsEmpty, values: [] })).toBe(true);
  });

  it('drops empty groups on the way to the server', () => {
    expect(usableGroups(withPredicate(['']))).toEqual([]);
    expect(usableGroups(withPredicate())).toHaveLength(1);
  });
});

describe('editing the model', () => {
  it('adds a group with one blank predicate carrying the given name', () => {
    const filter = addGroup(EMPTY_FILTER, 'Plan');
    expect(filter.groups).toHaveLength(1);
    expect(filter.groups[0]?.id).toBe('g1');
    expect(filter.groups[0]?.predicates).toEqual([
      { id: 'p1', name: 'Plan', operator: AttrFilterDefaultOperator.Is, values: [''] },
    ]);
  });

  it('hands out the smallest unused id, so equal edits produce equal filters', () => {
    const two = addGroup(addGroup(EMPTY_FILTER), 'City');
    expect(two.groups.map((group) => group.id)).toEqual(['g1', 'g2']);
    const again = addPredicate(two, 'g1', 'Plan');
    expect(again.groups[0]?.predicates.map((each) => each.id)).toEqual(['p1', 'p2']);
    expect(emptyPredicate(two.groups[0]!).id).toBe('p2');
  });

  it('updates one group or one predicate and leaves the rest alone', () => {
    const filter = addGroup(addGroup(EMPTY_FILTER, 'Plan'), 'City');
    const flipped = updateGroup(filter, 'g2', { operator: BoolOperator.Or });
    expect(flipped.groups[0]?.operator).toBe(BoolOperator.And);
    expect(flipped.groups[1]?.operator).toBe(BoolOperator.Or);
    const renamed = updatePredicate(filter, 'g1', 'p1', { values: ['Pro'] });
    expect(renamed.groups[0]?.predicates[0]?.values).toEqual(['Pro']);
    expect(renamed.groups[1]).toEqual(filter.groups[1]);
  });

  it('removing the last predicate removes the group with it', () => {
    const filter = addGroup(EMPTY_FILTER, 'Plan');
    expect(removePredicate(filter, 'g1', 'p1').groups).toEqual([]);
    expect(removeGroup(filter, 'g1').groups).toEqual([]);
  });

  it('builds the "has this field" filter the other surfaces ask for', () => {
    const filter = filterForAttribute('Plan');
    expect(filter.groups[0]?.predicates[0]).toEqual({
      id: 'p1',
      name: 'Plan',
      operator: AttrFilterDefaultOperator.IsNotEmpty,
      values: [],
    });
    expect(isUsablePredicate(filter.groups[0]!.predicates[0]!)).toBe(true);
  });
});

describe('assignee keys', () => {
  it('round-trips a user id through the key', () => {
    expect(assigneeUserId(userAssigneeKey('ua-1'))).toBe('ua-1');
    expect(assigneeUserId('Unassigned')).toBeNull();
  });

  it('maps every key onto the filter the API takes', () => {
    expect(toAssigneeFilter('Any')).toEqual({ type: ContactAssigneeFilterType.Any });
    expect(toAssigneeFilter('Unassigned')).toEqual({ type: ContactAssigneeFilterType.Unassigned });
    expect(toAssigneeFilter('FuelyAI')).toEqual({ type: ContactAssigneeFilterType.FuelyAi });
    expect(toAssigneeFilter(userAssigneeKey('ua-1'))).toEqual({
      type: ContactAssigneeFilterType.AssigneeId,
      assigneeID: 'ua-1',
    });
  });
});
