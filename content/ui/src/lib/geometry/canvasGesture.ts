/**
 * Which gesture the canvas BACKGROUND owns, decided from pointer counts.
 *
 * A press on empty canvas means one of two things: draw a marquee, or move the
 * scene. The tool decides for a single pointer — the Select tool marquees, the
 * Pan tool pans, and a middle button or a held Space pans in any tool. What no
 * tool gets to decide is a second finger. Two fingers on a canvas is a pinch,
 * everywhere, and a canvas that answers a pinch with two marquees — which is
 * what a per-pointer marquee session does, since each pointer down looks like
 * its own press — is a canvas that cannot be zoomed on a phone at all in the
 * Select tool. The flow builder papered over that by forcing the Pan tool on
 * every coarse pointer, which took the marquee away from a tablet with a
 * stylus to keep the pinch. The primitive should pinch regardless.
 *
 * So the rule is a state machine over pointer arrivals and departures, and the
 * component consults it on every background press: a second pointer while a
 * marquee is in progress CANCELS the marquee — nothing is selected, the box
 * simply goes — and hands both pointers to the viewport, which already knows
 * how to turn two pointers into a pinch and one into a pan. Once the viewport
 * owns the gesture, every further pointer joins it and no marquee starts until
 * the last finger lifts.
 *
 * A press on a NODE consults the same table before it becomes a drag. Nodes
 * do not stop propagation, but the canvas's own handler ignores anything that
 * did not land on the background — so without this a second finger on a card
 * during a marquee kept the marquee, started that card's drag, and never
 * became the pinch it was meant as. `nodePointerDown` says whether the canvas
 * CLAIMS the pointer: while a marquee or a viewport gesture is in progress it
 * does, and the pointer joins the viewport exactly as a background press
 * would; when the background is idle it does not, and the node drags.
 *
 * Pure so the transitions are a table a test can walk. `Canvas` owns the
 * pointer events; this file owns the decision.
 */

export type BackgroundGesture =
  { kind: 'idle' } | { kind: 'marquee'; pointerId: number } | { kind: 'viewport'; pointerIds: readonly number[] };

export interface BackgroundPress {
  pointerId: number;
  /** The press asked to pan on its own: middle button, Space held, or the Pan tool. */
  pan: boolean;
}

export interface BackgroundStep {
  gesture: BackgroundGesture;
  /** This press starts a marquee for its pointer. */
  startMarquee: boolean;
  /** A marquee in progress ends here, selecting nothing. */
  cancelMarquee: boolean;
  /**
   * Pointers the viewport takes over on this press — the new one, and, on a
   * cancelled marquee, the one that was drawing it. The component gives the
   * viewport each pointer's CURRENT position, not where it went down: a finger
   * that has already dragged a marquee twenty pixels must not make the scene
   * jump twenty pixels the moment the pinch begins.
   */
  handToViewport: readonly number[];
}

export const IDLE_GESTURE: BackgroundGesture = { kind: 'idle' };

export function backgroundPointerDown(gesture: BackgroundGesture, press: BackgroundPress): BackgroundStep {
  switch (gesture.kind) {
    case 'idle':
      if (press.pan) {
        return {
          gesture: { kind: 'viewport', pointerIds: [press.pointerId] },
          startMarquee: false,
          cancelMarquee: false,
          handToViewport: [press.pointerId],
        };
      }
      return {
        gesture: { kind: 'marquee', pointerId: press.pointerId },
        startMarquee: true,
        cancelMarquee: false,
        handToViewport: [],
      };

    case 'marquee':
      /* The same pointer pressing again is a browser hiccup, not a second
         finger; keep the marquee rather than promoting one pointer to a pinch. */
      if (press.pointerId === gesture.pointerId) {
        return { gesture, startMarquee: false, cancelMarquee: false, handToViewport: [] };
      }
      return {
        gesture: { kind: 'viewport', pointerIds: [gesture.pointerId, press.pointerId] },
        startMarquee: false,
        cancelMarquee: true,
        handToViewport: [gesture.pointerId, press.pointerId],
      };

    case 'viewport':
      if (gesture.pointerIds.includes(press.pointerId)) {
        return { gesture, startMarquee: false, cancelMarquee: false, handToViewport: [] };
      }
      return {
        gesture: { kind: 'viewport', pointerIds: [...gesture.pointerIds, press.pointerId] },
        startMarquee: false,
        cancelMarquee: false,
        handToViewport: [press.pointerId],
      };
  }
}

export interface NodeStep {
  gesture: BackgroundGesture;
  /**
   * The canvas takes this pointer: the node must neither start a drag with it
   * nor report its lift as a click. False only when the background is idle.
   */
  claimed: boolean;
  /** A marquee in progress ends here, selecting nothing. */
  cancelMarquee: boolean;
  /** As on `BackgroundStep`: pointers the viewport takes over on this press. */
  handToViewport: readonly number[];
}

/**
 * A pointer landed on a node.
 *
 * With the background idle the press is the node's — a drag, a click, a hold —
 * and the gesture does not change. With a marquee or a viewport gesture in
 * progress the press is a further finger on the canvas, whatever it happened
 * to land on, and it takes the SAME transition a background press would: the
 * marquee is cancelled, both pointers go to the viewport, a later finger joins.
 * One table for both, so the two roads cannot drift apart.
 */
export function nodePointerDown(gesture: BackgroundGesture, pointerId: number): NodeStep {
  if (gesture.kind === 'idle') {
    return { gesture, claimed: false, cancelMarquee: false, handToViewport: [] };
  }
  /* `pan` only matters from idle, and idle is handled above. */
  const step = backgroundPointerDown(gesture, { pointerId, pan: false });
  return {
    gesture: step.gesture,
    claimed: true,
    cancelMarquee: step.cancelMarquee,
    handToViewport: step.handToViewport,
  };
}

/**
 * A pointer lifted, or was cancelled. The viewport gesture survives its
 * pointers leaving one at a time — a pinch that loses a finger becomes a pan,
 * which `useViewport` already handles — and only the last one leaving makes
 * the background idle again, so a marquee cannot start under a finger that is
 * still down.
 */
export function backgroundPointerUp(gesture: BackgroundGesture, pointerId: number): BackgroundGesture {
  switch (gesture.kind) {
    case 'idle':
      return gesture;
    case 'marquee':
      return gesture.pointerId === pointerId ? IDLE_GESTURE : gesture;
    case 'viewport': {
      if (!gesture.pointerIds.includes(pointerId)) return gesture;
      const remaining = gesture.pointerIds.filter((id) => id !== pointerId);
      return remaining.length === 0 ? IDLE_GESTURE : { kind: 'viewport', pointerIds: remaining };
    }
  }
}
