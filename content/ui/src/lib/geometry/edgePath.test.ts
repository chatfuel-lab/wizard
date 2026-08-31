import { describe, expect, it } from 'vitest';
import {
  arrowHeadAngle,
  distanceToPath,
  edgePolyline,
  pathLength,
  pathMidpoint,
  roundedPath,
  smoothStepPath,
} from './edgePath';

const SOURCE = { x: 0, y: 0 };

describe('edgePolyline', () => {
  it('is a straight line when the handles face each other at the same height', () => {
    const points = edgePolyline(SOURCE, { x: 400, y: 0 });
    expect(points).toEqual([
      { x: 0, y: 0 },
      { x: 400, y: 0 },
    ]);
  });

  it('leaves and enters perpendicular to the node', () => {
    const points = edgePolyline(SOURCE, { x: 400, y: 200 });
    /* Out of a right handle and into a left one: both end segments horizontal.
       The offset vertices themselves are gone — they were collinear with the
       run to the crossing, and simplify drops those. The guarantee they buy is
       still there, in the crossing never landing nearer than the offset. */
    expect(points[1].y).toBe(points[0].y);
    expect(points[points.length - 2].y).toBe(points[points.length - 1].y);
  });

  it('crosses at the midpoint between the offsets', () => {
    const points = edgePolyline(SOURCE, { x: 400, y: 200 });
    expect(points).toEqual([
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 200 },
      { x: 400, y: 200 },
    ]);
  });

  it('detours around, rather than doubling back, when the target is behind', () => {
    const points = edgePolyline(SOURCE, { x: -300, y: 160 });
    /* Out to the right of the source, along a line between the two, back to
       the left of the target, in. Nothing between them is at a midpoint x,
       because the midpoint is behind the source. */
    expect(points).toEqual([
      { x: 0, y: 0 },
      { x: 24, y: 0 },
      { x: 24, y: 80 },
      { x: -324, y: 80 },
      { x: -324, y: 160 },
      { x: -300, y: 160 },
    ]);
  });

  it('steps clear of two level nodes instead of drawing a line through both', () => {
    const points = edgePolyline(SOURCE, { x: -300, y: 0 });
    /* Halfway between two level handles is level, and a level backward route
       is a straight line through both nodes — the exact thing the detour is
       for. Below two offsets of separation it goes round instead. */
    expect(points).toEqual([
      { x: 0, y: 0 },
      { x: 24, y: 0 },
      { x: 24, y: 24 },
      { x: -324, y: 24 },
      { x: -324, y: 0 },
      { x: -300, y: 0 },
    ]);
  });

  it('drops duplicate vertices even when source and target coincide', () => {
    const points = edgePolyline(SOURCE, { x: 0, y: 0 });
    for (let i = 1; i < points.length; i += 1) {
      expect(points[i]).not.toEqual(points[i - 1]);
    }
  });

  it('routes vertically when the handles are on the top and bottom', () => {
    const points = edgePolyline(SOURCE, { x: 200, y: 400 }, { sourceSide: 'bottom', targetSide: 'top' });
    expect(points).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 200 },
      { x: 200, y: 200 },
      { x: 200, y: 400 },
    ]);
  });

  it('turns a short forward hop into a detour once the offset outgrows it', () => {
    const target = { x: 100, y: 200 };
    expect(edgePolyline(SOURCE, target, { offset: 24 })).toHaveLength(4);
    /* 60 out of the source and 60 back off the target overlap across a 100-unit
       gap, so there is no forward room left and the route has to go round. */
    expect(edgePolyline(SOURCE, target, { offset: 60 })).toHaveLength(6);
  });
});

describe('roundedPath', () => {
  it('is empty for no points and a move for one', () => {
    expect(roundedPath([])).toBe('');
    expect(roundedPath([{ x: 3, y: 4 }])).toBe('M 3,4');
  });

  it('is a plain line when there is no corner to round', () => {
    expect(roundedPath([SOURCE, { x: 100, y: 0 }])).toBe('M 0,0 L 100,0');
  });

  it('replaces a corner with a quadratic pulled back by the radius', () => {
    const d = roundedPath(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ],
      10,
    );
    expect(d).toBe('M 0,0 L 90,0 Q 100,0 100,10 L 100,100');
  });

  it('clamps the radius to half the shorter leg, so a short segment cannot loop', () => {
    const d = roundedPath(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 4 },
      ],
      10,
    );
    /* Half of the 4-unit leg is 2, and both sides of the corner use it. */
    expect(d).toBe('M 0,0 L 98,0 Q 100,0 100,2 L 100,4');
  });

  it('smoothStepPath is the polyline, rounded', () => {
    const target = { x: 400, y: 200 };
    expect(smoothStepPath(SOURCE, target)).toBe(roundedPath(edgePolyline(SOURCE, target), 8));
  });
});

describe('arrowHeadAngle', () => {
  it('is 0 pointing east and 90 pointing south — SVG y grows downward', () => {
    expect(arrowHeadAngle([SOURCE, { x: 10, y: 0 }])).toBe(0);
    expect(arrowHeadAngle([SOURCE, { x: 0, y: 10 }])).toBe(90);
    expect(arrowHeadAngle([SOURCE, { x: -10, y: 0 }])).toBe(180);
  });

  it('reads the last segment, not the overall direction', () => {
    /* A backward edge ends by entering a left handle, so it points east even
       though the target is west of the source. */
    const points = edgePolyline(SOURCE, { x: -300, y: 160 });
    expect(arrowHeadAngle(points)).toBe(0);
  });

  it('is 0 rather than NaN for a degenerate route', () => {
    expect(arrowHeadAngle([])).toBe(0);
    expect(arrowHeadAngle([SOURCE])).toBe(0);
    expect(arrowHeadAngle([SOURCE, SOURCE])).toBe(0);
  });
});

describe('pathMidpoint', () => {
  it('is halfway by arc length, not the middle vertex', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 300 },
    ];
    expect(pathLength(points)).toBe(400);
    expect(pathMidpoint(points)).toEqual({ x: 100, y: 100 });
  });

  it('lands on the detour of a backward edge, not inside either node', () => {
    const points = edgePolyline(SOURCE, { x: -300, y: 160 });
    const mid = pathMidpoint(points);
    expect(mid.y).toBe(80);
    expect(mid.x).toBeGreaterThan(-324);
    expect(mid.x).toBeLessThan(24);
  });

  it('handles degenerate routes', () => {
    expect(pathMidpoint([])).toEqual({ x: 0, y: 0 });
    expect(pathMidpoint([{ x: 5, y: 5 }])).toEqual({ x: 5, y: 5 });
    expect(pathMidpoint([SOURCE, SOURCE])).toEqual({ x: 0, y: 0 });
  });
});

describe('distanceToPath', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ];

  it('is zero on the line', () => {
    expect(distanceToPath({ x: 50, y: 0 }, points)).toBe(0);
    expect(distanceToPath({ x: 100, y: 50 }, points)).toBe(0);
  });

  it('measures perpendicular to the nearest segment', () => {
    expect(distanceToPath({ x: 50, y: 12 }, points)).toBe(12);
  });

  it('clamps to the ends rather than to the infinite line', () => {
    /* Straight off the start: 30 to the left of a segment that begins at 0. */
    expect(distanceToPath({ x: -30, y: 0 }, points)).toBe(30);
  });

  it('takes the closest of several segments', () => {
    expect(distanceToPath({ x: 96, y: 96 }, points)).toBe(4);
  });

  it('is Infinity for an empty route and a plain distance for a single point', () => {
    expect(distanceToPath({ x: 0, y: 0 }, [])).toBe(Infinity);
    expect(distanceToPath({ x: 3, y: 4 }, [SOURCE])).toBe(5);
  });
});
