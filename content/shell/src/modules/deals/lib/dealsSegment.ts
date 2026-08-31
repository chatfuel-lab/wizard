/**
 * Attribute predicates → the `SegmentInput` engine C takes.
 *
 * `SegmentInput` is the only way this API expresses "contacts whose «deal
 * amount» is greater than 1000", and it is deliberately kept in its own file:
 * `queryPlan.ts` decides *whether* to go there, this decides *what to send*.
 *
 * Two shape facts from the SDL that the whole file follows from:
 *
 * - A `FilterInput` carries exactly one predicate and needs an `id`, and that
 *   id has to be a UUID (see `stableUuid` in the API client — a non-UUID id
 *   fails the whole query). The ids here are DERIVED from the predicate's own id, so
 *   re-rendering with an unchanged filter produces a byte-identical variables
 *   object — an `id: crypto.randomUUID()` would make every render look like a
 *   new query and refetch forever.
 * - `AttrFilterInput` offers a `defaultStrategy` and a `dateStrategy`. Only the
 *   default one is used, because it is the only one whose semantics are known
 *   without a live probe: it ORs the string / int / float / date
 *   interpretations of the value and counts the condition satisfied if any of
 *   them holds. `dateStrategy` takes an RFC3339 `Time`, while this module's
 *   canonical date form is a millisecond-timestamp *string*, and nothing in the
 *   SDL says how those two meet. That approximation is not hidden — it is a
 *   caveat the table prints (`queryPlan.ts`, id `range`).
 *
 * `resultOperator` is `AND`: predicates narrow. An OR builder would need a
 * grouping UI the filter model has no room for, and "amount > 1000 OR company
 * is Acme" is not a question a pipeline asks.
 */
import {
  AttrFilterDefaultOperator,
  BoolOperator,
  type FilterInput,
  type SegmentInput,
} from '~api/generated/deals/graphql';
import { stableUuid } from '~api';
import { isNullary, type AttrPredicate } from './dealsFilter';

/**
 * The in-flight segment's id. It is never stored server-side (`segment:` on
 * `contactsConnection` is an inline argument), but it MUST be a UUID: the
 * scalar is documented as "UUID string" and the API rejects
 * anything else with a generic error that names no field (in practice —
 * this file used to send the literal string below and engine C
 * never answered). `stableUuid` keeps it deterministic, which is what makes an
 * unchanged filter a byte-identical variables object.
 */
export const SEGMENT_ID = stableUuid('chatfuel.deals.segment/deals-table-inline');

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
  [AttrFilterDefaultOperator.Gt]: 'is greater than',
  [AttrFilterDefaultOperator.Lt]: 'is less than',
  [AttrFilterDefaultOperator.IsEmpty]: 'is empty',
  [AttrFilterDefaultOperator.IsNotEmpty]: 'is not empty',
};

/**
 * The operators whose result is approximate, because the server compares every
 * typed interpretation of the value at once.
 */
export const RANGE_OPERATORS: readonly AttrFilterDefaultOperator[] = [
  AttrFilterDefaultOperator.Gt,
  AttrFilterDefaultOperator.Lt,
];

export function isRangeOperator(operator: AttrFilterDefaultOperator): boolean {
  return RANGE_OPERATORS.includes(operator);
}

/** A comparison against one value; the rest accept a list. */
export function isSingleValued(operator: AttrFilterDefaultOperator): boolean {
  return isRangeOperator(operator) || operator === AttrFilterDefaultOperator.StartsWith;
}

/**
 * Editor text → the value list. Multi-valued operators split on commas, so
 * `Referral, Partner` is one predicate rather than two — which is the only way
 * to say OR at all, since `resultOperator` is AND.
 */
export function parseValues(input: string, operator: AttrFilterDefaultOperator): string[] {
  if (isNullary(operator)) return [];
  if (isSingleValued(operator)) {
    const single = input.trim();
    return single === '' ? [] : [single];
  }
  return input
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '');
}

/** The value list back as editor text. Round-trips with `parseValues`. */
export function formatValues(values: readonly string[]): string {
  return values.join(', ');
}

/** What actually goes on the wire: blanks dropped, nullary operators send none. */
export function comparableValues(predicate: AttrPredicate): string[] {
  if (isNullary(predicate.operator)) return [];
  return predicate.values.map((value) => value.trim()).filter((value) => value !== '');
}

export function toFilterInput(predicate: AttrPredicate): FilterInput {
  return {
    id: stableUuid(`chatfuel.deals.segment/filter/${predicate.id}`),
    byAttribute: {
      name: predicate.name.trim(),
      defaultStrategy: {
        operator: predicate.operator,
        comparableValues: comparableValues(predicate),
      },
    },
  };
}

/**
 * The segment, or null when there is nothing to say — `contactsConnection`
 * takes `segment: null` and answers with every contact, which is what a
 * sort-only route would mean if `queryPlan` did not floor it.
 */
export function buildSegment(predicates: readonly AttrPredicate[]): SegmentInput | null {
  if (predicates.length === 0) return null;
  return {
    id: SEGMENT_ID,
    name: 'Deals table',
    resultOperator: BoolOperator.And,
    filters: predicates.map(toFilterInput),
  };
}

/**
 * The predicate a sort-only route is floored with: sorting by an attribute
 * nobody has is a page of blanks, and `orderBy` cannot exclude them itself.
 */
export function sortFloorPredicate(attribute: string): AttrPredicate {
  return {
    id: 'sort-floor',
    name: attribute,
    operator: AttrFilterDefaultOperator.IsNotEmpty,
    values: [],
  };
}
