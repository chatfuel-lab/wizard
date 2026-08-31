import { describe, expect, it } from 'vitest';
import { DEFAULT_OVERSCAN, indexAtOffset, rowOffsets, virtualWindow, type MeasureRow } from './virtualList';

/** 100px rows: an index is its own offset divided by 100, which keeps the
    assertions readable when the window is what is under test. */
const flat: MeasureRow = () => 100;

describe('rowOffsets', () => {
  it('is one longer than the row count and ends at the total height', () => {
    const offsets = rowOffsets(3, 50);
    expect(offsets).toEqual([0, 50, 100, 150]);
  });

  it('is a single zero for an empty list', () => {
    expect(rowOffsets(0, 50)).toEqual([0]);
  });

  it('mixes measured rows with estimates for the ones never rendered', () => {
    const measured = new Map([
      [0, 30],
      [2, 210],
    ]);
    expect(rowOffsets(4, 50, (index) => measured.get(index))).toEqual([0, 30, 80, 290, 340]);
  });

  it('ignores a measurement that cannot be a height', () => {
    /* offsetHeight is 0 for a row whose ancestor is display:none, and NaN is
       what an unfinished measurement reads as. Either one would collapse the
       scrollbar and teleport the reader. */
    const bogus: MeasureRow = (index) => [0, -20, Number.NaN, undefined][index];
    expect(rowOffsets(4, 50, bogus)).toEqual([0, 50, 100, 150, 200]);
  });

  it('survives a nonsense count or estimate rather than allocating forever', () => {
    expect(rowOffsets(-3, 50)).toEqual([0]);
    expect(rowOffsets(Number.NaN, 50)).toEqual([0]);
    expect(rowOffsets(2, Number.NaN)).toEqual([0, 0, 0]);
  });
});

describe('indexAtOffset', () => {
  const offsets = rowOffsets(5, 100);

  it('finds the row an offset falls inside', () => {
    expect(indexAtOffset(offsets, 0)).toBe(0);
    expect(indexAtOffset(offsets, 99)).toBe(0);
    expect(indexAtOffset(offsets, 100)).toBe(1);
    expect(indexAtOffset(offsets, 250)).toBe(2);
  });

  it('clamps at both ends, including an overscroll bounce', () => {
    expect(indexAtOffset(offsets, -400)).toBe(0);
    expect(indexAtOffset(offsets, 500)).toBe(4);
    expect(indexAtOffset(offsets, 99_999)).toBe(4);
    expect(indexAtOffset(offsets, Number.NaN)).toBe(0);
  });

  it('answers 0 for an empty list instead of -1', () => {
    expect(indexAtOffset(rowOffsets(0, 100), 0)).toBe(0);
  });

  it('agrees with a linear scan over uneven rows', () => {
    const heights = [12, 480, 33, 7, 260, 91, 140];
    const uneven = rowOffsets(heights.length, 40, (index) => heights[index]);
    const total = uneven[uneven.length - 1]!;
    for (let offset = 0; offset < total; offset += 1) {
      let expected = 0;
      while (expected + 1 < heights.length && uneven[expected + 1]! <= offset) expected += 1;
      expect(indexAtOffset(uneven, offset)).toBe(expected);
    }
  });
});

describe('virtualWindow', () => {
  const base = { count: 100, estimateHeight: 100, measure: flat, overscan: 0 };

  it('renders exactly the rows the viewport covers', () => {
    const window = virtualWindow({ ...base, scrollTop: 0, viewportHeight: 500 });
    expect(window.start).toBe(0);
    /* end is exclusive: rows 0..5, because the 500px viewport ends ON the top
       edge of row 5 and a row whose first pixel is visible has to render. */
    expect(window.end).toBe(6);
  });

  it('moves the window with the scroll position', () => {
    const window = virtualWindow({ ...base, scrollTop: 1000, viewportHeight: 500 });
    expect(window.start).toBe(10);
    expect(window.end).toBe(16);
  });

  it('pads the skipped rows so the scrollbar does not move', () => {
    const window = virtualWindow({ ...base, scrollTop: 1000, viewportHeight: 500 });
    expect(window.paddingTop).toBe(1000);
    expect(window.paddingBottom).toBe(10_000 - 1600);
    expect(window.totalHeight).toBe(10_000);
    /* The invariant the whole thing rests on. */
    expect(window.paddingTop + (window.end - window.start) * 100 + window.paddingBottom).toBe(window.totalHeight);
  });

  it('adds overscan rows on both sides', () => {
    const window = virtualWindow({ ...base, scrollTop: 1000, viewportHeight: 500, overscan: 3 });
    expect(window.start).toBe(7);
    expect(window.end).toBe(19);
    expect(window.paddingTop).toBe(700);
  });

  it('clips overscan at the ends rather than producing negative padding', () => {
    const top = virtualWindow({ ...base, scrollTop: 0, viewportHeight: 500, overscan: 8 });
    expect(top.start).toBe(0);
    expect(top.paddingTop).toBe(0);

    const bottom = virtualWindow({ ...base, scrollTop: 9500, viewportHeight: 500, overscan: 8 });
    expect(bottom.end).toBe(100);
    expect(bottom.paddingBottom).toBe(0);
  });

  it('defaults to a few rows of overscan', () => {
    const window = virtualWindow({
      count: 100,
      estimateHeight: 100,
      measure: flat,
      scrollTop: 1000,
      viewportHeight: 500,
    });
    expect(window.start).toBe(10 - DEFAULT_OVERSCAN);
    expect(window.end).toBe(16 + DEFAULT_OVERSCAN);
  });

  it('is empty for an empty list', () => {
    expect(virtualWindow({ ...base, count: 0, scrollTop: 0, viewportHeight: 500 })).toEqual({
      start: 0,
      end: 0,
      paddingTop: 0,
      paddingBottom: 0,
      totalHeight: 0,
    });
  });

  it('still renders a row before the scroller has been measured', () => {
    /* viewportHeight is 0 on the first paint. An empty window there renders
       nothing, so nothing is ever measured, so the window stays 0 forever. */
    const window = virtualWindow({ ...base, scrollTop: 0, viewportHeight: 0 });
    expect(window.end).toBeGreaterThan(window.start);
  });

  it('shortens the content as measurements come in taller or shorter than the estimate', () => {
    const measured = virtualWindow({
      count: 4,
      estimateHeight: 100,
      overscan: 0,
      scrollTop: 0,
      viewportHeight: 500,
      measure: (index) => (index < 2 ? 40 : undefined),
    });
    expect(measured.totalHeight).toBe(40 + 40 + 100 + 100);
  });

  it('holds the last window when the scroller overscrolls past the end', () => {
    const window = virtualWindow({ ...base, scrollTop: 99_999, viewportHeight: 500 });
    expect(window.end).toBe(100);
    expect(window.paddingBottom).toBe(0);
  });

  it('treats nonsense scroll metrics as the top of the list', () => {
    const window = virtualWindow({
      ...base,
      scrollTop: Number.NaN,
      viewportHeight: Number.NaN,
      overscan: Number.NaN,
    });
    expect(window.start).toBe(0);
    expect(window.end).toBeGreaterThan(0);
  });

  it('accepts offsets a caller already built, and answers identically', () => {
    const input = { ...base, scrollTop: 1000, viewportHeight: 500, overscan: 3 };
    const shared = rowOffsets(input.count, input.estimateHeight, input.measure);
    expect(virtualWindow({ ...input, offsets: shared })).toEqual(virtualWindow(input));
  });

  it('rebuilds rather than trusting offsets of the wrong length', () => {
    /* A stale array is a window pointing at rows that no longer exist, which is
       worse than the pass it saves. */
    const input = { ...base, scrollTop: 1000, viewportHeight: 500 };
    const stale = rowOffsets(3, 100, flat);
    expect(virtualWindow({ ...input, offsets: stale })).toEqual(virtualWindow(input));
  });

  it('never asks for a row that does not exist', () => {
    const heights = [80, 20, 300, 45, 130, 60, 210, 90];
    for (const scrollTop of [-50, 0, 137, 500, 940, 5000]) {
      for (const overscan of [0, 2, 40]) {
        const window = virtualWindow({
          count: heights.length,
          estimateHeight: 100,
          measure: (index) => heights[index],
          scrollTop,
          viewportHeight: 300,
          overscan,
        });
        expect(window.start).toBeGreaterThanOrEqual(0);
        expect(window.end).toBeLessThanOrEqual(heights.length);
        expect(window.end).toBeGreaterThan(window.start);
        expect(window.paddingTop).toBeGreaterThanOrEqual(0);
        expect(window.paddingBottom).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
