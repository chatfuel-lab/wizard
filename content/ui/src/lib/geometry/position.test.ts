import { describe, expect, it } from 'vitest';
import { availableSpace, parsePlacement, resolvePosition, type PositionInput } from './position';

const VIEWPORT = { width: 1000, height: 800 };

function input(overrides: Partial<PositionInput> = {}): PositionInput {
  return {
    anchor: { x: 400, y: 300, width: 100, height: 40 },
    floating: { width: 200, height: 160 },
    viewport: VIEWPORT,
    placement: 'bottom-start',
    offset: 6,
    padding: 8,
    ...overrides,
  };
}

describe('parsePlacement', () => {
  it('defaults a bare side to center alignment', () => {
    expect(parsePlacement('bottom')).toEqual({ side: 'bottom', alignment: 'center' });
    expect(parsePlacement('top-end')).toEqual({ side: 'top', alignment: 'end' });
  });
});

describe('availableSpace', () => {
  it('measures each edge from the anchor box', () => {
    expect(availableSpace({ x: 400, y: 300, width: 100, height: 40 }, VIEWPORT)).toEqual({
      top: 300,
      bottom: 460,
      left: 400,
      right: 500,
    });
  });
});

describe('resolvePosition — main axis', () => {
  it('sits below the anchor with the offset applied', () => {
    const r = resolvePosition(input());
    expect(r.y).toBe(346); // 300 + 40 + 6
    expect(r.placement).toBe('bottom-start');
  });

  it('sits above the anchor for a top placement', () => {
    const r = resolvePosition(input({ placement: 'top-start' }));
    expect(r.y).toBe(134); // 300 - 160 - 6
  });

  it('sits to the right for a right placement', () => {
    const r = resolvePosition(input({ placement: 'right-start' }));
    expect(r.x).toBe(506); // 400 + 100 + 6
    expect(r.y).toBe(300);
  });
});

describe('resolvePosition — cross-axis alignment', () => {
  it('start aligns the leading edges', () => {
    expect(resolvePosition(input({ placement: 'bottom-start' })).x).toBe(400);
  });

  it('end aligns the trailing edges', () => {
    expect(resolvePosition(input({ placement: 'bottom-end' })).x).toBe(300); // 400 + 100 - 200
  });

  it('center splits the difference', () => {
    expect(resolvePosition(input({ placement: 'bottom' })).x).toBe(350); // 450 - 100
  });
});

describe('resolvePosition — flip', () => {
  it('flips to the top when the bottom cannot fit and the top is roomier', () => {
    // anchor near the bottom: 30px below, 700 above
    const r = resolvePosition(input({ anchor: { x: 400, y: 700, width: 100, height: 40 } }));
    expect(r.placement).toBe('top-start');
    expect(r.y).toBe(534); // 700 - 160 - 6
  });

  it('does NOT flip when the opposite side is no roomier', () => {
    // anchor dead centre of a short viewport: neither side fits, both equal
    const r = resolvePosition(
      input({
        anchor: { x: 400, y: 80, width: 100, height: 40 },
        viewport: { width: 1000, height: 200 },
      }),
    );
    expect(r.placement).toBe('bottom-start');
  });

  it('flips right-to-left when the right edge is tight', () => {
    const r = resolvePosition(input({ anchor: { x: 900, y: 300, width: 60, height: 40 }, placement: 'right-start' }));
    expect(r.placement).toBe('left-start');
    expect(r.x).toBe(694); // 900 - 200 - 6
  });
});

describe('resolvePosition — shift', () => {
  it('pulls a menu back inside the right edge', () => {
    const r = resolvePosition(input({ anchor: { x: 950, y: 300, width: 40, height: 40 } }));
    expect(r.x).toBe(792); // 1000 - 200 - 8
    expect(r.shifted).toBe(true);
  });

  it('pushes a menu off the left edge back to the padding', () => {
    const r = resolvePosition(input({ anchor: { x: 2, y: 300, width: 40, height: 40 }, placement: 'bottom-end' }));
    expect(r.x).toBe(8);
    expect(r.shifted).toBe(true);
  });

  it('reports shifted:false when nothing had to move', () => {
    expect(resolvePosition(input()).shifted).toBe(false);
  });

  it('keeps the top-left corner visible when the floating element is wider than the viewport', () => {
    const r = resolvePosition(input({ floating: { width: 1200, height: 160 } }));
    expect(r.x).toBe(8);
  });
});

describe('resolvePosition — size', () => {
  it('reports the room left below the anchor', () => {
    const r = resolvePosition(input());
    expect(r.maxHeight).toBe(446); // 460 - 6 - 8
  });

  it('stays put and reports a small maxHeight when neither side fits and the top is tighter', () => {
    // top: 40px, bottom: 100px — bottom cannot fit the 160px menu but is still
    // the better of the two, so no flip; the menu must scroll instead.
    const r = resolvePosition(
      input({ anchor: { x: 400, y: 40, width: 100, height: 40 }, viewport: { width: 1000, height: 180 } }),
    );
    expect(r.placement).toBe('bottom-start');
    expect(r.maxHeight).toBe(86); // 100 - 6 - 8
  });

  it('never reports a negative maxHeight for an anchor scrolled past the bottom edge', () => {
    const r = resolvePosition(
      input({ anchor: { x: 400, y: 198, width: 100, height: 40 }, viewport: { width: 1000, height: 200 } }),
    );
    expect(r.maxHeight).toBeGreaterThanOrEqual(0);
    expect(r.maxWidth).toBeGreaterThanOrEqual(0);
  });
});

describe('resolvePosition — degenerate inputs', () => {
  it('handles a zero-size floating element (first measure pass)', () => {
    const r = resolvePosition(input({ floating: { width: 0, height: 0 } }));
    expect(Number.isFinite(r.x)).toBe(true);
    expect(Number.isFinite(r.y)).toBe(true);
  });

  it('handles an anchor larger than the viewport', () => {
    const r = resolvePosition(input({ anchor: { x: -100, y: -50, width: 1400, height: 1000 } }));
    expect(Number.isFinite(r.x)).toBe(true);
    expect(r.maxHeight).toBeGreaterThanOrEqual(0);
  });
});
