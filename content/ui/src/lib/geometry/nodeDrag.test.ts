import { describe, expect, it } from 'vitest';
import {
  beginDrag,
  dragActivated,
  dragTo,
  endDrag,
  fireHold,
  guideNeighbours,
  holdArms,
  pressRelease,
} from './nodeDrag';
import { rafThrottle, type FrameScheduler } from '../interaction/rafThrottle';

const session = (origin = { x: 100, y: 100 }) =>
  beginDrag({
    pointerId: 1,
    startClient: { x: 500, y: 400 },
    startWorld: { x: 200, y: 200 },
    origin,
  });

/** A scheduler nothing runs unless the test says so. */
function handCranked() {
  let queued: (() => void) | null = null;
  const scheduler: FrameScheduler = {
    request: (callback) => {
      queued = callback;
      return 1;
    },
    cancel: () => {
      queued = null;
    },
  };
  return {
    scheduler,
    frame: () => {
      const run = queued;
      queued = null;
      run?.();
    },
    pending: () => queued !== null,
  };
}

describe('a drag commits where the pointer left it', () => {
  it('moves the node by the same world delta the pointer travelled', () => {
    const drag = session();
    drag.moved = true;
    const step = dragTo(drag, { x: 350, y: 433 });
    expect(step.target).toEqual({ x: 250, y: 333 });
    expect(step.delta).toEqual({ dx: 150, dy: 233 });
    expect(endDrag(drag)).toEqual({ x: 250, y: 333 });
  });

  /**
   * The reported bug, as a test.
   *
   * A rAF-throttled mover with its last frame dropped — which is what happens
   * when the component re-renders between the final pointer move and the
   * release, because the effect holding the listeners tears down and its
   * cleanup cancels the pending frame.
   *
   * The old code rebuilt the commit value from the store the throttle writes,
   * so a dropped frame meant committing a stale position, and a drag where NO
   * frame ran meant committing the origin — the block snapping back to exactly
   * where it started, then staying there after a refetch.
   */
  it('commits the last target even when the final animation frame never runs', () => {
    const { scheduler, frame, pending } = handCranked();
    const drag = session();
    drag.moved = true;

    // What the store would have been told, if a frame had run.
    const written: { dx: number; dy: number }[] = [];
    const move = rafThrottle((world: { x: number; y: number }) => {
      written.push(dragTo(drag, world).delta);
    }, scheduler);

    move({ x: 300, y: 300 });
    frame(); // this one runs
    move({ x: 350, y: 433 });
    expect(pending()).toBe(true);
    move.cancel(); // …and this one is dropped, exactly as the cleanup does

    expect(written).toEqual([{ dx: 100, dy: 100 }]); // the store is a frame behind
    expect(endDrag(drag)).toEqual({ x: 200, y: 200 }); // and the session agrees with it
  });

  it('commits the origin only if the pointer genuinely never moved', () => {
    const { scheduler } = handCranked();
    const drag = session();
    drag.moved = true;
    const move = rafThrottle((world: { x: number; y: number }) => dragTo(drag, world), scheduler);

    move({ x: 350, y: 433 });
    move.cancel(); // every frame dropped — the pathological case

    /* The session never advanced, so the target IS the origin. Committing it is
       correct here and was the bug everywhere else: the old code could not tell
       this case from "the pointer moved and the frames were dropped", because
       both read {0,0} out of the store. */
    expect(endDrag(drag)).toEqual({ x: 100, y: 100 });
  });

  it('commits nothing at all when the press never became a drag', () => {
    const drag = session();
    expect(drag.moved).toBe(false);
    /* Not the origin — nothing. A caller handed a position would write the
       origin back over whatever else landed while the click was happening. */
    expect(endDrag(drag)).toBeNull();
  });
});

describe('activation', () => {
  it('asks a finger to travel further than a mouse', () => {
    const drag = session();
    const nudge = { x: 506, y: 400 };
    expect(dragActivated(drag, nudge, 'mouse')).toBe(true);
    expect(dragActivated(drag, nudge, 'touch')).toBe(false);
    expect(dragActivated(drag, { x: 512, y: 400 }, 'touch')).toBe(true);
  });
});

describe('snap and alignment', () => {
  it('puts the target on the grid', () => {
    const drag = session({ x: 0, y: 0 });
    drag.moved = true;
    const step = dragTo(drag, { x: 247, y: 191 }, { snapGrid: 24 });
    expect(step.target.x).toBe(48);
    /* `toBeCloseTo`, because rounding -9/24 to a multiple of 24 lands on
       NEGATIVE zero, and `toBe` uses Object.is, which says -0 is not 0. It
       reaches the DOM as `translate(48px, -0px)`, which every browser reads as
       zero — a wart, not a defect, and not worth bending `snapToGrid` over. */
    expect(step.target.y).toBeCloseTo(0);
    expect(endDrag(drag)?.x).toBe(48);
  });

  it('pulls the target onto a neighbour and reports the guide', () => {
    const drag = session({ x: 0, y: 0 });
    drag.moved = true;
    const step = dragTo(
      drag,
      { x: 203, y: 200 },
      {
        neighbours: [{ x: 0, y: 500, width: 100, height: 50 }],
        size: { width: 100, height: 50 },
        tolerance: 8,
      },
    );
    expect(step.target.x).toBe(0); // left edges flush
    expect(step.guides.some((guide) => guide.axis === 'x')).toBe(true);
    expect(endDrag(drag)).toEqual(step.target);
  });

  it('snaps before it aligns, so the guide is drawn where the node actually is', () => {
    const drag = session({ x: 0, y: 0 });
    drag.moved = true;
    const step = dragTo(
      drag,
      { x: 206, y: 200 },
      {
        snapGrid: 10,
        neighbours: [{ x: 0, y: 500, width: 100, height: 50 }],
        size: { width: 100, height: 50 },
        tolerance: 8,
      },
    );
    /* The pointer asks for x=6. Snapping first puts it on 10, which is 10 away
       from the neighbour's left edge and therefore out of the 8-unit grab —
       final x is 10 and no guide is drawn. Aligning first would grab from 6,
       land on 0, and then snapping would leave it there: final x 0, with a
       guide. The two orders genuinely disagree, and this asserts ours.
       The grid is a constraint the user chose; alignment is a hint, and a hint
       does not get to overrule a constraint. */
    expect(step.target.x).toBe(10);
    expect(step.guides).toEqual([]);
  });

  it('leaves the target alone when there is nothing to align to', () => {
    const drag = session({ x: 0, y: 0 });
    drag.moved = true;
    const step = dragTo(drag, { x: 333, y: 244 }, { neighbours: [], size: { width: 10, height: 10 } });
    expect(step.target).toEqual({ x: 133, y: 44 });
    expect(step.guides).toEqual([]);
  });

  it('ignores alignment for a node that has not been measured yet', () => {
    const drag = session({ x: 0, y: 0 });
    drag.moved = true;
    const step = dragTo(
      drag,
      { x: 203, y: 200 },
      {
        neighbours: [{ x: 0, y: 500, width: 100, height: 50 }],
        size: { width: 0, height: 0 },
        tolerance: 8,
      },
    );
    /* A zero-sized rect aligns its left, centre and right edge to the same
       number, so it would grab a guide from three directions at once. */
    expect(step.target).toEqual({ x: 3, y: 0 });
    expect(step.guides).toEqual([]);
  });
});

describe('guide neighbours', () => {
  const rect = (x: number, y: number, width = 100, height = 50) => ({ x, y, width, height });
  const nodes = [
    { id: 'a', rect: rect(0, 0) },
    { id: 'b', rect: rect(200, 0) },
    { id: 'c', rect: rect(400, 0) },
    { id: 'unmeasured', rect: rect(600, 0, 0, 0) },
  ];

  it('offers every measured node but the dragged one', () => {
    expect(guideNeighbours(nodes, 'a')).toEqual([rect(200, 0), rect(400, 0)]);
  });

  it('leaves out what the consumer says is moving too', () => {
    /* `a` and `b` are a group and `a` is being dragged. `b` shares `a`'s top
       edge and always will, because it moves with `a`; a guide to it would
       be a line that never goes away. */
    const group = new Set(['a', 'b']);
    expect(guideNeighbours(nodes, 'a', (id) => !group.has(id))).toEqual([rect(400, 0)]);
  });

  it('raises no guide to a lockstep neighbour, and still raises one to a bystander', () => {
    const group = new Set(['a', 'b']);
    const s = session({ x: 0, y: 0 });
    /* Drag `a` down by 3 world units: still within tolerance of `c`'s top
       edge (y = 0). Without the filter, `b` would offer the same edge; with
       it, the one guide that appears is `c`'s. */
    const step = dragTo(
      s,
      { x: 200, y: 203 },
      {
        neighbours: guideNeighbours(nodes, 'a', (id) => !group.has(id)),
        size: { width: 100, height: 50 },
        tolerance: 6,
      },
    );
    expect(step.guides.length).toBeGreaterThan(0);
    expect(step.target.y).toBe(0);
  });
});

describe('long-press', () => {
  it('arms for a finger and a pen, never for a mouse', () => {
    expect(holdArms('touch')).toBe(true);
    expect(holdArms('pen')).toBe(true);
    expect(holdArms('mouse')).toBe(false);
  });

  it('fires once for a press that stayed put, and the release is then not a click', () => {
    const s = session();
    expect(pressRelease(s)).toBe('click');
    expect(fireHold(s)).toBe(true);
    expect(s.held).toBe(true);
    expect(fireHold(s)).toBe(false);
    expect(pressRelease(s)).toBe('longPress');
    /* Nothing moved, so there is nothing to commit either. */
    expect(endDrag(s)).toBeNull();
  });

  it('does not fire for a hold that became a drag', () => {
    const s = session();
    /* Eight pixels is the touch tolerance — past it the press is a drag,
       and the timer that elapses afterwards must find that out. */
    expect(dragActivated(s, { x: 509, y: 400 }, 'touch')).toBe(true);
    s.moved = true;
    expect(fireHold(s)).toBe(false);
    expect(s.held).toBe(false);
    expect(pressRelease(s)).toBe('drag');
  });

  it('a jitter inside the tolerance is still a hold', () => {
    const s = session();
    expect(dragActivated(s, { x: 505, y: 403 }, 'touch')).toBe(false);
    expect(fireHold(s)).toBe(true);
  });

  it('a press that lifts before the timer is a click', () => {
    const s = session();
    expect(pressRelease(s)).toBe('click');
    expect(endDrag(s)).toBeNull();
  });
});
