import { describe, expect, it } from 'vitest';
import { AttrFilterDefaultOperator, AttributeDataType, BoolOperator, Sort } from '~api/generated/contacts/graphql';
import { EMPTY_FILTER, type AttrPredicate, type ContactsFilter } from './contactsFilter';
import {
  MAX_PREDICATES,
  filterLevelIssues,
  hasErrors,
  isInstantValue,
  issuesFor,
  predicateCount,
  summarizeIssues,
  validateFilter,
  type CatalogFacts,
} from './filterValidation';

const predicate = (over: Partial<AttrPredicate> = {}): AttrPredicate => ({
  id: 'p1',
  name: 'city',
  operator: AttrFilterDefaultOperator.Is,
  values: ['Berlin'],
  ...over,
});

const withGroup = (predicates: AttrPredicate[]): ContactsFilter => ({
  ...EMPTY_FILTER,
  groups: [{ id: 'g1', operator: BoolOperator.And, predicates }],
});

const facts = (over: Partial<CatalogFacts> = {}): CatalogFacts => ({
  ready: true,
  has: (name) => name === 'city' || name === 'last seen' || name === 'deal currency',
  dataTypeOf: (name) => (name === 'last seen' ? AttributeDataType.Datetime : AttributeDataType.String),
  defaultValueOf: (name) => (name === 'deal currency' ? 'EUR' : null),
  ...over,
});

describe('a row that is not on the wire says so', () => {
  it('flags a nameless condition as an error', () => {
    const issues = validateFilter(withGroup([predicate({ name: '  ' })]), facts());
    expect(issues).toHaveLength(1);
    expect(issues[0].level).toBe('error');
    expect(issues[0].message).toContain('not being applied');
    expect(hasErrors(issues)).toBe(true);
  });

  it('stops at the missing name rather than piling on', () => {
    const issues = validateFilter(withGroup([predicate({ name: '', values: [] })]), facts());
    expect(issues).toHaveLength(1);
  });

  it('flags a missing value where the operator needs one', () => {
    const issues = validateFilter(withGroup([predicate({ values: ['  '] })]), facts());
    expect(issues.map((issue) => issue.level)).toEqual(['error']);
    expect(issues[0].message).toContain('“city” needs a value');
  });

  it('does not ask a nullary operator for a value', () => {
    const filter = withGroup([predicate({ operator: AttrFilterDefaultOperator.IsEmpty, values: [] })]);
    expect(validateFilter(filter, facts())).toEqual([]);
  });
});

describe('answers that will surprise you', () => {
  it('warns that an unknown field matches nobody', () => {
    const issues = validateFilter(withGroup([predicate({ name: 'favourite colour' })]), facts());
    expect(issues).toHaveLength(1);
    expect(issues[0].level).toBe('warning');
    expect(issues[0].message).toContain('matches nobody');
  });

  it('says nothing about an unknown field while the catalog is still loading', () => {
    const issues = validateFilter(
      withGroup([predicate({ name: 'favourite colour' })]),
      facts({ ready: false, has: () => false }),
    );
    expect(issues).toEqual([]);
  });

  it('warns that a bot-wide default makes “is empty” match nobody', () => {
    const filter = withGroup([
      predicate({ name: 'deal currency', operator: AttrFilterDefaultOperator.IsEmpty, values: [] }),
    ]);
    const issues = validateFilter(filter, facts());
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('matches nobody');
    expect(issues[0].message).toContain('EUR');
  });

  it('warns that the same default makes “is not empty” match everyone', () => {
    const filter = withGroup([
      predicate({
        name: 'deal currency',
        operator: AttrFilterDefaultOperator.IsNotEmpty,
        values: [],
      }),
    ]);
    expect(validateFilter(filter, facts())[0].message).toContain('matches everyone');
  });

  it('leaves a field without a default alone', () => {
    const filter = withGroup([predicate({ operator: AttrFilterDefaultOperator.IsNotEmpty, values: [] })]);
    expect(validateFilter(filter, facts())).toEqual([]);
  });

  it('warns when a datetime field is given something that is not a date', () => {
    const filter = withGroup([
      predicate({ name: 'last seen', operator: AttrFilterDefaultOperator.Gt, values: ['soon'] }),
    ]);
    const issues = validateFilter(filter, facts());
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('not a date');
  });

  it('accepts both wire forms of a date', () => {
    expect(isInstantValue('1720456863000')).toBe(true);
    expect(isInstantValue('2026-08-18T10:00:00.000Z')).toBe(true);
    expect(isInstantValue('later')).toBe(false);
    expect(isInstantValue('   ')).toBe(false);
    const filter = withGroup([
      predicate({
        name: 'last seen',
        operator: AttrFilterDefaultOperator.Gt,
        values: ['1720456863000'],
      }),
    ]);
    expect(validateFilter(filter, facts())).toEqual([]);
  });
});

describe('the filter as a whole', () => {
  it('counts every row on screen, half-typed ones included', () => {
    const filter = withGroup([predicate(), predicate({ id: 'p2', name: '' })]);
    expect(predicateCount(filter)).toBe(2);
  });

  it('refuses more conditions than it sends', () => {
    const many = Array.from({ length: MAX_PREDICATES + 2 }, (_, index) => predicate({ id: `p${index}` }));
    const issues = filterLevelIssues(validateFilter(withGroup(many), facts()));
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('too-many');
    expect(issues[0].message).toContain('Remove 2');
  });

  it('is happy at exactly the cap', () => {
    const many = Array.from({ length: MAX_PREDICATES }, (_, index) => predicate({ id: `p${index}` }));
    expect(filterLevelIssues(validateFilter(withGroup(many), facts()))).toEqual([]);
  });

  it('catches a window that ends before it starts', () => {
    const filter: ContactsFilter = {
      ...EMPTY_FILTER,
      since: '2026-08-18T00:00:00.000Z',
      until: '2026-08-11T00:00:00.000Z',
      sort: { name: 'last seen', direction: Sort.Desc },
    };
    expect(filterLevelIssues(validateFilter(filter, facts())).map((i) => i.id)).toEqual(['window-order']);
  });
});

describe('the window the live engine cannot take', () => {
  it('warns when a window is the only thing narrowing the list', () => {
    const filter: ContactsFilter = { ...EMPTY_FILTER, since: '2026-08-11T00:00:00.000Z' };
    expect(filterLevelIssues(validateFilter(filter, facts())).map((i) => i.id)).toEqual(['window-ignored']);
  });

  it('stays quiet once a sort puts the list on the snapshot engine', () => {
    const filter: ContactsFilter = {
      ...EMPTY_FILTER,
      since: '2026-08-11T00:00:00.000Z',
      sort: { name: 'last seen', direction: Sort.Desc },
    };
    expect(filterLevelIssues(validateFilter(filter, facts()))).toEqual([]);
  });

  it('stays quiet once a field condition puts the list on the snapshot engine', () => {
    const filter: ContactsFilter = {
      ...withGroup([predicate()]),
      since: '2026-08-11T00:00:00.000Z',
    };
    expect(filterLevelIssues(validateFilter(filter, facts()))).toEqual([]);
  });

  it('says nothing at all about an empty filter', () => {
    expect(validateFilter(EMPTY_FILTER, facts())).toEqual([]);
    expect(summarizeIssues([])).toBeNull();
  });
});

describe('reading the issues back', () => {
  it('finds the ones belonging to a row', () => {
    const filter = withGroup([predicate({ values: [''] }), predicate({ id: 'p2', name: '' })]);
    const issues = validateFilter(filter, facts());
    expect(issuesFor(issues, 'g1', 'p1')).toHaveLength(1);
    expect(issuesFor(issues, 'g1', 'p2')).toHaveLength(1);
    expect(issuesFor(issues, 'g1', 'nope')).toHaveLength(0);
  });

  it('summarises both levels separately', () => {
    const filter = withGroup([predicate({ values: [''] }), predicate({ id: 'p2', name: 'favourite colour' })]);
    expect(summarizeIssues(validateFilter(filter, facts()))).toBe('1 not applied · 1 to check');
  });

  it('gives every issue a distinct key', () => {
    const filter = withGroup([
      predicate({ name: 'deal currency', operator: AttrFilterDefaultOperator.IsEmpty, values: [] }),
      predicate({ id: 'p2', name: '' }),
    ]);
    const ids = validateFilter(filter, facts()).map((issue) => issue.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
