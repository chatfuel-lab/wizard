import { describe, expect, it } from 'vitest';
import { AttrFilterDefaultOperator, BoolOperator } from '~api/generated/broadcasts/graphql';
import { EMPTY_AUDIENCE, type AttrPredicate, type AudienceFilter } from './audienceFilter';
import {
  MAX_GROUPS,
  MAX_PREDICATES,
  filterLevelIssues,
  hasErrors,
  issuesFor,
  validateAudience,
} from './audienceValidation';

const predicate = (over: Partial<AttrPredicate> = {}): AttrPredicate => ({
  id: 'p1',
  name: 'city',
  operator: AttrFilterDefaultOperator.Is,
  values: ['Berlin'],
  ...over,
});

const withGroup = (predicates: AttrPredicate[]): AudienceFilter => ({
  ...EMPTY_AUDIENCE,
  groups: [{ id: 'g1', operator: BoolOperator.And, predicates }],
});

describe('validateAudience', () => {
  it('has nothing to say about a complete filter, or about everyone', () => {
    expect(validateAudience(EMPTY_AUDIENCE)).toEqual([]);
    expect(validateAudience(withGroup([predicate()]))).toEqual([]);
    expect(
      validateAudience(withGroup([predicate({ operator: AttrFilterDefaultOperator.IsEmpty, values: [] })])),
    ).toEqual([]);
  });

  it('names the row with no field, and says nothing else about it', () => {
    const issues = validateAudience(withGroup([predicate({ name: '', values: [] })]));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ level: 'error', groupId: 'g1', predicateId: 'p1', message: 'Pick a field' });
  });

  it('names the row with no value on an operator that wants one', () => {
    const issues = validateAudience(withGroup([predicate({ values: ['', ' '] })]));
    expect(issues.map((issue) => issue.message)).toEqual(['Add a value']);
    expect(hasErrors(issues)).toBe(true);
  });

  it('names the row with a value on an operator that takes none', () => {
    const issues = validateAudience(withGroup([predicate({ operator: AttrFilterDefaultOperator.IsNotEmpty })]));
    expect(issues.map((issue) => [issue.level, issue.message])).toEqual([['error', 'This operator takes no value']]);
  });

  it('marks a range row approximate as a note, not an error', () => {
    const issues = validateAudience(
      withGroup([predicate({ operator: AttrFilterDefaultOperator.Gt, values: ['500'] })]),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].level).toBe('note');
    expect(hasErrors(issues)).toBe(false);
    expect(issuesFor(issues, 'g1', 'p1')).toEqual(issues);
  });

  it('stops at the condition ceiling, as one issue about the whole filter', () => {
    const predicates = Array.from({ length: MAX_PREDICATES + 2 }, (_, index) => predicate({ id: `p${index + 1}` }));
    const issues = validateAudience(withGroup(predicates));
    expect(filterLevelIssues(issues)).toHaveLength(1);
    expect(filterLevelIssues(issues)[0].message).toMatch(/^Remove 2 conditions/);
    expect(hasErrors(issues)).toBe(true);
    expect(validateAudience(withGroup(predicates.slice(0, MAX_PREDICATES)))).toEqual([]);
  });

  it('stops at the group ceiling', () => {
    const groups = Array.from({ length: MAX_GROUPS + 1 }, (_, index) => ({
      id: `g${index + 1}`,
      operator: BoolOperator.And,
      predicates: [predicate()],
    }));
    const issues = validateAudience({ ...EMPTY_AUDIENCE, groups });
    expect(filterLevelIssues(issues).map((issue) => issue.message)).toEqual([
      `Remove 1 group — ${MAX_GROUPS} is the most one audience takes`,
    ]);
  });

  it('keeps each issue on its own row', () => {
    const issues = validateAudience(
      withGroup([predicate({ id: 'p1', name: '' }), predicate({ id: 'p2', values: [] }), predicate({ id: 'p3' })]),
    );
    expect(issuesFor(issues, 'g1', 'p1').map((issue) => issue.message)).toEqual(['Pick a field']);
    expect(issuesFor(issues, 'g1', 'p2').map((issue) => issue.message)).toEqual(['Add a value']);
    expect(issuesFor(issues, 'g1', 'p3')).toEqual([]);
    expect(new Set(issues.map((issue) => issue.id)).size).toBe(issues.length);
  });
});
