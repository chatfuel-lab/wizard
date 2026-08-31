/**
 * Layout policy in one place — the band names come from `~ui`'s container
 * queries (`useBand`); nothing here reads the viewport.
 */
import type { Band } from '~ui';

export type { Band };

/** Below this band the Channels rail stacks over the scope page (SplitPane `collapseBelow`). */
export const RAIL_COLLAPSE_BELOW: Band = 'wide';

/** From this band up the Test panel is a column beside the scope page; below it, it stacks under the page. */
export const PANEL_INLINE_FROM: Band = 'wide';
