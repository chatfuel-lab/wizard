import { Skeleton } from '~ui';
import type { CalendarMode } from '../lib/publishingParams';

export interface CalendarSkeletonProps {
  mode: CalendarMode;
}

/** Rows of the week stand-in. One row is one hour, at the grid's own density. */
const HOURS = Array.from({ length: 8 }, (_, index) => index);
/* Which hours carry a card, per column — a fixed pattern, so the placeholder is
   the same on every load rather than shimmering somewhere new each time. */
const CARDS: Record<number, number[]> = { 0: [2], 1: [1, 5], 2: [], 3: [3], 4: [0, 4], 5: [6], 6: [2] };
/* The gutter is labelled every third hour, as the real one is. */
const LABEL_EVERY = 3;

/** One post-shaped card: the header line, the caption beside its picture, the pill. */
function CardStandIn() {
  return (
    <span className="flex h-full w-full flex-col gap-0.5 rounded-control border border-border bg-surface-raised p-2">
      <Skeleton width="2.5rem" height="0.6875rem" />
      <span className="flex items-start gap-1.5">
        <span className="min-w-0 flex-1">
          <Skeleton width="100%" height="0.75rem" />
        </span>
        <Skeleton width="2.5rem" height="2.5rem" />
      </span>
    </span>
  );
}

/**
 * The calendar's first paint, in the geometry the real surface will occupy.
 *
 * The point is that nothing moves when the posts arrive: the gutter, the
 * columns and the day cells are already where they will be, and a stand-in is
 * the SHAPE of what replaces it — a card with a picture in the week, a one-line
 * chip in a month cell. A placeholder that does not match the real thing is a
 * flicker with extra steps.
 */
export function CalendarSkeleton({ mode }: CalendarSkeletonProps) {
  if (mode === 'month') {
    return (
      <div
        aria-hidden
        aria-busy
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-surface-raised"
      >
        {/* The weekday row is real chrome, not data, so the grid does not jump
            down a line when the posts arrive. */}
        <div className="grid grid-cols-7 border-b border-border">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="flex justify-center px-2 py-1.5">
              <Skeleton width="1.75rem" height="0.6875rem" />
            </div>
          ))}
        </div>
        <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-7">
          {Array.from({ length: 42 }, (_, index) => (
            <div
              key={index}
              className={`flex min-h-0 flex-col gap-0.5 overflow-hidden border-b border-border p-1 ${
                index % 7 === 0 ? '' : 'border-l'
              } ${index >= 35 ? 'border-b-0' : ''}`}
            >
              <span className="px-0.5">
                <Skeleton width="1rem" height="0.75rem" />
              </span>
              {index % 3 === 0 ? <Skeleton width="100%" height="1.25rem" /> : null}
              {index % 7 === 2 ? <Skeleton width="100%" height="1.25rem" /> : null}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (mode === 'week') {
    return (
      <div
        aria-hidden
        aria-busy
        className="flex min-h-0 flex-1 overflow-hidden rounded-card border border-border bg-surface-raised"
      >
        <div className="flex w-time-gutter shrink-0 flex-col border-r border-border">
          <div className="h-9 border-b border-border" />
          {HOURS.map((hour) => (
            <div key={hour} className="flex h-hour-comfortable items-start justify-end pr-1.5 pt-0.5">
              {hour % LABEL_EVERY === 0 ? <Skeleton width="1.75rem" height="0.625rem" /> : null}
            </div>
          ))}
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-7">
          {Array.from({ length: 7 }, (_, column) => (
            <div key={column} className="relative border-l border-border first:border-l-0">
              <div className="flex h-9 items-center justify-center border-b border-border px-2">
                <Skeleton width="3rem" height="0.75rem" />
              </div>
              <div className="relative" style={{ height: `calc(${HOURS.length} * var(--height-hour-comfortable))` }}>
                {(CARDS[column] ?? []).map((hour) => (
                  <div
                    key={hour}
                    className="absolute inset-x-0.5"
                    style={{
                      top: `calc(${hour} * var(--height-hour-comfortable))`,
                      height: 'var(--height-hour-comfortable)',
                    }}
                  >
                    <CardStandIn />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      aria-hidden
      aria-busy
      className="min-h-0 flex-1 overflow-hidden rounded-card border border-border bg-surface-raised"
    >
      {Array.from({ length: 3 }, (_, group) => (
        <div key={group} className="border-b border-border-subtle last:border-b-0">
          <div className="border-b border-border-subtle px-3 py-1.5">
            <Skeleton width="7rem" height="0.75rem" />
          </div>
          {Array.from({ length: group === 1 ? 1 : 2 }, (_, row) => (
            <div key={row} className="flex items-center gap-3 px-3 py-2">
              <Skeleton width="0.25rem" height="2rem" />
              <Skeleton width="3rem" height="0.75rem" />
              <Skeleton width="2rem" height="2rem" />
              <Skeleton width={row === 0 ? '45%' : '30%'} height="0.875rem" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
