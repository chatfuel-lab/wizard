/**
 * What is wrong with an audience filter, said in words that name the row.
 *
 * A copy of the contacts module's `lib/filterValidation.ts` (modules do not
 * import each other) trimmed to the builder's shape. It exists because of
 * one API fact: an invalid `SegmentInput` comes back as a generic error and
 * nothing else — no path, no field, no index. Client-side is therefore the
 * only place a person can be told which row to fix.
 *
 * Three levels, and the difference is load-bearing:
 *
 * - **error** — the row is not on the wire. `usableGroups` drops a nameless
 *   or valueless predicate before `buildSegment` sees it, so the segment sent
 *   is always valid; what is NOT safe is letting someone believe a row they
 *   typed is narrowing the audience. The hook writes and counts only while no
 *   error stands, so the figure on screen never describes a half-built row.
 * - **warning** — the segment goes out and the answer will surprise you.
 * - **note** — a fact about the row rather than a fault. The one note here is
 *   the range operators' approximation: the server compares every typed
 *   reading of the value at once (its own example: "001717…" satisfies
 *   `starts_with "00"` and `greater_than "500"` together). The builder draws a
 *   note as a two-word tag, never as a sentence on screen.
 *
 * Everything is pure, so every sentence the builder can print is a unit test.
 */
import { isNullary, isRangeOperator, predicateCount, type AttrPredicate, type AudienceFilter } from './audienceFilter';

/**
 * The ceiling the builder enforces. Not a documented API limit — the API
 * documents none below `FILTERS_LIMIT` — but a segment past this size is one
 * nobody can read, and it is also where a generic API error stops being
 * diagnosable at all.
 */
export const MAX_PREDICATES = 20;

/** How many groups are worth offering. Two levels is all the API nests to. */
export const MAX_GROUPS = 10;

export type IssueLevel = 'error' | 'warning' | 'note';

export interface AudienceIssue {
  /** Stable within one validation pass — safe as a React key. */
  id: string;
  level: IssueLevel;
  /** The row it points at, or null when it is about the filter as a whole. */
  groupId: string | null;
  predicateId: string | null;
  message: string;
}

const hasValue = (predicate: AttrPredicate): boolean => predicate.values.some((value) => value.trim() !== '');

function predicateIssues(groupId: string, predicate: AttrPredicate): AudienceIssue[] {
  const issues: AudienceIssue[] = [];
  const at = { groupId, predicateId: predicate.id };
  const key = `${groupId}/${predicate.id}`;

  if (predicate.name.trim() === '') {
    issues.push({ id: `${key}/name`, level: 'error', ...at, message: 'Pick a field' });
    return issues;
  }

  if (isNullary(predicate.operator)) {
    if (hasValue(predicate)) {
      issues.push({ id: `${key}/value`, level: 'error', ...at, message: 'This operator takes no value' });
    }
  } else if (!hasValue(predicate)) {
    issues.push({ id: `${key}/value`, level: 'error', ...at, message: 'Add a value' });
  }

  if (isRangeOperator(predicate.operator)) {
    issues.push({ id: `${key}/range`, level: 'note', ...at, message: 'Approximate' });
  }

  return issues;
}

export function validateAudience(filter: AudienceFilter): AudienceIssue[] {
  const issues: AudienceIssue[] = [];

  for (const group of filter.groups) {
    for (const predicate of group.predicates) issues.push(...predicateIssues(group.id, predicate));
  }

  const total = predicateCount(filter);
  if (total > MAX_PREDICATES) {
    issues.push({
      id: 'too-many-conditions',
      level: 'error',
      groupId: null,
      predicateId: null,
      message: `Remove ${total - MAX_PREDICATES} ${total - MAX_PREDICATES === 1 ? 'condition' : 'conditions'} — ${MAX_PREDICATES} is the most one audience takes`,
    });
  }

  if (filter.groups.length > MAX_GROUPS) {
    issues.push({
      id: 'too-many-groups',
      level: 'error',
      groupId: null,
      predicateId: null,
      message: `Remove ${filter.groups.length - MAX_GROUPS} ${filter.groups.length - MAX_GROUPS === 1 ? 'group' : 'groups'} — ${MAX_GROUPS} is the most one audience takes`,
    });
  }

  return issues;
}

export const hasErrors = (issues: readonly AudienceIssue[]): boolean => issues.some((issue) => issue.level === 'error');

/** The issues attached to one row. */
export function issuesFor(issues: readonly AudienceIssue[], groupId: string, predicateId: string): AudienceIssue[] {
  return issues.filter((issue) => issue.groupId === groupId && issue.predicateId === predicateId);
}

/** The issues about the filter as a whole. */
export const filterLevelIssues = (issues: readonly AudienceIssue[]): AudienceIssue[] =>
  issues.filter((issue) => issue.groupId === null);
