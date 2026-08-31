import { describe, expect, it } from 'vitest';
import { budgetBreakdown, faqChars, formatChars, instructionsChars, itemChars, profileChars, share } from './budget';
import type { CatalogItem, KnowledgeBaseInfo } from '../types';

const kb = (over: Partial<KnowledgeBaseInfo> = {}): KnowledgeBaseInfo =>
  ({
    companyName: 'Acme',
    email: 'a@b.c',
    phone: '+1',
    address: '',
    website: '',
    howToPay: '',
    additionalInstructions: '',
    businessHoursSchedule: { workingHours: [] },
    faqs: [],
    ...over,
  }) as KnowledgeBaseInfo;

const product = (title: string, description = '', amount?: string): CatalogItem =>
  ({
    __typename: 'GoodsProduct',
    id: title,
    title,
    description,
    isAvailable: true,
    price: amount ? { amount, currency: 'USD' } : null,
    images: [],
  }) as unknown as CatalogItem;

describe('per-source counts', () => {
  it('counts the profile fields', () => {
    expect(profileChars(kb())).toBe('Acme'.length + 'a@b.c'.length + '+1'.length);
  });

  it('counts only the enabled days of the schedule', () => {
    const withHours = kb({
      businessHoursSchedule: {
        workingHours: [
          { day: 'Mon', enabled: true, start: '09:00', end: '18:00' },
          { day: 'Sun', enabled: false, start: '09:00', end: '18:00' },
        ],
      },
    } as Partial<KnowledgeBaseInfo>);
    expect(profileChars(withHours) - profileChars(kb())).toBe('Mon'.length + '09:00'.length + '18:00'.length + 2);
  });

  it('counts instructions and FAQs', () => {
    expect(instructionsChars(kb({ additionalInstructions: 'hello' }))).toBe(5);
    expect(faqChars([{ question: 'ab', answer: 'cde' }])).toBe(5);
  });

  it('counts a catalog item with and without a price', () => {
    expect(itemChars(product('Tea', 'green'))).toBe(3 + 5);
    expect(itemChars(product('Tea', 'green', '9.00'))).toBe(3 + 5 + 4 + 3);
  });
});

describe('budgetBreakdown', () => {
  const base = { kb: kb(), products: [], services: [], teamChars: 0, full: false };

  it('keeps the server total and splits the catalog by estimated share', () => {
    const out = budgetBreakdown({
      ...base,
      total: 1000,
      catalog: 300,
      products: [product('aaaa')],
      services: [product('bb')],
    });
    expect(out.total).toBe(1000);
    // 4 of 6 estimated characters are the product's.
    expect(out.bySource.products).toBe(200);
    expect(out.bySource.services).toBe(100);
    expect(out.bySource.products + out.bySource.services).toBe(300);
  });

  it('puts everything it cannot explain into other', () => {
    const out = budgetBreakdown({ ...base, total: 1000, catalog: 0 });
    expect(out.bySource.other).toBe(1000 - profileChars(kb()));
  });

  it('never returns a negative slice when the estimate over-counts', () => {
    const out = budgetBreakdown({ ...base, total: 1, catalog: 0 });
    expect(out.bySource.other).toBe(0);
  });

  it('handles an empty catalog without dividing by zero', () => {
    const out = budgetBreakdown({ ...base, total: 0, catalog: 0 });
    expect(out.bySource.products).toBe(0);
    expect(out.bySource.services).toBe(0);
  });
});

describe('formatting', () => {
  it('is zero, not NaN, on a fresh bot', () => {
    expect(share(0, 0)).toBe(0);
  });

  it('groups thousands', () => {
    expect(formatChars(1234567)).toBe('1 234 567');
    expect(formatChars(42)).toBe('42');
  });
});
