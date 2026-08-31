import { describe, expect, it } from 'vitest';
import { isUuid } from '~api';
import { AttrFilterDefaultOperator, BoolOperator } from '~api/generated/contacts/graphql';
import { buildSegment, comparableValues, formatValues, parseValues, segmentFor } from './contactsSegment';
import { EMPTY_FILTER, type ContactsFilter } from './contactsFilter';

const withGroups = (groups: ContactsFilter['groups'], groupOperator = BoolOperator.And): ContactsFilter => ({
  ...EMPTY_FILTER,
  groupOperator,
  groups,
});

const predicate = (id: string, name: string, operator = AttrFilterDefaultOperator.Is, values = ['x']) => ({
  id,
  name,
  operator,
  values,
});

describe('buildSegment', () => {
  it('is null when nothing is asked', () => {
    expect(buildSegment(EMPTY_FILTER)).toBeNull();
    expect(buildSegment(withGroups([{ id: 'g1', operator: BoolOperator.And, predicates: [] }]))).toBeNull();
    expect(
      buildSegment(withGroups([{ id: 'g1', operator: BoolOperator.And, predicates: [predicate('p1', '')] }])),
    ).toBeNull();
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
    );
    expect(segment?.resultOperator).toBe(BoolOperator.Or);
    expect(segment?.filters).toHaveLength(1);
    expect(segment?.filters[0].byAttribute?.name).toBe('city');
    expect(segment?.filters[0].byInFlightSegment).toBeUndefined();
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
    );
    expect(segment?.resultOperator).toBe(BoolOperator.Or);
    expect(segment?.filters).toHaveLength(2);
    const nested = segment?.filters[1].byInFlightSegment;
    expect(nested?.resultOperator).toBe(BoolOperator.Or);
    expect(nested?.filters).toHaveLength(2);
  });

  it('gives every segment and filter a real uuid — the API rejects anything else', () => {
    const segment = buildSegment(
      withGroups([
        { id: 'g1', operator: BoolOperator.And, predicates: [predicate('p1', 'city')] },
        { id: 'g2', operator: BoolOperator.And, predicates: [predicate('p1', 'plan')] },
      ]),
    );
    expect(isUuid(segment!.id)).toBe(true);
    for (const filter of segment!.filters) {
      expect(isUuid(filter.id)).toBe(true);
      if (filter.byInFlightSegment) {
        expect(isUuid(filter.byInFlightSegment.id)).toBe(true);
        for (const inner of filter.byInFlightSegment.filters) expect(isUuid(inner.id)).toBe(true);
      }
    }
  });

  it('never collides two groups that use the same predicate ids', () => {
    const segment = buildSegment(
      withGroups([
        { id: 'g1', operator: BoolOperator.And, predicates: [predicate('p1', 'city')] },
        { id: 'g2', operator: BoolOperator.And, predicates: [predicate('p1', 'plan')] },
      ]),
    );
    const inner = segment!.filters.map((f) => f.byInFlightSegment!.filters[0].id);
    expect(inner[0]).not.toBe(inner[1]);
  });

  it('produces a byte-identical variables object for an unchanged filter', () => {
    const filter = withGroups([{ id: 'g1', operator: BoolOperator.And, predicates: [predicate('p1', 'city')] }]);
    expect(JSON.stringify(buildSegment(filter))).toBe(JSON.stringify(buildSegment({ ...filter })));
  });

  it('drops blank values and sends none for nullary operators', () => {
    expect(comparableValues(predicate('p1', 'city', AttrFilterDefaultOperator.Is, [' Berlin ', '', ' ']))).toEqual([
      'Berlin',
    ]);
    expect(comparableValues(predicate('p1', 'city', AttrFilterDefaultOperator.IsEmpty, ['ignored']))).toEqual([]);
  });

  it('never emits byTag or byStoredSegment — both fail on the live API', () => {
    const segment = buildSegment(
      withGroups([{ id: 'g1', operator: BoolOperator.And, predicates: [predicate('p1', 'city')] }]),
    );
    const json = JSON.stringify(segment);
    expect(json).not.toContain('byTag');
    expect(json).not.toContain('byStoredSegment');
    expect(json).not.toContain('dateStrategy');
  });
});

describe('segmentFor', () => {
  it('builds a one-off segment with uuid ids', () => {
    const segment = segmentFor('audience/whatsapp', [
      predicate('p1', 'whatsapp phone', AttrFilterDefaultOperator.IsNotEmpty, []),
    ]);
    expect(isUuid(segment!.id)).toBe(true);
    expect(segment!.filters[0].byAttribute?.defaultStrategy?.comparableValues).toEqual([]);
  });

  it('is null for an empty predicate list', () => {
    expect(segmentFor('x', [])).toBeNull();
  });
});

describe('parseValues / formatValues', () => {
  it('round-trips a multi-value list', () => {
    expect(parseValues('Berlin, Munich ,', false)).toEqual(['Berlin', 'Munich']);
    expect(formatValues(['Berlin', 'Munich'])).toBe('Berlin, Munich');
  });

  it('keeps commas in a single-valued operator', () => {
    expect(parseValues('1,500', true)).toEqual(['1,500']);
  });
});
