import { describe, expect, it } from 'vitest';
import { alignBlocks } from './alignBlocks';

const block = (id: string, positionX: number, positionY: number) => ({ id, positionX, positionY });

describe('alignBlocks', () => {
  const blocks = [block('a', 100, 50), block('b', 340, 20), block('c', 220, 90), block('d', 900, 900)];

  it('aligns the selection to its leftmost block, leaving that one alone', () => {
    expect(alignBlocks(blocks, new Set(['a', 'b', 'c']), 'left')).toEqual([
      { blockID: 'b', positionX: 100, positionY: 20 },
      { blockID: 'c', positionX: 100, positionY: 90 },
    ]);
  });

  it('aligns the selection to its topmost block, leaving that one alone', () => {
    expect(alignBlocks(blocks, new Set(['a', 'b', 'c']), 'top')).toEqual([
      { blockID: 'a', positionX: 100, positionY: 20 },
      { blockID: 'c', positionX: 220, positionY: 20 },
    ]);
  });

  it('touches nothing outside the selection', () => {
    const updates = alignBlocks(blocks, new Set(['a', 'b']), 'left');
    expect(updates.map((u) => u.blockID)).not.toContain('c');
    expect(updates.map((u) => u.blockID)).not.toContain('d');
  });

  it('is nothing to do for one block, for none, or for a selection already aligned', () => {
    expect(alignBlocks(blocks, new Set(['a']), 'left')).toEqual([]);
    expect(alignBlocks(blocks, new Set(), 'top')).toEqual([]);
    expect(alignBlocks([block('x', 5, 5), block('y', 5, 80)], new Set(['x', 'y']), 'left')).toEqual([]);
  });

  it('ignores ids the flow no longer has', () => {
    expect(alignBlocks(blocks, new Set(['a', 'ghost']), 'left')).toEqual([]);
    expect(alignBlocks(blocks, new Set(['a', 'b', 'ghost']), 'left')).toHaveLength(1);
  });
});
