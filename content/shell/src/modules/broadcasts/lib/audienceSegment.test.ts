import { describe, expect, it } from 'vitest';
import { isUuid } from '~api';
import {
  AttrFilterDateOperator,
  AttrFilterDefaultOperator,
  BoolOperator,
  TagFilterOperator,
  type SegmentInput,
} from '~api/generated/broadcasts/graphql';
import type { SegmentRead } from '../types';
import { EMPTY_AUDIENCE, type AudienceFilter } from './audienceFilter';
import { buildSegment, comparableValues, isEveryone, segmentToFilter, toFilterInput } from './audienceSegment';
import { sampleSegment } from './samples';

const FLOW = 'flow-1';

const predicate = (id: string, name: string, operator = AttrFilterDefaultOperator.Is, values = ['x']) => ({
  id,
  name,
  operator,
  values,
});

const withGroups = (groups: AudienceFilter['groups'], groupOperator = BoolOperator.And): AudienceFilter => ({
  groupOperator,
  groups,
});

type ReadFilter = SegmentRead['filters'][number];

/** A filter as the server hands it back: the attribute is an object, not a name. */
const readAttr = (
  id: string,
  name: string,
  operator = AttrFilterDefaultOperator.Is,
  comparableValues: string[] = ['x'],
): ReadFilter => ({
  id,
  byAttribute: {
    attribute: { name, type: 'custom' as never, dataType: 'string' as never },
    defaultStrategy: { operator, comparableValues },
    dateStrategy: null,
  },
  byTag: null,
  byStoredSegment: null,
  byInFlightSegment: null,
});

const readTag = (id: string, ...tagNames: string[]): ReadFilter => ({
  id,
  byAttribute: null,
  byTag: { operator: TagFilterOperator.Is, tagNames },
  byStoredSegment: null,
  byInFlightSegment: null,
});

const readNested = (id: string, resultOperator: BoolOperator, filters: ReadFilter[]): ReadFilter => ({
  id,
  byAttribute: null,
  byTag: null,
  byStoredSegment: null,
  byInFlightSegment: { id: `${id}-segment`, name: null, resultOperator, filters },
});

const everyUuid = (segment: SegmentInput): void => {
  expect(isUuid(segment.id)).toBe(true);
  for (const filter of segment.filters) {
    expect(isUuid(filter.id)).toBe(true);
    if (filter.byInFlightSegment) everyUuid(filter.byInFlightSegment);
  }
};

describe('buildSegment', () => {
  it('sends "everyone" as a segment with an id and no filters — never null', () => {
    const segment = buildSegment(EMPTY_AUDIENCE, FLOW);
    expect(segment.filters).toEqual([]);
    expect(isUuid(segment.id)).toBe(true);
    expect(isEveryone(segment)).toBe(true);
    // A builder with only half-typed rows is "everyone" too.
    expect(
      buildSegment(withGroups([{ id: 'g1', operator: BoolOperator.And, predicates: [predicate('p1', '')] }]), FLOW)
        .filters,
    ).toEqual([]);
  });

  it('flattens a single group into the outer segment', () => {
    const segment = buildSegment(
      withGroups([
        {
          id: 'g1',
          operator: BoolOperator.Or,
          predicates: [predicate('p1', 'city', AttrFilterDefaultOperator.Is, ['Berlin'])],
        },
      ]),
      FLOW,
    );
    expect(segment.resultOperator).toBe(BoolOperator.Or);
    expect(segment.filters).toHaveLength(1);
    expect(segment.filters[0].byAttribute?.name).toBe('city');
    expect(segment.filters[0].byInFlightSegment).toBeUndefined();
    expect(isEveryone(segment)).toBe(false);
  });

  it('nests two groups one level through byInFlightSegment', () => {
    const segment = buildSegment(
      withGroups(
        [
          { id: 'g1', operator: BoolOperator.And, predicates: [predicate('p1', 'city')] },
          { id: 'g2', operator: BoolOperator.Or, predicates: [predicate('p1', 'company'), predicate('p2', 'plan')] },
        ],
        BoolOperator.Or,
      ),
      FLOW,
    );
    expect(segment.resultOperator).toBe(BoolOperator.Or);
    expect(segment.filters).toHaveLength(2);
    const nested = segment.filters[1].byInFlightSegment;
    expect(nested?.resultOperator).toBe(BoolOperator.Or);
    expect(nested?.filters).toHaveLength(2);
  });

  it('gives every segment and filter a real uuid — the API rejects anything else', () => {
    everyUuid(
      buildSegment(
        withGroups([
          { id: 'g1', operator: BoolOperator.And, predicates: [predicate('p1', 'city')] },
          { id: 'g2', operator: BoolOperator.And, predicates: [predicate('p1', 'plan')] },
        ]),
        FLOW,
      ),
    );
    everyUuid(buildSegment(EMPTY_AUDIENCE, FLOW));
  });

  it('is byte-identical across calls for the same builder, and different for another campaign', () => {
    const filter = withGroups([
      { id: 'g1', operator: BoolOperator.And, predicates: [predicate('p1', 'city')] },
      { id: 'g2', operator: BoolOperator.And, predicates: [predicate('p1', 'plan')] },
    ]);
    expect(JSON.stringify(buildSegment(filter, FLOW))).toBe(JSON.stringify(buildSegment(filter, FLOW)));
    expect(buildSegment(filter, FLOW).id).not.toBe(buildSegment(filter, 'flow-2').id);
    expect(buildSegment(filter, FLOW).filters[0].id).not.toBe(buildSegment(filter, 'flow-2').filters[0].id);
    expect(buildSegment(EMPTY_AUDIENCE, FLOW).id).toBe(buildSegment(EMPTY_AUDIENCE, FLOW).id);
  });

  it('never collides two groups that use the same predicate ids', () => {
    const segment = buildSegment(
      withGroups([
        { id: 'g1', operator: BoolOperator.And, predicates: [predicate('p1', 'city')] },
        { id: 'g2', operator: BoolOperator.And, predicates: [predicate('p1', 'plan')] },
      ]),
      FLOW,
    );
    const ids = new Set<string>();
    for (const filter of segment.filters) {
      ids.add(filter.id);
      for (const inner of filter.byInFlightSegment?.filters ?? []) ids.add(inner.id);
    }
    expect(ids.size).toBe(4);
  });

  it('sends no values for a nullary operator and trims the rest', () => {
    expect(comparableValues(predicate('p1', 'x', AttrFilterDefaultOperator.IsEmpty, ['stale']))).toEqual([]);
    expect(comparableValues(predicate('p1', 'x', AttrFilterDefaultOperator.Is, [' a ', '', 'b']))).toEqual(['a', 'b']);
    expect(toFilterInput(FLOW, 'g1', predicate('p1', ' city ')).byAttribute?.name).toBe('city');
  });
});

describe('segmentToFilter', () => {
  it('reads a fresh entry point as everyone', () => {
    expect(segmentToFilter(sampleSegment())).toEqual({ filter: EMPTY_AUDIENCE, passthrough: [] });
  });

  it('reads a flat segment as one group whose operator is the segment operator', () => {
    const { filter, passthrough } = segmentToFilter(
      sampleSegment({
        resultOperator: BoolOperator.Or,
        filters: [
          readAttr('f1', 'city', AttrFilterDefaultOperator.Is, ['Berlin', 'Munich']),
          readAttr('f2', 'whatsapp phone', AttrFilterDefaultOperator.IsNotEmpty, []),
        ],
      }),
    );
    expect(passthrough).toEqual([]);
    expect(filter.groups).toHaveLength(1);
    expect(filter.groups[0].operator).toBe(BoolOperator.Or);
    expect(filter.groups[0].predicates).toEqual([
      { id: 'p1', name: 'city', operator: AttrFilterDefaultOperator.Is, values: ['Berlin', 'Munich'] },
      { id: 'p2', name: 'whatsapp phone', operator: AttrFilterDefaultOperator.IsNotEmpty, values: [] },
    ]);
  });

  it('reads nested segments as groups joined by the outer operator', () => {
    const { filter } = segmentToFilter(
      sampleSegment({
        resultOperator: BoolOperator.Or,
        filters: [
          readNested('n1', BoolOperator.And, [readAttr('f1', 'city'), readAttr('f2', 'plan')]),
          readNested('n2', BoolOperator.Or, [readAttr('f3', 'company')]),
        ],
      }),
    );
    expect(filter.groupOperator).toBe(BoolOperator.Or);
    expect(filter.groups.map((group) => [group.id, group.operator, group.predicates.length])).toEqual([
      ['g1', BoolOperator.And, 2],
      ['g2', BoolOperator.Or, 1],
    ]);
  });

  it('round-trips: read → filter → segment says the same thing', () => {
    const read = sampleSegment({
      resultOperator: BoolOperator.Or,
      filters: [
        readNested('n1', BoolOperator.And, [
          readAttr('f1', 'city', AttrFilterDefaultOperator.Is, ['Berlin']),
          readAttr('f2', 'plan', AttrFilterDefaultOperator.IsNot, ['free']),
        ]),
        readNested('n2', BoolOperator.And, [
          readAttr('f3', 'whatsapp phone', AttrFilterDefaultOperator.IsNotEmpty, []),
        ]),
      ],
    });
    const { filter, passthrough } = segmentToFilter(read);
    const sent = buildSegment(filter, FLOW, passthrough);
    expect(sent.resultOperator).toBe(BoolOperator.Or);
    expect(sent.filters.map((filter) => filter.byInFlightSegment?.resultOperator)).toEqual([
      BoolOperator.And,
      BoolOperator.And,
    ]);
    expect(sent.filters[0].byInFlightSegment?.filters.map((filter) => filter.byAttribute)).toEqual([
      { name: 'city', defaultStrategy: { operator: AttrFilterDefaultOperator.Is, comparableValues: ['Berlin'] } },
      { name: 'plan', defaultStrategy: { operator: AttrFilterDefaultOperator.IsNot, comparableValues: ['free'] } },
    ]);
    expect(sent.filters[1].byInFlightSegment?.filters[0].byAttribute).toEqual({
      name: 'whatsapp phone',
      defaultStrategy: { operator: AttrFilterDefaultOperator.IsNotEmpty, comparableValues: [] },
    });
    everyUuid(sent);
  });

  it('keeps what the builder cannot show and re-sends it verbatim, where it was', () => {
    const read = sampleSegment({
      resultOperator: BoolOperator.Or,
      filters: [
        readAttr('f1', 'city', AttrFilterDefaultOperator.Is, ['Berlin']),
        readTag('f2', 'vip'),
        {
          id: 'f3',
          byAttribute: {
            attribute: { name: 'signed up', type: 'system' as never, dataType: 'datetime' as never },
            defaultStrategy: null,
            dateStrategy: { operator: AttrFilterDateOperator.Gt, comparableDate: '2030-01-01T00:00:00Z' },
          },
          byTag: null,
          byStoredSegment: null,
          byInFlightSegment: null,
        },
      ],
    });
    const { filter, passthrough } = segmentToFilter(read);
    expect(filter.groups).toHaveLength(1);
    expect(filter.groups[0].predicates).toHaveLength(1);
    expect(passthrough.map((entry) => entry.text)).toEqual(['tag is vip', 'signed up is after 2030-01-01T00:00:00Z']);

    const sent = buildSegment(filter, FLOW, passthrough);
    // The flat OR stays a flat OR: the tag and the date ride beside the city row.
    expect(sent.resultOperator).toBe(BoolOperator.Or);
    expect(sent.filters).toHaveLength(3);
    expect(sent.filters[1]).toEqual({ id: 'f2', byTag: { operator: TagFilterOperator.Is, tagNames: ['vip'] } });
    expect(sent.filters[2]).toEqual({
      id: 'f3',
      byAttribute: {
        name: 'signed up',
        dateStrategy: { operator: AttrFilterDateOperator.Gt, comparableDate: '2030-01-01T00:00:00Z' },
      },
    });
  });

  it('keeps a nested segment the builder has no row for as one whole passthrough', () => {
    const read = sampleSegment({
      resultOperator: BoolOperator.And,
      filters: [
        readNested('n1', BoolOperator.And, [readAttr('f1', 'city')]),
        readNested('n2', BoolOperator.Or, [readTag('f2', 'vip'), readTag('f3', 'beta')]),
      ],
    });
    const { filter, passthrough } = segmentToFilter(read);
    expect(filter.groups).toHaveLength(1);
    expect(passthrough).toHaveLength(1);
    expect(passthrough[0].text).toBe('(tag is vip or tag is beta)');
    const sent = buildSegment(filter, FLOW, passthrough);
    expect(sent.filters).toHaveLength(2);
    expect(sent.filters[1].byInFlightSegment).toEqual({
      id: 'n2-segment',
      name: null,
      resultOperator: BoolOperator.Or,
      filters: [
        { id: 'f2', byTag: { operator: TagFilterOperator.Is, tagNames: ['vip'] } },
        { id: 'f3', byTag: { operator: TagFilterOperator.Is, tagNames: ['beta'] } },
      ],
    });
  });

  it('drops a passthrough with the group it was read in, and keeps one whose group only lost its rows', () => {
    const read = sampleSegment({
      resultOperator: BoolOperator.And,
      filters: [
        readNested('n1', BoolOperator.Or, [readAttr('f1', 'city'), readTag('f2', 'vip')]),
        readNested('n2', BoolOperator.And, [readAttr('f3', 'plan')]),
      ],
    });
    const { filter, passthrough } = segmentToFilter(read);
    expect(passthrough[0].groupId).toBe('g1');

    const withoutGroup = { ...filter, groups: filter.groups.filter((group) => group.id !== 'g1') };
    expect(buildSegment(withoutGroup, FLOW, passthrough).filters.some((entry) => entry.byTag)).toBe(false);

    const rowsGone = {
      ...filter,
      groups: filter.groups.map((group) => (group.id === 'g1' ? { ...group, predicates: [] } : group)),
    };
    /* The tag stays inside ITS group, under the group's own operator — not
       hoisted to the top under the outer one. */
    const sent = buildSegment(rowsGone, FLOW, passthrough);
    expect(sent.filters.map((entry) => (entry.byTag ? 'tag' : 'group'))).toEqual(['group', 'group']);
    const kept = sent.filters[0].byInFlightSegment;
    expect(kept?.resultOperator).toBe(BoolOperator.Or);
    expect(kept?.filters.map((entry) => (entry.byTag ? 'tag' : 'attr'))).toEqual(['tag']);
  });

  it('keeps a third level whole, its own operator and all', () => {
    const read = sampleSegment({
      resultOperator: BoolOperator.And,
      filters: [
        readNested('n0', BoolOperator.And, [
          readAttr('f9', 'plan'),
          readNested('n1', BoolOperator.Or, [readTag('f2', 'vip'), readTag('f3', 'beta')]),
        ]),
      ],
    });
    const { filter, passthrough } = segmentToFilter(read);
    expect(filter.groups.map((group) => group.predicates.map((p) => p.name))).toEqual([['plan']]);
    expect(passthrough).toHaveLength(1);
    expect(passthrough[0].text).toBe('(tag is vip or tag is beta)');
    const sent = buildSegment(filter, FLOW, passthrough);
    const inner = sent.filters.find((entry) => entry.byInFlightSegment)?.byInFlightSegment;
    expect(inner?.resultOperator).toBe(BoolOperator.Or);
    expect(inner?.filters.map((entry) => entry.byTag?.tagNames[0])).toEqual(['vip', 'beta']);
  });
});
