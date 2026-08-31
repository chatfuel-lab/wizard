/**
 * From what the grid hands back — a column and two minutes — to what the API
 * takes: instants, formatted with the bot zone's offset, and a specialist.
 * The reverse of `calendarLayout.ts`, and the one place the DnD protocol's
 * arithmetic lives, so a keyboard nudge, a pointer drag, a month drop and a
 * drag-to-create all agree.
 *
 * Rules that are easy to get wrong, each pinned by a test:
 *
 * - **A move keeps the booking's duration in milliseconds**, and re-resolves
 *   the start from the DISPLAY zone's wall clock (`zonedInstant`). Across a
 *   DST change a 60-minute booking dragged onto the changeover day stays 60
 *   minutes; its end wall clock is whatever that means there. FullCalendar
 *   and Cal.com do the same.
 * - **Dragging the tail of a booking that crosses midnight moves the whole
 *   booking.** The tail segment starts at 00:00 of its day; the offset from
 *   the booking's real start is carried over so the booking lands with its
 *   tail where the pointer dropped it.
 * - **A resize sets exactly one edge to the instant under the pointer** and
 *   refuses to invert (null); the other edge is untouched.
 * - **A column change in the by-specialist day is a reassign**, and a drop
 *   that changes both time and column is a `move` that also carries the
 *   specialist patch — one mutation, one undo entry.
 * - **Every instant SENT is `toZoneIso(instant, botZone ?? 'UTC')`** — never
 *   `Z`, never the operator's offset (see `zone.ts`).
 * - **A month drop keeps the wall-clock time of day** in the display zone.
 */
import { timeRangeLabel } from '~ui';
import type { BookingRecord, DisplayZone, SpecialistRecord } from '../types';
import type { BookingPatch } from './bookingInput';
import { UNASSIGNED } from './bookingsFilter';
import type { NewBookingPrefill } from './bookingsParams';
import { MINUTES_PER_DAY, moveDetail, type CalendarColumn, type CalendarEvent } from './calendarLayout';
import { specialistName } from './catalogStore';
import { shiftDayKey, toZoneIso, wallClock, zonedInstant } from './zone';

export type SpanEditKind = 'move' | 'resize' | 'reassign';

export interface SpanEdit {
  patch: BookingPatch;
  kind: SpanEditKind;
  /** What the toast names as the destination — "Tue 10:15", "Maria", "10:00 – 10:45". */
  detail: string;
}

export interface SpanContext {
  zone: DisplayZone;
  columns: readonly CalendarColumn[];
  catalog: readonly SpecialistRecord[];
  /** Where a deleted-specialist reference can still be found (visible records). */
  records?: readonly BookingRecord[];
  hour12?: boolean;
  locale?: string;
}

/** Minutes may run past midnight (a span ending at 1440, a nudge past it): normalise to a real day. */
export function instantAt(dayKey: string, minute: number, zone: string): number {
  const days = Math.floor(minute / MINUTES_PER_DAY);
  const rest = minute - days * MINUTES_PER_DAY;
  return zonedInstant(days === 0 ? dayKey : shiftDayKey(dayKey, days), rest, zone);
}

/** RFC3339 in the bot zone's offset — the only framing the API reads as an instant. */
export function wireIso(ms: number, zone: DisplayZone): string {
  return toZoneIso(ms, zone.botZone ?? 'UTC');
}

/**
 * The reference for a specialist key: a catalog specialist as a
 * `BookingSpecialistRef`, `null` for Unassigned, a deleted reference copied
 * from a record that still carries it. `undefined` when the key is unknown.
 */
export function specialistRefFor(
  key: string,
  catalog: readonly SpecialistRecord[],
  records: readonly BookingRecord[] = [],
): BookingRecord['specialist'] | undefined {
  if (key === UNASSIGNED) return null;
  const sp = catalog.find((s) => s.id === key);
  if (sp) {
    return {
      __typename: 'Specialist',
      id: sp.id,
      profile: {
        firstName: sp.profile.firstName,
        lastName: sp.profile.lastName ?? null,
        logo: sp.profile.logo ? { ...sp.profile.logo } : null,
      },
    } as BookingRecord['specialist'];
  }
  const carrier = records.find((r) => r.specialist && 'id' in r.specialist && r.specialist.id === key);
  return carrier ? carrier.specialist : undefined;
}

export function specialistLabelFor(
  key: string,
  catalog: readonly SpecialistRecord[],
  records: readonly BookingRecord[] = [],
): string {
  if (key === UNASSIGNED) return 'Unassigned';
  const sp = catalog.find((s) => s.id === key);
  if (sp) return specialistName(sp.profile);
  const ref = specialistRefFor(key, catalog, records);
  return ref && 'profile' in ref ? specialistName(ref.profile) : 'Deleted specialist';
}

const startMs = (r: BookingRecord) => new Date(r.startTime).getTime();
const endMs = (r: BookingRecord) => new Date(r.endTime).getTime();

/** How far a segment's start is from the booking's start — zero for the first segment. */
function segmentOffsetMs(event: CalendarEvent, zone: string): number {
  if (event.segment === 0) return 0;
  return instantAt(event.dayKey, event.start, zone) - startMs(event.record);
}

export interface SpanChange {
  columnId: string;
  start: number;
  end: number;
}

/**
 * A move: the segment landed at `change`. Returns the patch (times and/or
 * specialist), or null when nothing changed or the column is unknown.
 */
export function moveEdit(event: CalendarEvent, change: SpanChange, ctx: SpanContext): SpanEdit | null {
  const column = ctx.columns.find((c) => c.id === change.columnId);
  if (!column) return null;
  const record = event.record;
  const duration = endMs(record) - startMs(record);
  const newStart = instantAt(column.dayKey, change.start, ctx.zone.zone) - segmentOffsetMs(event, ctx.zone.zone);
  if (Number.isNaN(newStart)) return null;
  const newEnd = newStart + duration;

  const patch: BookingPatch = {};
  const timeChanged = newStart !== startMs(record) || newEnd !== endMs(record);
  if (timeChanged) {
    patch.startTime = wireIso(newStart, ctx.zone);
    patch.endTime = wireIso(newEnd, ctx.zone);
  }

  let specialistChanged = false;
  let specialistLabel = '';
  if (column.kind === 'specialist') {
    const currentKey =
      record.specialist && 'id' in record.specialist && record.specialist.id ? record.specialist.id : UNASSIGNED;
    if (column.key !== currentKey) {
      const ref = specialistRefFor(column.key, ctx.catalog, ctx.records);
      if (ref === undefined) return null;
      patch.specialist = ref;
      specialistChanged = true;
      specialistLabel = specialistLabelFor(column.key, ctx.catalog, ctx.records);
    }
  }

  if (!timeChanged && !specialistChanged) return null;
  if (!timeChanged) return { patch, kind: 'reassign', detail: specialistLabel };
  const wall = wallClock(newStart, ctx.zone.zone);
  const detail = moveDetail(wall.dayKey, wall.minuteOfDay, ctx.locale, ctx.hour12);
  return { patch, kind: 'move', detail: specialistChanged ? `${detail} · ${specialistLabel}` : detail };
}

/** A resize: whichever edge differs from the segment's is set to the instant under it. */
export function resizeEdit(event: CalendarEvent, change: SpanChange, ctx: SpanContext): SpanEdit | null {
  const record = event.record;
  let newStart = startMs(record);
  let newEnd = endMs(record);
  if (change.start !== event.start) newStart = instantAt(event.dayKey, change.start, ctx.zone.zone);
  if (change.end !== event.end) newEnd = instantAt(event.dayKey, change.end, ctx.zone.zone);
  if (Number.isNaN(newStart) || Number.isNaN(newEnd) || newEnd <= newStart) return null;
  if (newStart === startMs(record) && newEnd === endMs(record)) return null;
  const from = wallClock(newStart, ctx.zone.zone);
  const to = wallClock(newEnd, ctx.zone.zone);
  const detail =
    from.dayKey === to.dayKey
      ? timeRangeLabel(from.minuteOfDay, to.minuteOfDay, { hour12: ctx.hour12, locale: ctx.locale })
      : `${moveDetail(from.dayKey, from.minuteOfDay, ctx.locale, ctx.hour12)} – ${moveDetail(to.dayKey, to.minuteOfDay, ctx.locale, ctx.hour12)}`;
  return {
    patch: { startTime: wireIso(newStart, ctx.zone), endTime: wireIso(newEnd, ctx.zone) },
    kind: 'resize',
    detail,
  };
}

/** Drag-to-create: the span as wizard prefill. A specialist column names its specialist (`null` = unassigned). */
export function createPrefill(create: SpanChange, ctx: SpanContext): Partial<NewBookingPrefill> | null {
  const column = ctx.columns.find((c) => c.id === create.columnId);
  if (!column || create.end <= create.start) return null;
  const start = instantAt(column.dayKey, create.start, ctx.zone.zone);
  const end = instantAt(column.dayKey, create.end, ctx.zone.zone);
  const prefill: Partial<NewBookingPrefill> = { start: wireIso(start, ctx.zone), end: wireIso(end, ctx.zone) };
  if (column.kind === 'specialist' && !column.deleted)
    prefill.specialist = column.key === UNASSIGNED ? null : column.key;
  return prefill;
}

/** A click on empty grid: one snap step from the pressed minute. */
export function slotPrefill(
  columnId: string,
  minute: number,
  snap: number,
  ctx: SpanContext,
): Partial<NewBookingPrefill> | null {
  return createPrefill({ columnId, start: minute, end: Math.min(MINUTES_PER_DAY, minute + snap) }, ctx);
}

/** Duplicate: same service, specialist and time; the wizard picks the customer. */
export function duplicatePrefill(record: BookingRecord): Partial<NewBookingPrefill> {
  return {
    start: record.startTime,
    end: record.endTime,
    specialist: record.specialist && 'id' in record.specialist ? record.specialist.id : null,
    service: record.service && 'id' in record.service ? record.service.id : null,
  };
}

/** A month drop: same wall-clock time of day, another day. */
export function monthDropEdit(
  record: BookingRecord,
  dayKey: string,
  ctx: Pick<SpanContext, 'zone' | 'locale' | 'hour12'>,
): SpanEdit | null {
  const wall = wallClock(startMs(record), ctx.zone.zone);
  if (wall.dayKey === dayKey) return null;
  const newStart = zonedInstant(dayKey, wall.minuteOfDay, ctx.zone.zone);
  if (Number.isNaN(newStart)) return null;
  const newEnd = newStart + (endMs(record) - startMs(record));
  return {
    patch: { startTime: wireIso(newStart, ctx.zone), endTime: wireIso(newEnd, ctx.zone) },
    kind: 'move',
    detail: moveDetail(dayKey, wall.minuteOfDay, ctx.locale, ctx.hour12),
  };
}

export interface Nudge {
  /** ±snap minutes. */
  minutes?: number;
  /** ±1 column (a day, or a specialist). */
  columns?: number;
}

/**
 * Keyboard nudge: the segment shifted by minutes and/or columns, clamped to
 * the day and to the visible columns. Null at an edge, so the key is left to
 * whatever else wants it.
 */
export function nudgeEdit(event: CalendarEvent, nudge: Nudge, ctx: SpanContext): SpanEdit | null {
  const index = ctx.columns.findIndex((c) => c.id === event.columnId);
  if (index < 0) return null;
  const targetIndex = index + (nudge.columns ?? 0);
  if (targetIndex < 0 || targetIndex >= ctx.columns.length) return null;
  const length = event.end - event.start;
  let start = event.start + (nudge.minutes ?? 0);
  if (start < 0 || start + length > MINUTES_PER_DAY) return null;
  start = Math.round(start);
  return moveEdit(event, { columnId: ctx.columns[targetIndex]!.id, start, end: start + length }, ctx);
}

/** Alt+Shift+↑/↓: the end edge by ±minutes, never shorter than `minDuration`, never past midnight. */
export function resizeNudge(
  event: CalendarEvent,
  minutes: number,
  minDuration: number,
  ctx: SpanContext,
): SpanEdit | null {
  const end = event.end + minutes;
  if (end > MINUTES_PER_DAY || end - event.start < minDuration) return null;
  return resizeEdit(event, { columnId: event.columnId, start: event.start, end }, ctx);
}
