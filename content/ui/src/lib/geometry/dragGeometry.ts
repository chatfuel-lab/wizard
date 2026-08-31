/**
 * Drag-and-drop geometry — the pure core of dnd/useDragSession.
 *
 * Everything here is viewport coordinates and arithmetic. The hook owns the
 * pointer events, the rAF loop and the DOM writes; this file owns every
 * decision that can be wrong, which is why it is the part with tests.
 */

import type { Rect } from './position';

export interface Point {
  x: number;
  y: number;
}

export interface DropTarget {
  id: string;
  rect: Rect;
  disabled?: boolean;
}

export interface AutoScrollOptions {
  /** Distance from an edge at which scrolling starts, px. */
  edge?: number;
  /** Speed at the very edge, px per frame. */
  maxSpeed?: number;
}

export const MOUSE_ACTIVATION_PX = 5;
/** How long a finger rests before a board card LIFTS — the pause that tells a drag from a scroll. */
export const TOUCH_HOLD_MS = 180;
export const TOUCH_TOLERANCE_PX = 8;
/**
 * How long a finger rests on a canvas node before it means "menu".
 *
 * Not `TOUCH_HOLD_MS`, deliberately. That one is a delay you feel as
 * immediacy — it exists to let a finger scroll a list before the card under it
 * lifts, and it is over before a deliberate tap is. A long-press that opened a
 * menu at 180ms would open one on every unhurried tap. The platforms' own
 * long-press is 400–500ms and users have that timing in their hands; this
 * matches it. Movement past `TOUCH_TOLERANCE_PX` before it elapses is a drag,
 * not a hold — the same threshold `dragActivated` uses.
 */
export const LONG_PRESS_MS = 500;

/** Has the pointer moved far enough to mean "drag" rather than "click"? */
export function activationExceeded(start: Point, current: Point, threshold: number): boolean {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  return dx * dx + dy * dy >= threshold * threshold;
}

function contains(rect: Rect, point: Point): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}

/**
 * The target under the pointer.
 *
 * When several contain the point the SMALLEST wins, so a nested target beats
 * the container it sits in. Equal areas go to the later entry, which is the one
 * registered last and therefore painted on top.
 */
export function hitTest(point: Point, targets: readonly DropTarget[]): string | null {
  let best: DropTarget | null = null;
  let bestArea = Infinity;

  for (const target of targets) {
    if (target.disabled) continue;
    if (!contains(target.rect, point)) continue;
    const area = target.rect.width * target.rect.height;
    if (area <= bestArea) {
      best = target;
      bestArea = area;
    }
  }
  return best?.id ?? null;
}

function distanceToRect(point: Point, rect: Rect): number {
  const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.width));
  const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.height));
  return Math.hypot(dx, dy);
}

/**
 * Nearest target within `maxDistance`, for a pointer that is not over anything.
 *
 * Board columns have gutters between them, and releasing a card in a gutter
 * should mean the column you were clearly aiming at — not "cancelled".
 */
export function nearestTarget(point: Point, targets: readonly DropTarget[], maxDistance: number): string | null {
  let best: string | null = null;
  let bestDistance = maxDistance;

  for (const target of targets) {
    if (target.disabled) continue;
    const distance = distanceToRect(point, target.rect);
    if (distance < bestDistance) {
      best = target.id;
      bestDistance = distance;
    }
  }
  return best;
}

/** hitTest, falling back to nearestTarget. What the hook actually calls. */
export function resolveTarget(point: Point, targets: readonly DropTarget[], maxDistance = 48): string | null {
  return hitTest(point, targets) ?? nearestTarget(point, targets, maxDistance);
}

function ramp(distance: number, edge: number): number {
  /* Quadratic, not linear: entering the zone nudges, the last few pixels race.
   * A linear ramp feels like the board lurches the moment you cross the line. */
  const t = Math.min(Math.max((edge - distance) / edge, 0), 1);
  return t * t;
}

/**
 * Per-frame scroll delta for a container the pointer is dragging near the edge of.
 *
 * Each axis is gated on the pointer being within the container's OTHER axis
 * (plus the edge band). Without that, dragging over a neighbouring column would
 * still scroll this one, because "20px left of the container" reads as
 * "hard against the left edge".
 */
export function autoScrollVelocity(pointer: Point, rect: Rect, options?: AutoScrollOptions): Point {
  const edge = options?.edge ?? 60;
  const maxSpeed = options?.maxSpeed ?? 24;

  const inVerticalBand = pointer.y >= rect.y - edge && pointer.y <= rect.y + rect.height + edge;
  const inHorizontalBand = pointer.x >= rect.x - edge && pointer.x <= rect.x + rect.width + edge;

  let x = 0;
  let y = 0;

  if (inVerticalBand) {
    const fromLeft = pointer.x - rect.x;
    const fromRight = rect.x + rect.width - pointer.x;
    if (fromLeft < edge) x = -maxSpeed * ramp(fromLeft, edge);
    else if (fromRight < edge) x = maxSpeed * ramp(fromRight, edge);
  }

  if (inHorizontalBand) {
    const fromTop = pointer.y - rect.y;
    const fromBottom = rect.y + rect.height - pointer.y;
    if (fromTop < edge) y = -maxSpeed * ramp(fromTop, edge);
    else if (fromBottom < edge) y = maxSpeed * ramp(fromBottom, edge);
  }

  return { x, y };
}

/**
 * Where the drag layer's top-left goes for a given pointer position.
 *
 * `grab` is the offset from the source element's top-left to the pointer at
 * the moment the drag started — keeping it means the card stays under the exact
 * spot it was picked up by, instead of snapping its corner to the cursor.
 */
export function layerOrigin(pointer: Point, grab: Point): Point {
  return { x: pointer.x - grab.x, y: pointer.y - grab.y };
}
