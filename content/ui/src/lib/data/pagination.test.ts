import { describe, expect, it } from 'vitest';
import { paginationRange } from './pagination';

describe('paginationRange — small ranges', () => {
  it('lists every page when they all fit', () => {
    expect(paginationRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(paginationRange(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('handles no pages and a single page', () => {
    expect(paginationRange(1, 0)).toEqual([]);
    expect(paginationRange(1, 1)).toEqual([1]);
  });
});

describe('paginationRange — windows', () => {
  it('opens with a trailing gap', () => {
    expect(paginationRange(1, 20)).toEqual([1, 2, 3, 4, 5, 'gap', 20]);
    expect(paginationRange(3, 20)).toEqual([1, 2, 3, 4, 5, 'gap', 20]);
  });

  it('ends with a leading gap', () => {
    expect(paginationRange(20, 20)).toEqual([1, 'gap', 16, 17, 18, 19, 20]);
  });

  it('brackets the middle with two gaps', () => {
    expect(paginationRange(10, 20)).toEqual([1, 'gap', 9, 10, 11, 'gap', 20]);
  });

  it('never renders a gap standing in for a single page', () => {
    /* A gap must always hide at least two pages — otherwise it costs a click
     * to reach something the pager had room to show. */
    for (let page = 1; page <= 20; page += 1) {
      const range = paginationRange(page, 20);
      range.forEach((slot, index) => {
        if (slot !== 'gap') return;
        const before = range[index - 1] as number;
        const after = range[index + 1] as number;
        expect(after - before).toBeGreaterThan(2);
      });
    }
  });

  it('opens the left window rather than hiding page 2 behind a gap', () => {
    expect(paginationRange(4, 20).slice(0, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('keeps a constant width as the window slides', () => {
    const widths = [6, 8, 10, 12, 14].map((page) => paginationRange(page, 20).length);
    expect(new Set(widths).size).toBe(1);
  });
});

describe('paginationRange — edges', () => {
  it('always keeps the first and last page reachable', () => {
    for (const page of [1, 7, 13, 20]) {
      const range = paginationRange(page, 20);
      expect(range[0]).toBe(1);
      expect(range[range.length - 1]).toBe(20);
    }
  });

  it('clamps an out-of-bounds page instead of producing nonsense', () => {
    expect(paginationRange(0, 20)).toEqual(paginationRange(1, 20));
    expect(paginationRange(99, 20)).toEqual(paginationRange(20, 20));
  });

  it('widens the window with more siblings', () => {
    expect(paginationRange(10, 20, 2)).toEqual([1, 'gap', 8, 9, 10, 11, 12, 'gap', 20]);
  });
});
