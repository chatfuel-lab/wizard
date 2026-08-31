import { describe, expect, it } from 'vitest';
import {
  countAvailable,
  emptyReason,
  filterProducts,
  isAvailabilityFilter,
  isProductSort,
  matchesQuery,
  rememberAllRecent,
  rememberRecent,
  RECENT_MAX,
  sortProducts,
  visibleProducts,
  type ProductView,
} from './productFilter';
import type { CatalogProduct } from '../types';

const product = (id: string, over: Partial<CatalogProduct> = {}): CatalogProduct =>
  ({
    __typename: 'GoodsProduct',
    id,
    title: id,
    description: '',
    isAvailable: true,
    price: null,
    images: [],
    ...over,
  }) as unknown as CatalogProduct;

const priced = (id: string, amount: string, currency = 'EUR') =>
  product(id, { price: { amount, currency } } as Partial<CatalogProduct>);
const ids = (products: readonly CatalogProduct[]) => products.map((p) => p.id);
const view = (over: Partial<ProductView> = {}): ProductView => ({
  query: '',
  availability: 'all',
  sort: 'name',
  recent: [],
  ...over,
});

describe('matchesQuery', () => {
  const tea = product('a', { title: 'Ethiopia Guji', description: 'Peach and jasmine' } as Partial<CatalogProduct>);

  it('matches an empty query', () => {
    expect(matchesQuery(tea, '')).toBe(true);
    expect(matchesQuery(tea, '   ')).toBe(true);
  });

  it('matches title and description, case-insensitively', () => {
    expect(matchesQuery(tea, 'GUJI')).toBe(true);
    expect(matchesQuery(tea, 'jasmine')).toBe(true);
    expect(matchesQuery(tea, 'colombia')).toBe(false);
  });

  it('matches the price, because that is what a mispriced row is hunted by', () => {
    expect(matchesQuery(priced('b', '16.50'), '16.5')).toBe(true);
    expect(matchesQuery(priced('b', '16.50'), 'eur')).toBe(true);
  });
});

describe('filterProducts', () => {
  const list = [product('a'), product('b', { isAvailable: false } as Partial<CatalogProduct>)];

  it('filters by availability', () => {
    expect(ids(filterProducts(list, '', 'all'))).toEqual(['a', 'b']);
    expect(ids(filterProducts(list, '', 'available'))).toEqual(['a']);
    expect(ids(filterProducts(list, '', 'unavailable'))).toEqual(['b']);
  });

  it('applies the search and the filter together', () => {
    expect(ids(filterProducts(list, 'b', 'available'))).toEqual([]);
  });
});

describe('sortProducts', () => {
  it('sorts by name', () => {
    expect(ids(sortProducts([product('c'), product('a'), product('b')], 'name'))).toEqual(['a', 'b', 'c']);
  });

  it('sorts by price ascending and puts a price-less product last', () => {
    expect(ids(sortProducts([priced('mid', '12.00'), product('none'), priced('low', '4.00')], 'price'))).toEqual([
      'low',
      'mid',
      'none',
    ]);
  });

  it('breaks a price tie by name, so the order does not jitter', () => {
    expect(ids(sortProducts([priced('b', '5.00'), priced('a', '5.00')], 'price'))).toEqual(['a', 'b']);
  });

  it('puts what this session touched first, newest first', () => {
    expect(ids(sortProducts([product('a'), product('b'), product('c')], 'recent', ['b', 'a']))).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('falls back to the catalog tail, which is where the API appends', () => {
    expect(ids(sortProducts([product('a'), product('b'), product('c')], 'recent', []))).toEqual(['c', 'b', 'a']);
  });

  it('never mutates the list it was given', () => {
    const list = [product('c'), product('a')];
    sortProducts(list, 'name');
    expect(ids(list)).toEqual(['c', 'a']);
  });
});

describe('visibleProducts', () => {
  it('filters, then sorts', () => {
    const list = [
      priced('z', '9.00'),
      priced('a', '1.00'),
      product('hidden', { isAvailable: false } as Partial<CatalogProduct>),
    ];
    expect(ids(visibleProducts(list, view({ availability: 'available', sort: 'price' })))).toEqual(['a', 'z']);
  });
});

describe('rememberRecent', () => {
  it('moves an id to the front instead of duplicating it', () => {
    expect(rememberRecent(['a', 'b'], 'b')).toEqual(['b', 'a']);
  });

  it('caps the list', () => {
    const many = Array.from({ length: RECENT_MAX }, (_, index) => `id-${index}`);
    expect(rememberRecent(many, 'new')).toHaveLength(RECENT_MAX);
    expect(rememberRecent(many, 'new')[0]).toBe('new');
  });

  it('takes a batch and keeps the given order', () => {
    expect(rememberAllRecent(['x'], ['a', 'b'])).toEqual(['a', 'b', 'x']);
  });
});

describe('countAvailable', () => {
  it('counts both halves', () => {
    expect(countAvailable([product('a'), product('b', { isAvailable: false } as Partial<CatalogProduct>)])).toEqual({
      available: 1,
      unavailable: 1,
    });
  });
});

describe('emptyReason', () => {
  it('is nothing while rows are showing', () => {
    expect(emptyReason(3, 1, view())).toBeNull();
  });

  it('tells an empty catalog from a filtered one', () => {
    expect(emptyReason(0, 0, view())).toBe('none');
    expect(emptyReason(5, 0, view({ query: 'tea' }))).toBe('filtered');
    expect(emptyReason(5, 0, view({ availability: 'unavailable' }))).toBe('filtered');
  });
});

describe('guards', () => {
  it('reject a hand-edited value', () => {
    expect(isProductSort('price')).toBe(true);
    expect(isProductSort('nonsense')).toBe(false);
    expect(isAvailabilityFilter('available')).toBe(true);
    expect(isAvailabilityFilter(7)).toBe(false);
  });
});
