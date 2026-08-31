/**
 * Which column is the question, and which one is the price?
 *
 * The guess is by header NAME, and the aliases are the spellings the same
 * column arrives under from different shop exports: "Unit price", "unit_price"
 * and "unitPrice" are all the price column. A guess is never
 * final — the map step shows every field with a picker, and this file is
 * equally the place that applies a manual override.
 *
 * Everything here is strings in and strings out. Values stay text all the way
 * through the review table (that is what a person edits), and only turn into
 * wire input at apply time — `toFaqEntry` / `toProductInput` at the bottom.
 */
import { GoodsItemPriceCurrency } from '~api/generated/knowledge-base/graphql';
import type { CatalogItem, FaqEntry } from '../types';
import type { ImportTarget } from './knowledgeParams';

export type FaqField = 'question' | 'answer';
export type ProductField = 'title' | 'description' | 'amount' | 'currency' | 'available';
export type ImportField = FaqField | ProductField;

export interface FieldSpec {
  id: ImportField;
  label: string;
  /** Nothing can be created without it. */
  required: boolean;
  /** Header names, normalized the same way the file's headers are. */
  aliases: readonly string[];
}

/**
 * The target's fields, in the order the review table shows them.
 *
 * Products have no `images` field on purpose: a CSV can only carry a URL, the
 * catalog wants an uploaded FileID, and an import that silently dropped the
 * photos would look like it worked.
 */
export const FIELDS: Record<ImportTarget, readonly FieldSpec[]> = {
  faq: [
    {
      id: 'question',
      label: 'Question',
      required: true,
      aliases: ['question', 'questions', 'q', 'faq', 'ask', 'prompt'],
    },
    {
      id: 'answer',
      label: 'Answer',
      required: true,
      aliases: ['answer', 'answers', 'a', 'reply', 'replies', 'response'],
    },
  ],
  products: [
    {
      id: 'title',
      label: 'Title',
      required: true,
      aliases: ['title', 'name', 'product', 'productname', 'item', 'itemname', 'label'],
    },
    {
      id: 'description',
      label: 'Description',
      required: false,
      aliases: ['description', 'desc', 'details', 'detail', 'summary', 'about', 'notes'],
    },
    {
      id: 'amount',
      label: 'Price',
      required: false,
      aliases: ['price', 'amount', 'cost', 'value', 'unitprice', 'saleprice', 'rate'],
    },
    {
      id: 'currency',
      label: 'Currency',
      required: false,
      aliases: ['currency', 'cur', 'ccy', 'currencycode'],
    },
    {
      id: 'available',
      label: 'Available',
      required: false,
      aliases: ['available', 'availability', 'instock', 'stock', 'active', 'status', 'enabled', 'published'],
    },
  ],
};

/** Field → column index. A field with no entry is not mapped; a column may serve only one field. */
export type ColumnMapping = Partial<Record<ImportField, number>>;

/** Values as the review table holds them: text, per field, edited in place. */
export type DraftValues = Partial<Record<ImportField, string>>;

/**
 * Header text → a key both sides of the comparison agree on.
 *
 * Accents stripped (NFD drops the combining marks) so "Café" matches "cafe",
 * and every separator removed so "Product name", "product_name"
 * and "ProductName" are one key.
 */
export function normalizeHeader(header: string): string {
  return header
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/**
 * Guess the mapping from the header row.
 *
 * Two passes, and the order is the whole trick: an EXACT alias match claims
 * its column first, so a file with both "Price" and "Price currency" does not
 * lose the currency column to the substring pass. Only then do the leftovers
 * try to match by containment.
 *
 * When the headers say nothing (a file with no header row, or one in a
 * language nobody listed), the required fields fall back to position — a
 * two-column FAQ export is question, answer far more often than not. The map
 * step shows the result either way; this is a starting point, not a verdict.
 */
export function guessMapping(columns: readonly string[], target: ImportTarget): ColumnMapping {
  const fields = FIELDS[target];
  const keys = columns.map(normalizeHeader);
  const mapping: ColumnMapping = {};
  const taken = new Set<number>();

  const claim = (field: ImportField, index: number) => {
    mapping[field] = index;
    taken.add(index);
  };

  for (const field of fields) {
    const at = keys.findIndex((key, index) => !taken.has(index) && key !== '' && field.aliases.includes(key));
    if (at >= 0) claim(field.id, at);
  }

  for (const field of fields) {
    if (mapping[field.id] !== undefined) continue;
    const at = keys.findIndex(
      (key, index) =>
        !taken.has(index) && key.length > 2 && field.aliases.some((alias) => alias.length > 2 && key.includes(alias)),
    );
    if (at >= 0) claim(field.id, at);
  }

  const required = fields.filter((field) => field.required);
  if (required.every((field) => mapping[field.id] === undefined)) {
    required.forEach((field, position) => {
      if (position < columns.length) claim(field.id, position);
    });
  }
  return mapping;
}

/**
 * A manual override. `index === null` unmaps the field; taking a column that
 * another field holds moves it, because one column cannot be two fields and
 * silently mapping it twice is how an import writes the question into the
 * answer as well.
 */
export function setMapping(mapping: ColumnMapping, field: ImportField, index: number | null): ColumnMapping {
  const next: ColumnMapping = { ...mapping };
  if (index === null) {
    delete next[field];
    return next;
  }
  for (const key of Object.keys(next) as ImportField[]) {
    if (next[key] === index) delete next[key];
  }
  next[field] = index;
  return next;
}

/** Required fields with no column behind them — what blocks the review step. */
export const missingRequired = (mapping: ColumnMapping, target: ImportTarget): FieldSpec[] =>
  FIELDS[target].filter((field) => field.required && mapping[field.id] === undefined);

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

const CURRENCY_CODES = new Set<string>(Object.values(GoodsItemPriceCurrency));

export const isCurrencyCode = (raw: string): raw is GoodsItemPriceCurrency =>
  CURRENCY_CODES.has(raw.trim().toUpperCase());

/**
 * Symbols, longest first: `R$` must be tried before `$`, or every Brazilian
 * price becomes dollars. Ambiguous symbols (kr, $ alone in a Canadian export)
 * are a guess the review step shows and a person can change.
 */
const CURRENCY_SYMBOLS: readonly [string, string][] = [
  ['R$', 'BRL'],
  ['A$', 'AUD'],
  ['C$', 'CAD'],
  ['MX$', 'MXN'],
  ['NZ$', 'NZD'],
  ['US$', 'USD'],
  ['€', 'EUR'],
  ['£', 'GBP'],
  ['¥', 'JPY'],
  ['₹', 'INR'],
  ['₽', 'RUB'],
  ['₴', 'UAH'],
  ['₺', 'TRY'],
  ['₩', 'KRW'],
  ['₪', 'ILS'],
  ['฿', 'THB'],
  ['₦', 'NGN'],
  ['₱', 'PHP'],
  ['₫', 'VND'],
  ['₸', 'KZT'],
  ['₾', 'GEL'],
  ['zł', 'PLN'],
  ['Kč', 'CZK'],
  ['$', 'USD'],
];

/**
 * Digits into the "29" or "29.00" the API accepts.
 *
 * The hard part is which separator is the decimal one. `1.299,50` and
 * `1,299.50` are the same money written by two continents, so the rule is:
 * when both appear, the LAST one is the decimal point and the other is
 * thousands.
 *
 * With only ONE separator it is genuinely ambiguous, and the rule is: exactly
 * three digits after it is a thousands group — `1,500` and `1.299` are fifteen
 * hundred and one thousand two hundred and ninety-nine. That reads a 3-decimal
 * export (`29.990`) as 29 990, which is why the review table shows the
 * normalized amount for every row before a single product is created. Anything
 * else after the separator is a decimal, rounded to cents.
 */
export function normalizeAmount(raw: string): string | null {
  const cleaned = raw.replace(/[^\d.,-]/g, '');
  if (cleaned === '' || !/\d/.test(cleaned)) return null;
  const negative = cleaned.trim().startsWith('-');
  const digitsOnly = cleaned.replace(/-/g, '');

  const lastDot = digitsOnly.lastIndexOf('.');
  const lastComma = digitsOnly.lastIndexOf(',');
  let normalized: string;
  if (lastDot >= 0 && lastComma >= 0) {
    const decimalAt = Math.max(lastDot, lastComma);
    normalized = `${digitsOnly.slice(0, decimalAt).replace(/[.,]/g, '')}.${digitsOnly.slice(decimalAt + 1).replace(/[.,]/g, '')}`;
  } else {
    const at = Math.max(lastDot, lastComma);
    if (at < 0) {
      normalized = digitsOnly;
    } else {
      const tail = digitsOnly.slice(at + 1);
      const grouped =
        tail.length === 3 && digitsOnly.slice(0, at).replace(/[.,]/g, '').length > 0 && !/[.,]/.test(tail);
      normalized = grouped
        ? digitsOnly.replace(/[.,]/g, '')
        : `${digitsOnly.slice(0, at).replace(/[.,]/g, '')}.${tail}`;
    }
  }

  const value = Number(normalized);
  if (!Number.isFinite(value) || negative) return null;
  const decimals = normalized.split('.')[1] ?? '';
  const text = decimals.length > 2 ? value.toFixed(2) : normalized.replace(/^\./, '0.');
  return /^\d+(\.\d{1,2})?$/.test(text) ? text : null;
}

/** A price cell that may carry its own currency: `$29.99`, `29,99 €`, `USD 29`. */
export function parsePrice(raw: string): { amount: string; currency: GoodsItemPriceCurrency | null } | null {
  const text = raw.trim();
  if (text === '') return null;
  const amount = normalizeAmount(text);
  if (amount === null) return null;

  const code = /(?:^|[^A-Za-z])([A-Za-z]{3})(?:[^A-Za-z]|$)/.exec(text)?.[1];
  if (code && isCurrencyCode(code)) return { amount, currency: code.toUpperCase() as GoodsItemPriceCurrency };
  for (const [symbol, currency] of CURRENCY_SYMBOLS) {
    if (text.includes(symbol)) return { amount, currency: currency as GoodsItemPriceCurrency };
  }
  return { amount, currency: null };
}

const TRUE_WORDS = new Set(['yes', 'y', 'true', '1', 'instock', 'available', 'active', 'enabled', 'on']);
const FALSE_WORDS = new Set([
  'no',
  'n',
  'false',
  '0',
  'outofstock',
  'unavailable',
  'soldout',
  'inactive',
  'disabled',
  'off',
]);

/**
 * Availability from whatever the sheet said. Null when the word means nothing
 * here — the caller decides the default rather than guessing "in stock" for a
 * cell that says "backordered".
 */
export function parseAvailability(raw: string): boolean | null {
  /* Normalized the same way headers are, so "In stock", "in_stock" and
   * "InStock" all reach the sets below as one word each. */
  const key = normalizeHeader(raw);
  if (key === '') return null;
  if (TRUE_WORDS.has(key)) return true;
  if (FALSE_WORDS.has(key)) return false;
  return null;
}

/** The mapped cells of one row, as text, ready for the review table. */
export function applyMapping(cells: readonly string[], mapping: ColumnMapping, target: ImportTarget): DraftValues {
  const values: DraftValues = {};
  for (const field of FIELDS[target]) {
    const at = mapping[field.id];
    values[field.id] = at === undefined ? '' : (cells[at] ?? '').trim();
  }
  if (target === 'products') {
    /* One price column carrying "$29.99" fills BOTH fields: the currency is in
     * there, and asking a person to split it by hand for every row is exactly
     * the work this wizard exists to avoid. */
    const price = parsePrice(values.amount ?? '');
    if (price) {
      values.amount = price.amount;
      if ((values.currency ?? '') === '' && price.currency) values.currency = price.currency;
    }
    const currency = (values.currency ?? '').trim().toUpperCase();
    if (currency !== '' && !isCurrencyCode(currency)) values.currency = '';
    else values.currency = currency;
  }
  return values;
}

/** The currency the rest of this catalog is priced in — the default offered for rows without one. */
export function dominantCurrency(items: readonly CatalogItem[]): GoodsItemPriceCurrency {
  const counts = new Map<string, number>();
  for (const item of items) {
    const currency = item.price?.currency;
    if (currency) counts.set(currency, (counts.get(currency) ?? 0) + 1);
  }
  let best = GoodsItemPriceCurrency.Usd as string;
  let seen = 0;
  for (const [currency, count] of counts) {
    if (count > seen) {
      best = currency;
      seen = count;
    }
  }
  return best as GoodsItemPriceCurrency;
}

// ---------------------------------------------------------------------------
// Wire shapes
// ---------------------------------------------------------------------------

export const toFaqEntry = (values: DraftValues): FaqEntry => ({
  question: (values.question ?? '').trim(),
  answer: (values.answer ?? '').trim(),
});

export interface ProductInput {
  title: string;
  description: string;
  images: string[];
  isAvailable: boolean;
  price?: { amount: string; currency: GoodsItemPriceCurrency };
}

/**
 * A row as `GoodsProductInput`.
 *
 * No price rather than a zero price when the amount is unreadable: the schema
 * takes `price` as optional and "we could not read it" is not "it is free".
 * `images` is always empty — see the note on FIELDS.
 */
export function toProductInput(values: DraftValues, fallbackCurrency: GoodsItemPriceCurrency): ProductInput {
  const amount = normalizeAmount(values.amount ?? '');
  const currency = (values.currency ?? '').toUpperCase();
  const available = parseAvailability(values.available ?? '');
  return {
    title: (values.title ?? '').trim(),
    description: (values.description ?? '').trim(),
    images: [],
    /* Nothing said means for sale: a catalog row a person is importing is one
     * they want the assistant to offer. */
    isAvailable: available ?? true,
    ...(amount !== null
      ? {
          price: {
            amount,
            currency: (isCurrencyCode(currency) ? currency : fallbackCurrency) as GoodsItemPriceCurrency,
          },
        }
      : {}),
  };
}
