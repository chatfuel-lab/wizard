import { describe, expect, it } from 'vitest';
import { AttrFilterDefaultOperator } from '~api/generated/deals/graphql';
import type { AttrPredicate } from './dealsFilter';
import {
  OPERATORS,
  OPERATOR_LABELS,
  buildSegment,
  comparableValues,
  formatValues,
  isRangeOperator,
  isSingleValued,
  parseValues,
  sortFloorPredicate,
  toFilterInput,
} from './dealsSegment';
import { isUuid } from '~api';

const predicate = (over: Partial<AttrPredicate> = {}): AttrPredicate => ({
  id: 'p1',
  name: 'deal amount',
  operator: AttrFilterDefaultOperator.Is,
  values: ['1000'],
  ...over,
});

describe('operators', () => {
  it('offers all eight the SDL has, and labels every one', () => {
    expect(new Set(OPERATORS)).toEqual(new Set(Object.values(AttrFilterDefaultOperator)));
    for (const operator of OPERATORS) expect(OPERATOR_LABELS[operator]).toBeTruthy();
  });

  it('marks exactly GT and LT as the approximate ones', () => {
    expect(isRangeOperator(AttrFilterDefaultOperator.Gt)).toBe(true);
    expect(isRangeOperator(AttrFilterDefaultOperator.Lt)).toBe(true);
    expect(isRangeOperator(AttrFilterDefaultOperator.Is)).toBe(false);
    expect(isRangeOperator(AttrFilterDefaultOperator.Contains)).toBe(false);
  });
});

describe('parseValues', () => {
  it('splits a multi-valued operator on commas — the only way to say OR', () => {
    expect(parseValues(' Referral, Partner ,, Ads ', AttrFilterDefaultOperator.Is)).toEqual([
      'Referral',
      'Partner',
      'Ads',
    ]);
  });

  it('keeps a range operand whole, commas and all', () => {
    expect(isSingleValued(AttrFilterDefaultOperator.Gt)).toBe(true);
    expect(parseValues(' 1,500 ', AttrFilterDefaultOperator.Gt)).toEqual(['1,500']);
  });

  it('sends nothing for a nullary operator, whatever was typed', () => {
    expect(parseValues('ignored', AttrFilterDefaultOperator.IsEmpty)).toEqual([]);
    expect(parseValues('ignored', AttrFilterDefaultOperator.IsNotEmpty)).toEqual([]);
  });

  it('round-trips through formatValues', () => {
    const values = parseValues('Referral, Partner', AttrFilterDefaultOperator.Is);
    expect(parseValues(formatValues(values), AttrFilterDefaultOperator.Is)).toEqual(values);
  });
});

describe('comparableValues', () => {
  it('drops blanks rather than sending an empty comparison', () => {
    expect(comparableValues(predicate({ values: ['1000', '  ', ''] }))).toEqual(['1000']);
  });

  it('is empty for IS_EMPTY / IS_NOT_EMPTY even when values linger from an earlier operator', () => {
    expect(comparableValues(predicate({ operator: AttrFilterDefaultOperator.IsEmpty, values: ['1000'] }))).toEqual([]);
  });
});

describe('buildSegment', () => {
  it('is null with nothing to say — contactsConnection then means every contact', () => {
    expect(buildSegment([])).toBeNull();
  });

  it('derives the FilterID from the predicate, so an unchanged filter is byte-identical', () => {
    const first = buildSegment([predicate()]);
    const second = buildSegment([predicate()]);
    expect(first).toEqual(second);
  });

  /* In practice: a non-UUID id fails the whole query with a
     generic API error, which is why engine C never answered. */
  it('gives the segment and every filter a real uuid', () => {
    const segment = buildSegment([predicate(), predicate({ id: 'p2' })]);
    expect(isUuid(segment!.id)).toBe(true);
    for (const filter of segment!.filters) expect(isUuid(filter.id)).toBe(true);
  });

  it('keeps two predicates on different ids', () => {
    const segment = buildSegment([predicate(), predicate({ id: 'p2' })]);
    expect(segment!.filters[0].id).not.toBe(segment!.filters[1].id);
  });

  it('ANDs the predicates and trims the attribute name', () => {
    const segment = buildSegment([predicate({ name: ' deal amount ' }), predicate({ id: 'p2' })]);
    expect(segment?.resultOperator).toBe('AND');
    expect(segment?.filters).toHaveLength(2);
    expect(segment?.filters[0]?.byAttribute?.name).toBe('deal amount');
  });

  it('only ever uses the default strategy — the date one is unverified against ms strings', () => {
    const filter = toFilterInput(predicate());
    expect(filter.byAttribute?.defaultStrategy).toBeDefined();
    expect(filter.byAttribute?.dateStrategy).toBeUndefined();
  });
});

describe('sortFloorPredicate', () => {
  it('is a nullary IS_NOT_EMPTY on the sort attribute', () => {
    expect(sortFloorPredicate('deal amount')).toEqual({
      id: 'sort-floor',
      name: 'deal amount',
      operator: AttrFilterDefaultOperator.IsNotEmpty,
      values: [],
    });
  });
});
