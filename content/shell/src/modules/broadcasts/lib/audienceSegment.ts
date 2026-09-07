/**
 * The audience model ↔ the `SegmentInput` the entry point takes.
 *
 * A copy of the contacts module's `lib/contactsSegment.ts` (modules do not
 * import each other), with the read side that module never needed: a campaign
 * already HOLDS a segment, and the composer has to show it before it can
 * change it.
 *
 * Three facts shape the write side:
 *
 * 1. **Ids must be UUIDs.** `SegmentID` and `FilterID` are enforced: anything
 *    else fails the whole write with a generic error that names no field. Ids
 *    are derived through `stableUuid` from the model's own keys under a scope
 *    that names the campaign — stable across renders, so an unchanged builder
 *    is a byte-identical variables object, and distinct per campaign.
 * 2. **`dateStrategy` does not work.** Date predicates go through
 *    `defaultStrategy` as a millisecond-timestamp string like everything else.
 * 3. **An attribute filter carries exactly one strategy.**
 *
 * And one this module found: **"everyone" is `filters: []`**, not a null
 * segment. The entry point's segment is replaced wholesale, so the builder
 * with nothing in it is still a segment — with an id and no filters — and the
 * count with that segment equals the count with no segment at all.
 *
 * The read side is where the two shapes differ: the server hands back
 * `attribute { name }` where the input took `name`, and it can hold things
 * the builder has no row for — `byTag`, `byStoredSegment`, a `dateStrategy`,
 * all of which fail when SENT from here but were valid where they were
 * written. Those are kept verbatim as `passthrough` and re-sent as they were
 * read; whether the server takes them back from here was not observed. A
 * segment nested a third level down — deeper than the builder goes — is kept
 * whole the same way, so a re-save from here sends it back as it was.
 */
import { stableUuid } from '~api';
import { BoolOperator, type FilterInput, type SegmentInput } from '~api/generated/broadcasts/graphql';
import type { SegmentRead } from '../types';
import {
  EMPTY_AUDIENCE,
  isNullary,
  usableGroups,
  type AttrPredicate,
  type AudienceFilter,
  type FilterGroup,
} from './audienceFilter';

/** Every id in a campaign's segment is derived under a scope that names the campaign. */
const scopeOf = (flowId: string): string => `chatfuel.broadcasts.segment/${flowId}`;

const segmentId = (flowId: string, key: string): string => stableUuid(`${scopeOf(flowId)}/segment/${key}`);
const filterId = (flowId: string, key: string): string => stableUuid(`${scopeOf(flowId)}/filter/${key}`);

/** What actually goes on the wire: blanks dropped, nullary operators send none. */
export function comparableValues(predicate: AttrPredicate): string[] {
  if (isNullary(predicate.operator)) return [];
  return predicate.values.map((value) => value.trim()).filter((value) => value !== '');
}

export function toFilterInput(flowId: string, groupId: string, predicate: AttrPredicate): FilterInput {
  return {
    id: filterId(flowId, `${groupId}/${predicate.id}`),
    byAttribute: {
      name: predicate.name.trim(),
      defaultStrategy: {
        operator: predicate.operator,
        comparableValues: comparableValues(predicate),
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Passthrough — what the builder cannot say but must not lose
// ---------------------------------------------------------------------------

export interface PassthroughFilter {
  /** The server's own filter id — already a UUID, re-sent as it came. */
  id: string;
  /** The group it sat inside, or null for the segment's own filter list. */
  groupId: string | null;
  /** The filter exactly as it will be sent. */
  input: FilterInput;
  /** One line a person can read it as. */
  text: string;
}

type ReadFilter = SegmentRead['filters'][number];
type ReadInnerFilter = NonNullable<ReadFilter['byInFlightSegment']>['filters'][number];

const joinTexts = (texts: readonly string[], operator: BoolOperator): string =>
  texts.join(operator === BoolOperator.And ? ' and ' : ' or ');

const OPERATOR_WORDS: Record<string, string> = {
  IS: 'is',
  IS_NOT: 'is not',
  STARTS_WITH: 'starts with',
  CONTAINS: 'contains',
  LT: 'is before',
  GT: 'is after',
  IS_EMPTY: 'is empty',
  IS_NOT_EMPTY: 'is not empty',
};

type ReadDeepFilter = NonNullable<ReadInnerFilter['byInFlightSegment']>['filters'][number];

/** A read filter that the builder cannot show, as the input it will be re-sent as — or null when it cannot be re-sent at all. */
function toPassthrough(filter: ReadInnerFilter | ReadDeepFilter, groupId: string | null): PassthroughFilter | null {
  if ('byInFlightSegment' in filter && filter.byInFlightSegment) {
    // A third level: kept whole, its own operator and all.
    const inner = filter.byInFlightSegment;
    const kept = inner.filters.flatMap((deep) => toPassthrough(deep, groupId) ?? []);
    if (kept.length === 0) return null;
    return {
      id: filter.id,
      groupId,
      input: {
        id: filter.id,
        byInFlightSegment: {
          id: inner.id,
          name: inner.name ?? null,
          resultOperator: inner.resultOperator,
          filters: kept.map((entry) => entry.input),
        },
      },
      text:
        kept.length === 1
          ? kept[0].text
          : `(${joinTexts(
              kept.map((entry) => entry.text),
              inner.resultOperator,
            )})`,
    };
  }
  if (filter.byAttribute?.dateStrategy) {
    const { attribute, dateStrategy } = filter.byAttribute;
    // The input requires a date; a read with none cannot be sent back.
    if (dateStrategy.comparableDate === null || dateStrategy.comparableDate === undefined) return null;
    return {
      id: filter.id,
      groupId,
      input: {
        id: filter.id,
        byAttribute: {
          name: attribute.name,
          dateStrategy: { operator: dateStrategy.operator, comparableDate: dateStrategy.comparableDate },
        },
      },
      text: `${attribute.name} ${OPERATOR_WORDS[String(dateStrategy.operator)] ?? String(dateStrategy.operator).toLowerCase()} ${dateStrategy.comparableDate}`,
    };
  }
  if (filter.byTag) {
    const { operator, tagNames } = filter.byTag;
    return {
      id: filter.id,
      groupId,
      input: { id: filter.id, byTag: { operator, tagNames: [...tagNames] } },
      text: `tag ${OPERATOR_WORDS[String(operator)] ?? ''} ${tagNames.join(', ')}`.trim(),
    };
  }
  if (filter.byStoredSegment) {
    const { operator, segmentIDs } = filter.byStoredSegment;
    return {
      id: filter.id,
      groupId,
      input: { id: filter.id, byStoredSegment: { operator, segmentIDs: [...segmentIDs] } },
      text: `segment ${OPERATOR_WORDS[String(operator)] ?? ''} ${segmentIDs.join(', ')}`.trim(),
    };
  }
  return null;
}

/** The predicate a read filter is, or null when it is not one the builder has a row for. */
function toPredicate(filter: ReadInnerFilter, id: string): AttrPredicate | null {
  if (filter.byInFlightSegment) return null;
  const byAttribute = filter.byAttribute;
  if (!byAttribute?.defaultStrategy || byAttribute.dateStrategy) return null;
  const { operator, comparableValues: values } = byAttribute.defaultStrategy;
  return {
    id,
    name: byAttribute.attribute.name,
    operator,
    values: isNullary(operator) ? [] : [...values],
  };
}

// ---------------------------------------------------------------------------
// Read: what the server holds → what the builder edits
// ---------------------------------------------------------------------------

export interface SegmentReadResult {
  filter: AudienceFilter;
  passthrough: PassthroughFilter[];
}

/**
 * A stored segment as the builder edits it.
 *
 * The outer segment's own attribute filters become one group; each nested
 * segment becomes a group of its own. When the outer segment holds only its
 * own filters there is one group and both operators are the outer one, so a
 * flat `a OR tag` re-sends as `a OR tag` whether or not the builder can show
 * the tag. Mixed — own filters beside nested segments — reads as the own
 * filters in a group of their own alongside the nested groups, joined by the
 * outer operator, which says the same thing.
 *
 * A nested segment with no row the builder can show is kept whole, as one
 * passthrough carrying the nested segment, so its inner operator survives.
 *
 * Group and predicate ids are the builder's own `g<n>` / `p<n>`, so what is
 * sent back for the builder's rows are this campaign's stable UUIDs; the
 * server's ids for those rows are not kept, because the segment is replaced
 * wholesale and the server does not care which id a filter had last time.
 */
export function segmentToFilter(read: SegmentRead): SegmentReadResult {
  const groups: FilterGroup[] = [];
  const passthrough: PassthroughFilter[] = [];
  let nextGroup = 1;

  const collect = (filters: readonly ReadInnerFilter[], groupId: string | null) => {
    const predicates: AttrPredicate[] = [];
    const kept: PassthroughFilter[] = [];
    for (const filter of filters) {
      const predicate = toPredicate(filter, `p${predicates.length + 1}`);
      if (predicate) {
        predicates.push(predicate);
        continue;
      }
      const passed = toPassthrough(filter, groupId);
      if (passed) kept.push(passed);
    }
    return { predicates, kept };
  };

  const nested = read.filters.filter((filter) => filter.byInFlightSegment);
  const own = read.filters.filter((filter) => !filter.byInFlightSegment);

  if (nested.length === 0) {
    const { predicates, kept } = collect(own, 'g1');
    if (predicates.length === 0 && kept.length === 0) return { filter: EMPTY_AUDIENCE, passthrough: [] };
    if (predicates.length > 0) groups.push({ id: 'g1', operator: read.resultOperator, predicates });
    /* One group flattens on the way out, so the group's operator IS the
       segment's; the outer operator is set to the same so a passthrough left
       alone after its group's last row goes still joins as it did. */
    return {
      filter: { groupOperator: read.resultOperator, groups },
      passthrough: predicates.length > 0 ? kept : kept.map((entry) => ({ ...entry, groupId: null })),
    };
  }

  // The outer segment's own filters first: they were listed first there.
  if (own.length > 0) {
    const id = `g${nextGroup++}`;
    const { predicates, kept } = collect(own, null);
    if (predicates.length > 0) groups.push({ id, operator: read.resultOperator, predicates });
    passthrough.push(...kept);
  }

  for (const filter of nested) {
    const inner = filter.byInFlightSegment;
    if (!inner) continue;
    const id = `g${nextGroup}`;
    const { predicates, kept } = collect(inner.filters, id);
    if (predicates.length > 0) {
      nextGroup += 1;
      groups.push({ id, operator: inner.resultOperator, predicates });
      passthrough.push(...kept);
      continue;
    }
    if (kept.length === 0) continue;
    passthrough.push({
      id: filter.id,
      groupId: null,
      input: {
        id: filter.id,
        byInFlightSegment: {
          id: inner.id,
          name: inner.name ?? null,
          resultOperator: inner.resultOperator,
          filters: kept.map((entry) => entry.input),
        },
      },
      text:
        kept.length === 1
          ? kept[0].text
          : `(${joinTexts(
              kept.map((entry) => entry.text),
              inner.resultOperator,
            )})`,
    });
  }

  return { filter: { groupOperator: read.resultOperator, groups }, passthrough };
}

// ---------------------------------------------------------------------------
// Write: what the builder edits → what the server takes
// ---------------------------------------------------------------------------

function groupToSegment(flowId: string, group: FilterGroup, passthrough: readonly PassthroughFilter[]): SegmentInput {
  return {
    id: segmentId(flowId, group.id),
    name: `Group ${group.id}`,
    resultOperator: group.operator,
    filters: [
      ...group.predicates.map((predicate) => toFilterInput(flowId, group.id, predicate)),
      ...passthrough.filter((entry) => entry.groupId === group.id).map((entry) => entry.input),
    ],
  };
}

/**
 * The segment to send. Never null: "everyone" is a segment with no filters,
 * and the entry point's segment is replaced wholesale.
 *
 * One group flattens: a single group is the outer segment itself rather than
 * a segment wrapping a segment. Two or more nest, one level, through
 * `byInFlightSegment`. Passthrough filters ride along where they were read —
 * a group's inside its group, the rest at the top.
 */
export function buildSegment(
  filter: AudienceFilter,
  flowId: string,
  passthrough: readonly PassthroughFilter[] = [],
): SegmentInput {
  // A passthrough whose group was removed goes with it; one whose group is still
  // on screen but has no usable row yet stays, at the top.
  const live = passthrough.filter(
    (entry) => entry.groupId === null || filter.groups.some((g) => g.id === entry.groupId),
  );
  /* A group is sent when it has a usable row — or when it still holds a
     filter read from the campaign, so that filter keeps the group's operator
     rather than being hoisted under the outer one. */
  const usable = usableGroups(filter);
  const groups = filter.groups.flatMap((group) => {
    const kept = usable.find((candidate) => candidate.id === group.id);
    if (kept) return [kept];
    return live.some((entry) => entry.groupId === group.id) ? [{ ...group, predicates: [] }] : [];
  });
  const groupIds = new Set(groups.map((group) => group.id));
  const top = live
    .filter((entry) => entry.groupId === null || !groupIds.has(entry.groupId))
    .map((entry) => entry.input);

  if (groups.length === 0) {
    return { id: segmentId(flowId, 'root'), name: 'Audience', resultOperator: filter.groupOperator, filters: top };
  }

  if (groups.length === 1 && top.length === 0) {
    const [group] = groups;
    return { ...groupToSegment(flowId, group, live), id: segmentId(flowId, 'root'), name: 'Audience' };
  }

  return {
    id: segmentId(flowId, 'root'),
    name: 'Audience',
    resultOperator: filter.groupOperator,
    filters: [
      ...groups.map((group) => ({
        id: filterId(flowId, `group/${group.id}`),
        byInFlightSegment: groupToSegment(flowId, group, live),
      })),
      ...top,
    ],
  };
}

/** True when the segment selects every WhatsApp contact. */
export const isEveryone = (segment: SegmentInput): boolean => segment.filters.length === 0;
