/**
 * Which products the page shows, and in which order.
 *
 * Search, the availability filter and the sort are three independent
 * decisions, so they are three functions and one composer — a page that
 * filters inside its render is a page whose "why is this row missing?" has no
 * answer anybody can test.
 *
 * The `recent` sort deserves a note. `GoodsProduct` carries NO timestamp — the
 * schema has no createdAt and no updatedAt on a catalog item — so there is
 * nothing to sort by, and inventing one would be a lie. What does exist is two
 * real signals: the catalog is returned in a stable order with new items at
 * the end, and this session knows which rows it just wrote. So "recently
 * changed" is: what you touched here, newest first, then the catalog tail
 * upwards. It is honest about being a session-scoped answer, and it is the one
 * a person actually wants after saving three rows in a row.
 */
import type { CatalogProduct } from '../types';

export type AvailabilityFilter = 'all' | 'available' | 'unavailable';
export const AVAILABILITY_FILTERS: readonly AvailabilityFilter[] = ['all', 'available', 'unavailable'];
export const AVAILABILITY_LABELS: Record<AvailabilityFilter, string> = {
  all: 'All',
  available: 'Available',
  unavailable: 'Unavailable',
};

export type ProductSort = 'name' | 'price' | 'recent';
export const PRODUCT_SORTS: readonly ProductSort[] = ['name', 'price', 'recent'];
export const SORT_LABELS: Record<ProductSort, string> = { name: 'Name', price: 'Price', recent: 'Recently changed' };

export const isProductSort = (raw: unknown): raw is ProductSort =>
  typeof raw === 'string' && PRODUCT_SORTS.includes(raw as ProductSort);
export const isAvailabilityFilter = (raw: unknown): raw is AvailabilityFilter =>
  typeof raw === 'string' && AVAILABILITY_FILTERS.includes(raw as AvailabilityFilter);

/** How many ids the "recently changed" sort remembers. Past this it is the catalog order again. */
export const RECENT_MAX = 30;

const fold = (text: string): string => text.toLocaleLowerCase().trim();

/**
 * Title, description and price text. The price is searchable because "12.00"
 * and "EUR" are what somebody types when they are hunting for the row they
 * mispriced.
 */
export function matchesQuery(product: CatalogProduct, query: string): boolean {
  const needle = fold(query);
  if (needle === '') return true;
  const haystack = [product.title, product.description, product.price?.amount ?? '', product.price?.currency ?? ''].map(
    fold,
  );
  return haystack.some((field) => field.includes(needle));
}

export const matchesAvailability = (product: CatalogProduct, filter: AvailabilityFilter): boolean =>
  filter === 'all' || (filter === 'available' ? product.isAvailable : !product.isAvailable);

export const filterProducts = (
  products: readonly CatalogProduct[],
  query: string,
  filter: AvailabilityFilter,
): CatalogProduct[] =>
  products.filter((product) => matchesQuery(product, query) && matchesAvailability(product, filter));

/** Ascending, and a product with no price sorts last rather than as zero. */
function byPrice(a: CatalogProduct, b: CatalogProduct): number {
  const left = a.price ? Number(a.price.amount) : Number.POSITIVE_INFINITY;
  const right = b.price ? Number(b.price.amount) : Number.POSITIVE_INFINITY;
  if (left === right) return a.title.localeCompare(b.title);
  return left - right;
}

export function sortProducts(
  products: readonly CatalogProduct[],
  sort: ProductSort,
  recent: readonly string[] = [],
): CatalogProduct[] {
  const next = [...products];
  if (sort === 'name') return next.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === 'price') return next.sort(byPrice);
  /* `recent` first in the order they were touched, then the catalog backwards:
     the API appends, so its tail is the newest thing anybody added. */
  const rank = new Map(recent.map((id, index) => [id, index]));
  const position = new Map(products.map((product, index) => [product.id, index]));
  return next.sort((a, b) => {
    const left = rank.get(a.id);
    const right = rank.get(b.id);
    if (left !== undefined && right !== undefined) return left - right;
    if (left !== undefined) return -1;
    if (right !== undefined) return 1;
    return (position.get(b.id) ?? 0) - (position.get(a.id) ?? 0);
  });
}

export interface ProductView {
  query: string;
  availability: AvailabilityFilter;
  sort: ProductSort;
  recent: readonly string[];
}

export const visibleProducts = (products: readonly CatalogProduct[], view: ProductView): CatalogProduct[] =>
  sortProducts(filterProducts(products, view.query, view.availability), view.sort, view.recent);

/** Move an id to the front of the "recently changed" list, without duplicating it. */
export const rememberRecent = (recent: readonly string[], id: string, max: number = RECENT_MAX): string[] =>
  [id, ...recent.filter((known) => known !== id)].slice(0, max);

/** Several ids at once (a bulk write), newest-first in the order given. */
export const rememberAllRecent = (
  recent: readonly string[],
  ids: readonly string[],
  max: number = RECENT_MAX,
): string[] => ids.reduceRight((acc, id) => rememberRecent(acc, id, max), [...recent]);

export const countAvailable = (products: readonly CatalogProduct[]): { available: number; unavailable: number } => ({
  available: products.filter((product) => product.isAvailable).length,
  unavailable: products.filter((product) => !product.isAvailable).length,
});

/**
 * "No products match "tea"" vs "No products yet" — the empty state has to say
 * which of the two it is, or the answer to "where did everything go?" is a
 * shrug.
 */
export function emptyReason(total: number, shown: number, view: ProductView): 'none' | 'filtered' | null {
  if (shown > 0) return null;
  if (total === 0) return 'none';
  return view.query.trim() !== '' || view.availability !== 'all' ? 'filtered' : 'none';
}
