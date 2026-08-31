/**
 * A product (`GoodsProduct`) between the API record, the full-replace input
 * and the dialog's draft.
 *
 * `goodsProductUpdate` takes the WHOLE `GoodsProductInput`: flipping the
 * availability switch on a card re-sends the title, the description, the price
 * and the photo ids too, and the only honest source for those is the record
 * the API last returned. `productInputOf(record)` is that; `productInputOfDraft`
 * is the same for what the dialog holds. Both are pure and tested, because a
 * wrong field here silently overwrites a real one on every save.
 *
 * Two shapes worth naming, because both have bitten this codebase:
 *   - money is a STRING on the wire (`price.amount: "12.00"`), and a blank
 *     amount is NO PRICE (`price: null`), which the API tells apart from "0.00";
 *   - the images field takes FileIDs, never File objects.
 */
import { GoodsItemPriceCurrency, type GoodsProductInput } from '~api/generated/knowledge-base/graphql';
import type { CatalogItem, CatalogProduct } from '../types';
import { MAX_IMAGES, sameImages, type ImageRef } from './images';

/** What the dialog edits. Everything is text-shaped where a person types it. */
export interface ProductDraft {
  title: string;
  description: string;
  /** The typed amount; blank means no price. */
  priceAmount: string;
  currency: GoodsItemPriceCurrency;
  isAvailable: boolean;
  images: ImageRef[];
}

export type ProductField = 'title' | 'description' | 'price' | 'images' | 'form';
export type ProductErrors = Partial<Record<ProductField, string>>;

export const DEFAULT_CURRENCY = GoodsItemPriceCurrency.Usd;
export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 1000;

/** The full-replace input for a record, byte-faithful — an unchanged save is a no-op on the server. */
export function productInputOf(record: CatalogProduct): GoodsProductInput {
  return {
    title: record.title,
    description: record.description,
    isAvailable: record.isAvailable,
    price: record.price ? { amount: record.price.amount, currency: record.price.currency } : null,
    images: record.images.map((image) => image.id),
  };
}

/** The record with one flag flipped, as an input — what the card switch and the bulk bar send. */
export const productInputWithAvailability = (record: CatalogProduct, isAvailable: boolean): GoodsProductInput => ({
  ...productInputOf(record),
  isAvailable,
});

/** A draft for editing `record`, or a fresh one for "Add a product". */
export function productDraftOf(
  record: CatalogProduct | null,
  defaultCurrency: GoodsItemPriceCurrency = DEFAULT_CURRENCY,
): ProductDraft {
  if (!record)
    return { title: '', description: '', priceAmount: '', currency: defaultCurrency, isAvailable: true, images: [] };
  return {
    title: record.title,
    description: record.description,
    priceAmount: record.price?.amount ?? '',
    currency: record.price?.currency ?? defaultCurrency,
    isAvailable: record.isAvailable,
    images: record.images.map((image) => ({ id: image.id, url: image.url || undefined })),
  };
}

const AMOUNT = /^\d+(?:[.,]\d{1,2})?$/;

/** "12", "12.5", "12,50" → "12.00", "12.50"; null when it is not money. */
export function normalizeAmount(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  if (!AMOUNT.test(trimmed)) return null;
  const [whole, frac = ''] = trimmed.replace(',', '.').split('.');
  return `${String(Number(whole))}.${(frac + '00').slice(0, 2)}`;
}

/** What the server would reject, said before the round trip. Empty when the draft is fine. */
export function validateProductDraft(draft: ProductDraft): ProductErrors {
  const errors: ProductErrors = {};
  const title = draft.title.trim();
  if (!title) errors.title = 'A title is required.';
  else if (title.length < 2) errors.title = 'The title is too short.';
  else if (title.length > TITLE_MAX) errors.title = `The title must be ${TITLE_MAX} characters or fewer.`;
  if (draft.description.length > DESCRIPTION_MAX)
    errors.description = `The description must be ${DESCRIPTION_MAX} characters or fewer.`;
  if (draft.priceAmount.trim() !== '' && normalizeAmount(draft.priceAmount) === null)
    errors.price = 'The price must be a number like 12 or 12.50.';
  if (draft.images.length > MAX_IMAGES) errors.images = `At most ${MAX_IMAGES} photos.`;
  return errors;
}

/** The input for a draft. Call `validateProductDraft` first; this does not re-check. */
export function productInputOfDraft(draft: ProductDraft): GoodsProductInput {
  const amount = normalizeAmount(draft.priceAmount);
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    isAvailable: draft.isAvailable,
    price: amount === null ? null : { amount, currency: draft.currency },
    images: draft.images.map((image) => image.id),
  };
}

/** Same draft, field by field — the dialog's Save is disabled when nothing changed. */
export const sameProductDraft = (a: ProductDraft, b: ProductDraft): boolean =>
  a.title === b.title &&
  a.description === b.description &&
  a.priceAmount === b.priceAmount &&
  a.currency === b.currency &&
  a.isAvailable === b.isAvailable &&
  sameImages(a.images, b.images);

/** Which field an API error code belongs under; `form` when it is nobody's in particular. */
export function productFieldForCode(code: string | null): ProductField {
  if (!code) return 'form';
  if (code.startsWith('GoodsItemTitle')) return 'title';
  if (code === 'GoodsItemDescriptionTooLong') return 'description';
  if (code.startsWith('GoodsItemPrice')) return 'price';
  if (code === 'GoodsProductImagesTooMuch' || code === 'FileTooBig' || code === 'FileContentTypeNotSupported')
    return 'images';
  return 'form';
}

/** "$12.00", "€12.00", "12.00 BTCX" when Intl refuses the code, "Free" for zero, "No price" for none. */
export function formatPrice(price: { amount: string; currency: string } | null | undefined, locale?: string): string {
  if (!price) return 'No price';
  const value = Number(price.amount);
  if (Number.isNaN(value)) return `${price.amount} ${price.currency}`;
  if (value === 0) return 'Free';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: price.currency }).format(value);
  } catch {
    return `${price.amount} ${price.currency}`;
  }
}

/** The enum as Select options — the code is the label; a symbol table would be a second source of truth. */
export const CURRENCY_OPTIONS: readonly { value: string; label: string }[] = Object.values(GoodsItemPriceCurrency).map(
  (code) => ({ value: code, label: code }),
);

/**
 * The currency the rest of the catalog already uses, so a new product starts
 * there rather than in USD on a EUR bot. Products AND services, because they
 * are one catalog on the server and a shop does not price in two currencies by
 * accident.
 */
export function commonCurrency(items: readonly CatalogItem[]): GoodsItemPriceCurrency {
  const counts = new Map<GoodsItemPriceCurrency, number>();
  for (const item of items) if (item.price) counts.set(item.price.currency, (counts.get(item.price.currency) ?? 0) + 1);
  let best: GoodsItemPriceCurrency = DEFAULT_CURRENCY;
  let bestCount = 0;
  for (const [currency, count] of counts) {
    if (count > bestCount) {
      best = currency;
      bestCount = count;
    }
  }
  return best;
}
