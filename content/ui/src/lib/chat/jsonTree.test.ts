import { describe, expect, it } from 'vitest';
import {
  entriesOf,
  formatScalar,
  isExpandable,
  jsonKind,
  jsonPath,
  opensByDefault,
  stringifyJson,
  summarize,
  truncateText,
} from './jsonTree';

/* The arguments of a realistic approval batch. Every assertion about
   shape is made against this rather than a toy object. */
const CREATE_SERVICE = {
  botId: '000000000000000000000002',
  service: {
    title: 'Consultation',
    description: 'A 45-minute call to scope the build.',
    durationSeconds: 2700,
    images: [],
    isAvailable: true,
    price: { amount: 12000, currency: 'USD' },
  },
};

describe('jsonKind', () => {
  it('separates the six JSON kinds', () => {
    expect(jsonKind(null)).toBe('null');
    expect(jsonKind(true)).toBe('boolean');
    expect(jsonKind(1)).toBe('number');
    expect(jsonKind('a')).toBe('string');
    expect(jsonKind([])).toBe('array');
    expect(jsonKind({})).toBe('object');
  });

  it('does not pretend an undefined is a null', () => {
    expect(jsonKind(undefined)).toBe('unsupported');
    expect(jsonKind(() => {})).toBe('unsupported');
    expect(jsonKind(Symbol('x'))).toBe('unsupported');
  });
});

describe('summarize', () => {
  it('says how much is behind a collapsed row', () => {
    expect(summarize(CREATE_SERVICE).label).toBe('{…} 2 keys');
    expect(summarize(CREATE_SERVICE.service).label).toBe('{…} 6 keys');
    expect(summarize(CREATE_SERVICE.service.price).label).toBe('{…} 2 keys');
    expect(summarize([1, 2, 3]).label).toBe('[…] 3 items');
    expect(summarize([1]).label).toBe('[…] 1 item');
    expect(summarize({ a: 1 }).label).toBe('{…} 1 key');
  });

  it('shows an empty container as the empty literal, not as "0 keys"', () => {
    expect(summarize({}).label).toBe('{}');
    expect(summarize(CREATE_SERVICE.service.images).label).toBe('[]');
  });

  it('keeps the quotes on a string, so "12" and 12 are visibly different', () => {
    expect(summarize('12').label).toBe('"12"');
    expect(summarize(12).label).toBe('12');
    expect(summarize(true).label).toBe('true');
    expect(summarize(null).label).toBe('null');
  });

  it('reports a number JSON cannot hold rather than showing it as null', () => {
    expect(formatScalar(Number.NaN)).toBe('NaN');
    expect(formatScalar(Number.POSITIVE_INFINITY)).toBe('Infinity');
  });

  it('escapes what a raw string would break', () => {
    expect(formatScalar('line\nbreak')).toBe('"line\\nbreak"');
    expect(formatScalar('a "quote"')).toBe('"a \\"quote\\""');
  });
});

describe('entriesOf', () => {
  it('keeps the order the source wrote', () => {
    expect(entriesOf(CREATE_SERVICE.service).map((entry) => entry.key)).toEqual([
      'title',
      'description',
      'durationSeconds',
      'images',
      'isAvailable',
      'price',
    ]);
  });

  it('builds a path a person could type back', () => {
    const service = entriesOf(CREATE_SERVICE).find((entry) => entry.key === 'service')!;
    const price = entriesOf(service.value, service.path).find((entry) => entry.key === 'price')!;
    expect(price.path).toBe('service.price');
    expect(entriesOf(price.value, price.path).map((entry) => entry.path)).toEqual([
      'service.price.amount',
      'service.price.currency',
    ]);
  });

  it('indexes an array and bracket-quotes an awkward key', () => {
    expect(entriesOf(['a', 'b'], 'images').map((entry) => entry.path)).toEqual(['images[0]', 'images[1]']);
    expect(jsonPath('meta', 'a.b', false)).toBe('meta["a.b"]');
    expect(jsonPath('', 'botId', false)).toBe('botId');
  });

  it('has no children for a scalar, so a walk terminates', () => {
    expect(entriesOf(42)).toEqual([]);
    expect(entriesOf('text')).toEqual([]);
    expect(entriesOf(null)).toEqual([]);
    expect(isExpandable(42)).toBe(false);
    expect(isExpandable({})).toBe(false);
    expect(isExpandable(CREATE_SERVICE)).toBe(true);
  });
});

describe('truncateText', () => {
  it('reports what it hid rather than just ending in an ellipsis', () => {
    expect(truncateText('abcdefghij', 4)).toEqual({ text: 'abcd', truncated: true, hidden: 6 });
    expect(truncateText('abc', 10)).toEqual({ text: 'abc', truncated: false, hidden: 0 });
  });

  it('does not split an emoji in half', () => {
    /* Cutting between the surrogates renders as a replacement character. */
    const text = `ab${'\u{1f600}'}cd`;
    expect(truncateText(text, 3).text).toBe('ab');
  });

  it('treats a nonsense limit as no limit', () => {
    expect(truncateText('abc', 0).truncated).toBe(false);
    expect(truncateText('abc', Number.NaN).truncated).toBe(false);
  });
});

describe('opensByDefault', () => {
  it('opens the approval arguments down to the level a person is deciding on', () => {
    expect(opensByDefault(CREATE_SERVICE, 0, 2)).toBe(true);
    expect(opensByDefault(CREATE_SERVICE.service, 1, 2)).toBe(true);
    expect(opensByDefault(CREATE_SERVICE.service.price, 2, 2)).toBe(false);
  });

  it('leaves a big container shut however shallow it is', () => {
    const many = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`k${i}`, i]));
    expect(opensByDefault(many, 0, 2)).toBe(false);
  });

  it('never opens something with nothing in it', () => {
    expect(opensByDefault({}, 0, 2)).toBe(false);
    expect(opensByDefault('a string', 0, 2)).toBe(false);
  });
});

describe('stringifyJson', () => {
  it('is what the copy button puts on the clipboard', () => {
    expect(stringifyJson({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it('answers null instead of throwing, so a copy button cannot take the render down', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(stringifyJson(cyclic)).toBeNull();
    expect(stringifyJson(undefined)).toBeNull();
    expect(stringifyJson(1n)).toBeNull();
  });
});
