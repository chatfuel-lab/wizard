import { describe, expect, it } from 'vitest';
import { GoodsItemPriceCurrency } from '~api/generated/knowledge-base/graphql';
import {
  CURRENCY_OPTIONS,
  DEFAULT_CURRENCY,
  DESCRIPTION_MAX,
  TITLE_MAX,
  commonCurrency,
  formatPrice,
  normalizeAmount,
  productDraftOf,
  productFieldForCode,
  productInputOf,
  productInputOfDraft,
  productInputWithAvailability,
  sameProductDraft,
  validateProductDraft,
  type ProductDraft,
} from './productInput';
import type { CatalogItem, CatalogProduct } from '../types';

const product = (over: Partial<CatalogProduct> = {}): CatalogProduct =>
  ({
    __typename: 'GoodsProduct',
    id: 'prod-1',
    title: 'House Blend',
    description: 'Everyday bag.',
    isAvailable: true,
    price: { amount: '12.00', currency: GoodsItemPriceCurrency.Eur },
    images: [{ id: 'file-1', url: 'https://example.test/a.jpg' }],
    ...over,
  }) as unknown as CatalogProduct;

const draft = (over: Partial<ProductDraft> = {}): ProductDraft => ({
  title: 'House Blend',
  description: 'Everyday bag.',
  priceAmount: '12.00',
  currency: GoodsItemPriceCurrency.Eur,
  isAvailable: true,
  images: [{ id: 'file-1' }],
  ...over,
});

describe('productInputOf', () => {
  it('re-sends every field, so a switch flip does not blank the rest', () => {
    expect(productInputOf(product())).toEqual({
      title: 'House Blend',
      description: 'Everyday bag.',
      isAvailable: true,
      price: { amount: '12.00', currency: 'EUR' },
      images: ['file-1'],
    });
  });

  it('sends FileIDs, not File objects', () => {
    expect(productInputOf(product()).images).toEqual(['file-1']);
  });

  it('keeps "no price" as null rather than as zero', () => {
    expect(productInputOf(product({ price: null })).price).toBeNull();
  });

  it('changes only the flag for an availability write', () => {
    expect(productInputWithAvailability(product(), false)).toEqual({
      ...productInputOf(product()),
      isAvailable: false,
    });
  });
});

describe('productDraftOf', () => {
  it('starts a new product available, with no price and the given currency', () => {
    expect(productDraftOf(null, GoodsItemPriceCurrency.Gbp)).toEqual({
      title: '',
      description: '',
      priceAmount: '',
      currency: 'GBP',
      isAvailable: true,
      images: [],
    });
  });

  it('falls back to the default currency for a record with no price', () => {
    expect(productDraftOf(product({ price: null })).currency).toBe(DEFAULT_CURRENCY);
  });

  it('turns an empty URL into undefined so a thumbnail renders the placeholder', () => {
    const images = [{ id: 'file-1', url: '' }] as unknown as CatalogProduct['images'];
    expect(productDraftOf(product({ images })).images[0]).toEqual({ id: 'file-1', url: undefined });
  });
});

describe('normalizeAmount', () => {
  it('pads to two decimals and takes a comma', () => {
    expect(normalizeAmount('12')).toBe('12.00');
    expect(normalizeAmount('12.5')).toBe('12.50');
    expect(normalizeAmount('12,50')).toBe('12.50');
    expect(normalizeAmount(' 07 ')).toBe('7.00');
  });

  it('is null for a blank and for anything that is not money', () => {
    expect(normalizeAmount('')).toBeNull();
    expect(normalizeAmount('   ')).toBeNull();
    expect(normalizeAmount('twelve')).toBeNull();
    expect(normalizeAmount('12.345')).toBeNull();
    expect(normalizeAmount('-1')).toBeNull();
  });
});

describe('validateProductDraft', () => {
  it('passes a good draft', () => {
    expect(validateProductDraft(draft())).toEqual({});
  });

  it('needs a title, and a real one', () => {
    expect(validateProductDraft(draft({ title: '  ' })).title).toBeTruthy();
    expect(validateProductDraft(draft({ title: 'a' })).title).toBeTruthy();
    expect(validateProductDraft(draft({ title: 'x'.repeat(TITLE_MAX + 1) })).title).toBeTruthy();
  });

  it('caps the description', () => {
    expect(validateProductDraft(draft({ description: 'x'.repeat(DESCRIPTION_MAX + 1) })).description).toBeTruthy();
  });

  it('accepts a blank price but not a broken one', () => {
    expect(validateProductDraft(draft({ priceAmount: '' })).price).toBeUndefined();
    expect(validateProductDraft(draft({ priceAmount: 'ten' })).price).toBeTruthy();
  });

  it('caps the photos', () => {
    expect(
      validateProductDraft(draft({ images: Array.from({ length: 11 }, (_, index) => ({ id: `f${index}` })) })).images,
    ).toBeTruthy();
  });
});

describe('productInputOfDraft', () => {
  it('trims, normalizes the amount and sends the photo ids in order', () => {
    expect(
      productInputOfDraft(
        draft({ title: '  Tea  ', description: ' Nice ', priceAmount: '9,5', images: [{ id: 'b' }, { id: 'a' }] }),
      ),
    ).toEqual({
      title: 'Tea',
      description: 'Nice',
      isAvailable: true,
      price: { amount: '9.50', currency: 'EUR' },
      images: ['b', 'a'],
    });
  });

  it('sends no price at all for a blank amount', () => {
    expect(productInputOfDraft(draft({ priceAmount: '  ' })).price).toBeNull();
  });

  it('keeps a deliberate zero, which is not the same as no price', () => {
    expect(productInputOfDraft(draft({ priceAmount: '0' })).price).toEqual({ amount: '0.00', currency: 'EUR' });
  });
});

describe('sameProductDraft', () => {
  it('sees a reordered photo list as a change — the first photo is the one the AI sends', () => {
    expect(
      sameProductDraft(draft({ images: [{ id: 'a' }, { id: 'b' }] }), draft({ images: [{ id: 'b' }, { id: 'a' }] })),
    ).toBe(false);
  });

  it('is true for an untouched draft', () => {
    expect(sameProductDraft(draft(), draft())).toBe(true);
  });

  it('notices each field', () => {
    expect(sameProductDraft(draft(), draft({ title: 'Other' }))).toBe(false);
    expect(sameProductDraft(draft(), draft({ description: 'Other' }))).toBe(false);
    expect(sameProductDraft(draft(), draft({ priceAmount: '13.00' }))).toBe(false);
    expect(sameProductDraft(draft(), draft({ currency: GoodsItemPriceCurrency.Usd }))).toBe(false);
    expect(sameProductDraft(draft(), draft({ isAvailable: false }))).toBe(false);
  });
});

describe('productFieldForCode', () => {
  it('puts every code the catalog raises under a field', () => {
    expect(productFieldForCode('GoodsItemTitleNotUnique')).toBe('title');
    expect(productFieldForCode('GoodsItemDescriptionTooLong')).toBe('description');
    expect(productFieldForCode('GoodsItemPriceAmountWrongFormat')).toBe('price');
    expect(productFieldForCode('GoodsProductImagesTooMuch')).toBe('images');
    expect(productFieldForCode('FileTooBig')).toBe('images');
    expect(productFieldForCode('FuelyKnowledgeBaseLimitReached')).toBe('form');
    expect(productFieldForCode(null)).toBe('form');
  });
});

describe('formatPrice', () => {
  it('says what a missing price is instead of showing nothing', () => {
    expect(formatPrice(null)).toBe('No price');
    expect(formatPrice(undefined)).toBe('No price');
  });

  it('calls zero free', () => {
    expect(formatPrice({ amount: '0.00', currency: 'EUR' }, 'en-US')).toBe('Free');
  });

  it('formats a known currency and falls back to the code for one Intl refuses', () => {
    expect(formatPrice({ amount: '12.00', currency: 'USD' }, 'en-US')).toBe('$12.00');
    /* Intl takes any three-letter code; a four-letter one throws, which is the branch. */
    expect(formatPrice({ amount: '12.00', currency: 'BTCX' }, 'en-US')).toBe('12.00 BTCX');
  });

  it('shows an unparseable amount rather than NaN', () => {
    expect(formatPrice({ amount: 'lots', currency: 'EUR' })).toBe('lots EUR');
  });
});

describe('commonCurrency', () => {
  const priced = (currency: GoodsItemPriceCurrency): CatalogItem =>
    ({ price: { amount: '1.00', currency } }) as unknown as CatalogItem;

  it('picks the currency most of the catalog uses', () => {
    expect(
      commonCurrency([
        priced(GoodsItemPriceCurrency.Eur),
        priced(GoodsItemPriceCurrency.Eur),
        priced(GoodsItemPriceCurrency.Usd),
      ]),
    ).toBe(GoodsItemPriceCurrency.Eur);
  });

  it('falls back to the default on an empty or price-less catalog', () => {
    expect(commonCurrency([])).toBe(DEFAULT_CURRENCY);
    expect(commonCurrency([{ price: null } as unknown as CatalogItem])).toBe(DEFAULT_CURRENCY);
  });
});

describe('CURRENCY_OPTIONS', () => {
  it('offers the whole ISO enum, not a hand-picked handful', () => {
    expect(CURRENCY_OPTIONS.length).toBe(Object.values(GoodsItemPriceCurrency).length);
    expect(CURRENCY_OPTIONS.some((option) => option.value === 'EUR')).toBe(true);
  });
});
