import { describe, expect, it } from 'vitest';

import {
  botsPhrase,
  formatMoney,
  monthlyPlans,
  planHint,
  planSummary,
  type Pricing,
  type Product,
  type ProductsSchema,
} from '../src/billing';

/**
 * The catalogue read is the one thing standing between a fresh account and an
 * AI that answers, and it is hand-written against an API whose shape this
 * repository does not generate from. When a field it selects stops existing the
 * whole query fails validation, the step warns and the run finishes with a
 * workspace that has no plan — which is exactly what happened to `Product`'s
 * `isActive` and `isSelectable`. So what the picker is allowed to read is
 * pinned here, in the same file as the order it offers things in.
 */
const pricing = (id: string, price: string, over: Partial<Pricing> = {}): Pricing => ({
  id,
  intervalUnit: 'Month',
  intervalCount: 1,
  price,
  intervalPrice: price,
  currency: 'Usd',
  credits: Number(price),
  ...over,
});

const product = (id: string, name: string, pricingList: Pricing[], workspaceBotsLimit = 1): Product => ({
  id,
  name,
  description: '',
  workspaceBotsLimit,
  pricingList,
});

const schema = (over: Partial<ProductsSchema> = {}): ProductsSchema => ({ business: [], agency: [], ...over });

describe('monthlyPlans', () => {
  it('offers Business first, then the Agency tiers, each cheapest first', () => {
    const plans = monthlyPlans(
      schema({
        business: [product('business', 'Business', [pricing('business-monthly', '20')])],
        agency: [
          product('agency-m', 'Agency M', [pricing('agency-m-monthly', '199')], 5),
          product('agency-s', 'Agency S', [pricing('agency-s-monthly', '99')], 3),
        ],
      }),
    );
    expect(plans.map((plan) => plan.pricing.id)).toEqual(['business-monthly', 'agency-s-monthly', 'agency-m-monthly']);
    expect(plans.map((plan) => plan.group)).toEqual(['business', 'agency', 'agency']);
  });

  it('is monthly, and a year is not twelve months', () => {
    const annual = pricing('annual', '168', { intervalCount: 12 });
    const plans = monthlyPlans(
      schema({ business: [product('business', 'Business', [annual, pricing('monthly', '20')])] }),
    );
    expect(plans.map((plan) => plan.pricing.id)).toEqual(['monthly']);
  });

  it('leaves out a product that has no monthly price', () => {
    const annualOnly = product('legacy', 'Legacy', [pricing('legacy-annual', '999', { intervalCount: 12 })]);
    const plans = monthlyPlans(schema({ agency: [annualOnly, product('agency-s', 'Agency S', [pricing('s', '99')])] }));
    expect(plans.map((plan) => plan.product.id)).toEqual(['agency-s']);
  });

  it('is one price per product — the first monthly one is the one billing sells', () => {
    const grandfathered = product('business', 'Business', [pricing('current', '20'), pricing('old', '15')]);
    const plans = monthlyPlans(schema({ business: [grandfathered] }));
    expect(plans.map((plan) => plan.pricing.id)).toEqual(['current']);
  });

  it('is empty when the catalogue is', () => {
    expect(monthlyPlans(schema())).toEqual([]);
  });

  it('reads nothing off the product on the way in but its prices', () => {
    // A product the API hands back with extra keys, and none of them consulted:
    // asking for one that has been dropped fails the query for everybody.
    const withExtras = {
      ...product('business', 'Business', [pricing('live', '20')]),
      isActive: false,
      isSelectable: false,
      featureSet: 'NoAI',
    };
    expect(monthlyPlans(schema({ business: [withExtras as Product] })).map((plan) => plan.pricing.id)).toEqual([
      'live',
    ]);
  });
});

describe('what a plan line says', () => {
  const business = {
    group: 'business' as const,
    product: product('business', 'Business', [], 1),
    pricing: pricing('business-monthly', '20'),
  };
  const agency = {
    group: 'agency' as const,
    product: product('agency-s', 'Agency S', [], 3),
    pricing: pricing('agency-s-monthly', '99'),
  };

  it('prints a price the way a price tag does', () => {
    expect(formatMoney('20', 'Usd')).toBe('$20');
    expect(formatMoney('48.25', 'Usd')).toBe('$48.25');
    expect(formatMoney(999, 'usd')).toBe('$999');
    expect(formatMoney('15', 'Eur')).toBe('€15');
  });

  it('still prints a price on a currency the runtime does not know', () => {
    // Any three letters are a code to Intl (spelled out, with its own kind of
    // space); anything else it refuses, and the fallback takes over.
    expect(formatMoney('15', 'Xyz')).toMatch(/^XYZ\s15$/);
    expect(formatMoney('15', 'Chatfuel')).toBe('15 CHATFUEL');
    expect(formatMoney('n/a', 'Usd')).toBe('n/a USD');
  });

  it('counts bots, and calls zero unlimited', () => {
    expect(botsPhrase(1)).toBe('1 bot');
    expect(botsPhrase(5)).toBe('5 bots');
    expect(botsPhrase(0)).toBe('unlimited bots');
  });

  it('puts price, credits and the bot limit on the line', () => {
    expect(planHint(business)).toBe('$20/mo · $20 AI credits/mo · 1 bot');
    expect(planHint(agency)).toBe('$99/mo · $99 AI credits/mo · 3 bots');
  });

  it('names the plan with its price in one breath', () => {
    expect(planSummary(agency)).toBe('Agency S — $99/mo, $99 AI credits/mo');
  });
});
