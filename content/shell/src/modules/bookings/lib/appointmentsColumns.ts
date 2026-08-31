/**
 * The appointments table's columns as data, and what each cell says.
 *
 * Column definitions live here rather than in the component so that "which
 * columns hide on a phone" and "what does the customer cell print for a
 * Google-Calendar-imported booking" are tests, not screenshots. The
 * component decides how a cell LOOKS; this file decides what it CONTAINS.
 *
 * Every wall clock printed comes from `wallClock(at, zone)` — the display
 * zone, never `Date#getHours` — and a booking that crosses midnight in that
 * zone says so with its end day rather than pretending the range fits one.
 */
import type { GoodsItemPriceCurrency } from '~api/generated/bookings/graphql';
import type { BookingRecord } from '../types';
import { customerName } from './announce';
import type { AppointmentsSortKey } from './bookingsParams';
import { durationMinutes } from './bookingInput';
import { specialistName } from './catalogStore';
import type { Band, Density } from './layout';
import { isNarrow } from './layout';
import { statusMeta, type StatusMeta } from './status';
import { parseDayKey, wallClock } from './zone';

export interface AppointmentColumnSpec {
  key: AppointmentsSortKey;
  label: string;
  /** CSS width for the `<col>`. */
  width: string;
  align: 'start' | 'end';
  sortable: boolean;
}

/** Display order. Every key is sortable — the sort is local, so nothing is out of reach. */
export const APPOINTMENT_COLUMNS: readonly AppointmentColumnSpec[] = [
  { key: 'start', label: 'When', width: '9rem', align: 'start', sortable: true },
  { key: 'customer', label: 'Customer', width: '10.5rem', align: 'start', sortable: true },
  { key: 'service', label: 'Service', width: '9.5rem', align: 'start', sortable: true },
  { key: 'specialist', label: 'Specialist', width: '9.5rem', align: 'start', sortable: true },
  { key: 'status', label: 'Status', width: '6rem', align: 'start', sortable: true },
  { key: 'duration', label: 'Duration', width: '5.5rem', align: 'end', sortable: true },
  { key: 'price', label: 'Price', width: '5.5rem', align: 'end', sortable: true },
];

/**
 * Which columns the band takes away, so the table never scrolls sideways at
 * the band's floor (the widths above are minimums; `table-layout: fixed`
 * stretches them when there is room and overflows when there is not).
 * Below `wide` (900px) the specialist and the numeric tail go, leaving
 * when · customer · service · status — the four that fit 600px (the compact
 * band renders cards, `AppointmentCards`, built from those same four cells).
 * `wide` drops only the duration — it is readable off the range — and
 * `inline` (≥ 1280px) shows everything. Density never hides a column: it
 * changes row height, and hiding data behind a spacing preference would be
 * a surprise.
 */
export function hiddenColumnsFor(band: Band, _density: Density): AppointmentsSortKey[] {
  if (isNarrow(band)) return ['specialist', 'duration', 'price'];
  if (band === 'wide') return ['duration'];
  return [];
}

// ---------------------------------------------------------------------------
// Cells
// ---------------------------------------------------------------------------

export interface TimeCell {
  /** `Mon, Aug 17` (year added when it is not `todayKey`'s). */
  day: string;
  /** `10:00 – 10:30`, or `10:00 – Tue 01:30` when the end lands on another day. */
  range: string;
  /** `YYYY-MM-DD` of the start in the display zone — for grouping and sorting. */
  dayKey: string;
  crossesMidnight: boolean;
}

export interface FormatOptions {
  hour12?: boolean;
  locale?: string;
  /** Today's key in the display zone; a start in another year prints its year. */
  todayKey?: string;
}

const dayFormatters = new Map<string, Intl.DateTimeFormat>();
function dayFormatter(locale: string | undefined, withYear: boolean): Intl.DateTimeFormat {
  const key = `${locale ?? ''}|${withYear ? 'y' : ''}`;
  let f = dayFormatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: withYear ? 'numeric' : undefined,
      timeZone: 'UTC',
    });
    dayFormatters.set(key, f);
  }
  return f;
}

const timeFormatters = new Map<string, Intl.DateTimeFormat>();
function timeFormatter(locale: string | undefined, hour12: boolean): Intl.DateTimeFormat {
  const key = `${locale ?? ''}|${hour12 ? 12 : 23}`;
  let f = timeFormatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hourCycle: hour12 ? 'h12' : 'h23',
      timeZone: 'UTC',
    });
    timeFormatters.set(key, f);
  }
  return f;
}

/** A day key rendered as a date label, zone-free (a key is a date). */
export function formatDayLabel(dayKey: string, options: FormatOptions = {}): string {
  const p = parseDayKey(dayKey);
  if (!p) return dayKey;
  const todayYear = options.todayKey ? parseDayKey(options.todayKey)?.[0] : undefined;
  const withYear = todayYear !== undefined && todayYear !== p[0];
  return dayFormatter(options.locale, withYear)
    .format(new Date(Date.UTC(p[0], p[1] - 1, p[2])))
    .replace(/\u202f/g, ' ');
}

/** `Aug 17` — the short form the coverage lines and the CSV name use. */
export function formatShortDay(dayKey: string, options: FormatOptions = {}): string {
  const p = parseDayKey(dayKey);
  if (!p) return dayKey;
  const todayYear = options.todayKey ? parseDayKey(options.todayKey)?.[0] : undefined;
  const withYear = todayYear !== undefined && todayYear !== p[0];
  return new Intl.DateTimeFormat(options.locale, {
    month: 'short',
    day: 'numeric',
    year: withYear ? 'numeric' : undefined,
    timeZone: 'UTC',
  })
    .format(new Date(Date.UTC(p[0], p[1] - 1, p[2])))
    .replace(/\u202f/g, ' ');
}

/** The minute of a day as a clock label; `hour12` defaults to 24-hour so tests are deterministic. */
export function formatClock(minuteOfDay: number, options: FormatOptions = {}): string {
  return timeFormatter(options.locale, options.hour12 ?? false)
    .format(minuteOfDay * 60_000)
    .replace(/\u202f/g, ' ');
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function timeCell(
  record: Pick<BookingRecord, 'startTime' | 'endTime'>,
  zone: string,
  options: FormatOptions = {},
): TimeCell {
  const startMs = new Date(record.startTime).getTime();
  const endMs = new Date(record.endTime).getTime();
  const start = wallClock(startMs, zone);
  const end = wallClock(endMs, zone);
  // Ending exactly at the next midnight is still "the same day" (23:00 – 00:00).
  const crossesMidnight =
    start.dayKey !== end.dayKey && !(end.minuteOfDay === 0 && end.dayKey === nextDayKey(start.dayKey));
  const from = formatClock(start.minuteOfDay, options);
  const to = formatClock(end.minuteOfDay, options);
  return {
    day: formatDayLabel(start.dayKey, options),
    range: crossesMidnight ? `${from} – ${WEEKDAY_SHORT[end.weekday]} ${to}` : `${from} – ${to}`,
    dayKey: start.dayKey,
    crossesMidnight,
  };
}

function nextDayKey(dayKey: string): string {
  const p = parseDayKey(dayKey);
  if (!p) return dayKey;
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export type CustomerKind = 'contact' | 'inline' | 'gcal' | 'walkin';

export interface CustomerCell {
  kind: CustomerKind;
  /** The name shown in bold: contact name, inline name, "Google Calendar event", or "Walk-in". */
  name: string;
  /** Second line: phone, the GCal event summary, or null. */
  detail: string | null;
  avatar: string | null;
  /** The name a search or a CSV row uses — never the placeholder. */
  searchName: string;
  phone: string | null;
}

/** Whether a record is the Google-Calendar-imported branch. */
export function isGoogleCalendarRef(
  record: BookingRecord,
): record is Extract<BookingRecord, { __typename: 'BookingWithGoogleCalendarRef' }> {
  return record.__typename === 'BookingWithGoogleCalendarRef';
}

export function customerCell(record: BookingRecord): CustomerCell {
  const contact = record.contact;
  if (contact) {
    const phone = contact.__typename === 'WhatsappContact' ? contact.phone : null;
    return {
      kind: 'contact',
      name: contact.name.trim() || 'Unnamed',
      detail: phone ? formatPhone(phone) : null,
      avatar: contact.profilePictureUrl ?? null,
      searchName: contact.name,
      phone,
    };
  }
  const inline = record.inlineContact;
  if (inline) {
    return {
      kind: 'inline',
      name: inline.name.trim() || 'Unnamed',
      detail: formatPhone(inline.phoneNumber),
      avatar: null,
      searchName: inline.name,
      phone: inline.phoneNumber,
    };
  }
  if (isGoogleCalendarRef(record)) {
    const summary = record.googleCalendarRefData.summary.trim();
    return {
      kind: 'gcal',
      name: 'Google Calendar event',
      detail: summary || record.googleCalendarRefData.calendar.summary,
      avatar: null,
      searchName: summary,
      phone: null,
    };
  }
  return { kind: 'walkin', name: 'Walk-in', detail: null, avatar: null, searchName: '', phone: null };
}

/**
 * `+12025550100` → `+1 202 555 0100`; anything else verbatim.
 *
 * NANP is the one numbering plan whose grouping is knowable from the digits
 * alone. Everything else is left exactly as the API gave it: regrouping in
 * threes reads as correct to nobody — `+4915112345678` is `+49 151 12345678`
 * in Germany, never `+491 511 234 567 8` — and a number the operator has to
 * dial is worth more unstyled than restyled wrong.
 */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1'))
    return `+1 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  return raw;
}

export interface ServiceCell {
  title: string;
  deleted: boolean;
}

export function serviceCell(record: Pick<BookingRecord, 'service'>): ServiceCell | null {
  const s = record.service;
  if (!s) return null;
  return { title: s.title, deleted: s.__typename === 'DeletedGoodsService' };
}

export interface SpecialistCell {
  name: string;
  deleted: boolean;
  avatar: string | null;
}

export function specialistCell(record: Pick<BookingRecord, 'specialist'>): SpecialistCell | null {
  const s = record.specialist;
  if (!s) return null;
  const deleted = s.__typename === 'DeletedSpecialist';
  return { name: specialistName(s.profile), deleted, avatar: deleted ? null : (s.profile.logo?.url ?? null) };
}

export interface PriceCell {
  amount: number;
  currency: GoodsItemPriceCurrency;
  label: string;
}

/** null is a currency `Intl` refused — cached like any other answer, so the fallback is decided once. */
const moneyFormatters = new Map<string, Intl.NumberFormat | null>();
const plainFormatters = new Map<string, Intl.NumberFormat>();

function plainFormatter(locale: string | undefined): Intl.NumberFormat {
  const key = locale ?? '';
  let f = plainFormatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    plainFormatters.set(key, f);
  }
  return f;
}

/**
 * The module's one money formatter — `priceLabel` (`panelForm.ts`) and
 * `formatPrice` (`serviceInput.ts`) are the same number through here, so a
 * price reads the same in the table, the panel and a service card.
 *
 * `25.00 USD` → `$25.00`. `Intl` accepts any well-formed three-letter code and
 * prints it as-is (`XYZ 12.50`); only a code it REFUSES (`not-a-code`) reaches
 * the fallback, which is the plain number with the code after it.
 */
export function formatMoney(amount: number, currency: string, locale?: string): string {
  const key = `${locale ?? ''}|${currency}`;
  let f = moneyFormatters.get(key);
  // `undefined` is "not asked yet"; `null` is "asked, and Intl said no". Caching
  // a plain-number formatter under this key instead would drop the currency
  // from every call after the first.
  if (f === undefined) {
    try {
      f = new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' });
    } catch {
      f = null;
    }
    moneyFormatters.set(key, f);
  }
  return f ? f.format(amount).replace(/\u00a0/g, ' ') : `${plainFormatter(locale).format(amount)} ${currency}`;
}

/** The service's price — a Deleted service still prices; a malformed amount does not. */
export function priceCell(record: Pick<BookingRecord, 'service'>, locale?: string): PriceCell | null {
  const price = record.service?.price;
  if (!price) return null;
  const amount = Number(price.amount);
  if (!Number.isFinite(amount)) return null;
  return { amount, currency: price.currency, label: formatMoney(amount, price.currency, locale) };
}

/** `90` → `1 h 30 min`. */
export function formatDurationLabel(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function durationCell(record: Pick<BookingRecord, 'startTime' | 'endTime'>): { minutes: number; label: string } {
  const minutes = durationMinutes(record);
  return { minutes, label: formatDurationLabel(minutes) };
}

export function statusCell(record: Pick<BookingRecord, 'status'>): StatusMeta {
  return statusMeta(record.status);
}

/** The customer's display name — the shared `customerName` with the GCal branch added. */
export function displayCustomerName(record: BookingRecord): string {
  const cell = customerCell(record);
  return cell.kind === 'gcal' ? cell.name : customerName(record);
}
