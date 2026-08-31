/**
 * Deals' layout constants, over the design system's band model.
 *
 * `Band`, `bandFor` and the thresholds now live in `~ui` — ten modules needed
 * them, and the ResizeObserver that feeds them is `useContainerBand`. This file
 * stays as the module's door onto that so the ~15 files importing
 * `import type { Band } from '../lib/layout'` never learn anything moved, and
 * keeps the parts that are genuinely about deals: card geometry, column widths,
 * and the two policy functions.
 *
 * Breakpoints are CONTAINER-based, not viewport-based: an embed can be 700px
 * wide inside a 2560px screen, so a media query would answer the wrong
 * question.
 *
 * ⚠ `Band` gained a fourth member, `'compact'` (< 600px), which is NOT the same
 * thing as `Density`'s `'compact'` — one is how much room there is, the other
 * is how tightly rows are packed. Anywhere this module used to write
 * `band === 'narrow'` to mean "too small for a board", the correct test is now
 * `isNarrow`, which covers both small bands.
 */

import { BAND_INLINE, BAND_WIDE, bandAtLeast, bandFor, type Band } from '~ui';

export type { Band };
export { BAND_INLINE, BAND_WIDE, bandFor };

export type Density = 'compact' | 'comfortable';

export const DENSITIES: readonly Density[] = ['comfortable', 'compact'];

/** Card box heights, in px — the drop placeholder animates to exactly this. */
export const CARD_HEIGHT: Record<Density, number> = { compact: 32, comfortable: 76 };

/* COLUMN_WIDTH = 288 and RAIL_WIDTH = 44 used to live here as the peers of
   --width-column and --width-column-rail, and the R-tail was going to add a test
   pinning each pair together the way layout.test.ts pins the band thresholds to
   --container-*. There is nothing to pin: nothing imports them. The board sizes
   its columns with `w-column` and `w-column-rail`, so the CSS token is the only
   number in play and a TypeScript copy of it could only ever be wrong.

   The band thresholds are the opposite case and that is why they keep their
   test: bandFor() genuinely does arithmetic on them in JS while a container
   query does the same arithmetic in CSS, so there really are two numbers. One
   number needs no parity test. */

/**
 * Too narrow for a real board — the single question this module used to ask as
 * `band === 'narrow'`, back when that was the smallest band there was.
 */
export function isNarrow(band: Band): boolean {
  return !bandAtLeast(band, 'wide');
}

/** Narrow forces compact: a 76px card in a stage pager wastes the only axis there is. */
export function effectiveDensity(band: Band, requested: Density): Density {
  return isNarrow(band) ? 'compact' : requested;
}

/**
 * Kept, and kept tested, but no longer called: `InspectorHost` asks the same
 * question as `inlineFrom='inline'` (its default) against its own `useBand()`.
 * This is the module's statement of the policy, and the test below it is what
 * would catch that default moving.
 */
export function panelHost(band: Band): 'drawer' | 'inline' {
  return band === 'inline' ? 'inline' : 'drawer';
}
