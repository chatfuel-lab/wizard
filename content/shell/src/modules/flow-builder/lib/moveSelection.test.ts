import { describe, expect, it } from 'vitest';
import { moveSelection, type MovableBlock } from './moveSelection';

const block = (id: string, positionX: number, positionY: number): MovableBlock => ({
  id,
  positionX,
  positionY,
});

const flow = [block('a', 100, 100), block('b', 400, 100), block('c', 250, 340)];

describe('moveSelection', () => {
  it('moves one block to where it was dropped', () => {
    expect(moveSelection(flow, new Set(['a']), 'a', { x: 220, y: 260 })).toEqual([
      { blockID: 'a', positionX: 220, positionY: 260 },
    ]);
  });

  it('carries the rest of the selection by the same delta', () => {
    const updates = moveSelection(flow, new Set(['a', 'b', 'c']), 'a', { x: 160, y: 40 });
    expect(updates).toEqual([
      { blockID: 'a', positionX: 160, positionY: 40 },
      { blockID: 'b', positionX: 460, positionY: 40 },
      { blockID: 'c', positionX: 310, positionY: 280 },
    ]);
  });

  it('keeps every relative offset in the group exactly', () => {
    const updates = moveSelection(flow, new Set(['a', 'b', 'c']), 'c', { x: -75.4, y: 12.6 });
    const gap = (from: string, to: string) => {
      const one = updates.find((update) => update.blockID === from);
      const other = updates.find((update) => update.blockID === to);
      return { x: other!.positionX - one!.positionX, y: other!.positionY - one!.positionY };
    };
    expect(gap('a', 'b')).toEqual({ x: 300, y: 0 });
    expect(gap('a', 'c')).toEqual({ x: 150, y: 240 });
  });

  it('moves only the dragged block when the selection does not contain it', () => {
    expect(moveSelection(flow, new Set(['b', 'c']), 'a', { x: 0, y: 0 })).toEqual([
      { blockID: 'a', positionX: 0, positionY: 0 },
    ]);
  });

  it('skips a selected id the flow no longer has', () => {
    expect(moveSelection(flow, new Set(['a', 'ghost']), 'a', { x: 150, y: 150 })).toEqual([
      { blockID: 'a', positionX: 150, positionY: 150 },
    ]);
  });

  it('moves nothing when the dragged block is not in the flow', () => {
    expect(moveSelection(flow, new Set(['a', 'b']), 'ghost', { x: 10, y: 10 })).toEqual([]);
  });

  it('rounds to the Int! the server stores', () => {
    expect(moveSelection(flow, new Set(['a', 'b']), 'a', { x: 101.5, y: 99.49 })).toEqual([
      { blockID: 'a', positionX: 102, positionY: 99 },
      { blockID: 'b', positionX: 402, positionY: 99 },
    ]);
  });

  it('rounds a half the same way on both sides of zero, so the group stays rigid', () => {
    expect(moveSelection(flow, new Set(['a', 'c']), 'a', { x: -20.5, y: -20.5 })).toEqual([
      { blockID: 'a', positionX: -20, positionY: -20 },
      { blockID: 'c', positionX: 130, positionY: 220 },
    ]);
  });
});
