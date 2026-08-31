/**
 * The handful of per-user choices that are not a deep link.
 *
 * A deep link is something you SEND someone: which source is open, what you
 * searched for. A preference is something about you: whether you read a
 * catalog as cards or as a table, and which order you like it in. The URL
 * carries the first (see `knowledgeParams.ts`); this carries the second, as
 * one JSON string in `currentUser.userStorageItem` — the API's only per-user
 * persistence. Nothing here is shared with a teammate.
 *
 * Everything read back is untrusted: `parsePrefs` never throws, drops what it
 * cannot repair, and the key carries a version so a shape change reads as "no
 * preferences" rather than as garbage.
 */
import { isProductSort, type ProductSort } from './productFilter';

export const PREFS_KEY = 'chatfuel.knowledge.prefs.v1';

/** Cards or a dense table. The catalog is browsed one way and audited the other. */
export type ProductLayout = 'grid' | 'table';
export const PRODUCT_LAYOUTS: readonly ProductLayout[] = ['grid', 'table'];
export const isProductLayout = (raw: unknown): raw is ProductLayout =>
  typeof raw === 'string' && PRODUCT_LAYOUTS.includes(raw as ProductLayout);

export interface KnowledgePrefs {
  productLayout: ProductLayout;
  productSort: ProductSort;
}

/** Cards first: a catalog is mostly looked at, and a photo is why it has photos. */
export const DEFAULT_PREFS: KnowledgePrefs = { productLayout: 'grid', productSort: 'name' };

export function parsePrefs(raw: string | null | undefined): KnowledgePrefs {
  if (!raw) return DEFAULT_PREFS;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return DEFAULT_PREFS;
  }
  if (!value || typeof value !== 'object') return DEFAULT_PREFS;
  const record = value as Record<string, unknown>;
  return {
    productLayout: isProductLayout(record.productLayout) ? record.productLayout : DEFAULT_PREFS.productLayout,
    productSort: isProductSort(record.productSort) ? record.productSort : DEFAULT_PREFS.productSort,
  };
}

export const serializePrefs = (prefs: KnowledgePrefs): string => JSON.stringify(prefs);

export const samePrefs = (a: KnowledgePrefs, b: KnowledgePrefs): boolean => serializePrefs(a) === serializePrefs(b);
