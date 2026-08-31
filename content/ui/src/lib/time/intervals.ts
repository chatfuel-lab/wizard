/**
 * Half-open intervals `[start, end)` on one number line — minutes of a day,
 * epoch milliseconds, whatever the caller measures in.
 *
 * Half-open is the only convention under which two abutting bookings
 * (09:00–09:30, 09:30–10:00) neither overlap nor leave a gap, and it is what
 * every function here assumes. An interval with `end <= start` is EMPTY and is
 * dropped by `normalize`; nothing downstream has to defend against it.
 *
 * ## `sliceSlots` and the server's periods
 *
 * The booking API's availability comes back as PERIODS OF START TIMES with an
 * INCLUSIVE end: for a 30-minute service on a 09:00–18:00 day it says
 * `{start: '09:00', end: '17:30'}` — 17:30 is the LAST bookable start, not the
 * end of the free time. Read as a half-open interval that would lose the
 * 17:30 slot. So `sliceSlots` takes `endInclusive`: with it, a start `s` is
 * valid iff `start ≤ s ≤ end`; without it (the classic reading, for a list of
 * genuinely free time) iff `start ≤ s` and `s + duration ≤ end`. The default
 * is classic; the module passes `endInclusive: true` for what the server
 * returns, and the two readings are tested against each other.
 */

export interface Interval {
  start: number;
  end: number;
}

export interface SliceOptions {
  /**
   * `'step'` (default): slot starts sit on the step grid counted from 0 —
   * 09:00, 09:15, 09:30 — however ragged the free period is. `'start'`: the
   * grid is counted from each period's own start, so a period beginning at
   * 09:10 yields 09:10, 09:25, …
   */
  alignTo?: 'step' | 'start';
  /** The period's `end` is the last valid START, not the end of free time. */
  endInclusive?: boolean;
}

export function isEmpty(interval: Interval): boolean {
  return !(interval.end > interval.start);
}

export function length(interval: Interval): number {
  return Math.max(0, interval.end - interval.start);
}

/**
 * Sorted, non-empty, non-overlapping, non-abutting. Every other function
 * accepts unnormalized input and normalizes first, so callers never have to.
 */
export function normalize(intervals: readonly Interval[]): Interval[] {
  const sorted = intervals
    .filter((interval) => !isEmpty(interval) && Number.isFinite(interval.start) && Number.isFinite(interval.end))
    .map((interval) => ({ start: interval.start, end: interval.end }))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const out: Interval[] = [];
  for (const interval of sorted) {
    const last = out[out.length - 1];
    /* `<=`, not `<`: abutting halves become one whole. */
    if (last && interval.start <= last.end) last.end = Math.max(last.end, interval.end);
    else out.push(interval);
  }
  return out;
}

/** Union. `merge(a, b)` is `normalize([...a, ...b])` with a name that reads at the call site. */
export function merge(a: readonly Interval[], b: readonly Interval[] = []): Interval[] {
  return normalize([...a, ...b]);
}

/** `a` minus every part covered by `b`. */
export function subtract(a: readonly Interval[], b: readonly Interval[]): Interval[] {
  const holes = normalize(b);
  const out: Interval[] = [];
  for (const piece of normalize(a)) {
    let cursor = piece.start;
    for (const hole of holes) {
      if (hole.end <= cursor) continue;
      if (hole.start >= piece.end) break;
      if (hole.start > cursor) out.push({ start: cursor, end: hole.start });
      cursor = Math.max(cursor, hole.end);
      if (cursor >= piece.end) break;
    }
    if (cursor < piece.end) out.push({ start: cursor, end: piece.end });
  }
  return out;
}

/** The parts of the line inside BOTH lists. */
export function intersect(a: readonly Interval[], b: readonly Interval[]): Interval[] {
  const left = normalize(a);
  const right = normalize(b);
  const out: Interval[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    const x = left[i]!;
    const y = right[j]!;
    const start = Math.max(x.start, y.start);
    const end = Math.min(x.end, y.end);
    if (start < end) out.push({ start, end });
    if (x.end < y.end) i += 1;
    else j += 1;
  }
  return out;
}

/** Is `point` inside `[start, end)`? */
export function contains(interval: Interval, point: number): boolean {
  return point >= interval.start && point < interval.end;
}

/** Is every point of `target` inside the union of `intervals`? Empty target → true. */
export function covers(intervals: readonly Interval[], target: Interval): boolean {
  if (isEmpty(target)) return true;
  for (const interval of normalize(intervals)) {
    if (interval.start <= target.start && interval.end >= target.end) return true;
  }
  return false;
}

/** Do the two overlap by a positive amount? Abutting is NOT overlapping. */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Everything inside `bounds`, trimmed to it. */
export function clampTo(intervals: readonly Interval[], bounds: Interval): Interval[] {
  return intersect(intervals, [bounds]);
}

export function totalLength(intervals: readonly Interval[]): number {
  return normalize(intervals).reduce((sum, interval) => sum + length(interval), 0);
}

/**
 * The bookable start times inside `free`, for a booking of `duration`, every
 * `step`. Sorted, unique. See the header for what `endInclusive` means.
 */
export function sliceSlots(
  free: readonly Interval[],
  duration: number,
  step: number,
  options: SliceOptions = {},
): number[] {
  if (!(duration > 0) || !(step > 0)) return [];
  const alignTo = options.alignTo ?? 'step';
  const endInclusive = options.endInclusive ?? false;
  const starts = new Set<number>();
  /* Not normalized when the end is inclusive: two abutting periods
     `[09:00, 09:30]` and `[09:30, 10:00]` are two lists of starts and merging
     them is harmless, but an EMPTY-looking `{start: 17:30, end: 17:30}` is a
     real single start under this reading and normalize would drop it. */
  const periods = endInclusive
    ? [...free].filter((p) => p.end >= p.start).sort((a, b) => a.start - b.start)
    : normalize(free);
  for (const period of periods) {
    const origin = alignTo === 'start' ? period.start : 0;
    let s = origin + Math.ceil((period.start - origin) / step) * step;
    const last = endInclusive ? period.end : period.end - duration;
    for (; s <= last; s += step) starts.add(s);
  }
  return [...starts].sort((a, b) => a - b);
}
