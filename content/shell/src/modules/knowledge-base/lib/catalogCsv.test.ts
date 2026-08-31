import { describe, expect, it } from 'vitest';
import { CSV_BOM } from '~ui';
import {
  PHOTO_SEPARATOR,
  PRODUCT_CSV_HEADER,
  exportFileName,
  matchColumns,
  parseAvailable,
  parseCsv,
  parsePhotos,
  productCsvRow,
  productsToCsv,
  productsToJson,
  toCsv,
} from './catalogCsv';
import type { CatalogProduct } from '../types';

const product = (over: Partial<CatalogProduct> = {}): CatalogProduct =>
  ({
    __typename: 'GoodsProduct',
    id: 'prod-1',
    title: 'House Blend 250g',
    description: 'Chocolate and hazelnut.',
    isAvailable: true,
    price: { amount: '12.00', currency: 'EUR' },
    images: [],
    ...over,
  }) as unknown as CatalogProduct;

describe('toCsv', () => {
  it('writes the header then the rows, CRLF-terminated', () => {
    expect(toCsv(['A', 'B'], [['1', '2']])).toBe('A,B\r\n1,2\r\n');
  });

  it('writes a header-only file for no rows', () => {
    expect(toCsv(['A'], [])).toBe('A\r\n');
  });
});

describe('parseCsv', () => {
  it('reads plain rows', () => {
    expect(parseCsv('A,B\r\n1,2\r\n')).toEqual([
      ['A', 'B'],
      ['1', '2'],
    ]);
  });

  it('takes LF, CRLF and a lone CR alike', () => {
    expect(parseCsv('a,b\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    expect(parseCsv('a,b\rc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('keeps a comma, a newline and a doubled quote inside a quoted field', () => {
    expect(parseCsv('"a,b","one\ntwo","say ""hi"""\r\n')).toEqual([['a,b', 'one\ntwo', 'say "hi"']]);
  });

  it('does not invent a row for the trailing newline', () => {
    expect(parseCsv('a\r\n')).toHaveLength(1);
  });

  it('keeps a blank line, because dropping it would renumber every row after it', () => {
    expect(parseCsv('a\r\n\r\nb\r\n')).toEqual([['a'], [''], ['b']]);
  });

  it('strips a BOM Excel wrote', () => {
    expect(parseCsv(`${CSV_BOM}Title\r\nTea\r\n`)).toEqual([['Title'], ['Tea']]);
  });

  it('takes the formula guard back off', () => {
    expect(parseCsv("'=SUM(A1)\r\n")).toEqual([['=SUM(A1)']]);
  });
});

describe('round trip', () => {
  const awkward = [
    'plain',
    'has, a comma',
    'has "quotes" inside',
    'has\na newline',
    'has\r\nboth',
    ' padded ',
    '=SUM(A1)',
    '-15% until Friday',
    '',
    'ünïcødé — em dash',
    '"',
    'a"b,c\nd',
  ];

  it('survives every awkward field, byte for byte', () => {
    const parsed = parseCsv(
      toCsv(
        ['Cell'],
        awkward.map((value) => [value]),
      ),
    );
    expect(parsed.slice(1).map((row) => row[0])).toEqual(awkward);
  });

  it('survives a whole product row', () => {
    const rows = [productCsvRow(product({ description: 'Two lines,\n"quoted", and a trailing space ' }))];
    const parsed = parseCsv(productsToCsv([product({ description: 'Two lines,\n"quoted", and a trailing space ' })]));
    expect(parsed[0]).toEqual([...PRODUCT_CSV_HEADER]);
    expect(parsed[1]).toEqual(rows[0]!.map((cell) => String(cell ?? '')));
  });

  it('survives a BOM-prefixed file, which is what Excel writes back', () => {
    expect(parseCsv(CSV_BOM + productsToCsv([product()]))[1]?.[0]).toBe('House Blend 250g');
  });
});

describe('productCsvRow', () => {
  it('spells a price as amount and currency, and availability as yes/no', () => {
    expect(productCsvRow(product())).toEqual([
      'House Blend 250g',
      'Chocolate and hazelnut.',
      '12.00',
      'EUR',
      'yes',
      '',
    ]);
  });

  it('leaves both price cells empty when there is no price', () => {
    expect(productCsvRow(product({ price: null }))).toEqual([
      'House Blend 250g',
      'Chocolate and hazelnut.',
      '',
      '',
      'yes',
      '',
    ]);
  });

  it('joins photo URLs into one cell and drops the ones with no URL yet', () => {
    const images = [
      { id: 'f1', url: 'https://example.test/a.jpg' },
      { id: 'f2', url: '' },
      { id: 'f3', url: 'https://example.test/c.jpg' },
    ] as unknown as CatalogProduct['images'];
    expect(productCsvRow(product({ images }))[5]).toBe(
      `https://example.test/a.jpg${PHOTO_SEPARATOR}https://example.test/c.jpg`,
    );
  });
});

describe('productsToJson', () => {
  it('keeps the ids and FileIDs the API speaks in', () => {
    const parsed = JSON.parse(productsToJson([product()])) as { id: string; price: { amount: string } | null }[];
    expect(parsed[0]?.id).toBe('prod-1');
    expect(parsed[0]?.price?.amount).toBe('12.00');
  });
});

describe('matchColumns', () => {
  it('finds the columns of a file this module wrote', () => {
    expect(matchColumns(PRODUCT_CSV_HEADER)).toEqual({
      title: 0,
      description: 1,
      price: 2,
      currency: 3,
      available: 4,
      photos: 5,
    });
  });

  it('takes a renamed, reordered header', () => {
    expect(matchColumns(['Cost', 'Product name', 'In stock'])).toMatchObject({
      price: 0,
      title: 1,
      available: 2,
      description: null,
    });
  });

  it('is case-, space- and underscore-insensitive', () => {
    expect(matchColumns(['  PRODUCT_NAME ', 'IMAGE'])).toMatchObject({ title: 0, photos: 1 });
  });

  it('reports a field the file does not carry', () => {
    expect(matchColumns(['Title']).price).toBeNull();
  });
});

describe('parseAvailable', () => {
  it('reads the spellings a person actually types', () => {
    for (const yes of ['yes', 'Y', 'TRUE', '1', 'in stock']) expect(parseAvailable(yes)).toBe(true);
    for (const no of ['no', 'false', '0', 'nope']) expect(parseAvailable(no)).toBe(false);
  });

  it('treats a blank cell as available — the safer default for a catalog', () => {
    expect(parseAvailable('')).toBe(true);
    expect(parseAvailable(undefined)).toBe(true);
  });
});

describe('parsePhotos', () => {
  it('splits on the separator it wrote, and on the ones people use instead', () => {
    expect(parsePhotos('a | b;c\nd')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('is empty for an empty cell', () => {
    expect(parsePhotos('')).toEqual([]);
    expect(parsePhotos(undefined)).toEqual([]);
  });
});

describe('exportFileName', () => {
  it('carries the date so two exports do not collide', () => {
    expect(exportFileName('csv', new Date(2026, 7, 18))).toBe('products-2026-08-18.csv');
    expect(exportFileName('json', new Date(2026, 7, 18))).toBe('products-2026-08-18.json');
  });
});
