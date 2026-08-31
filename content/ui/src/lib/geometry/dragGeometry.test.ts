import { describe, expect, it } from 'vitest';
import {
  activationExceeded,
  autoScrollVelocity,
  hitTest,
  layerOrigin,
  nearestTarget,
  resolveTarget,
  type DropTarget,
} from './dragGeometry';

describe('activationExceeded', () => {
  it('is false below the threshold and true at or past it', () => {
    const start = { x: 100, y: 100 };
    expect(activationExceeded(start, { x: 103, y: 100 }, 5)).toBe(false);
    expect(activationExceeded(start, { x: 105, y: 100 }, 5)).toBe(true);
  });

  it('measures the diagonal, not either axis alone', () => {
    /* 4px right and 4px down is 5.66px of travel. */
    expect(activationExceeded({ x: 0, y: 0 }, { x: 4, y: 4 }, 5)).toBe(true);
  });

  it('ignores direction', () => {
    expect(activationExceeded({ x: 0, y: 0 }, { x: -6, y: 0 }, 5)).toBe(true);
  });
});

/* A board: three columns side by side, with a card inside the first. */
const COLUMNS: DropTarget[] = [
  { id: 'new', rect: { x: 0, y: 0, width: 280, height: 600 } },
  { id: 'ready', rect: { x: 300, y: 0, width: 280, height: 600 } },
  { id: 'won', rect: { x: 600, y: 0, width: 280, height: 600 }, disabled: true },
];

describe('hitTest', () => {
  it('finds the column under the pointer', () => {
    expect(hitTest({ x: 150, y: 200 }, COLUMNS)).toBe('new');
    expect(hitTest({ x: 400, y: 200 }, COLUMNS)).toBe('ready');
  });

  it('returns null in the gutter', () => {
    expect(hitTest({ x: 290, y: 200 }, COLUMNS)).toBeNull();
  });

  it('skips a disabled target even when the pointer is inside it', () => {
    expect(hitTest({ x: 700, y: 200 }, COLUMNS)).toBeNull();
  });

  it('prefers the smallest containing rect, so a nested drop zone wins', () => {
    const nested: DropTarget[] = [...COLUMNS, { id: 'new-top', rect: { x: 0, y: 0, width: 280, height: 60 } }];
    expect(hitTest({ x: 150, y: 30 }, nested)).toBe('new-top');
    expect(hitTest({ x: 150, y: 200 }, nested)).toBe('new');
  });

  it('counts the boundary as inside', () => {
    expect(hitTest({ x: 280, y: 600 }, COLUMNS)).toBe('new');
  });

  it('is null with no targets at all', () => {
    expect(hitTest({ x: 10, y: 10 }, [])).toBeNull();
  });
});

describe('nearestTarget', () => {
  it('picks the closer side of a gutter', () => {
    expect(nearestTarget({ x: 285, y: 200 }, COLUMNS, 48)).toBe('new');
    expect(nearestTarget({ x: 296, y: 200 }, COLUMNS, 48)).toBe('ready');
  });

  it('gives up past maxDistance', () => {
    expect(nearestTarget({ x: 150, y: 900 }, COLUMNS, 48)).toBeNull();
  });

  it('never returns a disabled target', () => {
    expect(nearestTarget({ x: 590, y: 200 }, COLUMNS, 48)).toBe('ready');
  });
});

describe('resolveTarget', () => {
  it('prefers containment over proximity', () => {
    expect(resolveTarget({ x: 279, y: 200 }, COLUMNS)).toBe('new');
  });

  it('falls back to the nearest column when released in the gutter', () => {
    expect(resolveTarget({ x: 296, y: 200 }, COLUMNS)).toBe('ready');
  });

  it('is null when the pointer is nowhere near the board', () => {
    expect(resolveTarget({ x: 150, y: 2000 }, COLUMNS)).toBeNull();
  });
});

const VIEWPORT = { x: 0, y: 0, width: 1000, height: 600 };

describe('autoScrollVelocity', () => {
  it('is still in the middle', () => {
    expect(autoScrollVelocity({ x: 500, y: 300 }, VIEWPORT)).toEqual({ x: 0, y: 0 });
  });

  it('scrolls left near the left edge and right near the right edge', () => {
    expect(autoScrollVelocity({ x: 10, y: 300 }, VIEWPORT).x).toBeLessThan(0);
    expect(autoScrollVelocity({ x: 990, y: 300 }, VIEWPORT).x).toBeGreaterThan(0);
  });

  it('ramps quadratically — deeper into the zone is disproportionately faster', () => {
    const shallow = Math.abs(autoScrollVelocity({ x: 45, y: 300 }, VIEWPORT).x);
    const deep = Math.abs(autoScrollVelocity({ x: 15, y: 300 }, VIEWPORT).x);
    expect(deep).toBeGreaterThan(shallow * 2);
  });

  it('caps at maxSpeed once the pointer is past the edge', () => {
    const speed = autoScrollVelocity({ x: -100, y: 300 }, VIEWPORT, { maxSpeed: 24 }).x;
    expect(speed).toBe(-24);
  });

  it('does not scroll horizontally for a pointer far above or below', () => {
    expect(autoScrollVelocity({ x: 10, y: -400 }, VIEWPORT).x).toBe(0);
    expect(autoScrollVelocity({ x: 10, y: 1200 }, VIEWPORT).x).toBe(0);
  });

  it('handles both axes at once in a corner', () => {
    const velocity = autoScrollVelocity({ x: 10, y: 10 }, VIEWPORT);
    expect(velocity.x).toBeLessThan(0);
    expect(velocity.y).toBeLessThan(0);
  });

  it('respects a custom edge band', () => {
    expect(autoScrollVelocity({ x: 80, y: 300 }, VIEWPORT, { edge: 60 }).x).toBe(0);
    expect(autoScrollVelocity({ x: 80, y: 300 }, VIEWPORT, { edge: 120 }).x).toBeLessThan(0);
  });
});

describe('layerOrigin', () => {
  it('keeps the grab point under the pointer', () => {
    expect(layerOrigin({ x: 400, y: 300 }, { x: 20, y: 12 })).toEqual({ x: 380, y: 288 });
  });
});
