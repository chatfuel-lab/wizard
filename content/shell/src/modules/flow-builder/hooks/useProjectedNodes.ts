import { useEffect, useMemo, useRef } from 'react';
import { nextEdgeSources, toNodes, type GraphNode } from '../lib/graph';
import type { BlockT, ConnectionT } from '../types';

/**
 * The node half of the projection, memoised on what nodes are made of.
 *
 * `toGraph(flow)` on `flow` was the whole projection on the whole flow, and
 * every element setter returns a NEW flow: a button renamed in one block
 * re-projected every node and every edge, and every `BlockNode` — memoised on
 * its `data`, which was a fresh object each time — re-rendered to draw the same
 * card. Nodes are now keyed on `blocks` and on the one set the connections
 * contribute (which "next" outlets are lit), and `toNodes` hands back the old
 * node object for any block that did not change, which is what lets the memo
 * hold. The previous projection is carried in a ref, written after commit, so
 * a render React throws away cannot leave a projection nothing rendered as
 * "previous".
 */
export function useProjectedNodes(blocks: readonly BlockT[], connections: readonly ConnectionT[]): GraphNode[] {
  const nextSources = useMemo(() => nextEdgeSources(connections), [connections]);
  const previous = useRef<GraphNode[]>([]);
  const nodes = useMemo(() => toNodes(blocks, nextSources, previous.current), [blocks, nextSources]);
  useEffect(() => {
    previous.current = nodes;
  }, [nodes]);
  return nodes;
}
