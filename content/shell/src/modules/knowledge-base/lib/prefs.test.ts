import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, PREFS_KEY, isProductLayout, parsePrefs, samePrefs, serializePrefs } from './prefs';

describe('parsePrefs', () => {
  it('is the default for nothing stored', () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs(undefined)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('')).toEqual(DEFAULT_PREFS);
  });

  it('never throws on garbage', () => {
    expect(parsePrefs('{not json')).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('42')).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('null')).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('[]')).toEqual({ ...DEFAULT_PREFS });
  });

  it('keeps what it recognises and repairs the rest', () => {
    expect(parsePrefs('{"productLayout":"table","productSort":"nope"}')).toEqual({
      productLayout: 'table',
      productSort: DEFAULT_PREFS.productSort,
    });
  });

  it('round-trips', () => {
    const prefs = { productLayout: 'table', productSort: 'price' } as const;
    expect(parsePrefs(serializePrefs(prefs))).toEqual(prefs);
  });
});

describe('samePrefs', () => {
  it('is true only for the same values', () => {
    expect(samePrefs(DEFAULT_PREFS, { ...DEFAULT_PREFS })).toBe(true);
    expect(samePrefs(DEFAULT_PREFS, { ...DEFAULT_PREFS, productLayout: 'table' })).toBe(false);
  });
});

describe('the key', () => {
  it('carries a version, so a shape change reads as "no preferences"', () => {
    expect(PREFS_KEY).toMatch(/\.v\d+$/);
  });
});

describe('isProductLayout', () => {
  it('rejects anything else', () => {
    expect(isProductLayout('grid')).toBe(true);
    expect(isProductLayout('list')).toBe(false);
    expect(isProductLayout(null)).toBe(false);
  });
});
