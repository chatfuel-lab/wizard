/**
 * Motion constants and helpers for the JS side of the system.
 *
 * CSS transitions read the --transition-duration-* / --ease-* tokens directly.
 * The Web Animations API cannot see CSS custom properties, so anything driven
 * by element.animate() reads these mirrors instead. They are kept numerically
 * identical to styles/tokens.css on purpose; that file is the source of truth
 * and this is its JS-visible shadow. Nothing enforces the pair — no validator
 * pass reads both — so the token each constant shadows is named beside it, and
 * a retune of the palette's motion has to come here too. (It did not, once: the
 * design-system port moved --ease-standard and --ease-entrance and left these
 * on the old curves, so a dragged card and the CSS transition under it eased
 * differently.)
 */

export const DURATION = {
  instant: 80,
  fast: 120,
  base: 180,
  slow: 260,
} as const;

export const EASING = {
  standard: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // --ease-standard
  entrance: 'cubic-bezier(0.165, 0.84, 0.44, 1)', // --ease-entrance
  exit: 'cubic-bezier(0.3, 0, 1, 1)', // --ease-exit
  spring: 'cubic-bezier(0.34, 1.36, 0.64, 1)', // --ease-spring
} as const;

/**
 * The CSS block collapses every duration token to 1ms under reduced motion,
 * but WAAPI never sees that. Every element.animate() path must consult this.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Duration to actually use — 0 when the user asked for less motion. */
export function motionDuration(ms: number): number {
  return prefersReducedMotion() ? 0 : ms;
}
