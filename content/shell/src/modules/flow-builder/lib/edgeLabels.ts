import { extractHandles } from './graph';
import type { BlockT } from '../types';

/**
 * What each component edge should be labelled with — the outlet it leaves from.
 *
 * Without this an edge is an anonymous line. A block with four buttons has four
 * lines coming out of its right-hand side, and the only way to learn which one
 * is "Yes" is to trace it back to the pip it starts at and read the row above
 * it. The label puts the answer on the line.
 *
 * Keyed by edge id rather than by handle, because that is what `CanvasEdges`
 * asks with, and the id `toGraph` mints for a component edge
 * (`c2b:<elementID>:<handleID>`) already carries both parts.
 *
 * Block-level edges get nothing. There is at most one per block and it means
 * "and then", which a line already says.
 *
 * Takes the blocks and not the flow, so a caller can memoise on exactly what it
 * reads: every element setter returns a new `flow` object, and keyed on that a
 * button rename would rebuild every label on the canvas.
 */
export function outletLabels(blocks: readonly BlockT[]): Map<string, string> {
  const byHandle = new Map<string, string>();
  for (const block of blocks) {
    for (const element of block.blockElements) {
      for (const handle of extractHandles(element)) {
        byHandle.set(`c2b:${element.id}:${handle.id}`, handle.label);
      }
    }
  }
  return byHandle;
}
