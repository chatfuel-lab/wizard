import { describe, expect, it } from 'vitest';
import {
  backgroundPointerDown,
  backgroundPointerUp,
  IDLE_GESTURE,
  nodePointerDown,
  type BackgroundGesture,
} from './canvasGesture';

describe('backgroundPointerDown', () => {
  it('starts a marquee for a lone Select-tool press', () => {
    const step = backgroundPointerDown(IDLE_GESTURE, { pointerId: 1, pan: false });
    expect(step.gesture).toEqual({ kind: 'marquee', pointerId: 1 });
    expect(step.startMarquee).toBe(true);
    expect(step.cancelMarquee).toBe(false);
    expect(step.handToViewport).toEqual([]);
  });

  it('gives a press that asked to pan straight to the viewport', () => {
    const step = backgroundPointerDown(IDLE_GESTURE, { pointerId: 1, pan: true });
    expect(step.gesture).toEqual({ kind: 'viewport', pointerIds: [1] });
    expect(step.startMarquee).toBe(false);
    expect(step.handToViewport).toEqual([1]);
  });

  it('cancels a marquee when a second pointer lands, and hands BOTH pointers to the viewport', () => {
    /* The Select tool, two fingers: the first began a marquee, the second
       makes it a pinch. The finger that was drawing the box goes to the
       viewport too — a pinch needs both. */
    const marquee = backgroundPointerDown(IDLE_GESTURE, { pointerId: 1, pan: false }).gesture;
    const step = backgroundPointerDown(marquee, { pointerId: 2, pan: false });
    expect(step.cancelMarquee).toBe(true);
    expect(step.startMarquee).toBe(false);
    expect(step.handToViewport).toEqual([1, 2]);
    expect(step.gesture).toEqual({ kind: 'viewport', pointerIds: [1, 2] });
  });

  it('does that whatever the tool says about the second press', () => {
    const marquee: BackgroundGesture = { kind: 'marquee', pointerId: 1 };
    expect(backgroundPointerDown(marquee, { pointerId: 2, pan: true }).cancelMarquee).toBe(true);
    expect(backgroundPointerDown(marquee, { pointerId: 2, pan: false }).cancelMarquee).toBe(true);
  });

  it('adds a further pointer to a viewport gesture without starting a marquee', () => {
    const viewport: BackgroundGesture = { kind: 'viewport', pointerIds: [1, 2] };
    const step = backgroundPointerDown(viewport, { pointerId: 3, pan: false });
    expect(step.gesture).toEqual({ kind: 'viewport', pointerIds: [1, 2, 3] });
    expect(step.startMarquee).toBe(false);
    expect(step.cancelMarquee).toBe(false);
    expect(step.handToViewport).toEqual([3]);
  });

  it('ignores a repeated down from a pointer it already tracks', () => {
    const marquee: BackgroundGesture = { kind: 'marquee', pointerId: 1 };
    const again = backgroundPointerDown(marquee, { pointerId: 1, pan: false });
    expect(again.gesture).toBe(marquee);
    expect(again.cancelMarquee).toBe(false);
    expect(again.handToViewport).toEqual([]);

    const viewport: BackgroundGesture = { kind: 'viewport', pointerIds: [1] };
    const twice = backgroundPointerDown(viewport, { pointerId: 1, pan: true });
    expect(twice.gesture).toBe(viewport);
    expect(twice.handToViewport).toEqual([]);
  });
});

describe('nodePointerDown', () => {
  it('leaves a press on a node to the node while the background is idle', () => {
    const step = nodePointerDown(IDLE_GESTURE, 1);
    expect(step.claimed).toBe(false);
    expect(step.gesture).toBe(IDLE_GESTURE);
    expect(step.cancelMarquee).toBe(false);
    expect(step.handToViewport).toEqual([]);
  });

  it('claims a second finger that lands on a node during a marquee, and pinches', () => {
    /* One finger drawing a marquee on the background, the second on a card:
       the same transition as two fingers on the background — the box goes,
       both pointers become the pinch — and the card does NOT start a drag. */
    const marquee = backgroundPointerDown(IDLE_GESTURE, { pointerId: 1, pan: false }).gesture;
    const step = nodePointerDown(marquee, 2);
    expect(step.claimed).toBe(true);
    expect(step.cancelMarquee).toBe(true);
    expect(step.handToViewport).toEqual([1, 2]);
    expect(step.gesture).toEqual({ kind: 'viewport', pointerIds: [1, 2] });
    /* Literally the same transition: the two roads share one table. */
    const background = backgroundPointerDown(marquee, { pointerId: 2, pan: false });
    expect(step.gesture).toEqual(background.gesture);
    expect(step.handToViewport).toEqual(background.handToViewport);
    expect(step.cancelMarquee).toBe(background.cancelMarquee);
  });

  it('claims a further finger on a node while the viewport owns the gesture', () => {
    const pan: BackgroundGesture = { kind: 'viewport', pointerIds: [1] };
    const step = nodePointerDown(pan, 2);
    expect(step.claimed).toBe(true);
    expect(step.cancelMarquee).toBe(false);
    expect(step.handToViewport).toEqual([2]);
    expect(step.gesture).toEqual({ kind: 'viewport', pointerIds: [1, 2] });
  });

  it('claims, without a hand-off, a pointer it already tracks', () => {
    const marquee: BackgroundGesture = { kind: 'marquee', pointerId: 1 };
    const again = nodePointerDown(marquee, 1);
    expect(again.claimed).toBe(true);
    expect(again.gesture).toBe(marquee);
    expect(again.cancelMarquee).toBe(false);
    expect(again.handToViewport).toEqual([]);

    const viewport: BackgroundGesture = { kind: 'viewport', pointerIds: [1, 2] };
    const twice = nodePointerDown(viewport, 2);
    expect(twice.claimed).toBe(true);
    expect(twice.gesture).toBe(viewport);
    expect(twice.handToViewport).toEqual([]);
  });

  it("walks marquee → finger on a node → both lift → idle, and the next node press is the node's", () => {
    let gesture: BackgroundGesture = IDLE_GESTURE;
    gesture = backgroundPointerDown(gesture, { pointerId: 1, pan: false }).gesture;
    gesture = nodePointerDown(gesture, 2).gesture;
    expect(gesture).toEqual({ kind: 'viewport', pointerIds: [1, 2] });
    gesture = backgroundPointerUp(gesture, 1);
    /* The finger on the node is still down: it stays the viewport's, and a
       marquee cannot start under it. */
    expect(backgroundPointerDown(gesture, { pointerId: 3, pan: false }).startMarquee).toBe(false);
    gesture = backgroundPointerUp(gesture, 2);
    expect(gesture).toEqual(IDLE_GESTURE);
    expect(nodePointerDown(gesture, 4).claimed).toBe(false);
  });
});

describe('backgroundPointerUp', () => {
  it('ends a marquee when its own pointer lifts, and only its own', () => {
    const marquee: BackgroundGesture = { kind: 'marquee', pointerId: 1 };
    expect(backgroundPointerUp(marquee, 2)).toBe(marquee);
    expect(backgroundPointerUp(marquee, 1)).toEqual(IDLE_GESTURE);
  });

  it('keeps the viewport gesture while any of its pointers is still down', () => {
    /* A pinch that loses a finger is a pan, and the background must not
       start a marquee under the finger that stayed. */
    const pinch: BackgroundGesture = { kind: 'viewport', pointerIds: [1, 2] };
    const pan = backgroundPointerUp(pinch, 1);
    expect(pan).toEqual({ kind: 'viewport', pointerIds: [2] });
    expect(backgroundPointerDown(pan, { pointerId: 3, pan: false }).startMarquee).toBe(false);
    expect(backgroundPointerUp(pan, 2)).toEqual(IDLE_GESTURE);
  });

  it('is a no-op for a pointer it never tracked, and when idle', () => {
    const pinch: BackgroundGesture = { kind: 'viewport', pointerIds: [1, 2] };
    expect(backgroundPointerUp(pinch, 9)).toBe(pinch);
    expect(backgroundPointerUp(IDLE_GESTURE, 1)).toBe(IDLE_GESTURE);
  });

  it('walks a whole two-finger gesture on the Select tool back to idle', () => {
    let gesture: BackgroundGesture = IDLE_GESTURE;
    gesture = backgroundPointerDown(gesture, { pointerId: 1, pan: false }).gesture;
    gesture = backgroundPointerDown(gesture, { pointerId: 2, pan: false }).gesture;
    gesture = backgroundPointerUp(gesture, 2);
    gesture = backgroundPointerUp(gesture, 1);
    expect(gesture).toEqual(IDLE_GESTURE);
    /* And the next lone press is a marquee again. */
    expect(backgroundPointerDown(gesture, { pointerId: 4, pan: false }).startMarquee).toBe(true);
  });
});
