import { describe, expect, it } from 'vitest';
import {
  alignmentGuides,
  boundsOf,
  clampZoom,
  fitToBounds,
  isRectVisible,
  IDENTITY_VIEWPORT,
  marqueeHits,
  panBy,
  readyToFit,
  rectFromPoints,
  screenToWorld,
  snapToGrid,
  worldToScreen,
  ZOOM_MAX,
  ZOOM_MIN,
  zoomAt,
  zoomBy,
  type Viewport,
} from './viewport';

const VIEWPORTS: Viewport[] = [
  { x: 0, y: 0, zoom: 1 },
  { x: 120, y: -80, zoom: 0.5 },
  { x: -640, y: 320, zoom: 2.25 },
  { x: 17.5, y: 3.25, zoom: 0.1 },
];

describe('screenToWorld / worldToScreen', () => {
  it('round-trips at every zoom', () => {
    for (const viewport of VIEWPORTS) {
      for (const point of [
        { x: 0, y: 0 },
        { x: 640, y: 480 },
        { x: -213.5, y: 97.25 },
      ]) {
        const back = screenToWorld(worldToScreen(point, viewport), viewport);
        expect(back.x).toBeCloseTo(point.x, 10);
        expect(back.y).toBeCloseTo(point.y, 10);
      }
    }
  });

  it('puts the world origin at the pan', () => {
    expect(worldToScreen({ x: 0, y: 0 }, { x: 120, y: -80, zoom: 0.5 })).toEqual({
      x: 120,
      y: -80,
    });
  });

  it('scales distances by the zoom, not the pan', () => {
    const viewport = { x: 1000, y: 1000, zoom: 2 };
    const a = worldToScreen({ x: 10, y: 10 }, viewport);
    const b = worldToScreen({ x: 20, y: 10 }, viewport);
    expect(b.x - a.x).toBe(20);
  });
});

describe('zoomAt', () => {
  it('holds the anchor point still — the whole feel of a wheel zoom', () => {
    const anchor = { x: 320, y: 240 };
    for (const viewport of VIEWPORTS) {
      const before = screenToWorld(anchor, viewport);
      const next = zoomAt(viewport, anchor, viewport.zoom * 1.4);
      const after = screenToWorld(anchor, next);
      expect(after.x).toBeCloseTo(before.x, 8);
      expect(after.y).toBeCloseTo(before.y, 8);
    }
  });

  it('clamps before solving the pan, so zooming past the limit does not drift', () => {
    const anchor = { x: 400, y: 300 };
    const at = zoomAt({ x: 0, y: 0, zoom: ZOOM_MAX }, anchor, ZOOM_MAX * 4);
    const again = zoomAt(at, anchor, ZOOM_MAX * 4);
    expect(at.zoom).toBe(ZOOM_MAX);
    expect(again).toEqual(at);
  });

  it('clamps the floor too', () => {
    expect(zoomAt(IDENTITY_VIEWPORT, { x: 0, y: 0 }, 0.0001).zoom).toBe(ZOOM_MIN);
    expect(clampZoom(1)).toBe(1);
  });

  it('zoomBy is zoomAt with a multiplier', () => {
    const anchor = { x: 100, y: 100 };
    const viewport = { x: 10, y: 20, zoom: 0.5 };
    expect(zoomBy(viewport, anchor, 2)).toEqual(zoomAt(viewport, anchor, 1));
  });
});

describe('panBy', () => {
  it('adds screen pixels and leaves the zoom alone', () => {
    expect(panBy({ x: 10, y: 20, zoom: 0.5 }, -5, 7)).toEqual({ x: 5, y: 27, zoom: 0.5 });
  });
});

describe('boundsOf', () => {
  it('is null for an empty scene', () => {
    expect(boundsOf([])).toBeNull();
  });

  it('wraps every rect', () => {
    expect(
      boundsOf([
        { x: 10, y: 10, width: 100, height: 40 },
        { x: -20, y: 200, width: 50, height: 50 },
      ]),
    ).toEqual({ x: -20, y: 10, width: 130, height: 240 });
  });
});

describe('fitToBounds', () => {
  const size = { width: 1000, height: 800 };

  it('centres the bounds', () => {
    const bounds = { x: 0, y: 0, width: 400, height: 200 };
    const viewport = fitToBounds(bounds, size);
    const centre = worldToScreen({ x: 200, y: 100 }, viewport);
    expect(centre.x).toBeCloseTo(500, 8);
    expect(centre.y).toBeCloseTo(400, 8);
  });

  it('fits the tighter axis', () => {
    /* 1800 wide in 1000 - 2*48 usable = 904 → 0.502; the height is not binding. */
    const viewport = fitToBounds({ x: 0, y: 0, width: 1800, height: 100 }, size);
    expect(viewport.zoom).toBeCloseTo(904 / 1800, 8);
  });

  it('does not magnify a single small node past maxZoom', () => {
    const viewport = fitToBounds({ x: 0, y: 0, width: 20, height: 20 }, size);
    expect(viewport.zoom).toBe(1);
  });

  it('honours an explicit maxZoom', () => {
    const viewport = fitToBounds({ x: 0, y: 0, width: 20, height: 20 }, size, { maxZoom: 1.5 });
    expect(viewport.zoom).toBe(1.5);
  });

  it('survives a zero-extent bounds — one node, or a column at one x', () => {
    /* maxZoom raised so the assertion is about the collapsed axis rather than
       about the cap: the width contributes no constraint at all, and it must
       not contribute a NaN or a zero either. */
    const viewport = fitToBounds({ x: 100, y: 0, width: 0, height: 600 }, size, { maxZoom: 2 });
    expect(Number.isFinite(viewport.zoom)).toBe(true);
    expect(Number.isFinite(viewport.x)).toBe(true);
    expect(viewport.zoom).toBeCloseTo((800 - 96) / 600, 8);
  });

  it('fits into the box left over after the inset, and centres there', () => {
    /* A 240px palette down the left. The scene must sit centred in the
       remaining 760px — its centre 240 + 380 = 620 from the canvas edge, not
       500 — and the zoom is found against 760 - 96, not 1000 - 96. */
    const bounds = { x: 0, y: 0, width: 1800, height: 100 };
    const viewport = fitToBounds(bounds, size, { inset: { left: 240 } });
    expect(viewport.zoom).toBeCloseTo((760 - 96) / 1800, 8);
    const centre = worldToScreen({ x: 900, y: 50 }, viewport);
    expect(centre.x).toBeCloseTo(620, 8);
    expect(centre.y).toBeCloseTo(400, 8);
    /* And the scene's left edge clears the palette, with the padding after it. */
    expect(worldToScreen({ x: 0, y: 0 }, viewport).x).toBeCloseTo(240 + 48, 8);
  });

  it('insets every side independently', () => {
    const bounds = { x: 0, y: 0, width: 200, height: 200 };
    const viewport = fitToBounds(bounds, size, {
      inset: { top: 100, right: 300, bottom: 200, left: 100 },
      maxZoom: 4,
    });
    /* Box: x 100..700 (600 wide), y 100..600 (500 tall); usable 504 x 404. */
    expect(viewport.zoom).toBeCloseTo(404 / 200, 8);
    const centre = worldToScreen({ x: 100, y: 100 }, viewport);
    expect(centre.x).toBeCloseTo(400, 8);
    expect(centre.y).toBeCloseTo(350, 8);
  });

  it('is unchanged by an empty inset', () => {
    const bounds = { x: 10, y: 20, width: 400, height: 200 };
    expect(fitToBounds(bounds, size, { inset: {} })).toEqual(fitToBounds(bounds, size));
  });

  it('survives an inset wider than the canvas', () => {
    const viewport = fitToBounds({ x: 0, y: 0, width: 400, height: 200 }, size, {
      inset: { left: 1200 },
    });
    expect(Number.isFinite(viewport.zoom)).toBe(true);
    expect(viewport.zoom).toBe(ZOOM_MIN);
  });

  it('is the identity viewport for an empty scene or an unmeasured canvas', () => {
    expect(fitToBounds(null, size)).toEqual(IDENTITY_VIEWPORT);
    expect(fitToBounds({ x: 0, y: 0, width: 10, height: 10 }, { width: 0, height: 0 })).toEqual(IDENTITY_VIEWPORT);
  });
});

describe('readyToFit', () => {
  /* The live case: a 2-block flow, blocks at x=192 and x=632, each 256 wide
     once rendered, on a 1000-wide canvas. */
  const size = { width: 1000, height: 800 };
  const first = { id: 'a', rect: { x: 192, y: 40, width: 256, height: 120 } };
  const second = { id: 'b', rect: { x: 632, y: 40, width: 256, height: 120 } };
  const unmeasured = { id: 'b', rect: { x: 632, y: 40, width: 0, height: 0 } };

  it('is not ready while any registered node is still a point', () => {
    expect(readyToFit([first, unmeasured])).toBe(false);
    expect(readyToFit([{ ...first, rect: { ...first.rect, height: 0 } }, second])).toBe(false);
  });

  it('is ready once every node has a size', () => {
    expect(readyToFit([first, second])).toBe(true);
    expect(readyToFit([first])).toBe(true);
  });

  it('is not ready for an empty scene — there is nothing to fit', () => {
    expect(readyToFit([])).toBe(false);
  });

  it('is the difference between fitting the blocks and fitting their anchors', () => {
    /* With the flow builder's palette inset. Fitted on positions alone (the
       second block still 0×0), the box is 440 wide, "fits at 1:1", and the
       second block's right edge lands off the canvas. Fitted on measured rects
       the box is 696 wide and both blocks are on screen, clear of the palette. */
    const options = { inset: { left: 240 } };
    const early = fitToBounds(boundsOf([first.rect, unmeasured.rect]), size, options);
    expect(early.zoom).toBe(1);
    expect(worldToScreen({ x: 632 + 256, y: 0 }, early).x).toBeGreaterThan(size.width);

    const ready = fitToBounds(boundsOf([first.rect, second.rect]), size, options);
    expect(ready.zoom).toBeLessThan(1);
    expect(worldToScreen({ x: 632 + 256, y: 0 }, ready).x).toBeLessThanOrEqual(size.width);
    expect(worldToScreen({ x: 192, y: 0 }, ready).x).toBeGreaterThanOrEqual(240);
  });
});

describe('isRectVisible', () => {
  const size = { width: 800, height: 600 };
  const node = { x: 0, y: 0, width: 200, height: 100 };

  it('sees a node in view and not one panned far away', () => {
    expect(isRectVisible(node, IDENTITY_VIEWPORT, size, 0)).toBe(true);
    expect(isRectVisible(node, { x: -5000, y: 0, zoom: 1 }, size, 0)).toBe(false);
  });

  it('counts a node that is only partly on screen', () => {
    expect(isRectVisible(node, { x: -150, y: 0, zoom: 1 }, size, 0)).toBe(true);
  });

  it('mounts a node inside the margin before it crosses the edge', () => {
    const justOff = { x: -300, y: 0, zoom: 1 };
    expect(isRectVisible(node, justOff, size, 0)).toBe(false);
    expect(isRectVisible(node, justOff, size, 200)).toBe(true);
  });

  it('shrinks the node with the zoom', () => {
    /* At 0.1 the 200-wide node is 20 screen px, so a pan of -25 clears it. */
    expect(isRectVisible(node, { x: -25, y: 0, zoom: 0.1 }, size, 0)).toBe(false);
    expect(isRectVisible(node, { x: -25, y: 0, zoom: 1 }, size, 0)).toBe(true);
  });
});

describe('rectFromPoints', () => {
  it('normalises a drag in any direction', () => {
    const forward = rectFromPoints({ x: 10, y: 10 }, { x: 60, y: 40 });
    const backward = rectFromPoints({ x: 60, y: 40 }, { x: 10, y: 10 });
    expect(forward).toEqual({ x: 10, y: 10, width: 50, height: 30 });
    expect(backward).toEqual(forward);
  });
});

describe('marqueeHits', () => {
  const items = [
    { id: 'a', rect: { x: 0, y: 0, width: 100, height: 50 } },
    { id: 'b', rect: { x: 200, y: 0, width: 100, height: 50 } },
    { id: 'c', rect: { x: 0, y: 400, width: 100, height: 50 } },
  ];

  it('takes anything the marquee touches, not only what it swallows', () => {
    expect(marqueeHits({ x: 90, y: 10, width: 10, height: 10 }, items)).toEqual(['a']);
  });

  it('takes several', () => {
    expect(marqueeHits({ x: 0, y: 0, width: 300, height: 60 }, items)).toEqual(['a', 'b']);
  });

  it('takes none when it touches nothing', () => {
    expect(marqueeHits({ x: 120, y: 100, width: 40, height: 40 }, items)).toEqual([]);
  });

  it('counts an edge-on touch', () => {
    expect(marqueeHits({ x: 100, y: 0, width: 0, height: 50 }, items)).toEqual(['a']);
  });
});

describe('snapToGrid', () => {
  it('rounds to the nearest intersection', () => {
    expect(snapToGrid({ x: 23, y: 37 }, 16)).toEqual({ x: 16, y: 32 });
  });

  it('rounds negatives the same way', () => {
    expect(snapToGrid({ x: -23, y: -37 }, 16)).toEqual({ x: -16, y: -32 });
  });

  it('is a no-op when snapping is off', () => {
    const point = { x: 23.5, y: 37.25 };
    expect(snapToGrid(point, 0)).toBe(point);
  });
});

describe('alignmentGuides', () => {
  const neighbour = { x: 100, y: 100, width: 200, height: 80 };

  it('snaps a nearly flush left edge onto the neighbour', () => {
    const result = alignmentGuides({ x: 104, y: 400, width: 200, height: 80 }, [neighbour], 8);
    expect(result.point.x).toBe(100);
    expect(result.guides).toContainEqual({ axis: 'x', position: 100, delta: -4 });
  });

  it('snaps a nearly centred rect onto the centre of the neighbour', () => {
    /* Centre 200; the moving rect's centre at 197 is 3 away, its left edge 97
       is 3 from the neighbour's left edge too — the closest wins, and a tie
       goes to the first found, so offset it to make the centre unambiguous. */
    const result = alignmentGuides({ x: 148, y: 400, width: 100, height: 80 }, [neighbour], 8);
    expect(result.point.x).toBe(150);
    expect(result.guides[0]).toEqual({ axis: 'x', position: 200, delta: 2 });
  });

  it('snaps both axes at once and reports one guide each', () => {
    const result = alignmentGuides({ x: 103, y: 178, width: 200, height: 80 }, [neighbour], 8);
    expect(result.point).toEqual({ x: 100, y: 180 });
    expect(result.guides.map((guide) => guide.axis)).toEqual(['x', 'y']);
  });

  it('leaves a rect alone when nothing is within the threshold', () => {
    const moving = { x: 600, y: 600, width: 200, height: 80 };
    const result = alignmentGuides(moving, [neighbour], 8);
    expect(result.point).toEqual({ x: 600, y: 600 });
    expect(result.guides).toEqual([]);
  });

  it('has nothing to snap to in an empty scene', () => {
    expect(alignmentGuides({ x: 0, y: 0, width: 10, height: 10 }, [], 8).guides).toEqual([]);
  });

  it('prefers the closer of two candidates', () => {
    const far = { x: 90, y: 100, width: 200, height: 80 };
    const near = { x: 103, y: 100, width: 200, height: 80 };
    const result = alignmentGuides({ x: 100, y: 400, width: 200, height: 80 }, [far, near], 16);
    expect(result.point.x).toBe(103);
  });
});
