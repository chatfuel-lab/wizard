/**
 * A service (`GoodsService`) between the API record, the full-replace input
 * and the dialog's draft — the same job `productInput.ts` does, plus a
 * duration, and only reachable when this module is the one editing services
 * (see `lib/mirror.ts`).
 *
 * The shared halves — the amount rules, the price formatter, the currency
 * list, the title and description limits — are imported from `productInput`
 * rather than copied: products and services are one catalog on the server and
 * two copies of "what counts as money" would drift.
 *
 * Duration is SECONDS on the wire and minutes in the UI, and the server's
 * floor is one minute (`ErrGoodsServiceDurationRequired` is what a zero gets).
 */
import type { GoodsServiceInput } from '~api/generated/knowledge-base/graphql';
import { GoodsItemPriceCurrency } from '~api/generated/knowledge-base/graphql';
import type { CatalogService } from '../types';
import { MAX_IMAGES, sameImages, type ImageRef } from './images';
import { DEFAULT_CURRENCY, DESCRIPTION_MAX, TITLE_MAX, normalizeAmount } from './productInput';

export interface ServiceDraft {
  title: string;
  description: string;
  /** Minutes, or null while unset. */
  durationMinutes: number | null;
  priceAmount: string;
  currency: GoodsItemPriceCurrency;
  isAvailable: boolean;
  images: ImageRef[];
}

export type ServiceField = 'title' | 'description' | 'duration' | 'price' | 'images' | 'form';
export type ServiceErrors = Partial<Record<ServiceField, string>>;

/** The server's floor, in seconds. A service shorter than a minute is not a booking. */
export const MIN_DURATION_SECONDS = 60;
export const DEFAULT_DURATION_MIN = 30;
export const MAX_DURATION_MIN = 24 * 60;

/** The full-replace input for a record, byte-faithful. */
export function serviceInputOf(record: CatalogService): GoodsServiceInput {
  return {
    title: record.title,
    description: record.description,
    durationSeconds: record.durationSeconds,
    isAvailable: record.isAvailable,
    price: record.price ? { amount: record.price.amount, currency: record.price.currency } : null,
    images: record.images.map((image) => image.id),
  };
}

export const serviceInputWithAvailability = (record: CatalogService, isAvailable: boolean): GoodsServiceInput => ({
  ...serviceInputOf(record),
  isAvailable,
});

export function serviceDraftOf(
  record: CatalogService | null,
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
    images: record.images.map((image) => ({ id: image.id, url: image.url || undefined })),
  };
}

export function validateServiceDraft(draft: ServiceDraft): ServiceErrors {
  const errors: ServiceErrors = {};
  const title = draft.title.trim();
  if (!title) errors.title = 'A title is required.';
  else if (title.length < 2) errors.title = 'The title is too short.';
  else if (title.length > TITLE_MAX) errors.title = `The title must be ${TITLE_MAX} characters or fewer.`;
  if (draft.description.length > DESCRIPTION_MAX)
    errors.description = `The description must be ${DESCRIPTION_MAX} characters or fewer.`;
  if (draft.durationMinutes === null || draft.durationMinutes < 1) errors.duration = 'A duration is required.';
  else if (draft.durationMinutes > MAX_DURATION_MIN) errors.duration = 'A service cannot be longer than a day.';
  if (draft.priceAmount.trim() !== '' && normalizeAmount(draft.priceAmount) === null)
    errors.price = 'The price must be a number like 25 or 25.50.';
  if (draft.images.length > MAX_IMAGES) errors.images = `At most ${MAX_IMAGES} photos.`;
  return errors;
}

/** The input for a draft. Call `validateServiceDraft` first; this does not re-check. */
export function serviceInputOfDraft(draft: ServiceDraft): GoodsServiceInput {
  const amount = normalizeAmount(draft.priceAmount);
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    durationSeconds: Math.max(MIN_DURATION_SECONDS, Math.round((draft.durationMinutes ?? DEFAULT_DURATION_MIN) * 60)),
    isAvailable: draft.isAvailable,
    price: amount === null ? null : { amount, currency: draft.currency },
    images: draft.images.map((image) => image.id),
  };
}

export const sameServiceDraft = (a: ServiceDraft, b: ServiceDraft): boolean =>
  a.title === b.title &&
  a.description === b.description &&
  a.durationMinutes === b.durationMinutes &&
  a.priceAmount === b.priceAmount &&
  a.currency === b.currency &&
  a.isAvailable === b.isAvailable &&
  sameImages(a.images, b.images);

export function serviceFieldForCode(code: string | null): ServiceField {
  if (!code) return 'form';
  if (code.startsWith('GoodsItemTitle')) return 'title';
  if (code === 'GoodsItemDescriptionTooLong') return 'description';
  if (code.startsWith('GoodsItemPrice')) return 'price';
  if (code === 'GoodsServiceImagesTooMuch' || code === 'FileTooBig' || code === 'FileContentTypeNotSupported')
    return 'images';
  if (code.includes('Duration')) return 'duration';
  return 'form';
}
