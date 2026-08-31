/**
 * Anchored positioning — the pure core.
 *
 * This is a deliberately small stand-in for floating-ui: the design system may
 * not take npm dependencies, and a popover only needs three of floating-ui's
 * middlewares. They run in this order, which is the order that matters:
 *
 *   flip  — if the preferred side lacks room AND the opposite side has more, swap
 *   shift — slide along the cross axis to stay inside the viewport
 *   size  — report how much room is left, so long menus scroll instead of overflow
 *
 * Everything here is pure geometry in VIEWPORT coordinates. The DOM shell lives
 * in hooks/useAnchoredPosition.ts and always positions with `position: fixed`,
 * which is what makes viewport coordinates the right space to compute in.
 */

export type Side = 'top' | 'bottom' | 'left' | 'right';
export type Alignment = 'start' | 'center' | 'end';
export type Placement =
  | 'bottom-start'
  | 'bottom'
  | 'bottom-end'
  | 'top-start'
  | 'top'
  | 'top-end'
  | 'right-start'
  | 'right'
  | 'right-end'
  | 'left-start'
  | 'left'
  | 'left-end';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface PositionInput {
  /** Anchor box in viewport coordinates (getBoundingClientRect). */
  anchor: Rect;
  /** Measured floating element size. */
  floating: Size;
  /** Viewport size (innerWidth/innerHeight, or visualViewport). */
  viewport: Size;
  placement: Placement;
  /** Gap between anchor and floating element, px. */
  offset?: number;
  /** Minimum gap from the viewport edge, px. */
  padding?: number;
}

export interface PositionResult {
  x: number;
  y: number;
  /** The placement actually used — may differ from the request after a flip. */
  placement: Placement;
  /** Space available on the resolved side, minus padding. Clamp to this. */
  maxHeight: number;
  maxWidth: number;
  /** True when the element had to be pushed to stay on screen. */
  shifted: boolean;
}

export function parsePlacement(placement: Placement): { side: Side; alignment: Alignment } {
  const [side, alignment] = placement.split('-') as [Side, Alignment | undefined];
  return { side, alignment: alignment ?? 'center' };
}

function joinPlacement(side: Side, alignment: Alignment): Placement {
  return (alignment === 'center' ? side : `${side}-${alignment}`) as Placement;
}

const OPPOSITE: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

function clamp(value: number, min: number, max: number): number {
  /* max < min happens when the floating element is wider than the viewport.
   * Preferring `min` keeps the top-left corner visible, which is the more
   * useful half to see. */
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

/** Room between the anchor and each viewport edge, ignoring padding/offset. */
export function availableSpace(anchor: Rect, viewport: Size): Record<Side, number> {
  return {
    top: anchor.y,
    bottom: viewport.height - (anchor.y + anchor.height),
    left: anchor.x,
    right: viewport.width - (anchor.x + anchor.width),
  };
}

function mainAxisSize(side: Side, floating: Size): number {
  return side === 'top' || side === 'bottom' ? floating.height : floating.width;
}

export function resolvePosition(input: PositionInput): PositionResult {
  const { anchor, floating, viewport } = input;
  const offset = input.offset ?? 6;
  const padding = input.padding ?? 8;
  const requested = parsePlacement(input.placement);

  /* ── flip ──────────────────────────────────────────────────────────────
   * Only swap when the opposite side is genuinely roomier. Flipping into an
   * equally cramped side just makes the movement look random. */
  const space = availableSpace(anchor, viewport);
  const needed = mainAxisSize(requested.side, floating) + offset + padding;
  let side = requested.side;
  if (space[side] < needed && space[OPPOSITE[side]] > space[side]) side = OPPOSITE[side];

  const vertical = side === 'top' || side === 'bottom';

  /* ── main axis: sit against the chosen side ───────────────────────── */
  let x: number;
  let y: number;
  if (side === 'bottom') y = anchor.y + anchor.height + offset;
  else if (side === 'top') y = anchor.y - floating.height - offset;
  else y = 0;
  if (side === 'right') x = anchor.x + anchor.width + offset;
  else if (side === 'left') x = anchor.x - floating.width - offset;
  else x = 0;

  /* ── cross axis: align, then shift back inside the viewport ───────── */
  const { alignment } = requested;
  if (vertical) {
    if (alignment === 'start') x = anchor.x;
    else if (alignment === 'end') x = anchor.x + anchor.width - floating.width;
    else x = anchor.x + anchor.width / 2 - floating.width / 2;
  } else {
    if (alignment === 'start') y = anchor.y;
    else if (alignment === 'end') y = anchor.y + anchor.height - floating.height;
    else y = anchor.y + anchor.height / 2 - floating.height / 2;
  }

  const rawX = x;
  const rawY = y;
  x = clamp(x, padding, viewport.width - floating.width - padding);
  y = clamp(y, padding, viewport.height - floating.height - padding);
  const shifted = x !== rawX || y !== rawY;

  /* ── size: what is left on the resolved side ──────────────────────── */
  const maxHeight = vertical ? Math.max(0, space[side] - offset - padding) : Math.max(0, viewport.height - padding * 2);
  const maxWidth = vertical ? Math.max(0, viewport.width - padding * 2) : Math.max(0, space[side] - offset - padding);

  return { x, y, placement: joinPlacement(side, alignment), maxHeight, maxWidth, shifted };
}
