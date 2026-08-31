/**
 * Layout bands — the module's own width, not the viewport's.
 *
 * Modules ship as EMBEDS. One can be 700px wide inside a 2560px screen, so a
 * media query answers the wrong question every time. Everything here is
 * measured against the module root; `useContainerBand` does the observing.
 *
 * The four numbers below are the same numbers as the `--container-*` tokens in
 * `styles/tokens.css`, which generate the `@compact:` / `@wide:` / `@inline:`
 * container-query variants. `layout.test.ts` parses that file and asserts the
 * parity, because a drift is a real bug rather than a style nit: at exactly
 * 900px the CSS would say one thing and this module another.
 *
 * WHICH TOOL FOR WHICH DECISION — the rule, in one line:
 *
 *   If the answer changes what React renders, ask JS (this file).
 *   If it only changes how something looks, ask CSS (`@wide:` and friends).
 *   Never ask the viewport from module code.
 *
 * "Looks" means grid column counts, gaps, padding, wrap, hiding a decorative
 * label. Those belong in CSS: container queries apply before paint (no
 * first-frame flash), cost zero React renders, need no prop threaded through
 * the tree, and re-evaluate per frame while a sibling animates its width — a
 * band that only fires on band CHANGE does none of that.
 *
 * "Renders" means a Drawer instead of an inline <aside> (different component,
 * different a11y, focus trap and scroll lock vs neither), which table columns
 * exist at all (CSS-hiding still renders and measures every cell), or a pixel
 * number that feeds an animation. Those are this file's job.
 */

export type Band = 'compact' | 'narrow' | 'wide' | 'inline';

/** Phone-shaped: one column, stacked master/detail, no board. */
export const BAND_NARROW = 600;
/** Wide enough for a real board rather than a single-column pager. */
export const BAND_WIDE = 900;
/** Wide enough to host a detail panel beside the content instead of over it. */
export const BAND_INLINE = 1280;

/** Ordered smallest to largest — `bandAtLeast` compares by this index. */
export const BANDS: readonly Band[] = ['compact', 'narrow', 'wide', 'inline'];

/** A width that is not a finite positive number is treated as the smallest band. */
export function bandFor(width: number): Band {
  if (!Number.isFinite(width) || width < BAND_NARROW) return 'compact';
  if (width < BAND_WIDE) return 'narrow';
  return width < BAND_INLINE ? 'wide' : 'inline';
}

/** `bandAtLeast(band, 'wide')` — reads better than an index comparison at call sites. */
export function bandAtLeast(band: Band, min: Band): boolean {
  return BANDS.indexOf(band) >= BANDS.indexOf(min);
}

/**
 * The band `width` implies, or null when it is the one we already have.
 *
 * Exists so the observer's "only set state when the band actually changed" rule
 * is a tested pure function instead of an untestable line buried in an effect.
 * Without it a drag that resizes nothing re-renders the whole module on every
 * ResizeObserver callback.
 */
export function nextBand(current: Band, width: number): Band | null {
  const band = bandFor(width);
  return band === current ? null : band;
}
