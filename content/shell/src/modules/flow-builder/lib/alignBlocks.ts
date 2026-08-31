import type { BlockPositionBulkUpdate } from '~api/generated/flow-builder/graphql';
import type { MovableBlock } from './moveSelection';

export type AlignEdge = 'left' | 'top';

/**
 * Line the selection up along its leading edge, as one bulk move.
 *
 * "Leading" is the smallest coordinate among the selected blocks — the
 * leftmost block's left, the topmost block's top — because that is the block
 * that stays put, and the one that stays put should be the one the user most
 * likely lined the others up against. Only blocks that actually move are in
 * the batch, so a selection already aligned produces an empty request rather
 * than a round trip that changes nothing.
 *
 * Fewer than two selected blocks is nothing to align, and the ActionBar reads
 * that as "do not offer it": aligning one block to itself is a button that
 * does nothing.
 */
export function alignBlocks(
  blocks: readonly MovableBlock[],
  selected: ReadonlySet<string>,
  edge: AlignEdge,
): BlockPositionBulkUpdate[] {
  const chosen = blocks.filter((block) => selected.has(block.id));
  if (chosen.length < 2) return [];
  const axis = edge === 'left' ? 'positionX' : 'positionY';
  const target = Math.min(...chosen.map((block) => block[axis]));
  return chosen
    .filter((block) => block[axis] !== target)
    .map((block) => ({
      blockID: block.id,
      positionX: edge === 'left' ? target : block.positionX,
      positionY: edge === 'top' ? target : block.positionY,
    }));
}
