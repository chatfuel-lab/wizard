/**
 * The `/` search over the appointments list.
 *
 * It is LOCAL by necessity — `bookingsV2` has no text argument, and there is
 * no bookings search anywhere in the API — so it filters the rows the list has
 * loaded and the toolbar says so. What it looks at is what a front desk knows
 * about a booking: the customer's name, their phone, the service, the
 * specialist, and the Google Calendar summary of an imported event.
 *
 * Every whitespace-separated token must match somewhere (AND across tokens,
 * OR across fields), case- and accent-insensitive. A token that is a run of
 * digits (with optional `+`, spaces, dashes, dots, parentheses) is a PHONE
 * search: it compares digits only, so `202 555` finds `+1 202 555 0120` and
 * `(202)` does too. Pure; the component debounces.
 */
import type { BookingRecord } from '../types';
import { customerCell, serviceCell, specialistCell } from './appointmentsColumns';

/* Letters NFD cannot decompose (they are letters of their own, not accented ones). */
const LIGATURES: Record<string, string> = { ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss', ł: 'l', đ: 'd', ð: 'd', þ: 'th' };

const fold = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\u00f8\u00e6\u0153\u00df\u0142\u0111\u00f0\u00fe]/g, (ch) => LIGATURES[ch] ?? ch)
    .trim();

const digitsOf = (text: string): string => text.replace(/\D/g, '');

const PHONE_TOKEN = /^\+?[\d\s().-]+$/;

export interface SearchToken {
  text: string;
  /** Digits only, when the token reads as a phone fragment (≥ 2 digits). */
  digits: string | null;
}

/** Split and normalise a query; empty in → empty out. */
export function parseSearch(query: string): SearchToken[] {
  const tokens: SearchToken[] = [];
  for (const raw of query.split(/\s+/)) {
    const text = fold(raw);
    if (!text) continue;
    const digits = PHONE_TOKEN.test(raw) ? digitsOf(raw) : '';
    tokens.push({ text, digits: digits.length >= 2 ? digits : null });
  }
  return tokens;
}

/** The searchable text of a booking, folded once. */
export interface SearchIndex {
  fields: string[];
  phoneDigits: string | null;
}

export function indexOf(record: BookingRecord): SearchIndex {
  const customer = customerCell(record);
  const fields = [
    customer.searchName,
    customer.kind === 'gcal' ? customer.name : '',
    serviceCell(record)?.title ?? '',
    specialistCell(record)?.name ?? '',
  ]
    .map(fold)
    .filter(Boolean);
  return { fields, phoneDigits: customer.phone ? digitsOf(customer.phone) : null };
}

export function matchesSearch(index: SearchIndex, tokens: readonly SearchToken[]): boolean {
  for (const token of tokens) {
    const inText = index.fields.some((f) => f.includes(token.text));
    const inPhone = token.digits !== null && index.phoneDigits !== null && index.phoneDigits.includes(token.digits);
    if (!inText && !inPhone) return false;
  }
  return true;
}

/** The rows matching `query`; the same array back when the query is blank. */
export function searchAppointments(records: readonly BookingRecord[], query: string): BookingRecord[] {
  const tokens = parseSearch(query);
  if (tokens.length === 0) return [...records];
  return records.filter((record) => matchesSearch(indexOf(record), tokens));
}
