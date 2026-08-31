import { Skeleton } from '~ui';

export interface CalendarSkeletonProps {
  /** 7 for a week, 1 for a day, the specialist count for a resource day. */
  columns: number;
  /** Month: a 6×7 shape instead of gutter + columns. */
  month?: boolean;
}

/** Ten hour rows, one gutter, N columns of blocks at plausible heights. */
const HOURS = Array.from({ length: 10 }, (_, i) => i);
const BLOCKS: Record<number, number[]> = { 0: [1, 4], 1: [2], 2: [0, 3, 6], 3: [5], 4: [1, 2], 5: [], 6: [3] };

/**
 * The calendar's first-paint shape: the gutter and the columns are already
 * where they will be, so the real grid replaces a stand-in of the same
 * geometry rather than pushing the toolbar around.
 */
export function CalendarSkeleton({ columns, month = false }: CalendarSkeletonProps) {
  if (month) {
    return (
      <div
        aria-hidden
        aria-busy
        className="grid min-h-0 flex-1 grid-cols-7 gap-px overflow-hidden rounded-card border border-border bg-border"
      >
        {Array.from({ length: 42 }, (_, i) => (
          <div key={i} className="flex flex-col gap-1 bg-surface-raised p-1.5">
            <Skeleton width="1.25rem" height="0.75rem" />
            {i % 3 === 0 ? <Skeleton width="80%" height="0.875rem" /> : null}
            {i % 5 === 0 ? <Skeleton width="60%" height="0.875rem" /> : null}
          </div>
        ))}
      </div>
    );
  }
  const count = Math.max(1, Math.min(columns, 8));
  return (
    <div
      aria-hidden
      aria-busy
      className="flex min-h-0 flex-1 overflow-hidden rounded-card border border-border bg-surface-raised"
    >
      <div className="flex w-time-gutter shrink-0 flex-col gap-0 border-r border-border">
        <div className="h-9 border-b border-border" />
        {HOURS.map((h) => (
          <div key={h} className="flex h-hour-cozy items-start justify-end pr-2 pt-1">
            <Skeleton width="1.75rem" height="0.625rem" />
          </div>
        ))}
      </div>
      <div className="grid min-w-0 flex-1" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
        {Array.from({ length: count }, (_, c) => (
          <div key={c} className="relative border-l border-border first:border-l-0">
            <div className="flex h-9 items-center border-b border-border px-2">
              <Skeleton width="3rem" height="0.75rem" />
            </div>
            <div
              className="time-grid-rules relative"
              style={
                {
                  height: `calc(${HOURS.length} * var(--height-hour-cozy))`,
                  '--time-grid-hour': 'var(--height-hour-cozy)',
                } as never
              }
            >
              {(BLOCKS[c % 7] ?? []).map((row) => (
                <div
                  key={row}
                  className="absolute inset-x-1"
                  style={{
                    top: `calc(${row} * var(--height-hour-cozy) + 4px)`,
                    height: `calc(var(--height-hour-cozy) * ${row % 2 === 0 ? 0.75 : 1.4})`,
                  }}
                >
                  <Skeleton variant="block" height="100%" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
