/**
 * Auto-layout: layered left-to-right BFS over the flow graph, fed to
 * updateBlockPositionBulk. Deterministic — same flow in, same positions out
 * (layer membership by minimum BFS depth, blocks sorted by id inside a
 * layer) — so repeated clicks are idempotent and tests can assert exact
 * coordinates. Heights vary per block; the fixed row step is a compromise
 * that keeps the projection pure (no DOM measuring).
 */
import type { BlockT, ConnectionT } from '../types';

/** Node width is w-60 (240px); the step leaves an 80px lane for edges. */
const COL_STEP = 320;
const ROW_STEP = 220;

export interface LayoutUpdate {
  blockID: string;
  positionX: number;
  positionY: number;
}

interface LayoutInput {
  blocks: readonly BlockT[];
  connections: readonly ConnectionT[];
}

/**
 * Roots (depth 0): the starting point, entry-point blocks and anything with
 * no inbound edge. Blocks reachable only through a cycle land in one trailing
 * layer after everything reachable.
 */
export function computeAutoLayout(flow: LayoutInput): LayoutUpdate[] {
  const ids = flow.blocks.map((b) => b.id).sort();
  if (ids.length === 0) return [];
  const outgoing = new Map<string, string[]>();
  const hasInbound = new Set<string>();
  for (const c of flow.connections) {
    if (c.sourceBlockID === c.targetBlockID) continue;
    const targets = outgoing.get(c.sourceBlockID) ?? [];
    targets.push(c.targetBlockID);
    outgoing.set(c.sourceBlockID, targets);
    hasInbound.add(c.targetBlockID);
  }

  const isRoot = (block: BlockT) =>
    ('isStartingPoint' in block && block.isStartingPoint) ||
    'isEntryPointEnabled' in block ||
    !hasInbound.has(block.id);
  const byId = new Map(flow.blocks.map((b) => [b.id, b]));

  const depth = new Map<string, number>();
  const queue: string[] = [];
  for (const id of ids) {
    const block = byId.get(id);
    if (block && isRoot(block)) {
      depth.set(id, 0);
      queue.push(id);
    }
  }
  while (queue.length > 0) {
    const id = queue.shift() as string;
    const next = (outgoing.get(id) ?? []).slice().sort();
    for (const target of next) {
      if (!depth.has(target) && byId.has(target)) {
        depth.set(target, (depth.get(id) ?? 0) + 1);
        queue.push(target);
      }
    }
  }

  // Cycle-only leftovers: one trailing layer, deterministic order.
  const maxDepth = Math.max(0, ...depth.values());
  for (const id of ids) {
    if (!depth.has(id)) depth.set(id, maxDepth + 1);
  }

  const rowInColumn = new Map<number, number>();
  return ids.map((id) => {
    const column = depth.get(id) ?? 0;
    const row = rowInColumn.get(column) ?? 0;
    rowInColumn.set(column, row + 1);
    return { blockID: id, positionX: column * COL_STEP, positionY: row * ROW_STEP };
  });
}
