import { describe, expect, it } from 'vitest';
import {
  catalogReducer,
  initialCatalogState,
  isInitialCatalogLoad,
  selectItem,
  selectItems,
  selectProducts,
  selectServices,
  specialistChars,
  specialistName,
} from './catalogStore';
import type { CatalogEntry, CatalogItem, SpecialistInfo } from '../types';

const product = (id: string, title = id): CatalogEntry =>
  ({
    __typename: 'GoodsProduct',
    id,
    title,
    description: '',
    isAvailable: true,
    price: null,
    images: [],
  }) as unknown as CatalogEntry;

const service = (id: string, title = id): CatalogEntry =>
  ({
    __typename: 'GoodsService',
    id,
    title,
    description: '',
    durationSeconds: 1800,
    isAvailable: true,
    price: null,
    images: [],
  }) as unknown as CatalogEntry;

const deleted = (): CatalogEntry => ({ __typename: 'DeletedGoodsService' }) as unknown as CatalogEntry;

const specialist = (firstName: string, lastName?: string, aboutInfo?: string): SpecialistInfo =>
  ({
    id: firstName,
    profile: { firstName, lastName: lastName ?? null, aboutInfo: aboutInfo ?? null, logo: null },
    services: [],
  }) as unknown as SpecialistInfo;

const loaded = (entries: CatalogEntry[]) =>
  catalogReducer({ ...initialCatalogState }, { type: 'loaded', epoch: 0, entries });

describe('load lifecycle', () => {
  it('starts as an initial load and leaves it once anything lands', () => {
    expect(isInitialCatalogLoad(initialCatalogState)).toBe(true);
    expect(isInitialCatalogLoad(loaded([]))).toBe(false);
  });

  it('drops a response from a stale epoch', () => {
    const reset = catalogReducer(loaded([product('a')]), { type: 'reset' });
    expect(catalogReducer(reset, { type: 'loaded', epoch: 0, entries: [product('late')] })).toBe(reset);
    expect(catalogReducer(reset, { type: 'failed', epoch: 0, error: 'old' })).toBe(reset);
    expect(catalogReducer(reset, { type: 'specialistsLoaded', epoch: 0, specialists: [specialist('Late')] })).toBe(
      reset,
    );
  });

  it('keeps the last good catalog visible while reloading', () => {
    const reset = catalogReducer(loaded([product('a')]), { type: 'reset' });
    expect(selectItems(reset)).toHaveLength(1);
  });
});

describe('the DeletedGoodsService stubs', () => {
  it('never reach a selector', () => {
    const state = loaded([product('a'), deleted(), service('b')]);
    expect(selectItems(state).map((item) => item.id)).toEqual(['a', 'b']);
  });
});

describe('the two response shapes', () => {
  it('replaces everything from a create or delete response', () => {
    const state = loaded([product('a'), product('b')]);
    const next = catalogReducer(state, { type: 'catalogReplaced', entries: [product('b')] });
    expect(next.order).toEqual(['b']);
    expect(next.byId.a).toBeUndefined();
  });

  it('merges one item from an update response without touching the order', () => {
    const state = loaded([product('a'), product('b')]);
    const next = catalogReducer(state, { type: 'itemMerged', item: product('a', 'Renamed') as CatalogItem });
    expect(next.order).toEqual(['a', 'b']);
    expect(next.byId.a?.title).toBe('Renamed');
  });

  it('appends an item it has never seen rather than losing it', () => {
    const next = catalogReducer(loaded([product('a')]), { type: 'itemMerged', item: product('c') as CatalogItem });
    expect(next.order).toEqual(['a', 'c']);
  });
});

describe('selectors', () => {
  it('splits products from services', () => {
    const state = loaded([product('p1'), service('s1'), product('p2')]);
    expect(selectProducts(state).map((item) => item.id)).toEqual(['p1', 'p2']);
    expect(selectServices(state).map((item) => item.id)).toEqual(['s1']);
  });

  it('looks an item up, or answers null', () => {
    const state = loaded([product('p1')]);
    expect(selectItem(state, 'p1')?.id).toBe('p1');
    expect(selectItem(state, 'gone')).toBeNull();
    expect(selectItem(state, null)).toBeNull();
  });
});

describe('specialists', () => {
  it('counts the characters the assistant is shown', () => {
    expect(specialistChars([specialist('Ann', 'Lee', 'Stylist')])).toBe(3 + 3 + 7);
    expect(specialistChars([])).toBe(0);
  });

  it('never renders a blank name', () => {
    expect(specialistName(specialist('Ann', 'Lee'))).toBe('Ann Lee');
    expect(specialistName(specialist('  '))).toBe('Unnamed');
  });
});
