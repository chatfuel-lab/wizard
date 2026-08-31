import { describe, expect, it } from 'vitest';
import { dealField, DEFAULT_CURRENCY } from './dealFields';
import { attributeMap, currencyOf, formatMoney, rawOf, readValue, toAttrValue, toDateInput } from './dealFieldValue';

const amount = dealField('amount');
const closeDate = dealField('closeDate');
const probability = dealField('probability');
const currency = dealField('currency');
const company = dealField('company');

describe('rawOf', () => {
  it('reads whichever branch the value arrived in', () => {
    expect(rawOf({ __typename: 'BotAttributeValueString', stringValue: '1500.50' })).toBe('1500.50');
    expect(rawOf({ __typename: 'BotAttributeValueLong', longValue: 42 })).toBe('42');
    expect(rawOf({ __typename: 'BotAttributeValueDouble', doubleValue: 1.5 })).toBe('1.5');
    expect(rawOf({ __typename: 'BotAttributeValueDatetime', datetimeValue: '1790000000000' })).toBe('1790000000000');
    expect(rawOf({ __typename: 'BotAttributeValueBoolean', booleanValue: false })).toBe('false');
    expect(rawOf(null)).toBe('');
  });

  it('keeps an empty string rather than falling through to another branch', () => {
    expect(rawOf({ __typename: 'BotAttributeValueString', stringValue: '' })).toBe('');
  });
});

describe('attributeMap', () => {
  it('keys by attribute name and tolerates a missing list', () => {
    expect(
      attributeMap([
        { attr: { name: 'deal amount' }, value: { stringValue: '900' } },
        { attr: { name: 'deal company' }, value: { stringValue: 'Acme' } },
      ]),
    ).toEqual({ 'deal amount': '900', 'deal company': 'Acme' });
    expect(attributeMap(undefined)).toEqual({});
  });
});

describe('money', () => {
  it('reads the canonical form', () => {
    expect(readValue('money', '1500.50')).toEqual({ raw: '1500.50', parsed: 1500.5, ok: true });
  });

  it('reads what other writers produce', () => {
    expect(readValue('money', '€1 234,56').parsed).toBe(1234.56);
    expect(readValue('money', '$1,234.56').parsed).toBe(1234.56);
    expect(readValue('money', '1.234,56').parsed).toBe(1234.56);
    expect(readValue('money', '-250').parsed).toBe(-250);
  });

  it('treats a lone comma with three digits after it as a thousands separator', () => {
    expect(readValue('money', '1,234').parsed).toBe(1234);
    expect(readValue('money', '1,50').parsed).toBe(1.5);
  });

  it('reports an unreadable value instead of NaN', () => {
    const value = readValue('money', 'about 5k');
    expect(value.parsed).toBeNull();
    expect(value.ok).toBe(false);
    expect(value.raw).toBe('about 5k');
  });

  it('an unset field is ok, not broken', () => {
    expect(readValue('money', undefined)).toEqual({ raw: '', parsed: null, ok: true });
    expect(readValue('money', '   ')).toEqual({ raw: '', parsed: null, ok: true });
  });

  it('canonicalises on write and leaves nonsense alone for the server to reject', () => {
    expect(toAttrValue(amount, ' €1 234,56 ')).toBe('1234.56');
    expect(toAttrValue(amount, '1500.50')).toBe('1500.5');
    expect(toAttrValue(amount, 'about 5k')).toBe('about 5k');
    expect(toAttrValue(amount, '  ')).toBe('');
  });
});

describe('date', () => {
  const ms = Date.UTC(2026, 8, 30);

  it('every input form canonicalises to the same millisecond timestamp', () => {
    expect(toAttrValue(closeDate, '2026-09-30')).toBe(String(ms));
    expect(toAttrValue(closeDate, String(ms))).toBe(String(ms));
    expect(toAttrValue(closeDate, '2026-09-30T00:00:00.000Z')).toBe(String(ms));
  });

  it('reads milliseconds, seconds and ISO alike', () => {
    expect(readValue('date', String(ms)).parsed).toBe(ms);
    expect(readValue('date', String(ms / 1000)).parsed).toBe(ms);
    expect(readValue('date', '2026-09-30').parsed).toBe(ms);
  });

  it('round-trips to the value a date input wants', () => {
    expect(toDateInput(readValue('date', String(ms)))).toBe('2026-09-30');
    expect(toDateInput(readValue('date', 'next tuesday'))).toBe('');
  });

  it('a date-only string never drifts by timezone', () => {
    expect(new Date(readValue('date', '2026-09-30').parsed!).toISOString()).toBe('2026-09-30T00:00:00.000Z');
  });

  it('reports an unreadable date', () => {
    expect(readValue('date', 'next tuesday')).toEqual({ raw: 'next tuesday', parsed: null, ok: false });
  });
});

describe('percent', () => {
  it('clamps to 0..100 and rounds', () => {
    expect(readValue('percent', '40').parsed).toBe(40);
    expect(readValue('percent', '40.6').parsed).toBe(41);
    expect(readValue('percent', '140').parsed).toBe(100);
    expect(readValue('percent', '-5').parsed).toBe(0);
    expect(toAttrValue(probability, '40.6%')).toBe('41');
  });
});

describe('currency and text', () => {
  it('upper-cases a three-letter code and passes anything else through', () => {
    expect(toAttrValue(currency, 'usd')).toBe('USD');
    expect(toAttrValue(currency, 'dollars')).toBe('dollars');
    expect(readValue('currency', 'EUR')).toEqual({ raw: 'EUR', parsed: null, ok: true });
  });

  it('text is never unreadable', () => {
    expect(readValue('text', 'about 5k').ok).toBe(true);
    expect(toAttrValue(company, '  Acme Ltd  ')).toBe('Acme Ltd');
  });

  it('falls back to the module default when a deal has no currency of its own', () => {
    expect(currencyOf({}, 'deal currency')).toBe(DEFAULT_CURRENCY);
    expect(currencyOf({ 'deal currency': '  ' }, 'deal currency')).toBe(DEFAULT_CURRENCY);
    expect(currencyOf({ 'deal currency': 'usd' }, 'deal currency')).toBe('USD');
  });
});

describe('formatMoney', () => {
  it('formats a real ISO code', () => {
    expect(formatMoney(1500.5, 'EUR', 'en-US')).toBe('€1,500.50');
    expect(formatMoney(96400, 'EUR', 'en-US')).toBe('€96,400');
  });

  it('never throws — Intl renders an unknown three-letter code as-is', () => {
    // Intl separates a bare code from the number with U+00A0, not a space.
    expect(formatMoney(1500, 'ZZZ', 'en-US').replace(/\u00a0/g, ' ')).toBe('ZZZ 1,500');
  });

  it('falls back to number + label when the code is not three letters', () => {
    expect(formatMoney(1500, 'dollars', 'en-US')).toBe('1,500 dollars');
    expect(formatMoney(1500, '', 'en-US')).toBe('1,500');
  });
});
