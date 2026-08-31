import { hourMarks, minuteToPx, rangeHeightPx, type GridDensity, type MinuteRange } from '../../lib/time/timeGrid';
import { formatMinuteOfDay } from '../../lib/time/timeOfDay';

/**
 * Hour heights as classes, per density. A `Record`, so the class names exist
 * in source for Tailwind to find; the geometry that varies per grid — the
 * label's `top` — is inline.
 */
export const HOUR_CLASS: Record<GridDensity, string> = {
  compact: 'h-hour-compact',
  cozy: 'h-hour-cozy',
  comfortable: 'h-hour-comfortable',
};

export interface TimeGutterProps {
  range: MinuteRange;
  hourPx: number;
  density: GridDensity;
  hour12: boolean;
  locale?: string;
  /** Minute of the now-line, for the small marker beside it. Null for none. */
  nowMinute: number | null;
  /** Minutes between labels. 60 draws every hour; a larger step thins them out. */
  labelStep?: number;
}

/**
 * The hour labels down the left of the grid.
 *
 * Each label sits INSIDE its hour, top-aligned, right-aligned — FullCalendar's
 * placement, not Google's straddled one. Straddling the rule puts the first
 * label half under the sticky header and the last one half past the bottom;
 * inside-the-hour clips nothing and needs no special case for either end.
 * The gutter is `sticky left-0` and opaque so it stays readable while the
 * columns scroll under it; the header above it is the grid's, not this.
 *
 * `labelStep` thins the labels out without touching anything else: the rules
 * behind the columns are a CSS tile on `--time-grid-hour` and stay on the hour,
 * so a coarser step drops labels and moves nothing.
 */
export function TimeGutter({ range, hourPx, density, hour12, locale, nowMinute, labelStep = 60 }: TimeGutterProps) {
  const marks = hourMarks(range, labelStep);
  const nowTop =
    nowMinute === null || nowMinute < range.start || nowMinute > range.end
      ? null
      : minuteToPx(nowMinute, hourPx, range);
  return (
    <div
      aria-hidden
      className="relative w-time-gutter shrink-0 select-none overflow-hidden border-r border-border bg-surface-raised"
      style={{ height: rangeHeightPx(range, hourPx) }}
    >
      {marks.map((minute) => (
        <div
          key={minute}
          className={`absolute inset-x-0 pr-1.5 pt-0.5 text-right text-micro tabular-nums text-text-faint ${HOUR_CLASS[density]}`}
          style={{ top: minuteToPx(minute, hourPx, range) }}
        >
          {formatMinuteOfDay(minute, { hour12, locale, short: true })}
        </div>
      ))}
      {nowTop !== null ? <div className="absolute right-0 h-px w-2 bg-now" style={{ top: nowTop }} /> : null}
    </div>
  );
}
