/**
 * The audience model — what a campaign's segment is, said the way the
 * builder edits it — and the pure helpers over it.
 *
 * A copy of the contacts module's `lib/contactsFilter.ts` (modules do not
 * import each other) cut down to what a segment can hold: attribute
 * predicates in groups. No text search, no assignee, no stage, no channel,
 * no sort — none of those are a `SegmentInput`, and the audience of a
 * WhatsApp campaign is exactly a `SegmentInput` on the entry point.
 *
 * The shape is the API's: `SegmentInput` has one `resultOperator`, and the
 * second level comes from `FilterInput.byInFlightSegment`, which nests a
 * segment inside a filter slot. So a filter is groups joined by one operator,
 * each group predicates joined by another. Deeper nesting answers live but
 * asks no question two levels cannot, so the builder stops there.
 */
import { AttrFilterDefaultOperator, BoolOperator } from '~api/generated/broadcasts/graphql';
import { dayKeyInZone, zonedInstant } from './zone';

/**
 * One attribute predicate. `values` is empty for IS_EMPTY / IS_NOT_EMPTY —
 * `comparableValues` is a list those two operators refuse
 * (`attr_filter_comparable_values_not_allowed`).
 *
 * A multi-value list is an OR inside the predicate: two values on one
 * CONTAINS match what two CONTAINS predicates joined by OR match.
 */
export interface AttrPredicate {
  id: string;
  name: string;
  operator: AttrFilterDefaultOperator;
  values: string[];
}

export interface FilterGroup {
  id: string;
  operator: BoolOperator;
  predicates: AttrPredicate[];
}

export interface AudienceFilter {
  groupOperator: BoolOperator;
  groups: FilterGroup[];
}

/** Every WhatsApp contact: no groups at all. */
export const EMPTY_AUDIENCE: AudienceFilter = {
  groupOperator: BoolOperator.And,
  groups: [],
};

// ---------------------------------------------------------------------------
// Operators
// ---------------------------------------------------------------------------

/** Every operator, in the order the editor offers them. */
export const OPERATORS: readonly AttrFilterDefaultOperator[] = [
  AttrFilterDefaultOperator.Is,
  AttrFilterDefaultOperator.IsNot,
  AttrFilterDefaultOperator.Contains,
  AttrFilterDefaultOperator.StartsWith,
  AttrFilterDefaultOperator.Gt,
  AttrFilterDefaultOperator.Lt,
  AttrFilterDefaultOperator.IsEmpty,
  AttrFilterDefaultOperator.IsNotEmpty,
];

export const OPERATOR_LABELS: Record<AttrFilterDefaultOperator, string> = {
  [AttrFilterDefaultOperator.Is]: 'is',
  [AttrFilterDefaultOperator.IsNot]: 'is not',
  [AttrFilterDefaultOperator.Contains]: 'contains',
  [AttrFilterDefaultOperator.StartsWith]: 'starts with',
  [AttrFilterDefaultOperator.Gt]: 'is after / greater than',
  [AttrFilterDefaultOperator.Lt]: 'is before / less than',
  [AttrFilterDefaultOperator.IsEmpty]: 'is empty',
  [AttrFilterDefaultOperator.IsNotEmpty]: 'is not empty',
};

export const GROUP_OPERATOR_LABELS: Record<BoolOperator, string> = {
  [BoolOperator.And]: 'and',
  [BoolOperator.Or]: 'or',
};

/** Takes no value at all. */
export function isNullary(operator: AttrFilterDefaultOperator): boolean {
  return operator === AttrFilterDefaultOperator.IsEmpty || operator === AttrFilterDefaultOperator.IsNotEmpty;
}

/**
 * Compares against one value; the rest accept a list. GT/LT are ranges and
 * STARTS_WITH has no sensible list form.
 */
export function isSingleValued(operator: AttrFilterDefaultOperator): boolean {
  return (
    operator === AttrFilterDefaultOperator.Gt ||
    operator === AttrFilterDefaultOperator.Lt ||
    operator === AttrFilterDefaultOperator.StartsWith
  );
}

/**
 * The operators whose answer is approximate, because the server compares
 * every typed reading of the value at once (the SDL's own example: "001717…"
 * satisfies `starts_with "00"` and `greater_than "500"` simultaneously).
 */
export function isRangeOperator(operator: AttrFilterDefaultOperator): boolean {
  return operator === AttrFilterDefaultOperator.Gt || operator === AttrFilterDefaultOperator.Lt;
}

// ---------------------------------------------------------------------------
// Reading the model
// ---------------------------------------------------------------------------

/** A predicate the server can actually be asked about. */
export function isUsablePredicate(predicate: AttrPredicate): boolean {
  if (predicate.name.trim() === '') return false;
  if (isNullary(predicate.operator)) return true;
  return predicate.values.some((value) => value.trim() !== '');
}

/** The groups reduced to what is worth sending: empty groups disappear. */
export function usableGroups(filter: AudienceFilter): FilterGroup[] {
  return filter.groups
    .map((group) => ({ ...group, predicates: group.predicates.filter(isUsablePredicate) }))
    .filter((group) => group.predicates.length > 0);
}

export const hasPredicates = (filter: AudienceFilter): boolean => usableGroups(filter).length > 0;

/** Every predicate on screen, including the half-typed ones. */
export function predicateCount(filter: AudienceFilter): number {
  return filter.groups.reduce((total, group) => total + group.predicates.length, 0);
}

// ---------------------------------------------------------------------------
// Editing the model — pure, so the builder has no logic in it
// ---------------------------------------------------------------------------

/**
 * The smallest unused `g<n>` / `p<n>`. Deterministic on purpose: ids feed
 * `stableUuid`, and a random one would make every render a new `FilterID`,
 * i.e. a new variables object, i.e. a new write and a new count.
 */
function nextId(prefix: string, taken: readonly string[]): string {
  for (let n = 1; ; n += 1) {
    const candidate = `${prefix}${n}`;
    if (!taken.includes(candidate)) return candidate;
  }
}

export const newGroupId = (filter: AudienceFilter): string =>
  nextId(
    'g',
    filter.groups.map((group) => group.id),
  );

export const newPredicateId = (group: FilterGroup): string =>
  nextId(
    'p',
    group.predicates.map((predicate) => predicate.id),
  );

export function emptyPredicate(group: FilterGroup, name = ''): AttrPredicate {
  return { id: newPredicateId(group), name, operator: AttrFilterDefaultOperator.Is, values: [''] };
}

export function addGroup(filter: AudienceFilter, name = ''): AudienceFilter {
  const group: FilterGroup = { id: newGroupId(filter), operator: BoolOperator.And, predicates: [] };
  return { ...filter, groups: [...filter.groups, { ...group, predicates: [emptyPredicate(group, name)] }] };
}

export function updateGroup(filter: AudienceFilter, groupId: string, patch: Partial<FilterGroup>): AudienceFilter {
  return {
    ...filter,
    groups: filter.groups.map((group) => (group.id === groupId ? { ...group, ...patch } : group)),
  };
}

export function removeGroup(filter: AudienceFilter, groupId: string): AudienceFilter {
  return { ...filter, groups: filter.groups.filter((group) => group.id !== groupId) };
}

export function addPredicate(filter: AudienceFilter, groupId: string, name = ''): AudienceFilter {
  return {
    ...filter,
    groups: filter.groups.map((group) =>
      group.id === groupId ? { ...group, predicates: [...group.predicates, emptyPredicate(group, name)] } : group,
    ),
  };
}

export function updatePredicate(
  filter: AudienceFilter,
  groupId: string,
  predicateId: string,
  patch: Partial<AttrPredicate>,
): AudienceFilter {
  return {
    ...filter,
    groups: filter.groups.map((group) =>
      group.id !== groupId
        ? group
        : {
            ...group,
            predicates: group.predicates.map((predicate) =>
              predicate.id === predicateId ? { ...predicate, ...patch } : predicate,
            ),
          },
    ),
  };
}

/** Removing the last predicate removes the group with it — an empty box is noise. */
export function removePredicate(filter: AudienceFilter, groupId: string, predicateId: string): AudienceFilter {
  return {
    ...filter,
    groups: filter.groups
      .map((group) =>
        group.id !== groupId
          ? group
          : { ...group, predicates: group.predicates.filter((predicate) => predicate.id !== predicateId) },
      )
      .filter((group) => group.predicates.length > 0),
  };
}

// ---------------------------------------------------------------------------
// The date editor's two value forms
// ---------------------------------------------------------------------------

/**
 * A predicate value as a `YYYY-MM-DD` for `DateField`, in the zone the
 * campaign is shown in.
 *
 * A stored value is either a millisecond stamp — the wire form
 * `lib/audienceSegment.ts` sends, because `dateStrategy` fails live and
 * `defaultStrategy` is all there is — or an RFC-3339 string a segment written
 * elsewhere carried. Both read; anything else reads as empty rather than as
 * `NaN-NaN-NaN`.
 */
export function dateValueToInput(value: string, zone: string): string {
  const trimmed = value.trim();
  if (trimmed === '') return '';
  const at = /^\d+$/.test(trimmed) ? Number(trimmed) : Date.parse(trimmed);
  if (!Number.isFinite(at)) return '';
  return dayKeyInZone(at, zone);
}

/** `YYYY-MM-DD` at the zone's midnight, back to the millisecond string the segment sends. */
export function dateInputToValue(input: string | null, zone: string): string {
  if (input === null || input.trim() === '') return '';
  const at = zonedInstant(input.trim(), 0, zone);
  return Number.isFinite(at) ? String(at) : '';
}
