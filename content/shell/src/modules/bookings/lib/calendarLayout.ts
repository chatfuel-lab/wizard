/**
 * From booking records to what the `~ui` grids draw — columns, events in
 * minutes of the DISPLAY zone, business hours, breaks, the now-line, month
 * buckets. Pure, so every rule below is a test rather than a screenshot.
 *
 * ## Two column keys
 *
 * By time (day / week) a column is a DAY: its id is the day key. By
 * specialist (day only) a column is a PERSON: its id is the specialist id,
 * plus `'none'` for unassigned bookings and, when a booking still points at a
 * deleted specialist, one column per such reference so nothing silently
 * disappears. The columns are the in-scope specialists — the shared filter's
 * ids, or the whole catalog when it names none — in catalog order, then the
 * deleted references (by name), then Unassigned last. Unassigned appears when
 * a booking needs it OR the filter asks for it, so a drag can unassign into an
 * empty column.
 *
 * ## Minutes are display-zone wall clock
 *
 * An instant becomes `(dayKey, minuteOfDay)` in `zone.zone` via `~ui`'s
 * `splitAtMidnight`, so a booking that crosses midnight is two events — the
 * first keeps the booking id (that is what focus, FLIP and selection key on),
 * the tail is `<id>~1`. Schedules and breaks are `HH:mm` in the BOT zone
 * (`lib/schedule.ts`); when the operator views in another zone they are shifted
 * by the offset difference AT THAT DAY, and the parts that spill past midnight
 * are picked up from the neighbouring weekday, so a Berlin 09–18 seen from
 * Tokyo shows as 16–01 across two columns rather than being clipped.
 *
 * ## Shading rules
 *
 * - Day column: business hours = union of the in-scope specialists' working
 *   ranges that weekday; a break is hatched only where EVERY specialist working
 *   that day is on break (the intersection) — with one specialist in scope that
 *   is simply their break; with everyone it is usually nothing, which is right.
 * - Specialist column: their own hours and their own break; no schedule or a
 *   day off → the column is closed (fully shaded); Unassigned takes the union.
 * - No in-scope specialist has any schedule → no shading at all rather than a
 *   wall of grey.
 */
import { intersect, merge, splitAtMidnight, type EventChipStatus, type EventChipTone, type EventTone } from '~ui';
import { APP_CONFIG } from '../../shellConfig';
import type { BookingRecord, DisplayZone, SpecialistRecord } from '../types';
import type { CalendarBy, CalendarColor, CalendarMode } from './bookingsParams';
import { UNASSIGNED, specialistKeyOf } from './bookingsFilter';
import { daysOf, type DayRange } from './calendarRange';
import { specialistName } from './catalogStore';
import { specialistTone } from './colors';
import { WEEKDAYS, breakRange, workingRanges, type MinuteRange } from './schedule';
import { statusMeta } from './status';
import { shiftDayKey, wallClock, weekdayOfKey, zoneOffsetMinutes, zonedInstant } from './zone';

export const MINUTES_PER_DAY = 1440;

/** The tail-segment separator: `bk-1~1` is the part of `bk-1` after midnight. */
export const SEGMENT_SEPARATOR = '~';

export interface CalendarEvent {
  /** The booking id for the first segment; `<bookingId>~<n>` for later ones. */
  id: string;
  bookingId: string;
  columnId: string;
  /** The day this segment lies on, in the display zone. */
  dayKey: string;
  start: number;
  end: number;
  segment: number;
  segments: number;
  record: BookingRecord;
}

export type CalendarColumn =
  | { kind: 'day'; id: string; dayKey: string; label: string }
  | {
      kind: 'specialist';
      id: string;
      dayKey: string;
      label: string;
      /** The catalog record, or null for Unassigned and deleted references. */
      specialist: SpecialistRecord | null;
      /** The specialist key: an id, or `'none'`. */
      key: string;
      deleted: boolean;
    };

export interface GridLayout {
  columns: CalendarColumn[];
  events: CalendarEvent[];
  /** Per column; `null` for a closed column. The whole map is null when nobody has a schedule (no shading). */
  businessHours: Record<string, MinuteRange[] | null> | null;
  blocked: { columnId: string; start: number; end: number }[];
  /** Where the grid opens: the earliest working minute (the grid shows half an hour above it), or 08:00. */
  initialScrollMinute: number;
}

export function bookingIdOf(eventId: string): string {
  const at = eventId.indexOf(SEGMENT_SEPARATOR);
  return at < 0 ? eventId : eventId.slice(0, at);
}

const startMs = (b: BookingRecord) => new Date(b.startTime).getTime();
const endMs = (b: BookingRecord) => new Date(b.endTime).getTime();

/** In-scope specialists: the filter's ids in catalog order, or the whole catalog. */
export function scopedSpecialists(
  catalog: readonly SpecialistRecord[],
  filterIds: readonly string[],
): SpecialistRecord[] {
  if (filterIds.length === 0) return [...catalog];
  return catalog.filter((sp) => filterIds.includes(sp.id));
}

/**
 * Minutes to add to a bot-zone wall clock to get the display zone's, at
 * noon of `dayKey` in the display zone. Zero when the two zones agree or the
 * bot has none.
 */
export function zoneShiftMinutes(dayKey: string, zone: DisplayZone): number {
  if (!zone.botZone || zone.botZone === zone.zone) return 0;
  const at = zonedInstant(dayKey, 720, zone.zone);
  if (Number.isNaN(at)) return 0;
  return zoneOffsetMinutes(zone.zone, at) - zoneOffsetMinutes(zone.botZone, at);
}

/** Shift ranges by `delta` minutes and keep what stays inside the day. */
export function shiftRanges(ranges: readonly MinuteRange[], delta: number): MinuteRange[] {
  const out: MinuteRange[] = [];
  for (const r of ranges) {
    const start = Math.max(0, r.start + delta);
    const end = Math.min(MINUTES_PER_DAY, r.end + delta);
    if (end > start) out.push({ start, end });
  }
  return out;
}

/**
 * A bot-zone schedule's ranges for `dayKey`, in the display zone. When the
 * shift is non-zero the previous and next weekdays contribute the parts that
 * cross into this day.
 */
export function displayRanges(
  pick: (weekday: (typeof WEEKDAYS)[number]) => MinuteRange[],
  dayKey: string,
  delta: number,
): MinuteRange[] {
  const weekday = weekdayOfKey(dayKey);
  const today = shiftRanges(pick(WEEKDAYS[weekday]!), delta);
  if (delta === 0) return today;
  const prev = shiftRanges(pick(WEEKDAYS[(weekday + 6) % 7]!), delta - MINUTES_PER_DAY);
  const next = shiftRanges(pick(WEEKDAYS[(weekday + 1) % 7]!), delta + MINUTES_PER_DAY);
  return merge(merge(prev, today), next);
}

export function workingRangesFor(specialist: SpecialistRecord, dayKey: string, delta: number): MinuteRange[] {
  return displayRanges((day) => workingRanges(specialist.schedule, day), dayKey, delta);
}

export function breakRangesFor(specialist: SpecialistRecord, dayKey: string, delta: number): MinuteRange[] {
  return displayRanges(
    (day) => {
      const brk = breakRange(specialist.schedule, day);
      return brk ? [brk] : [];
    },
    dayKey,
    delta,
  );
}

function anySchedule(specialists: readonly SpecialistRecord[]): boolean {
  return specialists.some((sp) => sp.schedule?.enabled && WEEKDAYS.some((d) => sp.schedule?.[d]?.enabled));
}

/** Union of hours over the specialists, and the break every WORKING one shares. */
function sharedHours(
  specialists: readonly SpecialistRecord[],
  dayKey: string,
  delta: number,
): { hours: MinuteRange[]; blocked: MinuteRange[] } {
  let hours: MinuteRange[] = [];
  let blocked: MinuteRange[] | null = null;
  for (const sp of specialists) {
    const ranges = workingRangesFor(sp, dayKey, delta);
    if (ranges.length === 0) continue;
    hours = merge(hours, ranges);
    const brk = breakRangesFor(sp, dayKey, delta);
    blocked = blocked === null ? brk : intersect(blocked, brk);
  }
  return { hours, blocked: blocked ?? [] };
}

/** The (day, minutes) segments of a booking in the display zone. */
export function segmentsOf(record: BookingRecord, zone: string): { dayKey: string; start: number; end: number }[] {
  const s = startMs(record);
  const e = endMs(record);
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return [];
  return splitAtMidnight(s, e, zone);
}

/** The display-zone day a booking starts on. */
export function startDayKey(record: BookingRecord, zone: string): string {
  return wallClock(startMs(record), zone).dayKey;
}

export interface GridLayoutInput {
  mode: Exclude<CalendarMode, 'month'>;
  by: CalendarBy;
  range: DayRange;
  /** Already filtered with `matchesFilter`. */
  records: readonly BookingRecord[];
  catalog: readonly SpecialistRecord[];
  /** `filter.specialists` — which ids (and `'none'`) are in scope. */
  filterSpecialists: readonly string[];
  zone: DisplayZone;
}

const DEFAULT_SCROLL_MINUTE = APP_CONFIG.calendarScrollMinute;

export function layoutGrid(input: GridLayoutInput): GridLayout {
  const { range, records, catalog, filterSpecialists, zone } = input;
  const bySpecialist = input.mode === 'day' && input.by === 'specialist';
  const days = daysOf(range);
  const scoped = scopedSpecialists(catalog, filterSpecialists);
  const shaded = anySchedule(scoped);

  const columns: CalendarColumn[] = [];
  const events: CalendarEvent[] = [];
  const businessHours: Record<string, MinuteRange[] | null> = {};
  const blocked: GridLayout['blocked'] = [];
  let earliest = Number.POSITIVE_INFINITY;

  const noteEarliest = (ranges: readonly MinuteRange[]) => {
    for (const r of ranges) earliest = Math.min(earliest, r.start);
  };

  if (!bySpecialist) {
    for (const dayKey of days) {
      const delta = zoneShiftMinutes(dayKey, zone);
      const shared = sharedHours(scoped, dayKey, delta);
      columns.push({ kind: 'day', id: dayKey, dayKey, label: dayKey });
      businessHours[dayKey] = shared.hours.length > 0 ? shared.hours : null;
      noteEarliest(shared.hours);
      for (const b of shared.blocked) blocked.push({ columnId: dayKey, ...b });
    }
    const visible = new Set(days);
    for (const record of records) {
      const all = segmentsOf(record, zone.zone);
      all.forEach((seg, index) => {
        if (!visible.has(seg.dayKey)) return;
        events.push({
          id: index === 0 ? record.id : `${record.id}${SEGMENT_SEPARATOR}${index}`,
          bookingId: record.id,
          columnId: seg.dayKey,
          dayKey: seg.dayKey,
          start: seg.start,
          end: seg.end,
          segment: index,
          segments: all.length,
          record,
        });
      });
    }
  } else {
    const dayKey = range.startKey;
    const delta = zoneShiftMinutes(dayKey, zone);
    const catalogIds = new Set(catalog.map((sp) => sp.id));
    // Which keys the day's bookings need beyond the catalog.
    const extra = new Map<string, string>(); // key → label
    let unassigned = filterSpecialists.includes(UNASSIGNED);
    const daySegments: { record: BookingRecord; all: { dayKey: string; start: number; end: number }[] }[] = [];
    for (const record of records) {
      const all = segmentsOf(record, zone.zone);
      if (!all.some((seg) => seg.dayKey === dayKey)) continue;
      daySegments.push({ record, all });
      const key = specialistKeyOf(record);
      if (key === UNASSIGNED) unassigned = true;
      else if (!catalogIds.has(key) && !extra.has(key)) {
        const profile = record.specialist && 'profile' in record.specialist ? record.specialist.profile : null;
        extra.set(key, profile ? specialistName(profile) : 'Deleted specialist');
      }
    }

    for (const sp of scoped) {
      columns.push({
        kind: 'specialist',
        id: sp.id,
        dayKey,
        label: specialistName(sp.profile),
        specialist: sp,
        key: sp.id,
        deleted: false,
      });
      const hours = workingRangesFor(sp, dayKey, delta);
      businessHours[sp.id] = hours.length > 0 ? hours : null;
      noteEarliest(hours);
      for (const b of breakRangesFor(sp, dayKey, delta)) blocked.push({ columnId: sp.id, ...b });
    }
    for (const [key, label] of Array.from(extra.entries()).sort((a, b) => a[1].localeCompare(b[1]))) {
      columns.push({
        kind: 'specialist',
        id: key,
        dayKey,
        label: `${label} (deleted)`,
        specialist: null,
        key,
        deleted: true,
      });
      businessHours[key] = null;
    }
    if (unassigned) {
      const shared = sharedHours(scoped, dayKey, delta);
      columns.push({
        kind: 'specialist',
        id: UNASSIGNED,
        dayKey,
        label: 'Unassigned',
        specialist: null,
        key: UNASSIGNED,
        deleted: false,
      });
      businessHours[UNASSIGNED] = shared.hours.length > 0 ? shared.hours : null;
    }

    const columnIds = new Set(columns.map((c) => c.id));
    for (const { record, all } of daySegments) {
      const key = specialistKeyOf(record);
      if (!columnIds.has(key)) continue;
      const total = all.length;
      all.forEach((seg, index) => {
        if (seg.dayKey !== dayKey) return;
        events.push({
          id: index === 0 ? record.id : `${record.id}${SEGMENT_SEPARATOR}${index}`,
          bookingId: record.id,
          columnId: key,
          dayKey,
          start: seg.start,
          end: seg.end,
          segment: index,
          segments: total,
          record,
        });
      });
    }
  }

  events.sort((a, b) => a.start - b.start || a.end - b.end || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  return {
    columns,
    events,
    businessHours: shaded ? businessHours : null,
    blocked,
    initialScrollMinute: Number.isFinite(earliest) ? earliest : DEFAULT_SCROLL_MINUTE,
  };
}

/** The now-line: `{minute, columnId}` by time (only today's column), `{minute}` by specialist on today, else null. */
export function nowLine(
  layout: Pick<GridLayout, 'columns'>,
  bySpecialist: boolean,
  nowMs: number,
  zone: string,
): { minute: number; columnId?: string } | null {
  const wall = wallClock(nowMs, zone);
  if (bySpecialist) {
    const day = layout.columns[0]?.dayKey;
    return day === wall.dayKey ? { minute: wall.minuteOfDay } : null;
  }
  return layout.columns.some((c) => c.id === wall.dayKey) ? { minute: wall.minuteOfDay, columnId: wall.dayKey } : null;
}

/** Bookings per column for the column headers — tail segments do not count their booking twice. */
export function countsByColumn(events: readonly Pick<CalendarEvent, 'columnId' | 'segment'>[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of events) if (e.segment === 0) out.set(e.columnId, (out.get(e.columnId) ?? 0) + 1);
  return out;
}

/** Records bucketed by their start day (display zone) — the month view's `dayOf`. */
export function monthBuckets(records: readonly BookingRecord[], zone: string): Map<string, BookingRecord[]> {
  const out = new Map<string, BookingRecord[]>();
  for (const record of records) {
    const key = startDayKey(record, zone);
    const list = out.get(key);
    if (list) list.push(record);
    else out.set(key, [record]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// How a block looks
// ---------------------------------------------------------------------------

/**
 * Status → event tone when colouring by status. Confirmed blue, Attended
 * lime, No-show pink, Pending and Reschedule orange (and dashed), Canceled
 * neutral (and struck). Kept apart from the specialist palette so a bot with
 * one specialist can still tell states apart at a glance.
 */
export const STATUS_EVENT_TONE: Record<string, EventChipTone> = {
  Pending: 5,
  Confirmed: 1,
  Attended: 6,
  NoShow: 4,
  Reschedule: 5,
  Canceled: 'neutral',
};

export interface BlockLook {
  tone: EventChipTone;
  status: EventChipStatus;
}

export function toneOf(index: number): EventChipTone {
  return index >= 1 && index <= 8 ? (index as EventTone) : 'neutral';
}

export function blockLook(
  record: Pick<BookingRecord, 'specialist' | 'status'>,
  color: CalendarColor,
  catalogOrder: readonly string[],
): BlockLook {
  const meta = statusMeta(record.status);
  if (color === 'status') return { tone: STATUS_EVENT_TONE[record.status] ?? 'neutral', status: meta.look };
  return { tone: toneOf(specialistTone(specialistKeyOf(record), catalogOrder)), status: meta.look };
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

const localDate = (dayKey: string): Date | null => {
  const [y, m, d] = dayKey.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12);
};

/** "Mon, Aug 17, 2026" · "Aug 17 – 23, 2026" / "Aug 31 – Sep 6, 2026" · "August 2026". */
export function rangeLabel(mode: CalendarMode, range: DayRange, anchorKey: string, locale?: string): string {
  const first = localDate(range.startKey);
  const last = localDate(shiftDayKey(range.endKey, -1));
  const anchor = localDate(anchorKey);
  if (!first || !last || !anchor) return anchorKey;
  switch (mode) {
    case 'day':
      return new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(anchor);
    case 'week': {
      const sameMonth = first.getMonth() === last.getMonth();
      const from = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(first);
      const to = new Intl.DateTimeFormat(
        locale,
        sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' },
      ).format(last);
      const year = new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(last);
      return `${from} – ${to}, ${year}`;
    }
    case 'month':
      return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(anchor);
  }
}

/** "Tue 10:15" — what a move toast names as the destination. */
export function moveDetail(dayKey: string, minute: number, locale?: string, hour12?: boolean): string {
  const date = localDate(dayKey);
  const day = date ? new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date) : dayKey;
  const h = Math.floor(minute / 60) % 24;
  const m = minute % 60;
  const time = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: hour12 ? 'h12' : 'h23',
    timeZone: 'UTC',
  }).format(Date.UTC(1970, 0, 1, h, m));
  return `${day} ${time.replace(/\u202f/g, ' ')}`;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** `HH:mm` shifted by `delta` minutes, wrapping past midnight (a header, not arithmetic). */
function shiftedHHmm(text: string, delta: number): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!m || delta === 0) return text;
  const minute = (((Number(m[1]) * 60 + Number(m[2]) + delta) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${pad2(Math.floor(minute / 60))}:${pad2(minute % 60)}`;
}

/**
 * The second line of a specialist column header: "09:00–18:00 · break
 * 13:00–14:00", "Day off", "No schedule". `shift` is `zoneShiftMinutes` for
 * the day, so a header seen from another zone says the hours in THAT zone.
 */
export function dayHoursLabel(specialist: SpecialistRecord, dayKey: string, shift = 0): string {
  const s = specialist.schedule;
  if (!s?.enabled || !WEEKDAYS.some((d) => s[d]?.enabled)) return 'No schedule';
  const day = WEEKDAYS[weekdayOfKey(dayKey)]!;
  const hours = s[day];
  if (!hours?.enabled) return 'Day off';
  const brk = hours.break
    ? ` · break ${shiftedHHmm(hours.break.start, shift)}–${shiftedHHmm(hours.break.end, shift)}`
    : '';
  return `${shiftedHHmm(hours.start, shift)}–${shiftedHHmm(hours.end, shift)}${brk}`;
}

/** The chip's title: the customer, or what stands in. */
export function eventTitle(record: BookingRecord): string {
  return record.contact?.name?.trim() || record.inlineContact?.name?.trim() || 'Walk-in';
}

/** The chip's second line: the service, "Deleted service — Old Facial", or nothing. */
export function eventSubtitle(record: BookingRecord): { text: string; deleted: boolean } | null {
  const service = record.service;
  if (!service) return null;
  if (service.__typename === 'DeletedGoodsService') return { text: `${service.title} (deleted)`, deleted: true };
  return { text: service.title, deleted: false };
}

/** The signature the FLIP keys on: it changes exactly when a block can have moved. */
export function layoutSignature(events: readonly Pick<CalendarEvent, 'id' | 'columnId' | 'start' | 'end'>[]): string {
  return events.map((e) => `${e.id}:${e.columnId}:${e.start}:${e.end}`).join('|');
}

/**
 * `layoutSignature` for whichever surface is up: the grid layout's events, or
 * — month and agenda, where there is no layout — the records' start days (a
 * chip or a row can only move by changing its day).
 */
export function signatureOf(
  layout: { events: readonly Pick<CalendarEvent, 'id' | 'columnId' | 'start' | 'end'>[] } | null,
  records: readonly BookingRecord[],
  zone: string,
): string {
  return layoutSignature(
    layout?.events ?? records.map((r) => ({ id: r.id, columnId: startDayKey(r, zone), start: 0, end: 0 })),
  );
}

/** "Monday, Aug 17" — a day column's header text (noon dodges DST edges). */
export function dayColumnHeading(dayKey: string, locale?: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1, 12).toLocaleDateString(locale, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/** The empty surface's words: whose absence it is (nothing loaded vs. the filter hid everything), and the period noun the sentence ends on. */
export function calendarEmptyCopy(
  mode: CalendarMode,
  hasRecords: boolean,
  filterEmpty: boolean,
): { title: string; periodNoun: string } {
  const periodNoun = mode === 'day' ? 'today' : mode === 'week' ? 'this week' : 'this month';
  const title = hasRecords && !filterEmpty ? `No bookings match the filter ${periodNoun}` : `No bookings ${periodNoun}`;
  return { title, periodNoun };
}
