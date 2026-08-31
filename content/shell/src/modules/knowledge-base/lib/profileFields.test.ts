import { describe, expect, it } from 'vitest';
import { ESSENTIAL_FIELDS, FIELD_META, PROFILE_FIELDS, warnFor, websiteHref } from './profileFields';

describe('the field table', () => {
  it('describes every field it lists', () => {
    for (const field of PROFILE_FIELDS) {
      expect(FIELD_META[field].label).toBeTruthy();
      expect(FIELD_META[field].hint).toBeTruthy();
    }
  });

  it('keeps the instructions field out of the profile page', () => {
    expect(PROFILE_FIELDS).not.toContain('additionalInstructions');
    expect(FIELD_META.additionalInstructions).toBeDefined();
  });

  it('marks the fields a bot should not go live without', () => {
    expect(ESSENTIAL_FIELDS).toEqual(['companyName', 'phone']);
  });
});

describe('advisory warnings', () => {
  it('never warns on an empty value - empty is a state, not an error', () => {
    for (const field of PROFILE_FIELDS) expect(warnFor(field, '')).toBeNull();
    expect(warnFor('email', '   ')).toBeNull();
  });

  it('accepts numbers people actually dial', () => {
    for (const value of ['+1 202 555 0142', '020 7946 0958', '(555) 123-4567', '+49-30-901820']) {
      expect(warnFor('phone', value), value).toBeNull();
    }
  });

  it('flags a phone nobody could dial', () => {
    expect(warnFor('phone', 'call the shop')).toBeTruthy();
  });

  it('accepts an ordinary email and flags the rest', () => {
    expect(warnFor('email', 'hello@acme.com')).toBeNull();
    expect(warnFor('email', 'hello@acme')).toBeTruthy();
    expect(warnFor('email', 'hello')).toBeTruthy();
  });

  it('accepts a bare host as a website', () => {
    expect(warnFor('website', 'acme.com')).toBeNull();
    expect(warnFor('website', 'https://acme.com/menu')).toBeNull();
    expect(warnFor('website', 'not a website')).toBeTruthy();
  });

  it('leaves free text alone', () => {
    expect(warnFor('howToPay', 'Cash only, and a deposit for groups')).toBeNull();
    expect(warnFor('address', '12 Market Street')).toBeNull();
  });
});

describe('websiteHref', () => {
  it('adds a scheme to a bare host', () => {
    expect(websiteHref('acme.com')).toBe('https://acme.com');
  });

  it('leaves an explicit scheme alone', () => {
    expect(websiteHref('http://acme.com')).toBe('http://acme.com');
    expect(websiteHref('HTTPS://acme.com')).toBe('HTTPS://acme.com');
  });

  it('is null when there is nothing to link', () => {
    expect(websiteHref('   ')).toBeNull();
  });

  it('is null for a value that is not an address at all', () => {
    /* The field takes any string the operator types, and this function is what
       turns it into an href — so what cannot be a link comes back as none. */
    expect(websiteHref('javascript:alert(1)')).toBeNull();
    expect(websiteHref('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(websiteHref('ring the bell, no website')).toBeNull();
  });
});
