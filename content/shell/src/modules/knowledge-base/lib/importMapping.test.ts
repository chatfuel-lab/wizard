import { describe, expect, it } from 'vitest';
import {
  applyMapping,
  dominantCurrency,
  guessMapping,
  isCurrencyCode,
  missingRequired,
  normalizeAmount,
  normalizeHeader,
  parseAvailability,
  parsePrice,
  setMapping,
  toFaqEntry,
  toProductInput,
} from './importMapping';
import { GoodsItemPriceCurrency } from '~api/generated/knowledge-base/graphql';
import type { CatalogItem } from '../types';

describe('normalizeHeader', () => {
  it('folds case, accents and separators', () => {
    expect(normalizeHeader('Café Price')).toBe('cafeprice');
    expect(normalizeHeader('Product name')).toBe('productname');
    expect(normalizeHeader('product_name')).toBe('productname');
    expect(normalizeHeader('  PRICE  ')).toBe('price');
  });
});

describe('guessMapping', () => {
  it('finds English FAQ columns', () => {
    expect(guessMapping(['Question', 'Answer'], 'faq')).toEqual({ question: 0, answer: 1 });
  });

  it('finds them under the spellings an export uses', () => {
    expect(guessMapping(['Q', 'A'], 'faq')).toEqual({ question: 0, answer: 1 });
    expect(guessMapping(['Prompt', 'Response'], 'faq')).toEqual({ question: 0, answer: 1 });
    expect(guessMapping(['Questions', 'Replies'], 'faq')).toEqual({ question: 0, answer: 1 });
  });

  it('ignores the columns it does not know', () => {
    expect(guessMapping(['id', 'Answer', 'tags', 'Question'], 'faq')).toEqual({ question: 3, answer: 1 });
  });

  it('maps the product fields, currency included', () => {
    expect(guessMapping(['Title', 'Description', 'Price', 'Currency', 'In stock'], 'products')).toEqual({
      title: 0,
      description: 1,
      amount: 2,
      currency: 3,
      available: 4,
    });
  });

  it('does not let "price" swallow "price currency"', () => {
    const mapping = guessMapping(['Product', 'Price', 'Price currency'], 'products');
    expect(mapping.amount).toBe(1);
    expect(mapping.currency).toBe(2);
  });

  it('matches a decorated header by containment', () => {
    expect(guessMapping(['Item title (EN)', 'Long description'], 'products')).toEqual({ title: 0, description: 1 });
  });

  it('falls back to position when no header says anything', () => {
    expect(guessMapping(['Column 1', 'Column 2'], 'faq')).toEqual({ question: 0, answer: 1 });
  });

  it('does not invent a mapping for a single column', () => {
    expect(guessMapping(['Column 1'], 'faq')).toEqual({ question: 0 });
    expect(missingRequired(guessMapping(['Column 1'], 'faq'), 'faq').map((field) => field.id)).toEqual(['answer']);
  });
});

describe('setMapping', () => {
  it('moves a column away from the field that held it', () => {
    const next = setMapping({ question: 0, answer: 1 }, 'question', 1);
    expect(next).toEqual({ question: 1 });
  });

  it('unmaps with null', () => {
    expect(setMapping({ question: 0, answer: 1 }, 'answer', null)).toEqual({ question: 0 });
  });
});

describe('normalizeAmount', () => {
  const cases: [string, string | null][] = [
    ['29', '29'],
    ['29.00', '29.00'],
    ['$29.99', '29.99'],
    ['29,99 €', '29.99'],
    ['1,299.50', '1299.50'],
    ['1.299,50', '1299.50'],
    ['1 299,00', '1299.00'],
    ['1,500', '1500'],
    ['1.299', '1299'],
    /* Ambiguous by construction: three digits after a single separator is read
     * as a thousands group, so a 3-decimal export reads high. The review table
     * shows this number before anything is created. */
    ['29.990', '29990'],
    ['29.9999', '30.00'],
    ['USD 7', '7'],
    ['', null],
    ['free', null],
    ['-5', null],
  ];
  for (const [raw, expected] of cases) {
    it(`${raw || '(empty)'} → ${expected}`, () => expect(normalizeAmount(raw)).toBe(expected));
  }
});

describe('parsePrice', () => {
  it('reads the currency out of a symbol', () => {
    expect(parsePrice('$29.99')).toEqual({ amount: '29.99', currency: 'USD' });
    expect(parsePrice('29,99 €')).toEqual({ amount: '29.99', currency: 'EUR' });
    expect(parsePrice('R$ 59,90')).toEqual({ amount: '59.90', currency: 'BRL' });
  });

  it('reads a three-letter code', () => {
    expect(parsePrice('GBP 12.00')).toEqual({ amount: '12.00', currency: 'GBP' });
  });

  it('leaves the currency open when there is none', () => {
    expect(parsePrice('49')).toEqual({ amount: '49', currency: null });
  });

  it('is null for something that is not a price', () => {
    expect(parsePrice('call us')).toBe(null);
  });

  it('knows the enum', () => {
    expect(isCurrencyCode('usd')).toBe(true);
    expect(isCurrencyCode('XXXX')).toBe(false);
  });
});

describe('parseAvailability', () => {
  it('reads yes and no under the spellings a sheet uses', () => {
    for (const word of ['yes', 'Y', 'TRUE', '1', 'In stock', 'Active', 'enabled']) {
      expect(parseAvailability(word)).toBe(true);
    }
    for (const word of ['no', 'FALSE', '0', 'out of stock', 'Sold out', 'disabled']) {
      expect(parseAvailability(word)).toBe(false);
    }
  });

  it('is null for a word it does not know, so the caller keeps the decision', () => {
    expect(parseAvailability('backordered')).toBe(null);
    expect(parseAvailability('')).toBe(null);
  });
});

describe('applyMapping', () => {
  it('picks the mapped cells', () => {
    const values = applyMapping(['id-1', 'Do you ship?', 'Yes'], { question: 1, answer: 2 }, 'faq');
    expect(values).toEqual({ question: 'Do you ship?', answer: 'Yes' });
  });

  it('splits a price column that carries its own currency', () => {
    const values = applyMapping(['Sofa', 'Blue', '$299.00'], { title: 0, description: 1, amount: 2 }, 'products');
    expect(values.amount).toBe('299.00');
    expect(values.currency).toBe('USD');
  });

  it('keeps an explicit currency column over the symbol', () => {
    const values = applyMapping(
      ['Sofa', '', '$299', 'EUR'],
      { title: 0, description: 1, amount: 2, currency: 3 },
      'products',
    );
    expect(values.currency).toBe('EUR');
  });

  it('drops a currency that is not a real code', () => {
    const values = applyMapping(
      ['Sofa', '', '299', 'dollars'],
      { title: 0, description: 1, amount: 2, currency: 3 },
      'products',
    );
    expect(values.currency).toBe('');
  });
});

describe('wire shapes', () => {
  it('trims an FAQ entry', () => {
    expect(toFaqEntry({ question: ' Q? ', answer: ' A ' })).toEqual({ question: 'Q?', answer: 'A' });
  });

  it('builds a product with a price', () => {
    const input = toProductInput(
      { title: 'Sofa', description: 'Blue', amount: '299', currency: 'EUR' },
      GoodsItemPriceCurrency.Usd,
    );
    expect(input).toEqual({
      title: 'Sofa',
      description: 'Blue',
      images: [],
      isAvailable: true,
      price: { amount: '299', currency: 'EUR' },
    });
  });

  it('omits the price when the amount is unreadable rather than pricing it at zero', () => {
    const input = toProductInput({ title: 'Sofa', amount: 'ask us' }, GoodsItemPriceCurrency.Usd);
    expect(input.price).toBeUndefined();
  });

  it('falls back to the catalog currency', () => {
    const input = toProductInput({ title: 'Sofa', amount: '10' }, GoodsItemPriceCurrency.Gbp);
    expect(input.price).toEqual({ amount: '10', currency: 'GBP' });
  });

  it('takes the availability column when it says something', () => {
    expect(toProductInput({ title: 'Sofa', available: 'no' }, GoodsItemPriceCurrency.Usd).isAvailable).toBe(false);
    expect(toProductInput({ title: 'Sofa', available: 'backordered' }, GoodsItemPriceCurrency.Usd).isAvailable).toBe(
      true,
    );
  });
});

describe('dominantCurrency', () => {
  const priced = (currency: string | null): CatalogItem =>
    ({
      __typename: 'GoodsProduct',
      id: currency ?? 'none',
      title: 't',
      description: '',
      isAvailable: true,
      images: [],
      price: currency ? { amount: '1', currency } : null,
    }) as unknown as CatalogItem;

  it('is the one most of the catalog uses', () => {
    expect(dominantCurrency([priced('EUR'), priced('EUR'), priced('USD')])).toBe('EUR');
  });

  it('is USD for an empty catalog', () => {
    expect(dominantCurrency([])).toBe('USD');
    expect(dominantCurrency([priced(null)])).toBe('USD');
  });
});
