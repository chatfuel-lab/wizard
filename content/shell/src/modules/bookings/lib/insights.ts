/**
 * The Insights numbers, computed client-side over one loaded window.
 *
 * There is NO aggregation anywhere in the booking API — no counts by status,
 * no revenue, no utilisation, nothing server-side. `bookingsV2(start, end)`
 * hands back every booking overlapping the window and that is the whole
 * input. So every figure here is a fold over the rows the Insights range
 * store holds, and every card prints its coverage ("over 143 bookings ·
 * Aug 1 – 31") because that is what the number is a number OF.
 *
 * Definitions, so the cards and the docs cannot drift:
 *
 * - **Status mix**: counts per status in `STATUS_META` order.
 * - **No-show rate** = NoShow / (Attended + NoShow). Null when nobody has
 *   been resolved either way — `0%` would claim a perfect record.
 * - **Cancel rate** = Canceled / total. Null when the window is empty.
 * - **Attended revenue**: PER CURRENCY, the sum of `service.price.amount` over
 *   Attended bookings. Never summed across currencies — a €80 massage and a
 *   $25 haircut do not add. A Deleted service still prices (the ref keeps its
 *   price); an Attended booking with no price counts as "unpriced" and is
 *   said so beside the totals.
 * - **Utilisation** per specialist = occupied minutes (statuses with
 *   `occupies` — everything but Canceled) / scheduled minutes (the schedule's
 *   working minutes, break subtracted, × how often each weekday occurs in the
 *   window). A specialist with no schedule has no denominator → null, and the
 *   card says "no schedule" rather than 0%. Occupied minutes are clipped to
 *   the window so a booking straddling its edge counts only its inside part.
 * - **Busiest weekdays / hours**: counts of bookings by the weekday and the
 *   start hour of their start, in the DISPLAY zone (a 09:00 Berlin booking is
 *   an 03:00 New York one, and the operator asked to see New York).
 *
 * Absent by API, and the view says so: lead time (bookings carry no
 * `createdAt`), anything over more than one loaded window, anything server-
 * aggregated. Pure; tested.
 */
import { BookingStatus } from '~api/generated/bookings/graphql';
import type { BookingRecord, SpecialistRecord } from '../types';
import { formatClock, priceCell, type FormatOptions } from './appointmentsColumns';
import { rangeLabel } from './appointmentsRange';
import { specialistKeyOf } from './bookingsFilter';
import type { InsightsPeriod } from './bookingsParams';
import { daysOf, rangeLength, type DayRange, type WeekStartsOn } from './calendarRange';
import { hasSchedule, specialistName } from './catalogStore';
import { WEEKDAYS, workingMinutes } from './schedule';
import { STATUS_META, statusMeta, type StatusTone } from './status';
import { wallClock, weekdayOfKey } from './zone';

export interface StatusSlice {
  status: BookingStatus;
  label: string;
  tone: StatusTone;
  count: number;
  /** 0..1 of the total; 0 when the total is 0. */
  share: number;
}

export interface CurrencyRevenue {
  currency: string;
  amount: number;
  /** Attended bookings that contributed. */
  bookings: number;
}

export interface Utilisation {
  specialistId: string;
  name: string;
  occupiedMinutes: number;
  /** Null when the specialist has no schedule. */
  scheduledMinutes: number | null;
  /** occupied / scheduled, or null when there is no (or a zero) denominator. */
  ratio: number | null;
  /** Occupying bookings counted. */
  bookings: number;
}

export interface Bucket {
  /** Weekday 0..6 (Sunday = 0) or hour 0..23. */
  key: number;
  label: string;
  count: number;
}

export interface Insights {
  total: number;
  statusMix: StatusSlice[];
  noShow: { noShow: number; attended: number; rate: number | null };
  cancel: { canceled: number; total: number; rate: number | null };
  revenue: { perCurrency: CurrencyRevenue[]; attended: number; unpriced: number };
  utilisation: Utilisation[];
  /** In week order starting at `weekStartsOn`. */
  weekdays: Bucket[];
  /** 24 entries, hour 0..23. */
  hours: Bucket[];
  coverage: { count: number; range: DayRange; days: number };
}

export interface InsightsInput {
  /** The window's rows, already narrowed by the shared filter. */
  records: readonly BookingRecord[];
  range: DayRange;
  /** The display zone — buckets and clipping use its wall clock. */
  zone: string;
  specialists: readonly Pick<SpecialistRecord, 'id' | 'profile' | 'schedule'>[];
  weekStartsOn: WeekStartsOn;
  /** The window's instants, for clipping occupied minutes; omit to count whole bookings. */
  window?: { startMs: number; endMs: number } | null;
  format?: FormatOptions;
}

const WEEKDAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** How many times each weekday (0..6) occurs in the range. */
export function weekdayOccurrences(range: DayRange): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0];
  for (const key of daysOf(range)) out[weekdayOfKey(key)]! += 1;
  return out;
}

/** The working minutes a schedule promises over the range, or null without a schedule. */
export function scheduledMinutesFor(specialist: Pick<SpecialistRecord, 'schedule'>, range: DayRange): number | null {
  if (!hasSchedule(specialist)) return null;
  const occurrences = weekdayOccurrences(range);
  let total = 0;
  for (let i = 0; i < 7; i += 1) total += occurrences[i]! * workingMinutes(specialist.schedule, WEEKDAYS[i]!);
  return total;
}

/** Minutes of `[start, end)` inside the window (whole booking when there is no window). */
export function occupiedMinutes(
  record: Pick<BookingRecord, 'startTime' | 'endTime'>,
  window: { startMs: number; endMs: number } | null | undefined,
): number {
  let start = new Date(record.startTime).getTime();
  let end = new Date(record.endTime).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  if (window) {
    start = Math.max(start, window.startMs);
    end = Math.min(end, window.endMs);
    if (end <= start) return 0;
  }
  return Math.round((end - start) / 60_000);
}

export function computeInsights(input: InsightsInput): Insights {
  const { records, range, zone, specialists, weekStartsOn } = input;
  const total = records.length;

  // Status mix.
  const counts = new Map<BookingStatus, number>();
  for (const r of records) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
  const statusMix: StatusSlice[] = STATUS_META.map((m) => {
    const count = counts.get(m.status) ?? 0;
    return { status: m.status, label: m.label, tone: m.tone, count, share: total === 0 ? 0 : count / total };
  });

  const attended = counts.get(BookingStatus.Attended) ?? 0;
  const noShow = counts.get(BookingStatus.NoShow) ?? 0;
  const canceled = counts.get(BookingStatus.Canceled) ?? 0;

  // Revenue per currency, Attended only.
  const perCurrency = new Map<string, CurrencyRevenue>();
  let unpriced = 0;
  for (const r of records) {
    if (r.status !== BookingStatus.Attended) continue;
    const price = priceCell(r);
    if (!price) {
      unpriced += 1;
      continue;
    }
    const entry = perCurrency.get(price.currency) ?? { currency: price.currency, amount: 0, bookings: 0 };
    entry.amount += price.amount;
    entry.bookings += 1;
    perCurrency.set(price.currency, entry);
  }
  const revenue = {
    perCurrency: Array.from(perCurrency.values())
      .map((e) => ({ ...e, amount: Math.round(e.amount * 100) / 100 }))
      .sort((a, b) => b.bookings - a.bookings || a.currency.localeCompare(b.currency)),
    attended,
    unpriced,
  };

  // Utilisation per catalog specialist.
  const occupiedById = new Map<string, { minutes: number; bookings: number }>();
  for (const r of records) {
    if (!statusMeta(r.status).occupies) continue;
    const key = specialistKeyOf(r);
    const minutes = occupiedMinutes(r, input.window);
    const entry = occupiedById.get(key) ?? { minutes: 0, bookings: 0 };
    entry.minutes += minutes;
    entry.bookings += 1;
    occupiedById.set(key, entry);
  }
  const utilisation: Utilisation[] = specialists.map((sp) => {
    const occupied = occupiedById.get(sp.id) ?? { minutes: 0, bookings: 0 };
    const scheduled = scheduledMinutesFor(sp, range);
    return {
      specialistId: sp.id,
      name: specialistName(sp.profile),
      occupiedMinutes: occupied.minutes,
      scheduledMinutes: scheduled,
      ratio: scheduled === null || scheduled === 0 ? null : occupied.minutes / scheduled,
      bookings: occupied.bookings,
    };
  });

  // Buckets in the display zone.
  const byWeekday = [0, 0, 0, 0, 0, 0, 0];
  const byHour = Array.from({ length: 24 }, () => 0);
  for (const r of records) {
    const ms = new Date(r.startTime).getTime();
    if (Number.isNaN(ms)) continue;
    const w = wallClock(ms, zone);
    byWeekday[w.weekday]! += 1;
    byHour[w.hour]! += 1;
  }
  const weekdays: Bucket[] = [];
  for (let i = 0; i < 7; i += 1) {
    const day = (weekStartsOn + i) % 7;
    weekdays.push({ key: day, label: WEEKDAY_LABEL[day]!, count: byWeekday[day]! });
  }
  const hours: Bucket[] = byHour.map((count, hour) => ({
    key: hour,
    label: formatClock(hour * 60, input.format),
    count,
  }));

  return {
    total,
    statusMix,
    noShow: { noShow, attended, rate: attended + noShow === 0 ? null : noShow / (attended + noShow) },
    cancel: { canceled, total, rate: total === 0 ? null : canceled / total },
    revenue,
    utilisation,
    weekdays,
    hours,
    coverage: { count: total, range, days: rangeLength(range) },
  };
}

/**
 * The hours worth drawing: from the first busy hour to the last, padded one
 * hour each side, never narrower than 08:00–18:00 so an empty window still
 * shows a working day rather than nothing.
 */
export function trimHours(hours: readonly Bucket[]): Bucket[] {
  const busy = hours.filter((h) => h.count > 0).map((h) => h.key);
  let first = 8;
  let last = 17;
  if (busy.length > 0) {
    first = Math.min(first, Math.max(0, Math.min(...busy) - 1));
    last = Math.max(last, Math.min(23, Math.max(...busy) + 1));
  }
  return hours.filter((h) => h.key >= first && h.key <= last);
}

/** `over 143 bookings · Aug 1 – 31`. */
export function coverageLine(insights: Pick<Insights, 'coverage'>, options: FormatOptions = {}): string {
  const n = insights.coverage.count;
  return `over ${n.toLocaleString(options.locale)} ${n === 1 ? 'booking' : 'bookings'} · ${rangeLabel(insights.coverage.range, options)}`;
}

/** `12%`; null → `—`. Whole percents: the inputs are counts of a few dozen. */
export function formatRate(rate: number | null): string {
  if (rate === null) return '—';
  return `${Math.round(rate * 100)}%`;
}

/** Bar width as a share of the largest bucket, 0..1 (0 when everything is 0). */
export function shareOfMax(count: number, buckets: readonly { count: number }[]): number {
  const max = Math.max(0, ...buckets.map((b) => b.count));
  return max === 0 ? 0 : count / max;
}

/** The busiest buckets — every bucket tied for the top count, or none when all are 0. */
export function peaks(buckets: readonly Bucket[]): Bucket[] {
  const max = Math.max(0, ...buckets.map((b) => b.count));
  return max === 0 ? [] : buckets.filter((b) => b.count === max);
}

/** `1 h 30 min` for the utilisation line, hours only past a day's worth. */
export function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest} min`;
  if (hours >= 24) return `${hours} h`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export const PERIOD_LABELS: Record<InsightsPeriod, string> = {
  week: 'This week',
  month: 'This month',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  custom: 'Custom',
};
