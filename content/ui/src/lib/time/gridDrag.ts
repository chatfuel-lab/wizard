/**
 * The continuous-drag state machine for the time grid — move, resize either
 * end, drag-to-create — with no DOM and no React.
 *
 * `dnd/useGridDragSession.ts` owns the pointer events, the rAF loop, the
 * touch hold and the live region; this file owns every decision that can be
 * wrong: where the span goes for a pointer at (column, minute), what an arrow
 * key does, whether the release commits anything. The split is the same one
 * `lib/geometry/nodeDrag.ts` made for the canvas, for the same reason: vitest here is
 * node-only, and a state machine hidden inside a hook is a state machine with
 * no tests. The lesson that file records — commit from the SESSION, never
 * from a store a throttled frame may not have written — holds here too:
 * `endGridDrag` reads `state.current` and nothing else.
 *
 * ## The four kinds
 *
 * - `move`      — the whole span shifts by the pointer's delta from the grab
 *                 point; the column follows the pointer unless `lockColumn`.
 *                 The delta is snapped, not the span, so a 09:10 booking
 *                 dragged down 15 minutes lands at 09:25, not 09:30 — the
 *                 booking keeps its own offset. Cal.com and FullCalendar both
 *                 do this; Google snaps the span and users notice.
 * - `resize-start` / `resize-end` — one end follows the pointer, snapped;
 *                 the other stays; `minDuration` is enforced against the
 *                 fixed end. Resizing never changes the column.
 * - `create`    — both ends come from the anchor (where the pointer went
 *                 down) and the pointer, in EITHER order: dragging upward
 *                 from the anchor grows the span upward. The anchor is
 *                 snapped down (floor) and the pointer end is snapped in the
 *                 direction of travel, so a press at 10:07 dragged to 10:20
 *                 gives 10:00–10:30. The column is the anchor's; a create
 *                 never spans columns.
 *
 * ## Keyboard
 *
 * ↑/↓ move by one snap; Shift makes it four (an hour at 15); ←/→ change
 * column; Alt+↑/↓ resize the end instead. The same rules clamp both paths,
 * so a keyboard user can reach exactly the spans a pointer user can.
 *
 * `moved` is the click/drag discriminator: a session whose current span
 * still equals its origin commits nothing, so a click on an event stays a
 * click.
 */

import type { MinuteRange, MinuteSpan } from './timeGrid';
import { clampSpan } from './timeGrid';
import { snapMinute } from './timeOfDay';

export type GridDragKind = 'move' | 'resize-start' | 'resize-end' | 'create';

export interface GridSpan extends MinuteSpan {
  /** Column INDEX — the hook maps it back to an id. */
  column: number;
}

export interface GridPoint {
  column: number;
  /** Minute of the day under the pointer, unsnapped and possibly out of range. */
  minute: number;
}

export interface GridDragRules {
  /** Minutes. 15 is the product default. */
  snap: number;
  /** Minutes. A resize can never make an event shorter than this. */
  minDuration: number;
  range: MinuteRange;
  columnCount: number;
  /** A move keeps its column — the day view by time, where a column change means nothing. */
  lockColumn?: boolean;
}

export interface GridDragState {
  kind: GridDragKind;
  /** The event being dragged; null for a create. */
  id: string | null;
  /** The span at grab time — what a cancel restores, and what a create starts from. */
  origin: GridSpan;
  /** Where the pointer went down. */
  anchor: GridPoint;
  /** THE value the release commits. */
  current: GridSpan;
  /** Has `current` ever differed from `origin`? */
  moved: boolean;
}

export interface KeyLike {
  key: string;
  shiftKey?: boolean;
  altKey?: boolean;
}

export function spanEquals(a: GridSpan, b: GridSpan): boolean {
  return a.column === b.column && a.start === b.start && a.end === b.end;
}

function clampColumn(column: number, rules: GridDragRules): number {
  if (rules.columnCount <= 0) return 0;
  return Math.min(Math.max(0, column), rules.columnCount - 1);
}

function clampMinute(minute: number, rules: GridDragRules): number {
  return Math.min(Math.max(minute, rules.range.start), rules.range.end);
}

/**
 * Start a session. For `create`, `span` is the anchor slot — start = end =
 * the pressed minute — and the first `gridDragTo` opens it up.
 */
export function beginGridDrag(args: {
  kind: GridDragKind;
  id: string | null;
  span: GridSpan;
  at: GridPoint;
  rules: GridDragRules;
}): GridDragState {
  const { kind, id, span, at, rules } = args;
  let origin: GridSpan;
  if (kind === 'create') {
    const start = clampMinute(snapMinute(at.minute, rules.snap, 'floor'), rules);
    origin = { column: clampColumn(at.column, rules), start, end: start };
  } else {
    origin = { column: clampColumn(span.column, rules), start: span.start, end: span.end };
  }
  return {
    kind,
    id,
    origin,
    anchor: { column: origin.column, minute: at.minute },
    current: { ...origin },
    moved: false,
  };
}

/** The pointer is at `at`. Returns the NEXT state; the argument is not mutated. */
export function gridDragTo(state: GridDragState, at: GridPoint, rules: GridDragRules): GridDragState {
  const { snap, minDuration } = rules;
  let next: GridSpan;

  switch (state.kind) {
    case 'move': {
      const delta = snapMinute(at.minute - state.anchor.minute, snap);
      const column = rules.lockColumn ? state.origin.column : clampColumn(at.column, rules);
      const shifted = clampSpan(
        { start: state.origin.start + delta, end: state.origin.end + delta },
        { range: rules.range, minDuration },
      );
      next = { column, ...shifted };
      break;
    }
    case 'resize-start': {
      const start = Math.min(clampMinute(snapMinute(at.minute, snap), rules), state.origin.end - minDuration);
      next = { column: state.origin.column, start: Math.max(start, rules.range.start), end: state.origin.end };
      break;
    }
    case 'resize-end': {
      const end = Math.max(clampMinute(snapMinute(at.minute, snap), rules), state.origin.start + minDuration);
      next = { column: state.origin.column, start: state.origin.start, end: Math.min(end, rules.range.end) };
      break;
    }
    case 'create': {
      const anchor = state.origin.start;
      const pointer = clampMinute(at.minute, rules);
      let start: number;
      let end: number;
      if (pointer >= anchor) {
        start = anchor;
        end = clampMinute(snapMinute(pointer, snap, 'ceil'), rules);
      } else {
        start = clampMinute(snapMinute(pointer, snap, 'floor'), rules);
        end = anchor + snap;
      }
      /* A create is at least one snap long even before the pointer moves —
         and at least `minDuration`, so a 15-minute press for a 30-minute
         service is already a valid booking. */
      const floor = Math.max(snap, minDuration);
      if (end - start < floor) {
        if (pointer >= anchor) end = start + floor;
        else start = end - floor;
      }
      next = { column: state.origin.column, ...clampSpan({ start, end }, { range: rules.range, minDuration: floor }) };
      break;
    }
  }

  const moved = state.moved || !spanEquals(next, state.origin);
  if (!moved && spanEquals(next, state.current)) return state;
  return { ...state, current: next, moved };
}

/**
 * A key while grabbed. Returns the next state, or null when the key is not
 * one of ours — so the caller can leave it to bubble (a Tab must still tab).
 */
export function gridKeyStep(state: GridDragState, key: KeyLike, rules: GridDragRules): GridDragState | null {
  const factor = key.shiftKey ? 4 : 1;
  const step = rules.snap * factor;
  const { minDuration, range } = rules;
  const current = state.current;
  let next: GridSpan;

  const vertical = key.key === 'ArrowUp' ? -1 : key.key === 'ArrowDown' ? 1 : 0;
  const horizontal = key.key === 'ArrowLeft' ? -1 : key.key === 'ArrowRight' ? 1 : 0;

  if (vertical !== 0) {
    if (key.altKey || state.kind === 'resize-end') {
      const end = Math.min(range.end, Math.max(current.start + minDuration, current.end + vertical * step));
      next = { ...current, end };
    } else if (state.kind === 'resize-start') {
      const start = Math.max(range.start, Math.min(current.end - minDuration, current.start + vertical * step));
      next = { ...current, start };
    } else {
      const shifted = clampSpan(
        { start: current.start + vertical * step, end: current.end + vertical * step },
        { range, minDuration },
      );
      next = { column: current.column, ...shifted };
    }
  } else if (horizontal !== 0) {
    if (state.kind !== 'move' || rules.lockColumn) return state;
    next = { ...current, column: clampColumn(current.column + horizontal, rules) };
  } else {
    return null;
  }

  const moved = state.moved || !spanEquals(next, state.origin);
  if (spanEquals(next, current) && moved === state.moved) return state;
  return { ...state, current: next, moved };
}

/**
 * The release. Null means "commit nothing" — the span never left its
 * origin, so this was a click (or a create that never opened).
 */
export function endGridDrag(state: GridDragState): GridSpan | null {
  if (!state.moved || spanEquals(state.current, state.origin)) return null;
  return state.current;
}
