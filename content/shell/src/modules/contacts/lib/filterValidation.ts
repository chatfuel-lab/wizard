/**
 * What is wrong with a filter, said in words that name the row.
 *
 * This file exists because of one API fact: an invalid `SegmentInput` comes
 * back as a generic error and nothing else. No path,
 * no field, no index — the response cannot tell anyone which of twelve
 * conditions was the bad one. Client-side is therefore not a nicety here, it is
 * the ONLY place a person can be told what to fix.
 *
 * Two levels, and the difference is load-bearing:
 *
 * - **error** — the condition is not on the wire. `usableGroups` already drops
 *   a nameless or valueless predicate before `buildSegment` sees it, so the
 *   query is safe; what is NOT safe is letting someone believe a row they
 *   typed is narrowing the list. Every error here says "not being applied".
 * - **warning** — the query runs and answers, and the answer will surprise you.
 *   An unknown attribute name matches nobody in silence (in practice); a
 *   bot-wide default makes `is empty` match nobody for the same reason; a
 *   last-message window is dropped on the engine that has no time argument.
 *
 * Everything is pure and takes the catalog as facts rather than as a hook, so
 * every sentence the UI can print is a unit test.
 */
import { AttrFilterDefaultOperator, AttributeDataType } from '~api/generated/contacts/graphql';
import {
  isNullary,
  isRangeOperator,
  usesChatOnlyFilters,
  usesSegmentOnlyFilters,
  type AttrPredicate,
  type ContactsFilter,
} from './contactsFilter';

/**
 * The ceiling the builder enforces. Not a documented API limit — the API
 * documents none — but a segment past this size is one nobody can read, and it
 * is also where a generic API error stops being diagnosable at all.
 */
export const MAX_PREDICATES = 20;

/** How many groups are worth offering. Two levels is all the API nests to. */
export const MAX_GROUPS = 10;

/**
 * Printed beside a greater/less row. The SDL's own example is the argument:
 * "001717…" satisfies `starts_with "00"` and `greater_than "500"` at the same
 * time, because the server compares every typed reading of the value at once.
 */
export const RANGE_NOTE =
  'Approximate: the server compares this value as text, number and date at once and keeps the row if any reading matches.';

export type IssueLevel = 'error' | 'warning';

export interface FilterIssue {
  /** Stable within one validation pass — safe as a React key. */
  id: string;
  level: IssueLevel;
  /** The row it points at, or null when it is about the filter as a whole. */
  groupId: string | null;
  predicateId: string | null;
  message: string;
}

/**
 * What the catalog knows, as three lookups.
 *
 * `ready` matters: while the catalog is still loading every name looks unknown,
 * and a filter bar that shouts "no field called city" for half a second is
 * worse than one that waits.
 */
export interface CatalogFacts {
  ready: boolean;
  has: (name: string) => boolean;
  dataTypeOf: (name: string) => AttributeDataType | undefined;
  /** The bot-wide default, or null. */
  defaultValueOf: (name: string) => string | null;
}

const NO_FACTS: CatalogFacts = {
  ready: false,
  has: () => true,
  dataTypeOf: () => undefined,
  defaultValueOf: () => null,
};

/** Every predicate on screen, including the half-typed ones. */
export function predicateCount(filter: ContactsFilter): number {
  return filter.groups.reduce((total, group) => total + group.predicates.length, 0);
}

const hasValue = (predicate: AttrPredicate): boolean => predicate.values.some((value) => value.trim() !== '');

/**
 * A value the datetime path can actually send. `lib/attributeValue.ts` makes
 * the wire form a millisecond string; an RFC-3339 string answers identically
 * (in practice), and anything else is not a date at all.
 */
export function isInstantValue(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === '') return false;
  if (/^\d+$/.test(trimmed)) return true;
  return Number.isFinite(Date.parse(trimmed));
}

function predicateIssues(groupId: string, predicate: AttrPredicate, facts: CatalogFacts): FilterIssue[] {
  const issues: FilterIssue[] = [];
  const at = { groupId, predicateId: predicate.id };
  const key = `${groupId}/${predicate.id}`;
  const name = predicate.name.trim();

  if (name === '') {
    issues.push({
      id: `${key}/name`,
      level: 'error',
      ...at,
      message: 'Pick a field — this condition is not being applied.',
    });
    return issues;
  }

  if (!isNullary(predicate.operator) && !hasValue(predicate)) {
    issues.push({
      id: `${key}/value`,
      level: 'error',
      ...at,
      message: `“${name}” needs a value — this condition is not being applied.`,
    });
  }

  if (facts.ready && !facts.has(name)) {
    issues.push({
      id: `${key}/unknown`,
      level: 'warning',
      ...at,
      message: `This bot has no field called “${name}” yet. The API answers an unknown name with no match at all, so this condition matches nobody until something writes it.`,
    });
  }

  const fallback = facts.defaultValueOf(name);
  if (fallback !== null && fallback !== '') {
    if (predicate.operator === AttrFilterDefaultOperator.IsEmpty) {
      issues.push({
        id: `${key}/default-empty`,
        level: 'warning',
        ...at,
        message: `“${name}” has a bot-wide default of “${fallback}”, so every contact reads it as filled — “is empty” matches nobody.`,
      });
    }
    if (predicate.operator === AttrFilterDefaultOperator.IsNotEmpty) {
      issues.push({
        id: `${key}/default-filled`,
        level: 'warning',
        ...at,
        message: `“${name}” has a bot-wide default of “${fallback}”, so every contact reads it as filled — “is not empty” matches everyone.`,
      });
    }
  }

  if (facts.dataTypeOf(name) === AttributeDataType.Datetime) {
    for (const value of predicate.values) {
      if (value.trim() !== '' && !isInstantValue(value)) {
        issues.push({
          id: `${key}/date/${value}`,
          level: 'warning',
          ...at,
          message: `“${value}” is not a date the API can read. Pick one from the calendar so it goes out as a timestamp.`,
        });
      }
    }
  }

  return issues;
}

export function validateFilter(filter: ContactsFilter, facts: CatalogFacts = NO_FACTS): FilterIssue[] {
  const issues: FilterIssue[] = [];

  for (const group of filter.groups) {
    for (const predicate of group.predicates) {
      issues.push(...predicateIssues(group.id, predicate, facts));
    }
  }

  const total = predicateCount(filter);
  if (total > MAX_PREDICATES) {
    issues.push({
      id: 'too-many',
      level: 'error',
      groupId: null,
      predicateId: null,
      message: `${total} conditions is more than this builder sends. Remove ${total - MAX_PREDICATES} — past about ${MAX_PREDICATES} the server's only answer to a bad segment is a generic error that names no field.`,
    });
  }

  if (filter.since !== null && filter.until !== null && Date.parse(filter.since) > Date.parse(filter.until)) {
    issues.push({
      id: 'window-order',
      level: 'error',
      groupId: null,
      predicateId: null,
      message: 'The last-message window ends before it starts, so it matches nobody.',
    });
  }

  /* The routing rule, restated from `lib/queryPlan.ts` rather than imported
     through `planQuery` (which wants columns and a catalog this file has no
     business knowing): a filter that asks ONLY for conversation state runs on
     `contactChatsConnection`, and that connection takes no time argument and
     no client-side window is applied to it either. So the window silently does
     nothing in exactly that case, and this is the only place that says so. */
  if (
    (filter.since !== null || filter.until !== null) &&
    usesChatOnlyFilters(filter) &&
    !usesSegmentOnlyFilters(filter)
  ) {
    issues.push({
      id: 'window-ignored',
      level: 'warning',
      groupId: null,
      predicateId: null,
      message:
        'The last-message window is not narrowing this list. With only conversation filters on, the list runs on the live engine, which has no time argument — add a field condition or a sort and the window applies.',
    });
  }

  return issues;
}

export const hasErrors = (issues: readonly FilterIssue[]): boolean => issues.some((issue) => issue.level === 'error');

/** The issues attached to one row. */
export function issuesFor(issues: readonly FilterIssue[], groupId: string, predicateId: string): FilterIssue[] {
  return issues.filter((issue) => issue.groupId === groupId && issue.predicateId === predicateId);
}

/** The issues about the filter as a whole. */
export const filterLevelIssues = (issues: readonly FilterIssue[]): FilterIssue[] =>
  issues.filter((issue) => issue.groupId === null);

/** The pill's one line, or null when there is nothing to say. */
export function summarizeIssues(issues: readonly FilterIssue[]): string | null {
  const errors = issues.filter((issue) => issue.level === 'error').length;
  const warnings = issues.length - errors;
  if (errors === 0 && warnings === 0) return null;
  const parts: string[] = [];
  if (errors > 0) parts.push(`${errors} not applied`);
  if (warnings > 0) parts.push(`${warnings} to check`);
  return parts.join(' · ');
}

/** True when this row should carry the approximate badge. */
export const isApproximate = (predicate: AttrPredicate): boolean => isRangeOperator(predicate.operator);
