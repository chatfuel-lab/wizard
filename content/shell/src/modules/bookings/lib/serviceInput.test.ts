import { describe, expect, it } from 'vitest';
import { GoodsItemPriceCurrency } from '~api/generated/bookings/graphql';
import { sampleFile, sampleService } from './samples';
import {
  CURRENCY_OPTIONS,
  formatPrice,
  normalizeAmount,
  sameServiceDraft,
  serviceDraftOf,
  serviceFieldForCode,
  serviceInputOf,
  serviceInputOfDraft,
  serviceInputWithAvailability,
  validateServiceDraft,
} from './serviceInput';

describe('serviceInputOf', () => {
  it('is the full record, field for field', () => {
    const record = sampleService({ images: [sampleFile('img-1'), sampleFile('img-2')] });
    expect(serviceInputOf(record)).toEqual({
      title: 'Consultation',
      description: '',
      durationSeconds: 1800,
      isAvailable: true,
      price: { amount: '30.00', currency: GoodsItemPriceCurrency.Usd },
      images: ['img-1', 'img-2'],
    });
  });
  it('keeps a null price null', () => {
    expect(serviceInputOf(sampleService({ price: null })).price).toBeNull();
  });
  it('flips only availability', () => {
    const record = sampleService();
    const off = serviceInputWithAvailability(record, false);
    expect(off.isAvailable).toBe(false);
    expect({ ...off, isAvailable: true }).toEqual(serviceInputOf(record));
  });
});

describe('serviceDraftOf', () => {
  it('starts a new service at 30 min, available, no price, in the given currency', () => {
    const draft = serviceDraftOf(null, GoodsItemPriceCurrency.Eur);
    expect(draft).toEqual({
      title: '',
      description: '',
      durationMinutes: 30,
      priceAmount: '',
      currency: 'EUR',
      isAvailable: true,
      images: [],
    });
  });
  it('reads a record into minutes and text', () => {
    const draft = serviceDraftOf(sampleService({ durationSeconds: 2700, images: [sampleFile('img-1')] }));
    expect(draft.durationMinutes).toBe(45);
    expect(draft.priceAmount).toBe('30.00');
    expect(draft.currency).toBe('USD');
    expect(draft.images).toEqual([{ id: 'img-1', url: 'https://files.example/img-1.png' }]);
  });
  it('round-trips a record through draft → input', () => {
    const record = sampleService({ description: 'Hi', images: [sampleFile('a')] });
    expect(serviceInputOfDraft(serviceDraftOf(record))).toEqual(serviceInputOf(record));
  });
});

describe('normalizeAmount', () => {
  it('accepts money and nothing else', () => {
    expect(normalizeAmount('25')).toBe('25.00');
    expect(normalizeAmount('25.5')).toBe('25.50');
    expect(normalizeAmount('25,50')).toBe('25.50');
    expect(normalizeAmount(' 007.10 ')).toBe('7.10');
    expect(normalizeAmount('')).toBeNull();
    expect(normalizeAmount('abc')).toBeNull();
    expect(normalizeAmount('25.123')).toBeNull();
    expect(normalizeAmount('-5')).toBeNull();
  });
});

describe('validateServiceDraft', () => {
  const ok = serviceDraftOf(sampleService());
  it('passes a sane draft', () => {
    expect(validateServiceDraft(ok)).toEqual({});
  });
  it('requires a title of 2..120', () => {
    expect(validateServiceDraft({ ...ok, title: ' ' }).title).toMatch(/required/);
    expect(validateServiceDraft({ ...ok, title: 'A' }).title).toMatch(/short/);
    expect(validateServiceDraft({ ...ok, title: 'x'.repeat(121) }).title).toMatch(/120/);
  });
  it('requires a duration within a day', () => {
    expect(validateServiceDraft({ ...ok, durationMinutes: null }).duration).toMatch(/required/);
    expect(validateServiceDraft({ ...ok, durationMinutes: 0 }).duration).toMatch(/required/);
    expect(validateServiceDraft({ ...ok, durationMinutes: 1441 }).duration).toMatch(/day/);
  });
  it('accepts a blank price and rejects a non-numeric one', () => {
    expect(validateServiceDraft({ ...ok, priceAmount: '' }).price).toBeUndefined();
    expect(validateServiceDraft({ ...ok, priceAmount: 'ten' }).price).toMatch(/25/);
  });
  it('caps images and description', () => {
    expect(
      validateServiceDraft({ ...ok, images: Array.from({ length: 11 }, (_, i) => ({ id: `i${i}` })) }).images,
    ).toMatch(/10/);
    expect(validateServiceDraft({ ...ok, description: 'x'.repeat(1001) }).description).toMatch(/1000/);
  });
});

describe('serviceInputOfDraft', () => {
  it('trims, converts minutes to seconds and normalises money', () => {
    const input = serviceInputOfDraft({
      ...serviceDraftOf(null),
      title: '  Haircut ',
      description: ' Wash and cut ',
      durationMinutes: 45,
      priceAmount: '25',
      currency: GoodsItemPriceCurrency.Eur,
      images: [{ id: 'f1' }],
    });
    expect(input).toEqual({
      title: 'Haircut',
      description: 'Wash and cut',
      durationSeconds: 2700,
      isAvailable: true,
      price: { amount: '25.00', currency: 'EUR' },
      images: ['f1'],
    });
  });
  it('sends no price for a blank amount and never less than a minute', () => {
    const input = serviceInputOfDraft({ ...serviceDraftOf(null), title: 'X', priceAmount: '  ', durationMinutes: 0.2 });
    expect(input.price).toBeNull();
    expect(input.durationSeconds).toBe(60);
  });
});

describe('sameServiceDraft', () => {
  it('compares every field including image order', () => {
    const a = serviceDraftOf(sampleService({ images: [sampleFile('1'), sampleFile('2')] }));
    expect(sameServiceDraft(a, { ...a })).toBe(true);
    expect(sameServiceDraft(a, { ...a, isAvailable: false })).toBe(false);
    expect(sameServiceDraft(a, { ...a, images: [...a.images].reverse() })).toBe(false);
    expect(sameServiceDraft(a, { ...a, priceAmount: '30.0' })).toBe(false);
  });
});

describe('serviceFieldForCode', () => {
  it('routes codes to fields', () => {
    expect(serviceFieldForCode('GoodsItemTitleNotUnique')).toBe('title');
    expect(serviceFieldForCode('GoodsItemTitleRequired')).toBe('title');
    expect(serviceFieldForCode('GoodsItemDescriptionTooLong')).toBe('description');
    expect(serviceFieldForCode('GoodsItemPriceAmountWrongFormat')).toBe('price');
    expect(serviceFieldForCode('GoodsItemPriceCurrencyRequired')).toBe('price');
    expect(serviceFieldForCode('GoodsServiceImagesTooMuch')).toBe('images');
    expect(serviceFieldForCode('ErrGoodsServiceDurationRequired')).toBe('duration');
    expect(serviceFieldForCode('GoodsItemsTooMuchForBot')).toBe('form');
    expect(serviceFieldForCode(null)).toBe('form');
  });
});

describe('formatPrice', () => {
  it('formats money, free and none', () => {
    expect(formatPrice({ amount: '25.00', currency: 'USD' }, 'en-US')).toBe('$25.00');
    expect(formatPrice({ amount: '80.00', currency: 'EUR' }, 'en-US')).toBe('€80.00');
    expect(formatPrice({ amount: '0.00', currency: 'USD' })).toBe('Free');
    expect(formatPrice(null)).toBe('No price');
    expect(formatPrice({ amount: 'x', currency: 'USD' })).toBe('x USD');
    // A code Intl refuses prints the number and the code — the same fallback the table takes.
    expect(formatPrice({ amount: '12', currency: 'not-a-code' }, 'en-US')).toBe('12.00 not-a-code');
  });
});

describe('CURRENCY_OPTIONS', () => {
  it('lists every enum value once, code as label', () => {
    expect(CURRENCY_OPTIONS.length).toBe(Object.values(GoodsItemPriceCurrency).length);
    expect(CURRENCY_OPTIONS.find((o) => o.value === 'USD')).toEqual({ value: 'USD', label: 'USD' });
  });
});
