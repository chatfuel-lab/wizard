import { describe, expect, it } from 'vitest';
import {
  bySeverity,
  countBySeverity,
  FAQ_ANSWER_MAX,
  findingsFor,
  INSTRUCTIONS_MAX,
  lint,
  readinessScore,
  worstSeverity,
  type LintInput,
} from './lint';
import type { CatalogProduct, CatalogService, FaqRow, KnowledgeBaseInfo } from '../types';

const kb = (over: Partial<KnowledgeBaseInfo> = {}): KnowledgeBaseInfo =>
  ({
    companyName: 'Acme',
    phone: '+1 202 555 0142',
    email: 'hello@acme.com',
    address: '12 Market Street',
    website: 'acme.com',
    howToPay: 'Cards and cash',
    additionalInstructions: 'You are a friendly assistant. Keep replies to two lines.',
    businessHoursSchedule: { workingHours: [{ day: 'Mon', enabled: true, start: '09:00', end: '18:00' }] },
    faqs: [],
    ...over,
  }) as KnowledgeBaseInfo;

const faq = (question: string, answer: string, key = question): FaqRow => ({ question, answer, key });

const product = (id: string, over: Partial<CatalogProduct> = {}): CatalogProduct =>
  ({
    __typename: 'GoodsProduct',
    id,
    title: id,
    description: 'A thing',
    isAvailable: true,
    price: { amount: '9.00', currency: 'USD' },
    images: [{ id: 'img', url: 'u', type: 'Image', status: 'Ready', size: 1 }],
    ...over,
  }) as unknown as CatalogProduct;

const service = (id: string, over: Partial<CatalogService> = {}): CatalogService =>
  ({
    ...(product(id) as unknown as CatalogService),
    __typename: 'GoodsService',
    durationSeconds: 1800,
    images: [],
    ...over,
  }) as unknown as CatalogService;

const input = (over: Partial<LintInput> = {}): LintInput => ({
  kb: kb(),
  faqs: [faq('a', '1'), faq('b', '2'), faq('c', '3'), faq('d', '4'), faq('e', '5')],
  products: [],
  services: [],
  specialists: [],
  catalogReady: true,
  ...over,
});

const ids = (over: Partial<LintInput> = {}) => lint(input(over)).map((finding) => finding.id);

describe('lint', () => {
  it('says nothing before anything has loaded', () => {
    expect(lint(input({ kb: null }))).toEqual([]);
  });

  it('is quiet on a healthy record', () => {
    expect(ids()).toEqual([]);
  });
});

describe('profile findings', () => {
  it('blocks on a missing essential field and only hints at the rest', () => {
    const out = lint(input({ kb: kb({ companyName: '', address: '' }) }));
    expect(out.find((finding) => finding.id === 'profile.missing.companyName')?.severity).toBe('blocker');
    expect(out.find((finding) => finding.id === 'profile.empty.address')?.severity).toBe('tip');
  });

  it('warns on a format that will not work for a customer', () => {
    expect(ids({ kb: kb({ email: 'hello@acme' }) })).toContain('profile.format.email');
  });

  it('does not warn about the format of a field it already reported as empty', () => {
    const out = ids({ kb: kb({ email: '' }) });
    expect(out).toContain('profile.empty.email');
    expect(out).not.toContain('profile.format.email');
  });

  it('warns when no day is open', () => {
    expect(
      ids({
        kb: kb({
          businessHoursSchedule: { workingHours: [{ day: 'Mon', enabled: false, start: '09:00', end: '18:00' }] },
        } as Partial<KnowledgeBaseInfo>),
      }),
    ).toContain('profile.hours.none');
  });
});

describe('instruction findings', () => {
  it('nudges an empty prompt without blocking', () => {
    const out = lint(input({ kb: kb({ additionalInstructions: '' }) }));
    expect(out.find((finding) => finding.id === 'instructions.empty')?.severity).toBe('tip');
  });

  it('warns past the length where the prompt crowds everything else out', () => {
    expect(ids({ kb: kb({ additionalInstructions: 'x'.repeat(INSTRUCTIONS_MAX + 1) }) })).toContain(
      'instructions.long',
    );
  });

  it('spots an FAQ pasted into the prompt', () => {
    expect(ids({ kb: kb({ additionalInstructions: 'Be brief.\nQ: do you ship?\nA: yes' }) })).toContain(
      'instructions.faq',
    );
  });

  it('spots a price list pasted into the prompt', () => {
    expect(ids({ kb: kb({ additionalInstructions: 'Menu: espresso $3, latte $4.50, cake 6.00' }) })).toContain(
      'instructions.prices',
    );
  });

  it('leaves a prompt that mentions one number alone', () => {
    expect(ids({ kb: kb({ additionalInstructions: 'Offer the 15.00 deposit when asked.' }) })).not.toContain(
      'instructions.prices',
    );
  });
});

describe('FAQ findings', () => {
  it('blocks on no FAQs at all and hints at a thin list', () => {
    expect(lint(input({ faqs: [] })).find((finding) => finding.id === 'faq.none')?.severity).toBe('blocker');
    expect(ids({ faqs: [faq('a', '1')] })).toContain('faq.thin');
  });

  it('blocks on an empty answer', () => {
    const out = lint(input({ faqs: [faq('Do you ship?', '   ')] }));
    expect(out.find((finding) => finding.id.startsWith('faq.noanswer'))?.severity).toBe('blocker');
  });

  it('warns on an answer nobody will read', () => {
    const out = ids({ faqs: [faq('q', 'x'.repeat(FAQ_ANSWER_MAX + 1))] });
    expect(out.some((id) => id.startsWith('faq.long'))).toBe(true);
  });

  it('treats the same question with two answers as worse than an exact duplicate', () => {
    const contradictory = lint(input({ faqs: [faq('Do you ship?', 'Yes', 'k1'), faq('do you ship', 'No', 'k2')] }));
    expect(contradictory.find((finding) => finding.id === 'faq.duplicate.k2')?.severity).toBe('warning');

    const identical = lint(input({ faqs: [faq('Do you ship?', 'Yes', 'k1'), faq('Do you ship?', 'Yes', 'k2')] }));
    expect(identical.find((finding) => finding.id === 'faq.duplicate.k2')?.severity).toBe('tip');
  });

  it('matches duplicates through punctuation and case', () => {
    const out = ids({ faqs: [faq('Do you ship?', 'Yes', 'k1'), faq('DO YOU SHIP', 'Yes', 'k2')] });
    expect(out).toContain('faq.duplicate.k2');
  });

  it('points at the row to open', () => {
    const out = lint(input({ faqs: [faq('q', '', 'the-key')] }));
    expect(out.find((finding) => finding.id.startsWith('faq.noanswer'))?.item).toBe('the-key');
  });
});

describe('catalog findings', () => {
  it('stays quiet until the catalog has actually loaded', () => {
    expect(ids({ catalogReady: false, products: [] })).toEqual([]);
  });

  it('warns about a product with no price and hints about no photo or description', () => {
    const out = ids({ products: [product('p1', { price: null, images: [], description: '' })] });
    expect(out).toContain('products.noprice.p1');
    expect(out).toContain('products.nophoto.p1');
    expect(out).toContain('products.nodesc.p1');
  });

  it('does not ask a service for a photo', () => {
    expect(ids({ services: [service('s1')] })).not.toContain('services.nophoto.s1');
  });

  it('warns when two entries share a title', () => {
    expect(ids({ products: [product('p1', { title: 'Tea' }), product('p2', { title: 'tea ' })] })).toContain(
      'products.duplicate.p2',
    );
  });

  it('warns when the assistant has nothing available to offer', () => {
    expect(ids({ products: [product('p1', { isAvailable: false })] })).toContain('products.allunavailable');
    expect(ids({ products: [product('p1', { isAvailable: false }), product('p2')] })).not.toContain(
      'products.allunavailable',
    );
  });
});

describe('scoring and grouping', () => {
  it('is 100 on a clean record', () => {
    expect(readinessScore([])).toBe(100);
  });

  it('never falls below zero', () => {
    const findings = lint(
      input({ kb: kb({ companyName: '', phone: '', email: '', address: '', website: '', howToPay: '' }), faqs: [] }),
    );
    expect(readinessScore(findings)).toBeGreaterThanOrEqual(0);
  });

  it('costs more for a blocker than for a tip', () => {
    const one = lint(input({ faqs: [] }));
    expect(readinessScore(one)).toBeLessThan(readinessScore(lint(input({ faqs: [faq('a', '1')] }))));
  });

  it('counts by severity', () => {
    expect(countBySeverity(lint(input({ faqs: [] })))).toMatchObject({ blocker: 1 });
  });

  it('scopes findings to a source and names the worst one', () => {
    const findings = lint(input({ kb: kb({ companyName: '' }), faqs: [] }));
    expect(findingsFor(findings, 'profile').every((finding) => finding.source === 'profile')).toBe(true);
    expect(worstSeverity(findings, 'profile')).toBe('blocker');
    expect(worstSeverity(findings, 'team')).toBeNull();
  });

  it('sorts blockers first', () => {
    const findings = lint(input({ kb: kb({ address: '' }), faqs: [] }));
    expect(bySeverity(findings)[0]!.severity).toBe('blocker');
  });
});
