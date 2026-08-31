import { activationExceeded, MOUSE_ACTIVATION_PX, TOUCH_TOLERANCE_PX, type Point } from './dragGeometry';
import { alignmentGuides, snapToGrid, type AlignmentGuide, type Rect } from './viewport';

/**
 * The decisions a node drag makes, with no DOM and no React in sight.
 *
 * ## Why this exists as its own file
 *
 * It used to live inside `CanvasNode`, and hiding it there cost a real bug: the
 * committed position was reconstructed at pointer-up by reading the store —
 *
 *     const offset = store.getOffset(id);
 *     const final = { x: origin.x + offset.dx, y: origin.y + offset.dy };
 *
 * — and the store is written by a rAF-throttled callback. If the last frame did
 * not run, the offset is one frame stale; if NO frame ran, the offset is zero
 * and `final` is **exactly where the drag started**. The node then commits its
 * own origin, the server dutifully stores it, and a refetch shows the block
 * back where it was. Which is what happened.
 *
 * The session knows the answer the whole time. Nothing should have to ask a
 * throttle whether it got round to running.
 *
 * So: every decision is here, `endDrag` reads the session and not a store, and
 * the whole sequence — press, move, release — is something a node-only vitest
 * can drive. That last part is the point. `rafThrottle` was given an injectable
 * scheduler precisely so it could be tested, and then the thing worth testing
 * was put somewhere no test could reach.
 *
 * ## The session is mutable, deliberately
 *
 * It lives in a ref and is written once per pointer move. Returning a fresh
 * object per move would allocate a thousand a second on a modern mouse, for a
 * value nothing ever compares by identity.
 */

export interface CanvasDragSession {
  pointerId: number;
  /** Where the pointer went down, in client px — the activation threshold's input. */
  startClient: Point;
  /** The same point in world units. Every target is measured from here. */
  startWorld: Point;
  /** The node's top-left when the drag began. The rollback point, and the anchor. */
  origin: Point;
  /** False until the pointer has travelled far enough to be a drag and not a click. */
  moved: boolean;
  /** True once a long-press fired for this press. The lift that follows is not a click. */
  held: boolean;
  /**
   * The last target this session computed — snapped, guide-adjusted, final.
   *
   * THE value `endDrag` commits. It starts at the origin so that a session which
   * never moved commits nothing rather than something arbitrary.
   */
  target: Point;
}

export interface CanvasDragOptions {
  /** World-unit grid. 0 is free movement. */
  snapGrid?: number;
  /** The rects to align against. `null` turns alignment off entirely. */
  neighbours?: readonly Rect[] | null;
  /** The dragged node's own size, needed to align its centre and far edge. */
  size?: { width: number; height: number };
  /** Guide grab distance in WORLD units — the caller divides screen px by zoom. */
  tolerance?: number;
}

export interface CanvasDragStep {
  /** The node's new top-left, world units. */
  target: Point;
  /** Displacement from the origin — what a live transform is written from. */
  delta: { dx: number; dy: number };
  /** Lines to draw. Empty when alignment is off or nothing lined up. */
  guides: readonly AlignmentGuide[];
}

export function beginDrag(args: {
  pointerId: number;
  startClient: Point;
  startWorld: Point;
  origin: Point;
}): CanvasDragSession {
  return {
    pointerId: args.pointerId,
    startClient: args.startClient,
    startWorld: args.startWorld,
    origin: args.origin,
    moved: false,
    held: false,
    target: { x: args.origin.x, y: args.origin.y },
  };
}

/**
 * Does this press arm a long-press timer at all? Never for a mouse: a mouse
 * has a right button, and `onContextMenu` is that road. Touch and pen have no
 * second button, and the browser's own long-press `contextmenu` is unreliable
 * — Chrome on Android fires it, Safari on iOS does not — so for them the
 * canvas times the hold itself.
 */
export function holdArms(pointerType: string): boolean {
  return pointerType !== 'mouse';
}

/**
 * The hold timer elapsed. Does it fire?
 *
 * A session that has become a drag is not a long-press — the finger moved,
 * the node moved with it, and a menu opening under a node in flight would be
 * absurd. One that already fired does not fire twice. Marks the session so
 * the release knows.
 */
export function fireHold(session: CanvasDragSession): boolean {
  if (session.moved || session.held) return false;
  session.held = true;
  return true;
}

export type PressRelease = 'click' | 'drag' | 'longPress';

/**
 * The pointer lifted: what was that? Exactly one of three, so a hold that
 * fired is neither a click on the node (which would open the inspector over
 * the menu the hold just opened) nor a drag (nothing moved).
 */
export function pressRelease(session: CanvasDragSession): PressRelease {
  if (session.moved) return 'drag';
  if (session.held) return 'longPress';
  return 'click';
}

/**
 * Has the pointer travelled far enough that this is a drag?
 *
 * Touch gets a wider tolerance than a mouse for the reason it always does: a
 * finger held still still moves several pixels, so a mouse threshold would turn
 * every tap into a drag.
 */
export function dragActivated(session: CanvasDragSession, client: Point, pointerType: string): boolean {
  const threshold = pointerType === 'mouse' ? MOUSE_ACTIVATION_PX : TOUCH_TOLERANCE_PX;
  return activationExceeded(session.startClient, client, threshold);
}

/**
 * The pointer moved to `world`. Returns where the node goes and writes it into
 * the session.
 *
 * Order matters and is not arbitrary: snap first, then align. The grid is a
 * hard constraint the user chose; alignment is a hint. Aligning first and then
 * snapping would pull the node off the guide it had just been placed on, so
 * the guide would draw somewhere the node is not.
 */
export function dragTo(session: CanvasDragSession, world: Point, options: CanvasDragOptions = {}): CanvasDragStep {
  const { snapGrid = 0, neighbours = null, size, tolerance = 0 } = options;

  let target: Point = {
    x: session.origin.x + (world.x - session.startWorld.x),
    y: session.origin.y + (world.y - session.startWorld.y),
  };
  if (snapGrid > 0) target = snapToGrid(target, snapGrid);

  let guides: readonly AlignmentGuide[] = [];
  if (neighbours && neighbours.length > 0 && size && size.width > 0) {
    const moving: Rect = { x: target.x, y: target.y, width: size.width, height: size.height };
    const result = alignmentGuides(moving, neighbours, tolerance);
    target = result.point;
    guides = result.guides;
  }

  session.target = target;
  return {
    target,
    delta: { dx: target.x - session.origin.x, dy: target.y - session.origin.y },
    guides,
  };
}

/**
 * The drag finished. Where does the node land?
 *
 * `null` means "commit nothing": the pointer never travelled far enough, so
 * this was a click and the node has not moved. A caller that treated null as a
 * position would write the origin back over whatever else had happened.
 *
 * Read from the SESSION. Not from a store, not from a transform, not from
 * anything a dropped animation frame could have left stale — which is the
 * entire reason this function exists rather than being three lines at a call
 * site.
 */
export function endDrag(session: CanvasDragSession): Point | null {
  return session.moved ? session.target : null;
}

/**
 * The rects a dragged node may align to, out of everything the canvas knows.
 *
 * Three exclusions, and the third is the one that had to be added. The node
 * itself, obviously. Anything unmeasured, because a zero-width rect has edges
 * at its origin and would offer a guide to a point in space. And whatever the
 * caller says is moving WITH the dragged node — a group drag's other members
 * travel in lockstep, so a member sharing an edge with the dragged node is
 * always aligned to it, and a guide that is always true is a line that never
 * goes away. `CanvasNode` cannot know what the group is; `guideAgainst` is how
 * the consumer tells it.
 */
export function guideNeighbours(
  nodes: readonly { id: string; rect: Rect }[],
  draggedId: string,
  guideAgainst?: (id: string) => boolean,
): Rect[] {
  const rects: Rect[] = [];
  for (const node of nodes) {
    if (node.id === draggedId) continue;
    if (node.rect.width <= 0) continue;
    if (guideAgainst && !guideAgainst(node.id)) continue;
    rects.push(node.rect);
  }
  return rects;
}
