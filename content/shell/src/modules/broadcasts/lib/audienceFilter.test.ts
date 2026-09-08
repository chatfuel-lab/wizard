import { describe, expect, it } from 'vitest';
import { AttrFilterDefaultOperator, BoolOperator } from '~api/generated/broadcasts/graphql';
import {
  EMPTY_AUDIENCE,
  addGroup,
  addPredicate,
  dateInputToValue,
  dateValueToInput,
  isNullary,
  isRangeOperator,
  isSingleValued,
  newGroupId,
  newPredicateId,
  predicateCount,
  removeGroup,
  removePredicate,
  updateGroup,
  updatePredicate,
  usableGroups,
  type AudienceFilter,
} from './audienceFilter';
import { zonedInstant } from './zone';

const ZONE = 'America/Mexico_City';

const filled = (): AudienceFilter => ({
  groupOperator: BoolOperator.And,
  groups: [
    {
      id: 'g1',
      operator: BoolOperator.And,
      predicates: [{ id: 'p1', name: 'city', operator: AttrFilterDefaultOperator.Is, values: ['Berlin'] }],
    },
  ],
});

describe('the operators', () => {
  it('know which take no value, one value, or are approximate', () => {
    expect(isNullary(AttrFilterDefaultOperator.IsEmpty)).toBe(true);
    expect(isNullary(AttrFilterDefaultOperator.Is)).toBe(false);
    expect(isSingleValued(AttrFilterDefaultOperator.StartsWith)).toBe(true);
    expect(isSingleValued(AttrFilterDefaultOperator.Contains)).toBe(false);
    expect(isRangeOperator(AttrFilterDefaultOperator.Gt)).toBe(true);
    expect(isRangeOperator(AttrFilterDefaultOperator.Lt)).toBe(true);
    expect(isRangeOperator(AttrFilterDefaultOperator.Is)).toBe(false);
  });
});

describe('editing the filter', () => {
  it('starts a group with one empty condition, ids counted from one', () => {
    const next = addGroup(EMPTY_AUDIENCE);
    expect(next.groups).toHaveLength(1);
    expect(next.groups[0].id).toBe('g1');
    expect(next.groups[0].predicates).toEqual([
      { id: 'p1', name: '', operator: AttrFilterDefaultOperator.Is, values: [''] },
    ]);
    expect(EMPTY_AUDIENCE.groups).toHaveLength(0);
  });

  it('picks the smallest unused id so an unchanged row keeps its id', () => {
    const filter = addGroup(addGroup(EMPTY_AUDIENCE));
    expect(newGroupId(filter)).toBe('g3');
    expect(newGroupId(removeGroup(filter, 'g1'))).toBe('g1');
    const group = {
      id: 'g1',
      operator: BoolOperator.And,
      predicates: [{ id: 'p2', name: '', operator: AttrFilterDefaultOperator.Is, values: [] }],
    };
    expect(newPredicateId(group)).toBe('p1');
  });

  it('adds a condition to the named group only', () => {
    const filter = addGroup(addGroup(EMPTY_AUDIENCE));
    const next = addPredicate(filter, 'g2', 'city');
    expect(next.groups[0].predicates).toHaveLength(1);
    expect(next.groups[1].predicates).toHaveLength(2);
    expect(next.groups[1].predicates[1]).toMatchObject({ id: 'p2', name: 'city' });
  });

  it('patches one condition and one group without touching the rest', () => {
    const filter = addPredicate(filled(), 'g1');
    const next = updatePredicate(filter, 'g1', 'p2', { name: 'plan', values: ['pro'] });
    expect(next.groups[0].predicates[0]).toEqual(filter.groups[0].predicates[0]);
    expect(next.groups[0].predicates[1]).toMatchObject({ name: 'plan', values: ['pro'] });
    expect(updateGroup(filter, 'g1', { operator: BoolOperator.Or }).groups[0].operator).toBe(BoolOperator.Or);
  });

  it('removes the group with its last condition', () => {
    const filter = addPredicate(filled(), 'g1');
    expect(removePredicate(filter, 'g1', 'p2').groups[0].predicates).toHaveLength(1);
    expect(removePredicate(filled(), 'g1', 'p1').groups).toHaveLength(0);
  });

  it('counts every condition on screen, half-typed ones included', () => {
    expect(predicateCount(addPredicate(filled(), 'g1'))).toBe(2);
  });
});

describe('what is worth sending', () => {
  it('drops a condition with no field or no value, and a group left empty by that', () => {
    const filter: AudienceFilter = {
      groupOperator: BoolOperator.And,
      groups: [
        {
          id: 'g1',
          operator: BoolOperator.And,
          predicates: [
            { id: 'p1', name: '', operator: AttrFilterDefaultOperator.Is, values: ['x'] },
            { id: 'p2', name: 'city', operator: AttrFilterDefaultOperator.Is, values: [' '] },
          ],
        },
        {
          id: 'g2',
          operator: BoolOperator.And,
          predicates: [
            { id: 'p1', name: 'phone', operator: AttrFilterDefaultOperator.IsNotEmpty, values: [] },
            { id: 'p2', name: 'city', operator: AttrFilterDefaultOperator.Is, values: ['Berlin'] },
          ],
        },
      ],
    };
    const usable = usableGroups(filter);
    expect(usable).toHaveLength(1);
    expect(usable[0].id).toBe('g2');
    expect(usable[0].predicates).toHaveLength(2);
  });
});

describe('the date editor', () => {
  it('sends the picked day at the bot zone midnight, as a millisecond string', () => {
    expect(dateInputToValue('2030-01-06', ZONE)).toBe(String(zonedInstant('2030-01-06', 0, ZONE)));
    expect(dateInputToValue(null, ZONE)).toBe('');
    expect(dateInputToValue('not a day', ZONE)).toBe('');
  });

  it('reads a millisecond stamp or an ISO string back as the day in the bot zone', () => {
    const at = zonedInstant('2030-01-06', 0, ZONE);
    expect(dateValueToInput(String(at), ZONE)).toBe('2030-01-06');
    expect(dateValueToInput(new Date(at).toISOString(), ZONE)).toBe('2030-01-06');
    expect(dateValueToInput('Berlin', ZONE)).toBe('');
  });
});
