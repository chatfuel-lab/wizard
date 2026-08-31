/**
 * The time grid's geometry — minutes ↔ pixels, event boxes, lane boxes, the
 * now-line, scroll targets, midnight splitting and event-to-event focus.
 * No DOM: `calendar/TimeGrid.tsx` is a renderer over these numbers.
 *
 * ## The pixel constants are the CSS tokens
 *
 * `HOUR_PX` mirrors `--height-hour-compact/cozy/comfortable` and
 * `MIN_EVENT_PX` mirrors `--height-event-min` in styles/tokens.css. The rules
 * behind the events are painted by CSS (`time-grid-rules`, tiled at
 * `--time-grid-hour`) and the events are placed by this file; if the two
 * numbers drift, a 10:00 booking sits on the 09:45 line. `timeGrid.test.ts`
 * parses the stylesheet and asserts the parity, exactly as layout.test.ts does
 * for the bands.
 *
 * ## Ranges are minutes of a day, columns are indexes
 *
 * The grid is zone-agnostic: it knows a column and a minute, and nothing about
 * what day or zone the column is. The module maps instants to (column, minute)
 * with `wallClockIn` and `splitAtMidnight` and hands the grid the result. That
 * is what keeps DST, the bot zone and the display zone out of the layout code —
 * a booking that crosses midnight is two segments before the grid ever sees it.
 */

import type { Interval } from './intervals';
import { MINUTES_PER_DAY } from './timeOfDay';
import { wallClockIn } from './timezone';

export type GridDensity = 'compact' | 'cozy' | 'comfortable';

/** Height of one hour, per density. Mirrors --height-hour-* in tokens.css. */
export const HOUR_PX: Record<GridDensity, number> = {
  compact: 48,
  cozy: 64,
  comfortable: 80,
};

/** The floor under an event's height. Mirrors --height-event-min. */
export const MIN_EVENT_PX = 20;

/** The strip at each end of an event that grabs as a resize rather than a move. */
export const RESIZE_EDGE_PX = 6;

/** Minutes of the day the grid shows. `end` may be 1440. */
export type MinuteRange = Interval;

export const FULL_DAY: MinuteRange = { start: 0, end: MINUTES_PER_DAY };

export interface MinuteSpan {
  start: number;
  end: number;
}

export function minuteToPx(minute: number, hourPx: number, range: MinuteRange = FULL_DAY): number {
  return ((minute - range.start) / 60) * hourPx;
}

/** Fractional and unclamped — the caller snaps and clamps. */
export function pxToMinute(px: number, hourPx: number, range: MinuteRange = FULL_DAY): number {
  return range.start + (px / hourPx) * 60;
}

/** Total content height of a column, px. */
export function rangeHeightPx(range: MinuteRange, hourPx: number): number {
  return Math.max(0, minuteToPx(range.end, hourPx, range));
}

/**
 * Keep a span inside the range without changing its length, then enforce the
 * minimum length. A span longer than the range collapses to the range.
 */
export function clampSpan(span: MinuteSpan, rules: { range: MinuteRange; minDuration: number }): MinuteSpan {
  const { range, minDuration } = rules;
  let start = span.start;
  let end = span.end;
  if (end - start < minDuration) end = start + minDuration;
  const duration = Math.min(end - start, range.end - range.start);
  if (start < range.start) {
    start = range.start;
    end = start + duration;
  }
  if (end > range.end) {
    end = range.end;
    start = end - duration;
  }
  return { start, end };
}

export interface EventBox {
  top: number;
  height: number;
  /** The span continues above the range's start (drawn without a top edge). */
  clippedStart: boolean;
  /** The span continues below the range's end. */
  clippedEnd: boolean;
}

/**
 * Where an event sits in its column, clipped to the range and padded up to
 * `minPx`. Null when the span is entirely outside the range.
 */
export function eventBox(
  span: MinuteSpan,
  hourPx: number,
  range: MinuteRange = FULL_DAY,
  minPx: number = MIN_EVENT_PX,
): EventBox | null {
  if (span.end < span.start || span.end <= range.start || span.start >= range.end) return null;
  const start = Math.max(span.start, range.start);
  const end = Math.min(span.end, range.end);
  const top = minuteToPx(start, hourPx, range);
  const height = Math.max(minPx, minuteToPx(end, hourPx, range) - top);
  return { top, height, clippedStart: span.start < range.start, clippedEnd: span.end > range.end };
}

export interface LaneBox {
  leftPct: number;
  widthPct: number;
}

/** Percentages of the column for lane `lane` of `lanes`. The component adds the gap. */
export function laneBox(lane: number, lanes: number): LaneBox {
  const count = Math.max(1, lanes);
  const index = Math.min(Math.max(0, lane), count - 1);
  return { leftPct: (index / count) * 100, widthPct: 100 / count };
}

/** Whole `step`-minute marks inside `[range.start, range.end)` — the gutter's labels and the rules. */
export function hourMarks(range: MinuteRange = FULL_DAY, step = 60): number[] {
  if (!(step > 0)) return [];
  const marks: number[] = [];
  for (let m = Math.ceil(range.start / step) * step; m < range.end; m += step) marks.push(m);
  return marks;
}

/**
 * Which of `count` equal columns `x` falls in, clamped to the ends: a pointer
 * dragged past the last column keeps the last column rather than losing the
 * event. −1 only when there are no columns or no width.
 */
export function columnAt(x: number, width: number, count: number): number {
  if (count <= 0 || !(width > 0)) return -1;
  const index = Math.floor((x / width) * count);
  return Math.min(Math.max(index, 0), count - 1);
}

/** The now-line's top, or null when now is outside the range. */
export function nowOffset(minute: number, hourPx: number, range: MinuteRange = FULL_DAY): number | null {
  if (minute < range.start || minute > range.end) return null;
  return minuteToPx(minute, hourPx, range);
}

/**
 * The scrollTop that shows `minute`. `'start'` leaves half an hour of context
 * above it (a work day that opens at 09:00 shows 08:30); `'center'` puts it in
 * the middle. Clamped so the last screen is never overscrolled.
 */
export function scrollTopFor(
  minute: number,
  hourPx: number,
  range: MinuteRange,
  viewportHeight: number,
  align: 'start' | 'center' = 'start',
): number {
  const px = minuteToPx(minute, hourPx, range);
  const target = align === 'center' ? px - viewportHeight / 2 : px - hourPx / 2;
  const max = Math.max(0, rangeHeightPx(range, hourPx) - viewportHeight);
  return Math.min(Math.max(0, Math.round(target)), max);
}

export interface DaySegment {
  dayKey: string;
  start: number;
  end: number;
}

/**
 * An instant range as (day, minutes) segments in `timeZone`. A booking that
 * ends exactly at midnight is one segment ending at 1440, not two; one that
 * crosses midnight is two; one that runs across a whole day in between is
 * three. Empty and inverted ranges give no segments.
 */
export function splitAtMidnight(startAt: number, endAt: number, timeZone: string): DaySegment[] {
  if (!(endAt > startAt)) return [];
  const first = wallClockIn(startAt, timeZone);
  const last = wallClockIn(endAt, timeZone);
  const endMinute = last.minuteOfDay;
  if (first.dayKey === last.dayKey) return [{ dayKey: first.dayKey, start: first.minuteOfDay, end: endMinute }];

  const segments: DaySegment[] = [{ dayKey: first.dayKey, start: first.minuteOfDay, end: MINUTES_PER_DAY }];
  /* Walk whole days by adding 24h and re-reading the zone, so a 23-hour DST
     day still counts as one day rather than being skipped. */
  let cursor = startAt;
  for (let guard = 0; guard < 400; guard += 1) {
    cursor += 86_400_000;
    const wall = wallClockIn(cursor, timeZone);
    if (wall.dayKey >= last.dayKey) break;
    if (segments[segments.length - 1]!.dayKey === wall.dayKey) continue;
    segments.push({ dayKey: wall.dayKey, start: 0, end: MINUTES_PER_DAY });
  }
  if (endMinute > 0) segments.push({ dayKey: last.dayKey, start: 0, end: endMinute });
  return segments;
}

/**
 * Which edge, if any, a pointer offset inside an event lands on. The edge
 * strip shrinks for tiny events so a 20px block still has a middle to grab.
 */
export function isResizeEdge(
  offsetY: number,
  heightPx: number,
  edgePx: number = RESIZE_EDGE_PX,
): 'start' | 'end' | null {
  const edge = Math.min(edgePx, Math.floor(heightPx / 3));
  if (edge <= 0) return null;
  if (offsetY < edge) return 'start';
  if (offsetY > heightPx - edge) return 'end';
  return null;
}

export interface FocusableEvent {
  id: string;
  columnId: string;
  start: number;
  end: number;
}

export type FocusKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End';

/**
 * The event to focus after an arrow key. Up/Down walk the same column by
 * start time; Left/Right jump to the nearest-in-time event of the adjacent
 * column that has any (skipping empty columns); Home/End are the column's
 * first and last. Null when there is nowhere to go, so the caller leaves the
 * key alone and lets it scroll.
 */
export function nextEventFocus(
  events: readonly FocusableEvent[],
  columnOrder: readonly string[],
  currentId: string | null,
  key: FocusKey,
): string | null {
  const byColumn = new Map<string, FocusableEvent[]>();
  for (const event of events) {
    const list = byColumn.get(event.columnId);
    if (list) list.push(event);
    else byColumn.set(event.columnId, [event]);
  }
  for (const list of byColumn.values())
    list.sort((a, b) => a.start - b.start || a.end - b.end || (a.id < b.id ? -1 : 1));

  const current = currentId === null ? null : (events.find((event) => event.id === currentId) ?? null);
  if (!current) {
    /* Nothing focused yet: any key lands on the first event of the first non-empty column. */
    for (const columnId of columnOrder) {
      const first = byColumn.get(columnId)?.[0];
      if (first) return first.id;
    }
    return null;
  }

  const column = byColumn.get(current.columnId) ?? [];
  const index = column.findIndex((event) => event.id === current.id);
  if (key === 'Home') return column[0]?.id ?? null;
  if (key === 'End') return column[column.length - 1]?.id ?? null;
  if (key === 'ArrowUp') return index > 0 ? column[index - 1]!.id : null;
  if (key === 'ArrowDown') return index < column.length - 1 ? column[index + 1]!.id : null;

  const step = key === 'ArrowRight' ? 1 : -1;
  let position = columnOrder.indexOf(current.columnId) + step;
  while (position >= 0 && position < columnOrder.length) {
    const candidates = byColumn.get(columnOrder[position]!);
    if (candidates && candidates.length > 0) {
      let best = candidates[0]!;
      let bestDistance = Math.abs(best.start - current.start);
      for (const candidate of candidates) {
        const distance = Math.abs(candidate.start - current.start);
        if (distance < bestDistance) {
          best = candidate;
          bestDistance = distance;
        }
      }
      return best.id;
    }
    position += step;
  }
  return null;
}
