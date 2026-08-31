import { describe, expect, it } from 'vitest';
import {
  clampTo,
  contains,
  covers,
  intersect,
  isEmpty,
  merge,
  normalize,
  overlaps,
  sliceSlots,
  subtract,
  totalLength,
} from './intervals';

const I = (start: number, end: number) => ({ start, end });

describe('normalize / merge', () => {
  it('sorts, drops empties, merges overlaps AND abutments', () => {
    expect(normalize([I(600, 660), I(540, 600), I(700, 700), I(650, 720)])).toEqual([I(540, 720)]);
    expect(normalize([I(10, 5)])).toEqual([]);
    expect(normalize([I(0, 60), I(120, 180)])).toEqual([I(0, 60), I(120, 180)]);
    expect(normalize([I(Number.NaN, 5), I(1, Number.POSITIVE_INFINITY)])).toEqual([]);
  });

  it('does not mutate its input', () => {
    const input = [I(60, 120), I(0, 60)];
    normalize(input);
    expect(input).toEqual([I(60, 120), I(0, 60)]);
  });

  it('merge is the union of two lists', () => {
    expect(merge([I(0, 60)], [I(30, 90), I(200, 210)])).toEqual([I(0, 90), I(200, 210)]);
    expect(merge([I(0, 60)])).toEqual([I(0, 60)]);
  });

  it('isEmpty', () => {
    expect(isEmpty(I(5, 5))).toBe(true);
    expect(isEmpty(I(5, 6))).toBe(false);
  });
});

describe('subtract', () => {
  it('cuts holes, trims ends, removes whole pieces', () => {
    // 09:00–18:00 minus a 13:00–14:00 break minus two bookings.
    expect(subtract([I(540, 1080)], [I(780, 840), I(600, 630), I(1050, 1100)])).toEqual([
      I(540, 600),
      I(630, 780),
      I(840, 1050),
    ]);
    expect(subtract([I(0, 100)], [I(0, 100)])).toEqual([]);
    expect(subtract([I(0, 100)], [I(-10, 200)])).toEqual([]);
    expect(subtract([I(0, 100)], [])).toEqual([I(0, 100)]);
    expect(subtract([], [I(0, 100)])).toEqual([]);
  });

  it('treats an abutting hole as no hole', () => {
    expect(subtract([I(0, 100)], [I(100, 200)])).toEqual([I(0, 100)]);
    expect(subtract([I(100, 200)], [I(0, 100)])).toEqual([I(100, 200)]);
  });
});

describe('intersect / clampTo', () => {
  it('keeps only what both lists cover', () => {
    expect(intersect([I(0, 100), I(200, 300)], [I(50, 250)])).toEqual([I(50, 100), I(200, 250)]);
    expect(intersect([I(0, 100)], [I(100, 200)])).toEqual([]);
    expect(intersect([I(0, 100)], [])).toEqual([]);
  });

  it('clampTo trims to bounds', () => {
    expect(clampTo([I(-60, 30), I(1400, 1500)], I(0, 1440))).toEqual([I(0, 30), I(1400, 1440)]);
  });
});

describe('contains / covers / overlaps', () => {
  it('is half-open at the end', () => {
    expect(contains(I(0, 60), 0)).toBe(true);
    expect(contains(I(0, 60), 59)).toBe(true);
    expect(contains(I(0, 60), 60)).toBe(false);
  });

  it('covers needs ONE normalized piece to hold the whole target', () => {
    expect(covers([I(0, 60), I(60, 120)], I(30, 90))).toBe(true); // abutting pieces merge
    expect(covers([I(0, 60), I(70, 120)], I(30, 90))).toBe(false);
    expect(covers([I(0, 60)], I(60, 60))).toBe(true); // empty target
    expect(covers([], I(0, 1))).toBe(false);
  });

  it('abutting is not overlapping', () => {
    expect(overlaps(I(0, 60), I(60, 120))).toBe(false);
    expect(overlaps(I(0, 61), I(60, 120))).toBe(true);
  });
});

describe('totalLength', () => {
  it('counts overlapping time once', () => {
    expect(totalLength([I(0, 60), I(30, 90)])).toBe(90);
    expect(totalLength([])).toBe(0);
  });
});

describe('sliceSlots — classic (free-time) semantics', () => {
  it('yields every start where the whole duration fits, on the step grid from 00:00', () => {
    // 09:00–10:00 free, 30-min service, 15-min step: 09:00, 09:15, 09:30.
    expect(sliceSlots([I(540, 600)], 30, 15)).toEqual([540, 555, 570]);
  });

  it('aligns to the step grid by default, or to the period start on request', () => {
    // 09:10–10:00: grid-aligned → 09:15, 09:30; start-aligned → 09:10, 09:25.
    expect(sliceSlots([I(550, 600)], 30, 15)).toEqual([555, 570]);
    expect(sliceSlots([I(550, 600)], 30, 15, { alignTo: 'start' })).toEqual([550, 565]);
  });

  it('merges overlapping free periods and dedupes starts', () => {
    expect(sliceSlots([I(540, 570), I(555, 600)], 30, 15)).toEqual([540, 555, 570]);
  });

  it('returns nothing for a period shorter than the duration, or bad arguments', () => {
    expect(sliceSlots([I(540, 560)], 30, 15)).toEqual([]);
    expect(sliceSlots([I(540, 600)], 0, 15)).toEqual([]);
    expect(sliceSlots([I(540, 600)], 30, 0)).toEqual([]);
    expect(sliceSlots([], 30, 15)).toEqual([]);
  });
});

describe('sliceSlots — endInclusive (the server’s start-time periods)', () => {
  it('reads end as the LAST valid start', () => {
    // Server: {start:'09:00', end:'17:30'} for a 30-min service ending 18:00.
    const starts = sliceSlots([I(540, 1050)], 30, 30, { endInclusive: true });
    expect(starts[0]).toBe(540);
    expect(starts[starts.length - 1]).toBe(1050);
    expect(starts).toHaveLength(18);
  });

  it('agrees with the classic reading of the same day once end is widened by the duration', () => {
    const server = sliceSlots([I(540, 1050)], 30, 15, { endInclusive: true });
    const classic = sliceSlots([I(540, 1080)], 30, 15);
    expect(server).toEqual(classic);
  });

  it('keeps a single-start period that the classic reading would call empty', () => {
    expect(sliceSlots([I(1050, 1050)], 30, 15, { endInclusive: true })).toEqual([1050]);
    expect(sliceSlots([I(1050, 1050)], 30, 15)).toEqual([]);
  });

  it('still drops an inverted period', () => {
    expect(sliceSlots([I(600, 540)], 30, 15, { endInclusive: true })).toEqual([]);
  });

  it('does not depend on the duration — the server already subtracted it', () => {
    expect(sliceSlots([I(540, 1050)], 90, 15, { endInclusive: true })).toEqual(
      sliceSlots([I(540, 1050)], 30, 15, { endInclusive: true }),
    );
  });
});
