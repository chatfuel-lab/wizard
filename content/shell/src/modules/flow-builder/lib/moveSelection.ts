import type { BlockPositionBulkUpdate } from '~api/generated/flow-builder/graphql';

/**
 * What a drag that ended means for every block it moved.
 *
 * The canvas hands back one thing — where the block under the pointer was
 * dropped — and a group drag has to turn that into a position for each of the
 * others. The whole of that is arithmetic over the flow's own coordinates, so
 * it lives here rather than in the drag-end handler: vitest is node-only, and a
 * rule inside a component is a rule nothing can check.
 *
 * Only the three fields a move reads, so a test case is three numbers rather
 * than a whole `BlockT` union member.
 */
export interface MovableBlock {
  id: string;
  positionX: number;
  positionY: number;
}

/**
 * The dragged block's displacement, applied to everything selected with it.
 *
 * ## Dragging a node outside the selection moves only that node
 *
 * Pressing a node that is not selected replaces the selection with it, so the
 * usual way to reach this is shift-clicking a selected node — which deselects
 * it — and then dragging it. That gesture means "move this one out of the
 * group", and carrying the group along would be the opposite of what was asked.
 *
 * ## Rounding, per block rather than once on the delta
 *
 * Positions are server-stored `Int!`s, so the delta is rounded away somewhere;
 * the question is where. Rounding each block's FINAL position guarantees the
 * dragged block lands exactly where it was dropped, which is the thing the user
 * watched happen. Relative offsets survive it too, because every position that
 * reaches this is already a whole number — `Math.round(n + d)` and
 * `n + Math.round(d)` agree for integer `n`.
 */
export function moveSelection(
  blocks: readonly MovableBlock[],
  selected: ReadonlySet<string>,
  draggedId: string,
  to: { x: number; y: number },
): BlockPositionBulkUpdate[] {
  const dragged = blocks.find((block) => block.id === draggedId);
  /* No block, no delta. A selection can outlive the blocks in it — another tab
     deleted one, a refetch landed mid-gesture — and inventing a displacement
     from a position nobody has is worse than moving nothing. */
  if (!dragged) return [];

  const dx = to.x - dragged.positionX;
  const dy = to.y - dragged.positionY;
  const moving = selected.has(draggedId) ? selected : new Set([draggedId]);

  /* Driven by the flow's own list, not by the selection: an id the selection
     still holds and the flow no longer has is skipped by construction, and the
     order out is the order the blocks are in — the same batch twice for the
     same gesture. */
  return blocks
    .filter((block) => moving.has(block.id))
    .map((block) => ({
      blockID: block.id,
      positionX: Math.round(block.positionX + dx),
      positionY: Math.round(block.positionY + dy),
    }));
}
