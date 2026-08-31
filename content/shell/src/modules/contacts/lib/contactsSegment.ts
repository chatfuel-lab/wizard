/**
 * Filter groups → the `SegmentInput` the segment engine takes.
 *
 * Three facts shape every line here:
 *
 * 1. **Ids must be UUIDs.** `SegmentID` and `FilterID` are documented as "UUID
 *    string" and enforced: `id: 'contacts-inline'` or `id: 'p1'` fails the
 *    whole query with a generic API error that names no field. Ids are
 *    therefore derived through `stableUuid` from the model's own keys — stable
 *    across renders (so an unchanged filter is a byte-identical variables
 *    object) and valid.
 * 2. **`dateStrategy` does not work.** Every form of it — on `signed up`, on
 *    `last seen`, on `blocked date`, with GT and with IS_NOT_EMPTY — fails.
 *    Date predicates go through `defaultStrategy` like everything else, which
 *    accepts both a millisecond timestamp string and an RFC-3339 string and
 *    answers identically for both. The module's canonical wire form is the
 *    millisecond string (`lib/attributeValue.ts`), so that is what is sent.
 * 3. **An attribute filter carries exactly one strategy.** Both → error, none
 *    → error.
 *
 * `byTag` and `byStoredSegment` are in the SDL and both fail live, so this
 * file cannot build them and the UI does not offer them.
 */
import { stableUuid } from '~api';
import { BoolOperator, type FilterInput, type SegmentInput } from '~api/generated/contacts/graphql';
import { isNullary, usableGroups, type AttrPredicate, type ContactsFilter, type FilterGroup } from './contactsFilter';

/**
 * The scope every id in a segment is derived under. It is part of the key so
 * that two different segments built in the same session (the list's and an
 * export's) never collide on a `FilterID`.
 */
const SCOPE = 'chatfuel.contacts.segment';

const segmentId = (key: string): string => stableUuid(`${SCOPE}/segment/${key}`);
const filterId = (key: string): string => stableUuid(`${SCOPE}/filter/${key}`);

/** What actually goes on the wire: blanks dropped, nullary operators send none. */
export function comparableValues(predicate: AttrPredicate): string[] {
  if (isNullary(predicate.operator)) return [];
  return predicate.values.map((value) => value.trim()).filter((value) => value !== '');
}

export function toFilterInput(groupId: string, predicate: AttrPredicate): FilterInput {
  return {
    id: filterId(`${groupId}/${predicate.id}`),
    byAttribute: {
      name: predicate.name.trim(),
      defaultStrategy: {
        operator: predicate.operator,
        comparableValues: comparableValues(predicate),
      },
    },
  };
}

function groupToSegment(group: FilterGroup): SegmentInput {
  return {
    id: segmentId(group.id),
    name: `Group ${group.id}`,
    resultOperator: group.operator,
    filters: group.predicates.map((predicate) => toFilterInput(group.id, predicate)),
  };
}

/**
 * The segment, or null when there is nothing to say. `segment: null` means
 * every contact, which is exactly what an empty builder should mean.
 *
 * One group flattens: a single group is the outer segment itself rather than a
 * segment wrapping a segment. Two or more nest, one level, through
 * `byInFlightSegment` — in practice, and depth 3 works too if a future
 * builder ever wants it.
 */
export function buildSegment(filter: ContactsFilter): SegmentInput | null {
  const groups = usableGroups(filter);
  if (groups.length === 0) return null;

  if (groups.length === 1) {
    const [group] = groups;
    return { ...groupToSegment(group), name: 'Contacts filter' };
  }

  return {
    id: segmentId('root'),
    name: 'Contacts filter',
    resultOperator: filter.groupOperator,
    filters: groups.map((group) => ({
      id: filterId(`group/${group.id}`),
      byInFlightSegment: groupToSegment(group),
    })),
  };
}

/**
 * A segment for one explicit predicate list, used by the audience tiles and
 * the fields surface where there is no filter model around.
 */
export function segmentFor(
  key: string,
  predicates: readonly AttrPredicate[],
  operator = BoolOperator.And,
): SegmentInput | null {
  if (predicates.length === 0) return null;
  return {
    id: segmentId(key),
    name: key,
    resultOperator: operator,
    filters: predicates.map((predicate) => toFilterInput(key, predicate)),
  };
}

/**
 * Editor text → the value list. Multi-valued operators split on commas, which
 * is how a single predicate says OR.
 */
export function parseValues(input: string, single: boolean): string[] {
  if (single) {
    const trimmed = input.trim();
    return trimmed === '' ? [] : [trimmed];
  }
  return input
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '');
}

export const formatValues = (values: readonly string[]): string => values.join(', ');
