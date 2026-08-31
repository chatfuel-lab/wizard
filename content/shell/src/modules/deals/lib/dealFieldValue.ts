import { DEFAULT_CURRENCY, type DealFieldKind, type DealFieldSpec } from './dealFields';

/**
 * Reading and writing deal-field values.
 *
 * The wire form is always a string, and **the canonical form is the contract**:
 * money as `"1500.50"` with no symbol and no separators, dates as millisecond
 * timestamps, percent as a bare integer. That is what lets the server derive
 * the typed interpretations its own date filters run on.
 *
 * Parsing exists for everything the module did not write. A flow, a CSV import
 * or a person in the dashboard can put `"€1 234,56"` or `"about 5k"` into the
 * same bucket, and the answer to the second one is `—`, never `NaN`.
 *
 * In practice: `ContactAttribute.value` is a single object and
 * for a custom attribute it is always `BotAttributeValueString` — `"1500.50"`
 * came back as a string, not a double. The SDL's promise that values are "also
 * represented as long, float, double, boolean or datetime" is internal, used
 * for filtering; it does not surface here. So the typed branches below are
 * handled defensively, not relied on.
 */

/** One branch of the BotAttributeValue interface, loosely typed so this file stays generated-code-free. */
export interface AttributeValueLike {
  __typename?: string;
  stringValue?: string | null;
  longValue?: number | string | null;
  doubleValue?: number | null;
  booleanValue?: boolean | null;
  datetimeValue?: string | null;
}

export interface AttributeEntryLike {
  attr: { name: string };
  value: AttributeValueLike;
}

/** The value exactly as the server holds it, whichever branch it arrived in. */
export function rawOf(value: AttributeValueLike | null | undefined): string {
  if (!value) return '';
  if (typeof value.stringValue === 'string') return value.stringValue;
  if (value.longValue !== null && value.longValue !== undefined) return String(value.longValue);
  if (value.doubleValue !== null && value.doubleValue !== undefined) return String(value.doubleValue);
  if (typeof value.datetimeValue === 'string') return value.datetimeValue;
  if (typeof value.booleanValue === 'boolean') return value.booleanValue ? 'true' : 'false';
  return '';
}

/** `contact.attributes` → name → raw string. Names never written are simply absent. */
export function attributeMap(entries: readonly AttributeEntryLike[] | null | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  for (const entry of entries ?? []) map[entry.attr.name] = rawOf(entry.value);
  return map;
}

export interface FieldValue {
  /** Exactly what the server holds; `''` when the attribute is unset. */
  raw: string;
  /** money/percent → a number, date → epoch ms, text → null. */
  parsed: number | null;
  /** False only when there IS a value and it could not be read. */
  ok: boolean;
}

const EMPTY: FieldValue = { raw: '', parsed: null, ok: true };

/**
 * A single comma with exactly three digits after it and something before it is
 * a thousands separator (`1,234`); otherwise it is a decimal comma (`1,50`).
 * `1,500` therefore reads as 1500 — the European "one and a half" loses. The
 * canonical form has no separators at all, so this only ever applies to values
 * this module did not write.
 */
function parseMoney(input: string): number | null {
  // A currency code on either side is fine; any other letter means this is
  // prose, not a number. Stripping letters wholesale would read "about 5k" as 5.
  const withoutCode = input
    .trim()
    .replace(/^[A-Za-z]{3}\s+/, '')
    .replace(/\s+[A-Za-z]{3}$/, '');
  if (/[A-Za-z]/.test(withoutCode)) return null;
  const cleaned = withoutCode.replace(/[^\d.,-]/g, '');
  if (cleaned === '' || cleaned === '-') return null;
  let normalized = cleaned;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    // Both present: the rightmost is the decimal mark, the other groups digits.
    const decimalAt = Math.max(lastComma, lastDot);
    normalized = `${cleaned.slice(0, decimalAt).replace(/[.,]/g, '')}.${cleaned.slice(decimalAt + 1)}`;
  } else if (lastComma !== -1) {
    const after = cleaned.length - lastComma - 1;
    const before = cleaned.slice(0, lastComma).replace('-', '');
    normalized = after === 3 && before.length > 0 ? cleaned.replace(/,/g, '') : cleaned.replace(/,/g, '.');
  }
  if (!/^-?\d*\.?\d+$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Ten-ish digits is a seconds timestamp; thirteen is milliseconds. */
function parseDate(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;
  if (/^-?\d+$/.test(trimmed)) {
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric)) return null;
    return Math.abs(numeric) < 1e11 ? numeric * 1000 : numeric;
  }
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePercent(input: string): number | null {
  const value = parseMoney(input);
  if (value === null) return null;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function readValue(kind: DealFieldKind, raw: string | undefined): FieldValue {
  if (raw === undefined || raw.trim() === '') return EMPTY;
  switch (kind) {
    case 'money': {
      const parsed = parseMoney(raw);
      return { raw, parsed, ok: parsed !== null };
    }
    case 'date': {
      const parsed = parseDate(raw);
      return { raw, parsed, ok: parsed !== null };
    }
    case 'percent': {
      const parsed = parsePercent(raw);
      return { raw, parsed, ok: parsed !== null };
    }
    case 'currency':
    case 'text':
      return { raw, parsed: null, ok: true };
  }
}

export function readField(spec: DealFieldSpec, raw: string | undefined): FieldValue {
  return readValue(spec.kind, raw);
}

/** `YYYY-MM-DD` is read as UTC midnight, so the day never drifts by timezone. */
function dateToMs(input: string): number | null {
  const trimmed = input.trim();
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (ymd) return Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  return parseDate(trimmed);
}

/**
 * Editable input → the canonical wire string. Returns `''` for "clear this
 * field", which the caller turns into contactAttributeDelete rather than a
 * write — an empty string is a value, and it would keep the attribute alive.
 */
export function toAttrValue(spec: DealFieldSpec, input: string): string {
  const trimmed = input.trim();
  if (trimmed === '') return '';
  switch (spec.kind) {
    case 'money': {
      const value = parseMoney(trimmed);
      return value === null ? trimmed : String(value);
    }
    case 'date': {
      const ms = dateToMs(trimmed);
      return ms === null ? trimmed : String(ms);
    }
    case 'percent': {
      const value = parsePercent(trimmed);
      return value === null ? trimmed : String(value);
    }
    case 'currency':
      return /^[A-Za-z]{3}$/.test(trimmed) ? trimmed.toUpperCase() : trimmed;
    case 'text':
      return trimmed;
  }
}

/** The value a `<input type="date">` wants back. */
export function toDateInput(value: FieldValue): string {
  if (value.parsed === null) return '';
  return new Date(value.parsed).toISOString().slice(0, 10);
}

/** An unknown or malformed currency code must not throw — it falls back to `1500.5 XYZ`. */
export function formatMoney(amount: number, currency: string, locale?: string): string {
  const code = /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : '';
  if (code !== '') {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      }).format(amount);
    } catch {
      /* not a real ISO code — fall through */
    }
  }
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(amount);
  return currency.trim() === '' ? number : `${number} ${currency.trim()}`;
}

/** The currency a deal's amount is in — its own field, else the module default. */
export function currencyOf(map: Record<string, string>, currencyName: string): string {
  const raw = map[currencyName]?.trim() ?? '';
  return raw === '' ? DEFAULT_CURRENCY : raw.toUpperCase();
}
