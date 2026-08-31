/**
 * A service (`GoodsService`) between the API record, the full-replace input
 * and the dialog's draft.
 *
 * `goodsServiceUpdate` takes the WHOLE `GoodsServiceInput` — flipping the
 * availability switch on a card re-sends title, description, duration, price
 * and images too, and the only honest source for those is the record the API
 * last returned. `serviceInputOf(record)` is that; `serviceInputOfDraft` is
 * the same for what the dialog holds. Both are pure and tested, because a
 * wrong field here silently overwrites a real one on every save.
 *
 * Money is a STRING on the wire (`price.amount: "25.00"`); a blank amount is
 * "no price" (`price: null`), which the API distinguishes from `"0.00"`.
 * Duration is seconds on the wire and minutes in the UI.
 */
import { GoodsItemPriceCurrency, type GoodsServiceInput } from '~api/generated/bookings/graphql';
import type { ServiceRecord } from '../types';
import { formatMoney } from './appointmentsColumns';

export interface ImageRef {
  id: string;
  url?: string;
}

/** What the dialog edits. Everything is text-shaped where a person types it. */
export interface ServiceDraft {
  title: string;
  description: string;
  /** Minutes, or null while unset. */
  durationMinutes: number | null;
  /** The typed amount; blank = no price. */
  priceAmount: string;
  currency: GoodsItemPriceCurrency;
  isAvailable: boolean;
  images: ImageRef[];
}

export type ServiceField = 'title' | 'description' | 'duration' | 'price' | 'images' | 'form';
export type ServiceErrors = Partial<Record<ServiceField, string>>;

export const DEFAULT_CURRENCY = GoodsItemPriceCurrency.Usd;
export const DEFAULT_DURATION_MIN = 30;
export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 1000;
export const MAX_IMAGES = 10;

/** The full-replace input for a record, byte-faithful (an unchanged save is a no-op on the server). */
export function serviceInputOf(record: ServiceRecord): GoodsServiceInput {
  return {
    title: record.title,
    description: record.description,
    durationSeconds: record.durationSeconds,
    isAvailable: record.isAvailable,
    price: record.price ? { amount: record.price.amount, currency: record.price.currency } : null,
    images: record.images.map((f) => f.id),
  };
}

/** The record with one flag flipped, as an input — the card switch's write. */
export function serviceInputWithAvailability(record: ServiceRecord, isAvailable: boolean): GoodsServiceInput {
  return { ...serviceInputOf(record), isAvailable };
}

/** A draft for editing `record`, or a fresh one for "Add service". */
export function serviceDraftOf(
  record: ServiceRecord | null,
  defaultCurrency: GoodsItemPriceCurrency = DEFAULT_CURRENCY,
): ServiceDraft {
  if (!record) {
    return {
      title: '',
      description: '',
      durationMinutes: DEFAULT_DURATION_MIN,
      priceAmount: '',
      currency: defaultCurrency,
      isAvailable: true,
      images: [],
    };
  }
  return {
    title: record.title,
    description: record.description,
    durationMinutes: Math.round(record.durationSeconds / 60),
    priceAmount: record.price?.amount ?? '',
    currency: record.price?.currency ?? defaultCurrency,
    isAvailable: record.isAvailable,
    images: record.images.map((f) => ({ id: f.id, url: f.url || undefined })),
  };
}

const AMOUNT = /^\d+(?:[.,]\d{1,2})?$/;

/** "25", "25.5", "25,50" → "25.00", "25.50"; null when it is not money. */
export function normalizeAmount(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  if (!AMOUNT.test(trimmed)) return null;
  const [whole, frac = ''] = trimmed.replace(',', '.').split('.');
  return `${String(Number(whole))}.${(frac + '00').slice(0, 2)}`;
}

/** What the server would reject, said before the round trip. Empty when the draft is fine. */
export function validateServiceDraft(draft: ServiceDraft): ServiceErrors {
  const errors: ServiceErrors = {};
  const title = draft.title.trim();
  if (!title) errors.title = 'A title is required.';
  else if (title.length < 2) errors.title = 'The title is too short.';
  else if (title.length > TITLE_MAX) errors.title = `The title must be ${TITLE_MAX} characters or fewer.`;
  if (draft.description.length > DESCRIPTION_MAX)
    errors.description = `The description must be ${DESCRIPTION_MAX} characters or fewer.`;
  if (draft.durationMinutes === null || draft.durationMinutes < 1) errors.duration = 'A duration is required.';
  else if (draft.durationMinutes > 24 * 60) errors.duration = 'A service cannot be longer than a day.';
  if (draft.priceAmount.trim() !== '' && normalizeAmount(draft.priceAmount) === null)
    errors.price = 'The price must be a number like 25 or 25.50.';
  if (draft.images.length > MAX_IMAGES) errors.images = `At most ${MAX_IMAGES} images.`;
  return errors;
}

/** The input for a draft. Call `validateServiceDraft` first; this does not re-check. */
export function serviceInputOfDraft(draft: ServiceDraft): GoodsServiceInput {
  const amount = normalizeAmount(draft.priceAmount);
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    durationSeconds: Math.max(60, Math.round((draft.durationMinutes ?? DEFAULT_DURATION_MIN) * 60)),
    isAvailable: draft.isAvailable,
    price: amount === null ? null : { amount, currency: draft.currency },
    images: draft.images.map((img) => img.id),
  };
}

/** Same draft, field by field — the dialog's Save button is disabled when nothing changed. */
export function sameServiceDraft(a: ServiceDraft, b: ServiceDraft): boolean {
  return (
    a.title === b.title &&
    a.description === b.description &&
    a.durationMinutes === b.durationMinutes &&
    a.priceAmount === b.priceAmount &&
    a.currency === b.currency &&
    a.isAvailable === b.isAvailable &&
    a.images.length === b.images.length &&
    a.images.every((img, i) => img.id === b.images[i]?.id)
  );
}

/** Which field an API error code belongs under; `form` when it is nobody's in particular. */
export function serviceFieldForCode(code: string | null): ServiceField {
  if (!code) return 'form';
  if (code.startsWith('GoodsItemTitle')) return 'title';
  if (code === 'GoodsItemDescriptionTooLong') return 'description';
  if (code.startsWith('GoodsItemPrice')) return 'price';
  if (code === 'GoodsServiceImagesTooMuch') return 'images';
  if (code.includes('Duration')) return 'duration';
  return 'form';
}

/**
 * "$25.00", "€80.00", "Free" for zero, "No price" for none. Same `formatMoney`
 * as the table and the panel use — see `priceLabel` in `panelForm.ts`; only the
 * "nothing here" word differs, because a card has room to say it and a panel line does not.
 */
export function formatPrice(price: { amount: string; currency: string } | null | undefined, locale?: string): string {
  if (!price) return 'No price';
  const value = Number(price.amount);
  if (!Number.isFinite(value)) return `${price.amount} ${price.currency}`;
  if (value === 0) return 'Free';
  return formatMoney(value, price.currency, locale);
}

/** The enum, as options for a Select — the code is the label; a symbol table would be a second source of truth. */
export const CURRENCY_OPTIONS: readonly { value: string; label: string }[] = Object.values(GoodsItemPriceCurrency).map(
  (code) => ({ value: code, label: code }),
);
