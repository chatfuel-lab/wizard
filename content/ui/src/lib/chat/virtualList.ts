/**
 * Which rows a long scroller actually renders.
 *
 * Generic on purpose: a thread and an inbox list are the same problem — a
 * variable number of rows of unequal, initially unknown height, of which a
 * screenful is visible. `chat/MessageList.tsx` is the first caller.
 *
 * Two properties the arithmetic has to hold, because both are how a virtual
 * list breaks in the wild:
 *
 * - a row that has not been measured yet still occupies its estimate, so the
 *   scrollbar exists before anything has rendered and the total height only
 *   ever gets more accurate;
 * - the window is expressed as two spacer heights rather than absolute offsets,
 *   so rows stay in normal flow. Absolutely positioned rows have to be measured
 *   before they can be placed, which is a frame of overlap on every new
 *   message, and they cannot be selected across.
 */

/** Height of a row, or undefined when it has never been in the DOM. */
export type MeasureRow = (index: number) => number | undefined;

/** Rows rendered past each edge, so a scroll of one row shows content, not blank. */
export const DEFAULT_OVERSCAN = 4;

export interface VirtualWindowInput {
  count: number;
  /** The scroller's own height. 0 before it has been measured. */
  viewportHeight: number;
  scrollTop: number;
  /** Stand-in height for rows nothing has measured yet. */
  estimateHeight: number;
  measure?: MeasureRow;
  overscan?: number;
  /**
   * Offsets already built by `rowOffsets`. A caller that needs them for its own
   * arithmetic — restoring a scroll anchor, say — passes them in rather than
   * paying for a second identical pass. Ignored if it is not `count + 1` long,
   * because a stale array is worse than a slow one.
   */
  offsets?: readonly number[];
}

export interface VirtualWindow {
  /** First rendered row, inclusive. */
  start: number;
  /** One past the last rendered row. */
  end: number;
  /** Spacer above `start`, in px — the rows that were skipped. */
  paddingTop: number;
  /** Spacer below `end`, in px. */
  paddingBottom: number;
  totalHeight: number;
}

/** A measured height only counts if it is a real, positive number. */
function heightAt(index: number, estimateHeight: number, measure?: MeasureRow): number {
  const measured = measure?.(index);
  if (measured !== undefined && Number.isFinite(measured) && measured > 0) return measured;
  return Number.isFinite(estimateHeight) && estimateHeight > 0 ? estimateHeight : 0;
}

/**
 * Running offsets, `count + 1` long: `offsets[i]` is the top of row i and the
 * last entry is the total height.
 *
 * A prefix sum rebuilt per call rather than an incrementally maintained tree.
 * A thread page is hundreds of rows, not millions, and a stale tree after a
 * remeasure is a whole class of bug that simply cannot happen here.
 */
export function rowOffsets(count: number, estimateHeight: number, measure?: MeasureRow): number[] {
  const safeCount = Number.isFinite(count) ? Math.max(Math.trunc(count), 0) : 0;
  const offsets = new Array<number>(safeCount + 1);
  offsets[0] = 0;
  for (let index = 0; index < safeCount; index += 1) {
    offsets[index + 1] = offsets[index]! + heightAt(index, estimateHeight, measure);
  }
  return offsets;
}

/**
 * The row containing `offset` — the last index whose top is at or above it.
 *
 * Binary search, so scrolling stays O(log n) once the offsets exist. Clamped
 * into range at both ends: an offset past the content answers "the last row",
 * which is what a scroller reports mid-overscroll on iOS.
 */
export function indexAtOffset(offsets: readonly number[], offset: number): number {
  const count = offsets.length - 1;
  if (count <= 0) return 0;
  const target = Number.isFinite(offset) ? offset : 0;
  if (target <= 0) return 0;
  if (target >= offsets[count]!) return count - 1;

  let low = 0;
  let high = count - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (offsets[middle]! <= target) low = middle;
    else high = middle - 1;
  }
  return low;
}

/**
 * The rendered window for a scroll position.
 *
 * `viewportHeight` of 0 is the first-paint case, not an error: the scroller has
 * not been measured yet, and returning an empty window there would render
 * nothing, measure nothing, and stay empty forever. So the window is always at
 * least one row wide while there are rows — enough to give the observer
 * something to measure, after which the real window takes over.
 */
export function virtualWindow({
  count,
  viewportHeight,
  scrollTop,
  estimateHeight,
  measure,
  overscan = DEFAULT_OVERSCAN,
  offsets: given,
}: VirtualWindowInput): VirtualWindow {
  const offsets =
    given && given.length === Math.max(Math.trunc(count), 0) + 1 ? given : rowOffsets(count, estimateHeight, measure);
  const rows = offsets.length - 1;
  const totalHeight = offsets[rows] ?? 0;
  if (rows <= 0) return { start: 0, end: 0, paddingTop: 0, paddingBottom: 0, totalHeight: 0 };

  const safeOverscan = Number.isFinite(overscan) ? Math.max(Math.trunc(overscan), 0) : 0;
  const top = Number.isFinite(scrollTop) ? Math.max(scrollTop, 0) : 0;
  const height = Number.isFinite(viewportHeight) ? Math.max(viewportHeight, 0) : 0;

  const first = indexAtOffset(offsets, top);
  const last = indexAtOffset(offsets, top + height);

  const start = Math.max(first - safeOverscan, 0);
  /* `last` is inclusive and `end` is exclusive, hence the +1; the extra
     Math.max keeps a one-row window alive when height is still 0. */
  const end = Math.min(Math.max(last + 1 + safeOverscan, start + 1), rows);

  return {
    start,
    end,
    paddingTop: offsets[start]!,
    paddingBottom: totalHeight - offsets[end]!,
    totalHeight,
  };
}
