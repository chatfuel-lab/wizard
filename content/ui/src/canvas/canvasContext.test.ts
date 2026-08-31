import { describe, expect, it } from 'vitest';
import { createCanvasStore, type CanvasStore } from './canvasContext';
import { IDENTITY_VIEWPORT } from '../lib/geometry/viewport';

/* The store writes one thing to the DOM — a node's transform — and vitest here
   is node-only. A stub with a `style` object is the whole surface it touches,
   so the arithmetic that decides WHERE a node goes is testable without jsdom. */
function stubElement() {
  return { style: { transform: '' } } as unknown as HTMLElement;
}

function makeStore(): CanvasStore {
  const store = createCanvasStore(IDENTITY_VIEWPORT);
  store.setSize({ width: 800, height: 600 });
  return store;
}

describe('node registry', () => {
  it('holds a registered node until it is released', () => {
    const store = makeStore();
    const release = store.registerNode('a', stubElement());
    expect(store.getNode('a')).toBeDefined();
    release();
    expect(store.getNode('a')).toBeUndefined();
  });

  it('bumps the geometry version when a rect changes, and not when it does not', () => {
    const store = makeStore();
    store.registerNode('a', stubElement());
    store.setNodeRect('a', { x: 0, y: 0, width: 100, height: 40 });
    const version = store.getGeometryVersion();
    store.setNodeRect('a', { x: 0, y: 0, width: 100, height: 40 });
    expect(store.getGeometryVersion()).toBe(version);
    store.setNodeRect('a', { x: 1, y: 0, width: 100, height: 40 });
    expect(store.getGeometryVersion()).toBeGreaterThan(version);
  });

  it('forgets the handles of a node that has gone', () => {
    const store = makeStore();
    const release = store.registerNode('a', stubElement());
    store.setHandle({
      key: store.handleKey('a', 'out'),
      nodeId: 'a',
      handleId: 'out',
      side: 'right',
      type: 'source',
      offset: { x: 10, y: 5 },
    });
    expect(store.getHandles()).toHaveLength(1);
    release();
    expect(store.getHandles()).toHaveLength(0);
  });
});

describe('visibility', () => {
  it('never clips a node that has not been measured', () => {
    const store = makeStore();
    store.registerNode('far', stubElement());
    store.setNodeRect('far', { x: 100_000, y: 100_000, width: 0, height: 0 });
    /* A measured-away node would be hidden, never render, and so never measure
       itself. Unmeasured has to mean visible or the node is lost for good. */
    expect(store.isVisible('far')).toBe(true);
  });

  it('clips a measured node that is off screen, and un-clips it on a pan', () => {
    const store = makeStore();
    store.registerNode('far', stubElement());
    store.setNodeRect('far', { x: 5_000, y: 0, width: 200, height: 80 });
    expect(store.isVisible('far')).toBe(false);

    store.setViewport({ x: -4_900, y: 0, zoom: 1 });
    expect(store.isVisible('far')).toBe(true);
  });

  it('wakes only the node whose answer changed', () => {
    const store = makeStore();
    store.registerNode('near', stubElement());
    store.registerNode('far', stubElement());
    store.setNodeRect('near', { x: 0, y: 0, width: 100, height: 40 });
    store.setNodeRect('far', { x: 5_000, y: 0, width: 100, height: 40 });

    let nearWoke = 0;
    let farWoke = 0;
    store.subscribeVisibility('near', () => {
      nearWoke += 1;
    });
    store.subscribeVisibility('far', () => {
      farWoke += 1;
    });

    store.setViewport({ x: -4_950, y: 0, zoom: 1 });
    expect(farWoke).toBe(1);
    /* 'near' left the screen too, so it is allowed exactly one wake-up as well
       — the point is that neither is woken by a pan that changes nothing. */
    const before = nearWoke;
    store.setViewport({ x: -4_951, y: 0, zoom: 1 });
    expect(nearWoke).toBe(before);
  });

  it('clips nothing at all when clipping is off', () => {
    const store = makeStore();
    store.setClip({ enabled: false, margin: 0 });
    store.registerNode('far', stubElement());
    store.setNodeRect('far', { x: 5_000, y: 0, width: 100, height: 40 });
    expect(store.isVisible('far')).toBe(true);
  });
});

describe('drag offsets', () => {
  it('moves the rect and writes the transform', () => {
    const store = makeStore();
    const element = stubElement();
    store.registerNode('a', element);
    store.setNodeRect('a', { x: 10, y: 20, width: 100, height: 40 });

    store.setOffset('a', { dx: 30, dy: -5 });
    expect(store.getNode('a')?.rect).toEqual({ x: 40, y: 15, width: 100, height: 40 });
    expect(element.style.transform).toBe('translate(40px, 15px)');
  });

  it('replaces a displacement rather than accumulating it', () => {
    const store = makeStore();
    store.registerNode('a', stubElement());
    store.setNodeRect('a', { x: 0, y: 0, width: 10, height: 10 });

    store.setOffset('a', { dx: 30, dy: 0 });
    store.setOffset('a', { dx: 50, dy: 0 });
    /* Every frame of a drag reports the TOTAL displacement since it began, not
       the step since the last frame. Adding them would run the node away. */
    expect(store.getNode('a')?.rect.x).toBe(50);
  });

  it('puts the node back where it was when the offsets are dropped', () => {
    const store = makeStore();
    const element = stubElement();
    store.registerNode('a', element);
    store.setNodeRect('a', { x: 10, y: 20, width: 100, height: 40 });

    store.setOffset('a', { dx: 30, dy: 30 });
    store.clearOffsets();

    expect(store.getNode('a')?.rect).toEqual({ x: 10, y: 20, width: 100, height: 40 });
    expect(element.style.transform).toBe('translate(10px, 20px)');
    expect(store.getOffset('a')).toEqual({ dx: 0, dy: 0 });
  });
});

describe('handles', () => {
  it('reports a handle in world coordinates, following its node', () => {
    const store = makeStore();
    store.registerNode('a', stubElement());
    store.setNodeRect('a', { x: 100, y: 100, width: 200, height: 80 });
    store.setHandle({
      key: store.handleKey('a', 'out'),
      nodeId: 'a',
      handleId: 'out',
      side: 'right',
      type: 'source',
      offset: { x: 200, y: 40 },
    });

    expect(store.handlePoint('a', 'out')).toEqual({ x: 300, y: 140 });

    store.setOffset('a', { dx: 50, dy: 0 });
    /* The offset is stored against the node, so the handle moves with it and
       nothing re-measures during a drag. */
    expect(store.handlePoint('a', 'out')).toEqual({ x: 350, y: 140 });
  });

  it('falls back to the node centre for a handle that has not registered', () => {
    const store = makeStore();
    store.registerNode('a', stubElement());
    store.setNodeRect('a', { x: 0, y: 0, width: 200, height: 80 });
    expect(store.handlePoint('a', null)).toEqual({ x: 100, y: 40 });
  });

  it('answers null for a node that does not exist', () => {
    expect(makeStore().handlePoint('ghost', null)).toBeNull();
  });

  it('does not bump the geometry version when a handle is re-measured unchanged', () => {
    const store = makeStore();
    store.registerNode('a', stubElement());
    const entry = {
      key: store.handleKey('a', 'out'),
      nodeId: 'a',
      handleId: 'out',
      side: 'right' as const,
      type: 'source' as const,
      offset: { x: 10, y: 5 },
    };
    store.setHandle(entry);
    const version = store.getGeometryVersion();
    store.setHandle({ ...entry, offset: { x: 10, y: 5 } });
    /* Handles re-measure on every ResizeObserver callback, and a bump here is
       a re-render of the whole edge layer. Idempotence is the whole point. */
    expect(store.getGeometryVersion()).toBe(version);
  });
});

describe('overlay', () => {
  it('notifies when the marquee appears and when it goes', () => {
    const store = makeStore();
    let notified = 0;
    store.subscribeOverlay(() => {
      notified += 1;
    });

    store.setMarquee({ x: 0, y: 0, width: 10, height: 10 });
    expect(store.getOverlay().marquee).toEqual({ x: 0, y: 0, width: 10, height: 10 });
    store.setMarquee(null);
    expect(store.getOverlay().marquee).toBeNull();
    expect(notified).toBe(2);
  });

  it('stays quiet when a clear clears nothing', () => {
    const store = makeStore();
    let notified = 0;
    store.subscribeOverlay(() => {
      notified += 1;
    });
    /* Every gesture clears all three when it ends AND again when its effect
       tears down. A render of the overlay per pointer-up for nothing is the
       thing this guard exists to stop. */
    store.setMarquee(null);
    store.setGhost(null);
    store.setGuides(null);
    expect(notified).toBe(0);
  });

  it('keeps the three channels independent', () => {
    const store = makeStore();
    store.setGhost('M 0,0 L 10,10');
    store.setMarquee({ x: 1, y: 1, width: 2, height: 2 });
    expect(store.getOverlay().ghost).toBe('M 0,0 L 10,10');
    store.setMarquee(null);
    expect(store.getOverlay().ghost).toBe('M 0,0 L 10,10');
  });

  it('returns a stable snapshot until something changes', () => {
    const store = makeStore();
    /* useSyncExternalStore re-reads the snapshot on every render and compares
       by identity; a fresh object each call is an infinite render loop. */
    expect(store.getOverlay()).toBe(store.getOverlay());
  });
});

describe('viewport', () => {
  it('ignores a viewport that is the same as the current one', () => {
    const store = makeStore();
    let notified = 0;
    store.subscribeViewport(() => {
      notified += 1;
    });
    store.setViewport({ x: 10, y: 0, zoom: 1 });
    store.setViewport({ x: 10, y: 0, zoom: 1 });
    expect(notified).toBe(1);
  });
});
