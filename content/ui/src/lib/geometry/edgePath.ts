/**
 * Edge routing — the pure core of canvas/CanvasEdges.
 *
 * The shape is decided once, as a polyline, and everything else reads it: the
 * SVG `d` rounds its corners, the arrow head takes the angle of its last
 * segment, the label sits at its midpoint by arc length, and hit testing
 * measures against its segments.
 *
 * That single source is the point. An SVG path string is write-only — to hit
 * test against a rendered `d` you would either re-parse it or ask the browser
 * via `getPointAtLength`, and the browser is not available to a node-only
 * vitest. A polyline is a list of numbers, so every one of those questions is
 * arithmetic with a test.
 */

import type { Point } from './dragGeometry';

/* The same four sides `position.ts` already names for anchoring a popover.
   Reused rather than redeclared: a handle on a node's right and a tooltip on a
   trigger's right mean the same thing, and two identical unions under one name
   is how they quietly stop meaning the same thing. */
import type { Side } from './position';

export type { Side };

export interface EdgeOptions {
  /** Which side the edge leaves the source from. */
  sourceSide?: Side;
  /** Which side it enters the target on. */
  targetSide?: Side;
  /**
   * How far it runs straight out of a handle before it is allowed to turn.
   * Without it an edge leaving a node's right side immediately turns back
   * across the node it just left.
   */
  offset?: number;
  /** Corner radius for the rendered path, world units. */
  radius?: number;
}

const NORMAL: Record<Side, Point> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
};

function step(point: Point, side: Side, distance: number): Point {
  const normal = NORMAL[side];
  return { x: point.x + normal.x * distance, y: point.y + normal.y * distance };
}

function isHorizontal(side: Side): boolean {
  return side === 'left' || side === 'right';
}

/** Drop the middle of any three consecutive collinear points. */
function simplify(points: readonly Point[]): Point[] {
  const out: Point[] = [];
  for (const point of points) {
    const last = out[out.length - 1];
    if (last && last.x === point.x && last.y === point.y) continue;
    out.push({ x: point.x, y: point.y });
  }
  for (let i = out.length - 2; i >= 1; i -= 1) {
    const previous = out[i - 1];
    const current = out[i];
    const next = out[i + 1];
    const collinear =
      (previous.x === current.x && current.x === next.x) || (previous.y === current.y && current.y === next.y);
    if (collinear) out.splice(i, 1);
  }
  return out;
}

/**
 * The orthogonal route from one handle to another.
 *
 * Two shapes, chosen by whether the target is far enough along the source's own
 * axis to be reached by going forward:
 *
 * - **Forward** — out, across at the midpoint, in. Three segments, the shape
 *   every left-to-right flow chart draws.
 * - **Backward** — out, along to a detour line, back past the source, in. Five
 *   segments. This is the case that a naive midpoint route gets wrong: the
 *   "midpoint" is behind the source, so the edge doubles back through both
 *   nodes and reads as a straight line with a kink.
 *
 * Both are computed from the offset points rather than the handles themselves,
 * so the first and last segment always leave perpendicular to the node.
 */
export function edgePolyline(source: Point, target: Point, options?: EdgeOptions): Point[] {
  const sourceSide = options?.sourceSide ?? 'right';
  const targetSide = options?.targetSide ?? 'left';
  const offset = options?.offset ?? 24;

  const from = step(source, sourceSide, offset);
  const to = step(target, targetSide, offset);

  const horizontal = isHorizontal(sourceSide);

  /* "Forward" means: the exit point has already passed the entry point in the
     direction the source handle faces. Everything else is the detour. */
  const forward = horizontal
    ? (to.x - from.x) * NORMAL[sourceSide].x >= 0
    : (to.y - from.y) * NORMAL[sourceSide].y >= 0;

  if (forward && isHorizontal(targetSide) === horizontal) {
    const mid = horizontal ? (from.x + to.x) / 2 : (from.y + to.y) / 2;
    const points = horizontal
      ? [source, from, { x: mid, y: from.y }, { x: mid, y: to.y }, to, target]
      : [source, from, { x: from.x, y: mid }, { x: to.x, y: mid }, to, target];
    return simplify(points);
  }

  /* The detour line runs along the axis the handles do NOT face. Halfway
     between the two offset points when there is room for it to be halfway —
     but when the two are level, halfway is level too, and the route collapses
     into a straight line drawn through both nodes. That is the exact failure
     the detour exists to prevent, so below a separation of two offsets the
     line steps clear of the lower of the two instead. */
  const separation = horizontal ? to.y - from.y : to.x - from.x;
  const detour =
    Math.abs(separation) >= offset * 2
      ? horizontal
        ? (from.y + to.y) / 2
        : (from.x + to.x) / 2
      : (horizontal ? Math.max(from.y, to.y) : Math.max(from.x, to.x)) + offset;
  const points = horizontal
    ? [source, from, { x: from.x, y: detour }, { x: to.x, y: detour }, to, target]
    : [source, from, { x: detour, y: from.y }, { x: detour, y: to.y }, to, target];
  return simplify(points);
}

/**
 * The polyline as an SVG path with rounded corners.
 *
 * Each corner is a quadratic curve whose control point is the corner itself,
 * pulled back along both legs by the radius. Quadratic rather than an arc: the
 * control point IS the corner, so the rounding needs no centre, no sweep flag
 * and no special case when the two legs are unequal — and it is clamped to half
 * the shorter leg, which is what stops a short segment between two corners from
 * turning into a loop.
 */
export function roundedPath(points: readonly Point[], radius = 8): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  let d = `M ${points[0].x},${points[0].y}`;

  for (let i = 1; i < points.length - 1; i += 1) {
    const previous = points[i - 1];
    const corner = points[i];
    const next = points[i + 1];

    const inLength = Math.hypot(corner.x - previous.x, corner.y - previous.y);
    const outLength = Math.hypot(next.x - corner.x, next.y - corner.y);
    const r = Math.min(radius, inLength / 2, outLength / 2);

    if (r <= 0) {
      d += ` L ${corner.x},${corner.y}`;
      continue;
    }

    const inUnit = { x: (corner.x - previous.x) / inLength, y: (corner.y - previous.y) / inLength };
    const outUnit = { x: (next.x - corner.x) / outLength, y: (next.y - corner.y) / outLength };

    d += ` L ${corner.x - inUnit.x * r},${corner.y - inUnit.y * r}`;
    d += ` Q ${corner.x},${corner.y} ${corner.x + outUnit.x * r},${corner.y + outUnit.y * r}`;
  }

  const last = points[points.length - 1];
  return `${d} L ${last.x},${last.y}`;
}

/** The route from one handle to the other, ready for a `<path d>`. */
export function smoothStepPath(source: Point, target: Point, options?: EdgeOptions): string {
  return roundedPath(edgePolyline(source, target, options), options?.radius ?? 8);
}

/**
 * The direction of the final segment, in degrees clockwise from east.
 *
 * Degrees, not radians, because the only consumer is an SVG `rotate()` and
 * converting at the call site would put the same `* 180 / Math.PI` in every
 * arrow head. Zero-length routes answer 0 rather than NaN.
 */
export function arrowHeadAngle(points: readonly Point[]): number {
  if (points.length < 2) return 0;
  const end = points[points.length - 1];
  const before = points[points.length - 2];
  const dx = end.x - before.x;
  const dy = end.y - before.y;
  if (dx === 0 && dy === 0) return 0;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/** Total length of the polyline. */
export function pathLength(points: readonly Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}

/**
 * The point halfway along the route BY ARC LENGTH, where a label goes.
 *
 * Not the middle vertex, and not the midpoint of the straight line between the
 * ends: on a backward edge the first is wherever the detour happens to bend and
 * the second lands inside one of the two nodes.
 */
export function pathMidpoint(points: readonly Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return { x: points[0].x, y: points[0].y };

  const half = pathLength(points) / 2;
  let travelled = 0;

  for (let i = 1; i < points.length; i += 1) {
    const from = points[i - 1];
    const to = points[i];
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    if (travelled + length >= half) {
      const t = length === 0 ? 0 : (half - travelled) / length;
      return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
    }
    travelled += length;
  }

  const last = points[points.length - 1];
  return { x: last.x, y: last.y };
}

function distanceToSegment(point: Point, from: Point, to: Point): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - from.x, point.y - from.y);

  const t = Math.min(Math.max(((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared, 0), 1);
  return Math.hypot(point.x - (from.x + dx * t), point.y - (from.y + dy * t));
}

/**
 * Distance from a world point to the route — the edge hit test.
 *
 * Measured against the polyline, not the rounded path: the corners are the only
 * place the two disagree and they disagree by less than the radius, which is
 * smaller than any tolerance a pointer would use. Clicking a 2px line needs a
 * tolerance of about 10 world units, and nobody can tell which side of a corner
 * they were 8 units away from.
 */
export function distanceToPath(point: Point, points: readonly Point[]): number {
  if (points.length === 0) return Infinity;
  if (points.length === 1) return Math.hypot(point.x - points[0].x, point.y - points[0].y);

  let best = Infinity;
  for (let i = 1; i < points.length; i += 1) {
    best = Math.min(best, distanceToSegment(point, points[i - 1], points[i]));
  }
  return best;
}
