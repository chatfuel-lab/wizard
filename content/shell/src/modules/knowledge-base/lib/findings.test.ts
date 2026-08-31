import { describe, expect, it } from 'vitest';
import { findingsByItem, rowsWithFindings, shortTitle, sourceWideFindings } from './findings';
import type { Finding } from './lint';

const finding = (over: Partial<Finding> = {}): Finding => ({
  id: 'products.noprice.a',
  source: 'products',
  severity: 'warning',
  title: 'No price: House Blend',
  detail: 'The assistant will not quote a product it has no price for.',
  item: 'a',
  ...over,
});

describe('findingsByItem', () => {
  it('groups by the row each finding names', () => {
    const grouped = findingsByItem([finding(), finding({ id: 'two', item: 'a' }), finding({ id: 'three', item: 'b' })]);
    expect(grouped.get('a')).toHaveLength(2);
    expect(grouped.get('b')).toHaveLength(1);
  });

  it('ignores findings about the source as a whole', () => {
    expect(findingsByItem([finding({ item: undefined })]).size).toBe(0);
  });

  it('keeps the order it was given, which is worst-first', () => {
    const grouped = findingsByItem([finding({ id: 'first' }), finding({ id: 'second' })]);
    expect(grouped.get('a')?.map((entry) => entry.id)).toEqual(['first', 'second']);
  });
});

describe('sourceWideFindings', () => {
  it('is the ones no row can carry', () => {
    expect(sourceWideFindings([finding(), finding({ id: 'all', item: undefined })]).map((entry) => entry.id)).toEqual([
      'all',
    ]);
  });
});

describe('shortTitle', () => {
  it('drops the row name the card already shows', () => {
    expect(shortTitle(finding({ title: 'No price: House Blend' }))).toBe('No price');
    expect(shortTitle(finding({ title: 'No photo: Acme cup' }))).toBe('No photo');
  });

  it('rewrites the duplicate finding, whose whole title is the name', () => {
    expect(shortTitle(finding({ title: 'Two entries called "Tea"' }))).toBe('Duplicate title');
  });

  it('leaves a title with no row name alone', () => {
    expect(shortTitle(finding({ title: 'Every product is unavailable', item: undefined }))).toBe(
      'Every product is unavailable',
    );
  });

  it('does not cut at a colon that starts the title', () => {
    expect(shortTitle(finding({ title: ': odd' }))).toBe(': odd');
  });
});

describe('rowsWithFindings', () => {
  it('counts rows, not findings', () => {
    expect(rowsWithFindings([finding(), finding({ id: 'two', item: 'a' }), finding({ id: 'three', item: 'b' })])).toBe(
      2,
    );
  });
});
