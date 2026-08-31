/**
 * The booking panel's "When" form, as pure functions.
 *
 * A booking on the wire is two instants; on the panel it is a day, a start
 * and a duration in the DISPLAY zone. This file is the whole translation:
 * `whenFormOf` reads a record into the form, `whenInstants` builds the two
 * instants back (day + minute in the display zone → an instant → formatted
 * with the BOT zone's offset, the only framing the API reads correctly — see
 * `zone.ts`), `isWhenDirty` says whether Save has anything to send, and
 * `validateWhen` says what the server would refuse before the round trip.
 *
 * Nothing here knows about React or the API client, so every rule that could
 * be wrong — a booking crossing midnight, a display zone that is not the bot's,
 * a 25-hour duration — is pinned in `panelForm.test.ts`.
 */
import { formatMinuteOfDay, timeRangeLabel } from '~ui';
import type { BookingRecord, DisplayZone } from '../types';
import { formatMoney } from './appointmentsColumns';
import { durationMinutes } from './bookingInput';
import { errorCode } from './errors';
import { parseDayKey, sameWallClock, toZoneIso, wallClock, zonedInstant } from './zone';

export interface WhenForm {
  /** `YYYY-MM-DD` in the display zone. */
  day: string;
  /** Minutes since the display zone's midnight. */
  startMinute: number;
  /** Minutes. */
  duration: number;
}

/** The API refuses anything longer (24 h accepted, past it rejected). */
export const MAX_DURATION_MIN = 24 * 60;
export const MIN_DURATION_MIN = 5;

/** The record's timing as the form shows it, in `zone`. */
export function whenFormOf(record: Pick<BookingRecord, 'startTime' | 'endTime'>, zone: string): WhenForm {
  const start = wallClock(new Date(record.startTime).getTime(), zone);
  return { day: start.dayKey, startMinute: start.minuteOfDay, duration: durationMinutes(record) };
}

/** The two instants a form means, in `displayZone`, formatted with the bot's offset (`botZone`, UTC when the bot has none). */
export function whenInstants(
  form: WhenForm,
  displayZone: string,
  botZone: string | null,
): { startTime: string; endTime: string } {
  const start = zonedInstant(form.day, form.startMinute, displayZone);
  const wire = botZone ?? 'UTC';
  return { startTime: toZoneIso(start, wire), endTime: toZoneIso(start + form.duration * 60_000, wire) };
}

/** True when saving `form` would send different instants than the record has. */
export function isWhenDirty(
  form: WhenForm,
  record: Pick<BookingRecord, 'startTime' | 'endTime'>,
  displayZone: string,
): boolean {
  const start = zonedInstant(form.day, form.startMinute, displayZone);
  if (Number.isNaN(start)) return true;
  const end = start + form.duration * 60_000;
  return start !== new Date(record.startTime).getTime() || end !== new Date(record.endTime).getTime();
}

/** What the server would refuse, said first; null when the form can be sent. */
export function validateWhen(form: WhenForm): string | null {
  if (!parseDayKey(form.day)) return 'Pick a day.';
  if (!Number.isInteger(form.startMinute) || form.startMinute < 0 || form.startMinute >= 24 * 60)
    return 'Pick a start time.';
  if (!Number.isFinite(form.duration) || form.duration < MIN_DURATION_MIN)
    return `The booking must last at least ${MIN_DURATION_MIN} minutes.`;
  if (form.duration > MAX_DURATION_MIN) return 'A booking cannot be longer than 24 hours.';
  return null;
}

/** Which control an API error belongs under, so the message lands beside it rather than in a toast. */
export type WhenField = 'day' | 'start' | 'duration';

export function whenFieldOfError(err: unknown): WhenField | null {
  switch (errorCode(err)) {
    case 'BookingStartTimeRequired':
      return 'start';
    case 'BookingEndTimeRequired':
    case 'BookingEndTimeBeforeStartTime':
    case 'BookingInvalidDuration':
      return 'duration';
    default:
      return null;
  }
}

/** True once the booking has ended (what `primaryActions` calls `isPast`). */
export function isPastBooking(record: Pick<BookingRecord, 'endTime'>, now: number): boolean {
  return new Date(record.endTime).getTime() < now;
}

// ---------------------------------------------------------------------------
// Labels — the sentences the panel header and the wizard summary print
// ---------------------------------------------------------------------------

export interface LabelOptions {
  hour12?: boolean;
  locale?: string;
  /** Today's key in the same zone; when given, today prints as "Today". */
  todayKey?: string | null;
}

const DAY_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function dayFormatter(locale: string | undefined, withYear: boolean): Intl.DateTimeFormat {
  const key = `${locale ?? ''}|${withYear ? 'y' : ''}`;
  let f = DAY_FORMATTERS.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: withYear ? 'numeric' : undefined,
      timeZone: 'UTC',
    });
    DAY_FORMATTERS.set(key, f);
  }
  return f;
}

/** "Mon, Aug 17" (adds the year when it is not this year); "Today" when `todayKey` matches; the key itself when it does not parse. */
export function dayLabel(dayKey: string, options: LabelOptions = {}): string {
  if (options.todayKey && options.todayKey === dayKey) return 'Today';
  const p = parseDayKey(dayKey);
  if (!p) return dayKey;
  const thisYear = options.todayKey ? Number(options.todayKey.slice(0, 4)) : new Date().getUTCFullYear();
  return dayFormatter(options.locale, p[0] !== thisYear).format(Date.UTC(p[0], p[1] - 1, p[2]));
}

/**
 * "10:00 – 10:30", or "22:30 – 01:15 (Tue, Aug 18)" when the booking ends on
 * another day of the zone. Both ends read in `zone`.
 */
export function timeSpanLabel(
  record: Pick<BookingRecord, 'startTime' | 'endTime'>,
  zone: string,
  options: LabelOptions = {},
): string {
  const start = wallClock(new Date(record.startTime).getTime(), zone);
  const end = wallClock(new Date(record.endTime).getTime(), zone);
  const label = timeRangeLabel(start.minuteOfDay, end.minuteOfDay, { hour12: options.hour12, locale: options.locale });
  if (end.dayKey === start.dayKey) return label;
  // Midnight as an end is still "the same day" to a person; anything past it is not.
  if (end.minuteOfDay === 0 && end.dayKey > start.dayKey) return label;
  return `${label} (${dayLabel(end.dayKey, options)})`;
}

/** "Mon, Aug 17 · 10:00 – 10:30" — the panel header's first line. */
export function whenLabel(
  record: Pick<BookingRecord, 'startTime' | 'endTime'>,
  zone: string,
  options: LabelOptions = {},
): string {
  const start = wallClock(new Date(record.startTime).getTime(), zone);
  return `${dayLabel(start.dayKey, options)} · ${timeSpanLabel(record, zone, options)}`;
}

/**
 * The second header line: the same span in the BOT's zone, or null when the
 * display zone shows the same wall clock at that instant (nothing to add).
 */
export function botTimeLabel(
  record: Pick<BookingRecord, 'startTime' | 'endTime'>,
  zone: DisplayZone,
  options: LabelOptions = {},
): string | null {
  if (!zone.botZone || zone.botZone === zone.zone) return null;
  const at = new Date(record.startTime).getTime();
  if (sameWallClock(zone.botZone, zone.zone, at)) return null;
  const botDay = wallClock(at, zone.botZone).dayKey;
  const displayDay = wallClock(at, zone.zone).dayKey;
  const span = timeSpanLabel(record, zone.botZone, { ...options, todayKey: null });
  const day = botDay === displayDay ? '' : `${dayLabel(botDay, { ...options, todayKey: null })} · `;
  return `${day}${span} in bot time (${zone.botZone})`;
}

/** A single minute of day as the zone's clock prints it. */
export function minuteLabel(minute: number, options: LabelOptions = {}): string {
  return formatMinuteOfDay(minute, { hour12: options.hour12, locale: options.locale });
}

/**
 * "$25.00" / "€80.00" per locale; "Free" for zero; "" for no price. The number
 * itself goes through `formatMoney` — the module's one money formatter — so
 * the panel, the table and a service card cannot disagree about a price. An
 * amount that is not a number at all is not money and is echoed as it came.
 */
export function priceLabel(price: { amount: string; currency: string } | null | undefined, locale?: string): string {
  if (!price) return '';
  const amount = Number(price.amount);
  if (!Number.isFinite(amount)) return `${price.amount} ${price.currency}`;
  if (amount === 0) return 'Free';
  return formatMoney(amount, price.currency, locale);
}
