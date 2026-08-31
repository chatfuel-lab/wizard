/**
 * Canvas viewport maths — the pure core of canvas/useViewport.
 *
 * One convention, and everything here follows from it:
 *
 *     screen = world * zoom + pan
 *     world  = (screen - pan) / zoom
 *
 * `pan` is in SCREEN pixels, not world units. That is the choice that makes
 * `zoomAt` a two-line function instead of a fixed-point solve: when the zoom
 * changes, the pan is the only thing that has to move, and it moves by exactly
 * the screen-space error at the anchor.
 *
 * Nothing in this file touches the DOM. The hook owns the wheel and pointer
 * events and the rAF loop; this file owns every decision that can be wrong,
 * which is why it is the part with tests — vitest here is node-only, so a
 * number that lives in a component is a number nothing can check.
 */

import type { Point } from './dragGeometry';
import type { Rect, Size } from './position';

export type { Point, Rect, Size };

/**
 * Pan in screen pixels, zoom as a scalar. A plain object rather than a matrix:
 * the canvas never rotates or skews, and the three numbers are what both the
 * CSS transform and the minimap want to read.
 */
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 2.5;

/**
 * The zoom a wheel notch multiplies by. Multiplicative, not additive: a fixed
 * step of 0.1 is a 100% change at zoom 0.1 and a 4% change at 2.5, so the same
 * gesture feels violent when zoomed out and inert when zoomed in.
 */
export const ZOOM_STEP = 1.1;

export const IDENTITY_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

export function clampZoom(zoom: number): number {
  return Math.min(Math.max(zoom, ZOOM_MIN), ZOOM_MAX);
}

export function worldToScreen(point: Point, viewport: Viewport): Point {
  return {
    x: point.x * viewport.zoom + viewport.x,
    y: point.y * viewport.zoom + viewport.y,
  };
}

export function screenToWorld(point: Point, viewport: Viewport): Point {
  return {
    x: (point.x - viewport.x) / viewport.zoom,
    y: (point.y - viewport.y) / viewport.zoom,
  };
}

/**
 * Zoom while holding one screen point still.
 *
 * This is the whole feel of a wheel zoom: the thing under the cursor must not
 * move. Zoom toward the centre instead and the user chases their target across
 * the screen, which reads as the canvas fighting them.
 *
 * The clamp is applied before the pan is solved, not after — clamping the
 * result would leave the pan compensating for a zoom that never happened, and
 * the canvas would drift a little every time the user kept scrolling at the
 * limit.
 */
export function zoomAt(viewport: Viewport, anchor: Point, zoom: number): Viewport {
  const next = clampZoom(zoom);
  const world = screenToWorld(anchor, viewport);
  return {
    x: anchor.x - world.x * next,
    y: anchor.y - world.y * next,
    zoom: next,
  };
}

/** One wheel notch, or one +/- button press, anchored on a screen point. */
export function zoomBy(viewport: Viewport, anchor: Point, factor: number): Viewport {
  return zoomAt(viewport, anchor, viewport.zoom * factor);
}

/** Pan by a screen-space delta. Zoom-independent by construction. */
export function panBy(viewport: Viewport, dx: number, dy: number): Viewport {
  return { x: viewport.x + dx, y: viewport.y + dy, zoom: viewport.zoom };
}

/** The smallest rect containing all of them, or null for an empty set. */
export function boundsOf(rects: readonly Rect[]): Rect | null {
  if (rects.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const rect of rects) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Screen pixels along each edge of the canvas that chrome covers — a palette
 * island down the left, an inspector over the right. Missing sides are 0.
 */
export interface FitInset {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface FitOptions {
  /** Screen-space breathing room on every side, px. */
  padding?: number;
  /**
   * Cap on the fitted zoom. Fitting a single small node to a large canvas would
   * otherwise magnify it to the zoom limit, which looks like a bug rather than
   * like a fit.
   */
  maxZoom?: number;
  /**
   * The part of the box that is under chrome. The scene is fitted and centred
   * in what is left, so a fit does not put the first block under the tool
   * palette. Different from `padding`, which is even and is breathing room;
   * this is uneven and is furniture.
   */
  inset?: FitInset;
}

/**
 * The viewport that centres `bounds` in a `size` box.
 *
 * An empty scene returns the identity viewport rather than a NaN one: "fit"
 * with nothing to fit is the untransformed canvas, and every alternative here
 * (throwing, returning null, dividing by a zero dimension) pushes a special
 * case into every caller for a case that is entirely ordinary on a new flow.
 */
export function fitToBounds(bounds: Rect | null, size: Size, options?: FitOptions): Viewport {
  const padding = options?.padding ?? 48;
  const maxZoom = options?.maxZoom ?? 1;
  const inset = {
    top: options?.inset?.top ?? 0,
    right: options?.inset?.right ?? 0,
    bottom: options?.inset?.bottom ?? 0,
    left: options?.inset?.left ?? 0,
  };

  if (!bounds || size.width <= 0 || size.height <= 0) return IDENTITY_VIEWPORT;

  /* The box the scene may occupy: the canvas minus the chrome. Floored at 1
     so an inset wider than the canvas — the palette on a phone — degrades to
     a tiny zoom rather than a negative one. */
  const boxWidth = Math.max(size.width - inset.left - inset.right, 1);
  const boxHeight = Math.max(size.height - inset.top - inset.bottom, 1);
  const usableWidth = Math.max(boxWidth - padding * 2, 1);
  const usableHeight = Math.max(boxHeight - padding * 2, 1);

  /* A zero-width bounds is a real case — one node, or a column of nodes all at
     the same x — and the axis it collapses on must not decide the zoom. */
  const zoomX = bounds.width > 0 ? usableWidth / bounds.width : Infinity;
  const zoomY = bounds.height > 0 ? usableHeight / bounds.height : Infinity;
  const fitted = Math.min(zoomX, zoomY);
  const zoom = clampZoom(Math.min(fitted === Infinity ? maxZoom : fitted, maxZoom));

  /* Centred in the uncovered box, not in the canvas: with a 240px palette on
     the left, "the middle" is 120px right of where it would otherwise be. */
  const centre = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  return {
    x: inset.left + boxWidth / 2 - centre.x * zoom,
    y: inset.top + boxHeight / 2 - centre.y * zoom,
    zoom,
  };
}

/**
 * May a mount-time fit commit against these items?
 *
 * Nodes are content-sized: at first paint every rect is 0×0, and each node's
 * ResizeObserver reports on its own, so there is a moment when the FIRST node
 * has a size and the rest are still points. A fit taken then frames a box made
 * of positions, not of blocks — two blocks 440 units apart, each 256 wide once
 * drawn, "fit at 1:1" and the second one hangs off the right edge. So the fit
 * waits for EVERY registered node to have been measured; the wait is a frame,
 * and it is what makes the fit a fit of the scene rather than of its anchors.
 *
 * Nothing registered is not ready either: there is nothing to fit, and the
 * identity viewport the canvas already shows is the right answer for an empty
 * scene (see `fitToBounds`).
 */
export function readyToFit(items: readonly CanvasItem[]): boolean {
  return items.length > 0 && items.every((item) => item.rect.width > 0 && item.rect.height > 0);
}

/**
 * Is this world-space rect inside the visible screen box?
 *
 * The gate for two things at once: whether a node renders at all, and whether
 * its edges' paths are computed. That second one is the reason this exists
 * rather than `content-visibility` — path maths runs in JS whether or not the
 * browser decides to paint the result.
 *
 * `margin` is screen pixels of slack, so a node scrolling into view has already
 * been mounted by the time it crosses the edge.
 */
export function isRectVisible(rect: Rect, viewport: Viewport, size: Size, margin = 200): boolean {
  const topLeft = worldToScreen({ x: rect.x, y: rect.y }, viewport);
  const width = rect.width * viewport.zoom;
  const height = rect.height * viewport.zoom;

  return (
    topLeft.x + width >= -margin &&
    topLeft.y + height >= -margin &&
    topLeft.x <= size.width + margin &&
    topLeft.y <= size.height + margin
  );
}

/** The world-space rect between two world points, in any drag direction. */
export function rectFromPoints(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

export interface CanvasItem {
  id: string;
  rect: Rect;
}

/**
 * Which items a marquee selects.
 *
 * Intersection, not containment. Containment is the stricter reading and it is
 * the wrong one here: a marquee dragged across a row of wide nodes would select
 * none of them unless the user swept past both far edges, and blocks in a flow
 * are wide.
 */
export function marqueeHits(marquee: Rect, items: readonly CanvasItem[]): string[] {
  const hits: string[] = [];
  for (const item of items) {
    const overlapsX = item.rect.x <= marquee.x + marquee.width && item.rect.x + item.rect.width >= marquee.x;
    const overlapsY = item.rect.y <= marquee.y + marquee.height && item.rect.y + item.rect.height >= marquee.y;
    if (overlapsX && overlapsY) hits.push(item.id);
  }
  return hits;
}

/** Nearest grid intersection, in world units. `grid <= 0` disables snapping. */
export function snapToGrid(point: Point, grid: number): Point {
  if (grid <= 0) return point;
  return { x: Math.round(point.x / grid) * grid, y: Math.round(point.y / grid) * grid };
}

export interface AlignmentGuide {
  axis: 'x' | 'y';
  /** World coordinate of the line to draw. */
  position: number;
  /** How far the moving rect must shift to sit on it. */
  delta: number;
}

export interface AlignmentResult {
  /** The moving rect's position after snapping — the value to apply. */
  point: Point;
  /** The lines to draw, at most one per axis. */
  guides: AlignmentGuide[];
}

const EDGES = ['start', 'centre', 'end'] as const;

function edgeValue(start: number, extent: number, edge: (typeof EDGES)[number]): number {
  if (edge === 'start') return start;
  if (edge === 'end') return start + extent;
  return start + extent / 2;
}

/**
 * Snap a dragged rect to its neighbours' edges and centres.
 *
 * Nine candidate pairs per axis (three edges of the moving rect against three
 * of each neighbour) and the closest wins, which is why a node snaps to a
 * neighbour's centre when it is nearly centred on it and to its left edge when
 * it is nearly flush with it, without the caller choosing a mode.
 *
 * `threshold` is world units, so the caller divides a screen-pixel tolerance by
 * the zoom: a guide that grabs from 8 screen pixels away should keep grabbing
 * from 8 screen pixels away when the canvas is zoomed out, not from 80 world
 * units that are now most of the screen.
 */
export function alignmentGuides(moving: Rect, others: readonly Rect[], threshold: number): AlignmentResult {
  const guides: AlignmentGuide[] = [];
  const point = { x: moving.x, y: moving.y };

  for (const axis of ['x', 'y'] as const) {
    const start = axis === 'x' ? moving.x : moving.y;
    const extent = axis === 'x' ? moving.width : moving.height;

    let best: AlignmentGuide | null = null;

    for (const other of others) {
      const otherStart = axis === 'x' ? other.x : other.y;
      const otherExtent = axis === 'x' ? other.width : other.height;

      for (const movingEdge of EDGES) {
        const from = edgeValue(start, extent, movingEdge);
        for (const otherEdge of EDGES) {
          const to = edgeValue(otherStart, otherExtent, otherEdge);
          const delta = to - from;
          if (Math.abs(delta) > threshold) continue;
          if (best && Math.abs(best.delta) <= Math.abs(delta)) continue;
          best = { axis, position: to, delta };
        }
      }
    }

    if (best) {
      guides.push(best);
      if (axis === 'x') point.x += best.delta;
      else point.y += best.delta;
    }
  }

  return { point, guides };
}
