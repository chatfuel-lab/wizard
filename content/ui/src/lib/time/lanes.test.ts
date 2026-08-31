import { describe, expect, it } from 'vitest';
import { packLanes } from './lanes';

const item = (id: string, start: number, end: number) => ({ id, start, end });

describe('packLanes', () => {
  it('gives a lone item lane 0 of 1', () => {
    expect(packLanes([item('a', 540, 600)])).toEqual(new Map([['a', { lane: 0, lanes: 1 }]]));
    expect(packLanes([])).toEqual(new Map());
  });

  it('packs two overlapping items side by side and a third that overlaps both into a third lane', () => {
    const lanes = packLanes([item('a', 540, 600), item('b', 570, 630), item('c', 580, 590)]);
    expect(lanes.get('a')).toEqual({ lane: 0, lanes: 3 });
    expect(lanes.get('b')).toEqual({ lane: 1, lanes: 3 });
    expect(lanes.get('c')).toEqual({ lane: 2, lanes: 3 });
  });

  it('reuses the first free lane, greedily', () => {
    // a 09:00–09:30, b 09:15–09:45, c 09:30–10:00 (fits back into a's lane).
    const lanes = packLanes([item('a', 540, 570), item('b', 555, 585), item('c', 570, 600)]);
    expect(lanes.get('a')).toEqual({ lane: 0, lanes: 2 });
    expect(lanes.get('b')).toEqual({ lane: 1, lanes: 2 });
    expect(lanes.get('c')).toEqual({ lane: 0, lanes: 2 });
  });

  it('keeps clusters independent — a lone item later in the day is full width', () => {
    const lanes = packLanes([item('a', 540, 600), item('b', 570, 630), item('z', 900, 960)]);
    expect(lanes.get('a')?.lanes).toBe(2);
    expect(lanes.get('z')).toEqual({ lane: 0, lanes: 1 });
  });

  it('treats abutting items as separate clusters', () => {
    const lanes = packLanes([item('a', 540, 600), item('b', 600, 660)]);
    expect(lanes.get('a')).toEqual({ lane: 0, lanes: 1 });
    expect(lanes.get('b')).toEqual({ lane: 0, lanes: 1 });
  });

  it('is order-independent and stable on ties', () => {
    const forward = packLanes([item('a', 540, 600), item('b', 540, 600), item('c', 540, 630)]);
    const backward = packLanes([item('c', 540, 630), item('b', 540, 600), item('a', 540, 600)]);
    expect(forward).toEqual(backward);
    // Longest first on an equal start, then id.
    expect(forward.get('c')?.lane).toBe(0);
    expect(forward.get('a')?.lane).toBe(1);
    expect(forward.get('b')?.lane).toBe(2);
  });

  it('bridges a cluster through a long item', () => {
    // a spans the day; b and c never overlap each other but both overlap a.
    const lanes = packLanes([item('a', 540, 1020), item('b', 600, 660), item('c', 900, 960)]);
    expect(lanes.get('a')).toEqual({ lane: 0, lanes: 2 });
    expect(lanes.get('b')).toEqual({ lane: 1, lanes: 2 });
    expect(lanes.get('c')).toEqual({ lane: 1, lanes: 2 });
  });

  it('survives an inverted item without a lane explosion', () => {
    const lanes = packLanes([item('bad', 600, 540), item('a', 540, 600)]);
    expect(lanes.get('bad')?.lane).toBeGreaterThanOrEqual(0);
    expect(lanes.get('a')).toBeDefined();
  });
});
