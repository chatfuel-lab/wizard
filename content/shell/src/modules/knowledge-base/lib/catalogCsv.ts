/**
 * Products as a file, and a file as products.
 *
 * Two audiences, so two layers. The bottom one is a general RFC 4180 pair —
 * `toCsv` / `parseCsv` — that knows nothing about this module: give it a
 * header and rows of values, get text; give it text, get rows of strings.
 * The top one is the product mapping: which columns, in which order, and how
 * a price, a flag and a photo list are spelled.
 *
 * The pair is an exact ROUND TRIP by construction, and the tests hold it to
 * that, because export and import are the same file seen from two sides: a
 * description with a comma, a newline, a quote or all three has to come back
 * byte for byte after a trip through a spreadsheet.
 *
 * The one asymmetry is deliberate. A cell beginning with `=`, `+`, `-` or `@`
 * is a formula to Excel and Sheets, so the shared `csvEscape` prefixes it with
 * an apostrophe — the standard defence, and the reason a price rule like
 * "-15% until Friday" arrives as text rather than as a broken calculation.
 * `parseCsv` takes that apostrophe back off, which is what keeps the round
 * trip true; the cost is that a cell genuinely starting with `'=` loses its
 * quote, and nobody writes that.
 *
 * No React, no hooks, no DOM: the export button, the import wizard and the
 * tests all call the same functions.
 */
import { CSV_BOM, csvText } from '~ui';
import type { CatalogProduct } from '../types';

export type CsvValue = string | number | null | undefined;
export type CsvRow = readonly CsvValue[];

/** Header + rows, CRLF-terminated (RFC 4180), no BOM. */
export function toCsv(header: readonly string[], rows: readonly CsvRow[]): string {
  return csvText([header, ...rows]);
}

/** Undo the shared escape's spreadsheet-formula guard. See the file header. */
const GUARD_PREFIX = /^'(?=[=+\-@\t\r])/;
const unguard = (field: string): string => field.replace(GUARD_PREFIX, '');

/**
 * Text to rows of strings, header row included.
 *
 * Hand-written rather than a split on commas, because every real CSV breaks
 * that: a quoted field may contain commas, CRLFs and doubled quotes, and the
 * file may arrive with CRLF, LF or a mix. A trailing newline does not produce
 * a phantom empty row; a blank line in the middle does, because a row of one
 * empty cell is what the file says and dropping it would silently renumber
 * everything after it.
 */
export function parseCsv(text: string): string[][] {
  const source = text.startsWith(CSV_BOM) ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  const endField = () => {
    row.push(unguard(field));
    field = '';
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]!;
    if (quoted) {
      if (char !== '"') {
        field += char;
        continue;
      }
      /* A doubled quote inside a quoted field is one literal quote. */
      if (source[index + 1] === '"') {
        field += '"';
        index += 1;
        continue;
      }
      quoted = false;
      continue;
    }
    if (char === '"' && field === '') {
      quoted = true;
      continue;
    }
    if (char === ',') {
      endField();
      continue;
    }
    if (char === '\r') {
      /* Both line endings, and a lone CR (old Mac exports) too. */
      if (source[index + 1] === '\n') index += 1;
      endRow();
      continue;
    }
    if (char === '\n') {
      endRow();
      continue;
    }
    field += char;
  }
  /* The last row only exists if the file did not end on a newline. */
  if (field !== '' || row.length > 0) endRow();
  return rows;
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

/**
 * The column order of an exported file, and the one the importer recognises
 * without being told. Human words, not field names: the file is opened in a
 * spreadsheet by somebody who has never seen the API.
 */
export const PRODUCT_CSV_HEADER: readonly string[] = [
  'Title',
  'Description',
  'Price',
  'Currency',
  'Available',
  'Photos',
];

export type ProductCsvField = 'title' | 'description' | 'price' | 'currency' | 'available' | 'photos';

/** Which header word maps to which field. Order matches `PRODUCT_CSV_HEADER`. */
export const PRODUCT_CSV_FIELDS: readonly ProductCsvField[] = [
  'title',
  'description',
  'price',
  'currency',
  'available',
  'photos',
];

/** Photos are one cell: several URLs separated by this, because a photo count varies per row. */
export const PHOTO_SEPARATOR = ' | ';

export function productCsvRow(product: CatalogProduct): CsvRow {
  return [
    product.title,
    product.description,
    product.price?.amount ?? '',
    product.price?.currency ?? '',
    product.isAvailable ? 'yes' : 'no',
    product.images
      .map((image) => image.url)
      .filter((url) => url !== '')
      .join(PHOTO_SEPARATOR),
  ];
}

export const productsToCsv = (products: readonly CatalogProduct[]): string =>
  toCsv(PRODUCT_CSV_HEADER, products.map(productCsvRow));

/**
 * The same products as JSON — the shape the GraphQL API actually takes, so a
 * developer exporting for a script gets ids and FileIDs rather than the
 * spreadsheet's URLs.
 */
export function productsToJson(products: readonly CatalogProduct[]): string {
  return JSON.stringify(
    products.map((product) => ({
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.price ? { amount: product.price.amount, currency: product.price.currency } : null,
      isAvailable: product.isAvailable,
      images: product.images.map((image) => ({ id: image.id, url: image.url })),
    })),
    null,
    2,
  );
}

const ALIASES: Record<ProductCsvField, readonly string[]> = {
  title: ['title', 'name', 'product', 'product name', 'product title', 'item', 'item name'],
  description: ['description', 'desc', 'details', 'about'],
  price: ['price', 'amount', 'cost'],
  currency: ['currency', 'ccy'],
  available: ['available', 'availability', 'in stock', 'instock', 'active'],
  photos: ['photos', 'photo', 'images', 'image', 'picture', 'pictures'],
};

const normalizeHeader = (cell: string): string =>
  cell.trim().toLocaleLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');

/**
 * Which column holds which field, for a header row that may have been
 * renamed, reordered or half-translated on the way through a spreadsheet.
 * `null` means the file does not carry that field at all — the importer
 * decides whether it can live without it (only `title` is required).
 */
export function matchColumns(header: readonly string[]): Record<ProductCsvField, number | null> {
  const cells = header.map(normalizeHeader);
  const out = { title: null, description: null, price: null, currency: null, available: null, photos: null } as Record<
    ProductCsvField,
    number | null
  >;
  for (const field of PRODUCT_CSV_FIELDS) {
    const at = cells.findIndex((cell) => ALIASES[field].includes(cell));
    out[field] = at < 0 ? null : at;
  }
  return out;
}

/** "yes", "true", "1", "y" — anything else is false. A blank cell means "available", which is the safer default for a catalog. */
export function parseAvailable(cell: string | undefined): boolean {
  const text = (cell ?? '').trim().toLocaleLowerCase();
  if (text === '') return true;
  return ['yes', 'y', 'true', '1', 'available', 'in stock'].includes(text);
}

/** The photo cell back into URLs. Empty in, empty out. */
export const parsePhotos = (cell: string | undefined): string[] =>
  (cell ?? '')
    .split(/[|;\n]/)
    .map((part) => part.trim())
    .filter((part) => part !== '');

/** `products-2026-08-18.csv` — the date, so two exports do not overwrite each other in Downloads. */
export function exportFileName(extension: 'csv' | 'json', today: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `products-${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}.${extension}`;
}
