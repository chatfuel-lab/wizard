import type { SalesStageV2 } from '~api/generated/deals/graphql';
import { STAGE_META } from '../lib/stages';

export interface ColumnRailProps {
  stage: SalesStageV2;
  total: number;
  isOver: boolean;
  dropTargetProps: Record<string, unknown>;
  onExpand: () => void;
}

/**
 * A collapsed column: 44px, and **still a full drop target** — a collapsed
 * column must never be a dead end for a card.
 *
 * It deliberately does **not** spring open on drag hover, unlike the gallery
 * demo. `useDragSession` measures every drop-target rect once at activation and
 * re-measures only while auto-scrolling; expanding a rail mid-drag would shift
 * every column to its right out from under the pointer, against a cache the
 * primitive will not refresh. Being a drop target is the better answer anyway:
 * the card gets where it is going without the board rearranging itself.
 */
export function ColumnRail({ stage, total, isOver, dropTargetProps, onExpand }: ColumnRailProps) {
  const meta = STAGE_META[stage];
  return (
    <div
      {...dropTargetProps}
      /* A snap point like an expanded column, so the stage pager can come to rest
         on a collapsed stage instead of scrolling past it to the next page. */
      className={`flex h-full w-column-rail shrink-0 snap-start flex-col items-center gap-2 rounded-card border py-2 transition-colors ${
        isOver ? 'border-accent bg-accent-soft/40' : 'border-border bg-surface-sunken'
      }`}
    >
      <span aria-hidden className={`size-2 shrink-0 rounded-full ${meta.dot}`} />
      <span className="shrink-0 text-xs tabular-nums text-text-muted">{total}</span>
      <button
        type="button"
        onClick={onExpand}
        aria-label={`Expand ${meta.label}`}
        className="focus-visible:focus-ring flex min-h-0 flex-1 items-center justify-center rounded text-xs text-text-muted hover:text-text"
      >
        <span className="[writing-mode:vertical-rl] whitespace-nowrap">{meta.label}</span>
      </button>
    </div>
  );
}
