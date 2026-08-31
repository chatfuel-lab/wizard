/**
 * Where the arrow keys go on the calendar — pure, because vitest here is
 * node-only and roving focus is right in four cases and wrong in the fifth.
 *
 * Two flows over the same list of `(id, columnId, start, end)`:
 *
 * - `grid` (time grid, month): ↑/↓ walk the SAME column by start and clamp at
 *   its ends; ←/→ jump to the event of the adjacent non-empty column whose
 *   start is nearest in time (empty columns are skipped); Home/End are the
 *   column's first and last.
 * - `list` (the agenda): the columns are days laid out top to bottom, so ↑/↓
 *   run on into the previous/next day and ←/→ mean the same as ↑/↓; Home/End
 *   are the whole list's ends.
 *
 * Nothing wraps — wrapping reads as a scroll jump. Null means "nowhere to go",
 * and the caller then leaves the key alone.
 *
 * `~ui`'s TimeGrid resolves its own arrows with the same rules; this file
 * exists for the surfaces the module renders itself (agenda rows, month
 * chips) and for the tests.
 */
import { monthMatrix } from '~ui';
import type { BookingRecord } from '../types';
import type { CalendarMode } from './bookingsParams';
import type { WeekStartsOn } from './calendarRange';
import { wallClock } from './zone';

export interface FocusableEvent {
  id: string;
  columnId: string;
  start: number;
  end: number;
}

export type FocusFlow = 'grid' | 'list';
export type FocusKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End';

/**
 * What the keyboard walks when there is no grid layout (month, agenda): each
 * booking collapses to a minute at its start day in the display zone, and the
 * column order is the month's matrix of days, or the single anchor day.
 */
export function fallbackFocusables(
  records: readonly BookingRecord[],
  zone: string,
  mode: CalendarMode,
  monthKey: string,
  weekStartsOn: WeekStartsOn,
  anchor: string,
): { events: FocusableEvent[]; columnOrder: string[] } {
  const events = records.map((r) => {
    const wall = wallClock(new Date(r.startTime).getTime(), zone);
    return { id: r.id, columnId: wall.dayKey, start: wall.minuteOfDay, end: wall.minuteOfDay + 1 };
  });
  return { events, columnOrder: mode === 'month' ? monthMatrix(monthKey, weekStartsOn) : [anchor] };
}

const byStart = (a: FocusableEvent, b: FocusableEvent) =>
  a.start - b.start || a.end - b.end || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Events grouped by column in `columnOrder`, each sorted by start. Columns with no events are omitted. */
export function orderedColumns(
  events: readonly FocusableEvent[],
  columnOrder: readonly string[],
): { columnId: string; events: FocusableEvent[] }[] {
  const byColumn = new Map<string, FocusableEvent[]>();
  for (const event of events) {
    const list = byColumn.get(event.columnId);
    if (list) list.push(event);
    else byColumn.set(event.columnId, [event]);
  }
  const out: { columnId: string; events: FocusableEvent[] }[] = [];
  const seen = new Set<string>();
  for (const columnId of columnOrder) {
    const list = byColumn.get(columnId);
    if (list && list.length > 0) {
      out.push({ columnId, events: [...list].sort(byStart) });
      seen.add(columnId);
    }
  }
  // Columns the order did not name (defensive: a booking on a day outside the range) go last, in key order.
  for (const [columnId, list] of Array.from(byColumn.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (!seen.has(columnId)) out.push({ columnId, events: [...list].sort(byStart) });
  }
  return out;
}

/** Every id in reading order — what ⌘A selects and what a list flow walks. */
export function orderedIds(events: readonly FocusableEvent[], columnOrder: readonly string[]): string[] {
  return orderedColumns(events, columnOrder).flatMap((column) => column.events.map((event) => event.id));
}

/** The first event anyone should land on. */
export function firstFocusable(events: readonly FocusableEvent[], columnOrder: readonly string[]): string | null {
  return orderedIds(events, columnOrder)[0] ?? null;
}

/** Keep focus somewhere real: the current id if it is still visible, else the first. */
export function resolveFocus(
  events: readonly FocusableEvent[],
  columnOrder: readonly string[],
  current: string | null,
): string | null {
  if (current && events.some((event) => event.id === current)) return current;
  return firstFocusable(events, columnOrder);
}

export interface NextFocusInput {
  events: readonly FocusableEvent[];
  columnOrder: readonly string[];
  current: string | null;
  key: FocusKey;
  flow?: FocusFlow;
}

export function nextFocus({ events, columnOrder, current, key, flow = 'grid' }: NextFocusInput): string | null {
  const columns = orderedColumns(events, columnOrder);
  if (columns.length === 0) return null;
  const currentEvent = current === null ? null : (events.find((event) => event.id === current) ?? null);
  if (!currentEvent) return firstFocusable(events, columnOrder);

  if (flow === 'list') {
    const ids = columns.flatMap((column) => column.events.map((event) => event.id));
    const index = ids.indexOf(currentEvent.id);
    if (index < 0) return ids[0] ?? null;
    switch (key) {
      case 'Home':
        return ids[0] ?? null;
      case 'End':
        return ids[ids.length - 1] ?? null;
      case 'ArrowUp':
      case 'ArrowLeft':
        return index > 0 ? ids[index - 1]! : null;
      case 'ArrowDown':
      case 'ArrowRight':
        return index < ids.length - 1 ? ids[index + 1]! : null;
    }
  }

  const columnIndex = columns.findIndex((column) => column.columnId === currentEvent.columnId);
  const column = columns[columnIndex];
  if (!column) return firstFocusable(events, columnOrder);
  const index = column.events.findIndex((event) => event.id === currentEvent.id);

  switch (key) {
    case 'Home':
      return column.events[0]!.id;
    case 'End':
      return column.events[column.events.length - 1]!.id;
    case 'ArrowUp':
      return index > 0 ? column.events[index - 1]!.id : null;
    case 'ArrowDown':
      return index < column.events.length - 1 ? column.events[index + 1]!.id : null;
    case 'ArrowLeft':
    case 'ArrowRight': {
      const step = key === 'ArrowRight' ? 1 : -1;
      const neighbour = columns[columnIndex + step];
      if (!neighbour) return null;
      let best = neighbour.events[0]!;
      let bestDistance = Math.abs(best.start - currentEvent.start);
      for (const candidate of neighbour.events) {
        const distance = Math.abs(candidate.start - currentEvent.start);
        if (distance < bestDistance) {
          best = candidate;
          bestDistance = distance;
        }
      }
      return best.id;
    }
  }
}
