import { describe, expect, it } from 'vitest';

import { pickMonthlyPricing, type Product } from '../src/billing';

/**
 * The catalogue read is the one thing standing between a fresh account and an
 * AI that answers, and it is hand-written against an API whose shape this
 * repository does not generate from. When a field it selects stops existing the
 * whole query fails validation, the step warns and the run finishes with a
 * workspace that has no plan — which is exactly what happened to `Product`'s
 * `isActive` and `isSelectable`. So what the picker is allowed to read is
 * pinned here, in the same file as the choice it makes.
 */
const product = (over: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'Pro',
  featureSet: 'All',
  pricingList: [],
  ...over,
});

const monthly = (id: string, intervalPrice: string, isActive = true) => ({
  id,
  intervalUnit: 'Month' as const,
  intervalCount: 1,
  price: intervalPrice,
  intervalPrice,
  currency: 'Usd',
  isActive,
});

describe('pickMonthlyPricing', () => {
  it('takes the cheapest live monthly price on a plan that carries the AI', () => {
    const products = [
      product({ pricingList: [monthly('dear', '99'), monthly('cheap', '69')] }),
      product({ id: 'p0', name: 'Lite', featureSet: 'NoAI', pricingList: [monthly('noai', '9')] }),
    ];
    expect(pickMonthlyPricing(products)?.id).toBe('cheap');
  });

  it('skips a price that is no longer sold', () => {
    const products = [product({ pricingList: [monthly('archived', '9', false), monthly('live', '69')] })];
    expect(pickMonthlyPricing(products)?.id).toBe('live');
  });

  it('is monthly, and a year is not twelve months', () => {
    const annual = { ...monthly('annual', '48.25'), intervalCount: 12 };
    expect(pickMonthlyPricing([product({ pricingList: [annual] })])).toBeUndefined();
  });

  it('reads nothing off the product but its feature set and its prices', () => {
    // A product the API hands back with extra keys, and none of them consulted:
    // asking for one that has been dropped fails the query for everybody.
    const withExtras = { ...product({ pricingList: [monthly('live', '69')] }), isActive: false, isSelectable: false };
    expect(pickMonthlyPricing([withExtras as Product])?.id).toBe('live');
  });
});
