/**
 * Layout policy in one place — the band names come from `~ui`'s container
 * queries (`useBand`); nothing here reads the viewport.
 */
import type { Band } from '~ui';

export type { Band };

/** Below this band the sources rail stacks over the source page (SplitPane `collapseBelow`). */
export const RAIL_COLLAPSE_BELOW: Band = 'wide';

/** Below this band the products grid drops to one column and the table hides its secondary columns. */
export const GRID_COMPACT_BELOW: Band = 'compact';
