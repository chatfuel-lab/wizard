import { describe, expect, it } from 'vitest';
import {
  AttrFilterDefaultOperator,
  BoolOperator,
  type SegmentPartsFragment,
} from '~api/generated/flow-builder/graphql';
import { buildSegmentInput, newAttributeRow, toSegmentModel } from './segmentInput';

const attr = (name: string) => ({
  __typename: 'BotAttribute' as const,
  name,
  type: 'custom',
  dataType: 'string',
});

const attrFilter = (id: string, name: string, operator: AttrFilterDefaultOperator, values: string[]) => ({
  __typename: 'Filter' as const,
  id,
  byAttribute: {
    __typename: 'AttrFilter' as const,
    attribute: attr(name),
    defaultStrategy: { __typename: 'AttrFilterDefaultStrategy' as const, operator, comparableValues: values },
    dateStrategy: null,
  },
  byTag: null,
  byStoredSegment: null,
  byInFlightSegment: null,
});

const segment = (filters: unknown[]): SegmentPartsFragment =>
  ({
    __typename: 'Segment',
    id: 'seg-1',
    name: null,
    resultOperator: BoolOperator.And,
    filters,
  }) as unknown as SegmentPartsFragment;

const TAG_FILTER = {
  __typename: 'Filter' as const,
  id: 'f-tag',
  byAttribute: null,
  byTag: { __typename: 'TagFilter' as const, operator: 'ANY_OF', tagNames: ['vip', 'beta'] },
  byStoredSegment: null,
  byInFlightSegment: null,
};

describe('toSegmentModel', () => {
  it('splits editable attribute rows from passthrough filters', () => {
    const model = toSegmentModel(
      segment([attrFilter('f-1', 'email', AttrFilterDefaultOperator.Contains, ['@x.com']), TAG_FILTER]),
    );
    expect(model.rows).toEqual([
      { filterId: 'f-1', attributeName: 'email', operator: AttrFilterDefaultOperator.Contains, value: '@x.com' },
    ]);
    expect(model.passthroughLabels).toEqual(['Tag filter: ANY_OF [vip, beta]']);
  });

  it('treats multi-value and date-strategy attribute filters as passthrough', () => {
    const multi = attrFilter('f-m', 'score', AttrFilterDefaultOperator.Is, ['1', '2']);
    const dated = {
      ...attrFilter('f-d', 'last visit', AttrFilterDefaultOperator.Is, []),
      byAttribute: {
        __typename: 'AttrFilter' as const,
        attribute: attr('last visit'),
        defaultStrategy: null,
        dateStrategy: { __typename: 'AttrFilterDateStrategy' as const, operator: 'LT', comparableDate: '2026-01-01' },
      },
    };
    const model = toSegmentModel(segment([multi, dated]));
    expect(model.rows).toEqual([]);
    expect(model.passthroughLabels).toHaveLength(2);
  });
});

describe('buildSegmentInput', () => {
  it('round-trips untouched segments without destroying passthrough parts', () => {
    const source = segment([attrFilter('f-1', 'email', AttrFilterDefaultOperator.Contains, ['@x.com']), TAG_FILTER]);
    const model = toSegmentModel(source);
    const input = buildSegmentInput(source, model.rows, model.resultOperator);
    expect(input).toEqual({
      id: 'seg-1',
      name: null,
      resultOperator: BoolOperator.And,
      filters: [
        {
          id: 'f-1',
          byAttribute: {
            name: 'email',
            defaultStrategy: { operator: AttrFilterDefaultOperator.Contains, comparableValues: ['@x.com'] },
            dateStrategy: undefined,
          },
          byTag: undefined,
          byStoredSegment: undefined,
          byInFlightSegment: undefined,
        },
        {
          id: 'f-tag',
          byAttribute: undefined,
          byTag: { operator: 'ANY_OF', tagNames: ['vip', 'beta'] },
          byStoredSegment: undefined,
          byInFlightSegment: undefined,
        },
      ],
    });
  });

  it('keeps original order for edits, appends new rows, drops deleted ones', () => {
    const source = segment([
      attrFilter('f-1', 'email', AttrFilterDefaultOperator.Is, ['a']),
      TAG_FILTER,
      attrFilter('f-2', 'phone', AttrFilterDefaultOperator.Is, ['b']),
    ]);
    const model = toSegmentModel(source);
    const edited = model.rows.filter((r) => r.filterId !== 'f-2'); // delete f-2
    edited[0] = { ...edited[0]!, value: 'a2' }; // edit f-1
    const added = { ...newAttributeRow(), attributeName: 'city', value: 'Berlin' };
    const input = buildSegmentInput(source, [...edited, added], BoolOperator.Or);
    expect(input.resultOperator).toBe(BoolOperator.Or);
    expect(input.filters.map((f) => f.id)).toEqual(['f-1', 'f-tag', added.filterId]);
    expect(input.filters[0]?.byAttribute?.defaultStrategy?.comparableValues).toEqual(['a2']);
  });

  it('sends empty comparableValues for the valueless operators', () => {
    const source = segment([attrFilter('f-1', 'email', AttrFilterDefaultOperator.Is, ['x'])]);
    const rows = toSegmentModel(source).rows;
    rows[0] = { ...rows[0]!, operator: AttrFilterDefaultOperator.IsEmpty, value: 'stale' };
    const input = buildSegmentInput(source, rows, BoolOperator.And);
    expect(input.filters[0]?.byAttribute?.defaultStrategy).toEqual({
      operator: AttrFilterDefaultOperator.IsEmpty,
      comparableValues: [],
    });
  });

  it('preserves nested in-flight segments verbatim', () => {
    const nested = {
      __typename: 'Filter' as const,
      id: 'f-n',
      byAttribute: null,
      byTag: null,
      byStoredSegment: null,
      byInFlightSegment: {
        __typename: 'Segment' as const,
        id: 'seg-nested',
        name: 'inner',
        resultOperator: BoolOperator.Or,
        filters: [attrFilter('f-inner', 'email', AttrFilterDefaultOperator.Is, ['z'])],
      },
    };
    const source = segment([nested]);
    const input = buildSegmentInput(source, [], BoolOperator.And);
    expect(input.filters[0]?.byInFlightSegment).toEqual({
      id: 'seg-nested',
      name: 'inner',
      resultOperator: BoolOperator.Or,
      filters: [
        {
          id: 'f-inner',
          byAttribute: {
            name: 'email',
            defaultStrategy: { operator: AttrFilterDefaultOperator.Is, comparableValues: ['z'] },
            dateStrategy: undefined,
          },
          byTag: undefined,
          byStoredSegment: undefined,
          byInFlightSegment: undefined,
        },
      ],
    });
  });
});
