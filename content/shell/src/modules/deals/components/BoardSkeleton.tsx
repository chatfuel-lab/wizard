import { Skeleton } from '~ui';
import { CARD_HEIGHT, type Density } from '../lib/layout';
import { STAGES } from '../lib/stages';

export interface BoardSkeletonProps {
  density: Density;
}

/**
 * The board's shape while it loads, instead of a centred spinner: the columns
 * are already where they will be, so nothing jumps when the data lands.
 *
 * `Skeleton` is `aria-hidden` by design, so the status text is what a screen
 * reader actually gets.
 */
export function BoardSkeleton({ density }: BoardSkeletonProps) {
  const height = `${CARD_HEIGHT[density]}px`;
  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-gutter">
      <span role="status" className="sr-only">
        Loading deals
      </span>
      {STAGES.map((stage, column) => (
        <div
          key={stage}
          className="flex h-full w-column shrink-0 flex-col gap-2 rounded-card border border-border bg-surface-sunken p-2"
        >
          <Skeleton variant="text" width="45%" />
          {Array.from({ length: 4 - (column % 3) }, (_, row) => (
            <Skeleton key={row} variant="block" height={height} />
          ))}
        </div>
      ))}
    </div>
  );
}
