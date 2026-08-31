/**
 * The character budget — the only "index size" this product has.
 *
 * Everything in the knowledge base is fed to the assistant as text, so the
 * server counts characters and refuses writes past a limit
 * (`FuelyKnowledgeBaseLimitReached`). It reports two numbers and no ceiling:
 * `usage.total` and `usage.catalog`. There is NO limit field in the schema, so
 * nothing here draws a gauge against an invented maximum: the breakdown is a
 * share of what is actually spent, and "full" is a state the server puts us in,
 * not a threshold we guess.
 *
 * The per-source counts are computed from the same strings that were sent, so
 * they are an estimate of the server's own arithmetic. `other` absorbs the
 * difference rather than hiding it — if the server counts something this file
 * does not model, the reader sees a slice named "Other", not a wrong total.
 */
import type { CatalogItem, FaqEntry, KnowledgeBaseInfo } from '../types';
import type { SourceId } from './sources';

/** Sources that spend the budget, in the order the meter stacks them. */
export type BudgetSlice =
  Extract<SourceId, 'profile' | 'instructions' | 'faq' | 'products' | 'services' | 'team'> | 'other';

export const BUDGET_SLICES: readonly BudgetSlice[] = [
  'profile',
  'instructions',
  'faq',
  'products',
  'services',
  'team',
  'other',
];

export interface BudgetBreakdown {
  /** `usage.total` — the server's number, never recomputed. */
  total: number;
  /** `usage.catalog` — the server's number for the goods catalog. */
  catalog: number;
  /** Estimated characters per source. Sums to `total` by construction (see `other`). */
  bySource: Record<BudgetSlice, number>;
  /** True once a write has come back with a limit error; the meter says so until the next reload. */
  full: boolean;
}

const len = (value: string | null | undefined): number => (value ? value.length : 0);

/** Business profile: the fields the profile page edits, plus the rendered hours. */
export function profileChars(kb: KnowledgeBaseInfo): number {
  const fields =
    len(kb.companyName) + len(kb.email) + len(kb.phone) + len(kb.address) + len(kb.website) + len(kb.howToPay);
  const days = kb.businessHoursSchedule.workingHours ?? [];
  /* A day reaches the assistant as "Mon 09:00-18:00" — the enabled ones only. */
  const hours = days.reduce(
    (sum, day) => (day.enabled ? sum + day.day.length + day.start.length + day.end.length + 2 : sum),
    0,
  );
  return fields + hours;
}

export const instructionsChars = (kb: KnowledgeBaseInfo): number => len(kb.additionalInstructions);

export const faqChars = (faqs: readonly FaqEntry[]): number =>
  faqs.reduce((sum, faq) => sum + len(faq.question) + len(faq.answer), 0);

/** One catalog item's share, by the same fields the AI is shown. Images cost nothing here. */
export const itemChars = (item: CatalogItem): number =>
  len(item.title) + len(item.description) + (item.price ? len(item.price.amount) + len(item.price.currency) : 0);

export const itemsChars = (items: readonly CatalogItem[]): number =>
  items.reduce((sum, item) => sum + itemChars(item), 0);

export interface BudgetInput {
  total: number;
  catalog: number;
  kb: KnowledgeBaseInfo;
  products: readonly CatalogItem[];
  services: readonly CatalogItem[];
  /** Specialists cost characters too, but the server folds them into the total, not into `catalog`. */
  teamChars: number;
  full: boolean;
}

/**
 * Split `total` across the sources.
 *
 * The catalog's two halves are apportioned from the server's `usage.catalog`
 * by their estimated share, so Products and Services always add up to a number
 * the server agrees with even when the estimate of an individual item is off.
 * Everything the model cannot explain lands in `other`, which is clamped at
 * zero: an estimate that over-counts must not produce a negative slice.
 */
export function budgetBreakdown(input: BudgetInput): BudgetBreakdown {
  const profile = profileChars(input.kb);
  const instructions = instructionsChars(input.kb);
  const faq = faqChars(input.kb.faqs);

  const productEstimate = itemsChars(input.products);
  const serviceEstimate = itemsChars(input.services);
  const catalogEstimate = productEstimate + serviceEstimate;
  const products = catalogEstimate === 0 ? 0 : Math.round((productEstimate / catalogEstimate) * input.catalog);
  const services = Math.max(0, input.catalog - products);

  const explained = profile + instructions + faq + input.catalog + input.teamChars;
  const other = Math.max(0, input.total - explained);

  return {
    total: input.total,
    catalog: input.catalog,
    bySource: { profile, instructions, faq, products, services, team: input.teamChars, other },
    full: input.full,
  };
}

/** Share of the total, 0–1. Zero when nothing is spent yet, so a fresh bot renders an empty meter, not NaN. */
export const share = (chars: number, total: number): number => (total > 0 ? chars / total : 0);

/** "1 234" — thousands separated, locale-independent so the tests do not move with the runner. */
export const formatChars = (chars: number): string => String(chars).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
