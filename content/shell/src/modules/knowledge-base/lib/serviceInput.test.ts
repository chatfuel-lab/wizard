import { describe, expect, it } from 'vitest';
import { GoodsItemPriceCurrency } from '~api/generated/knowledge-base/graphql';
import {
  DEFAULT_DURATION_MIN,
  MAX_DURATION_MIN,
  MIN_DURATION_SECONDS,
  sameServiceDraft,
  serviceDraftOf,
  serviceFieldForCode,
  serviceInputOf,
  serviceInputOfDraft,
  serviceInputWithAvailability,
  validateServiceDraft,
  type ServiceDraft,
} from './serviceInput';
import type { CatalogService } from '../types';

const service = (over: Partial<CatalogService> = {}): CatalogService =>
  ({
    __typename: 'GoodsService',
    id: 'svc-1',
    title: 'Cupping session',
    description: 'Six coffees side by side.',
    durationSeconds: 3600,
    isAvailable: true,
    price: { amount: '25.00', currency: GoodsItemPriceCurrency.Eur },
    images: [{ id: 'file-1', url: 'https://example.test/a.jpg' }],
    ...over,
  }) as unknown as CatalogService;

const draft = (over: Partial<ServiceDraft> = {}): ServiceDraft => ({
  title: 'Cupping session',
  description: 'Six coffees side by side.',
  durationMinutes: 60,
  priceAmount: '25.00',
  currency: GoodsItemPriceCurrency.Eur,
  isAvailable: true,
  images: [{ id: 'file-1' }],
  ...over,
});

describe('serviceInputOf', () => {
  it('re-sends every field, duration included', () => {
    expect(serviceInputOf(service())).toEqual({
      title: 'Cupping session',
      description: 'Six coffees side by side.',
      durationSeconds: 3600,
      isAvailable: true,
      price: { amount: '25.00', currency: 'EUR' },
      images: ['file-1'],
    });
  });

  it('changes only the flag for an availability write', () => {
    expect(serviceInputWithAvailability(service(), false).durationSeconds).toBe(3600);
    expect(serviceInputWithAvailability(service(), false).isAvailable).toBe(false);
  });
});

describe('serviceDraftOf', () => {
  it('converts seconds to minutes for the UI', () => {
    expect(serviceDraftOf(service()).durationMinutes).toBe(60);
  });

  it('starts a new service at the default duration', () => {
    expect(serviceDraftOf(null).durationMinutes).toBe(DEFAULT_DURATION_MIN);
  });
});

describe('validateServiceDraft', () => {
  it('passes a good draft', () => {
    expect(validateServiceDraft(draft())).toEqual({});
  });

  it('needs a duration', () => {
    expect(validateServiceDraft(draft({ durationMinutes: null })).duration).toBeTruthy();
    expect(validateServiceDraft(draft({ durationMinutes: 0 })).duration).toBeTruthy();
    expect(validateServiceDraft(draft({ durationMinutes: MAX_DURATION_MIN + 1 })).duration).toBeTruthy();
  });

  it('still checks everything a product checks', () => {
    expect(validateServiceDraft(draft({ title: '' })).title).toBeTruthy();
    expect(validateServiceDraft(draft({ priceAmount: 'free-ish' })).price).toBeTruthy();
  });
});

describe('serviceInputOfDraft', () => {
  it('converts minutes back to seconds', () => {
    expect(serviceInputOfDraft(draft({ durationMinutes: 45 })).durationSeconds).toBe(2700);
  });

  it('never sends less than the server floor', () => {
    expect(serviceInputOfDraft(draft({ durationMinutes: 0 })).durationSeconds).toBe(MIN_DURATION_SECONDS);
    expect(serviceInputOfDraft(draft({ durationMinutes: null })).durationSeconds).toBe(DEFAULT_DURATION_MIN * 60);
  });

  it('sends no price for a blank amount', () => {
    expect(serviceInputOfDraft(draft({ priceAmount: '' })).price).toBeNull();
  });
});

describe('sameServiceDraft', () => {
  it('notices the duration', () => {
    expect(sameServiceDraft(draft(), draft({ durationMinutes: 30 }))).toBe(false);
    expect(sameServiceDraft(draft(), draft())).toBe(true);
  });
});

describe('serviceFieldForCode', () => {
  it('puts the duration error under the duration field', () => {
    expect(serviceFieldForCode('ErrGoodsServiceDurationRequired')).toBe('duration');
    expect(serviceFieldForCode('GoodsServiceImagesTooMuch')).toBe('images');
    expect(serviceFieldForCode('GoodsItemTitleTooLong')).toBe('title');
    expect(serviceFieldForCode(null)).toBe('form');
  });
});
