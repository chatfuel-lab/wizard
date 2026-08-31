import { describe, expect, it } from 'vitest';
import { COUNTRY_CODES, countryOptions, isCountryCode } from './countries';

describe('countries', () => {
  it('has the ISO alpha-2 list, unique and upper-case', () => {
    expect(COUNTRY_CODES.length).toBeGreaterThan(240);
    expect(new Set(COUNTRY_CODES).size).toBe(COUNTRY_CODES.length);
    expect(COUNTRY_CODES.every((c) => /^[A-Z]{2}$/.test(c))).toBe(true);
    expect(isCountryCode('DE')).toBe(true);
    expect(isCountryCode('de')).toBe(true);
    expect(isCountryCode('XX')).toBe(false);
    expect(isCountryCode(null)).toBe(false);
  });
  it('names them and sorts by name; the value is the code', () => {
    const options = countryOptions('en');
    const de = options.find((o) => o.value === 'DE');
    expect(de?.label).toBe('Germany (DE)');
    const labels = options.map((o) => o.label);
    expect([...labels].sort((a, b) => a.localeCompare(b))).toEqual(labels);
    expect(options).toHaveLength(COUNTRY_CODES.length);
  });
});
