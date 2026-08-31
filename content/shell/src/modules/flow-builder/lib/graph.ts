/**
 * Pure projection: Flow (blocks + connections) → canvas nodes/edges.
 *
 * Edge keys are built from connection PARTS, never from Connection.id —
 * ConnectionID is synthesized per-request server-side (guide.md), so ids from
 * two fetches never match. Keying on parts keeps React reconciliation stable
 * across refetches and mutation reconciles.
 *
 * Block positions are server-stored ints; there is no auto-layout. Blocks that
 * share exact coordinates get a deterministic diagonal nudge (render-only) so
 * they never stack invisibly.
 */
import { templateStrToString } from './templateStr';
import type { BlockT, ConnectionT, ElementT } from '../types';

/** Block-level "next" outlet renders under this handle id on the node. */
export const BLOCK_SOURCE_HANDLE = 'block';

/**
 * Screen pixels of air around a fitted scene, for every fit call in the
 * module. `FitOptions.padding` is pixels; the `0.2` the fit calls used to
 * pass was a fraction unit left over from an earlier canvas engine, which is
 * to say a fifth of a pixel.
 */
export const FIT_PADDING = 48;

// The canvas hands onConnect only the node id + handle id, but
// ConnectComponent needs the element id too — so element handles carry BOTH,
// joined by this separator (ids are opaque server scalars; '::' never appears
// in the seed data and is vanishingly unlikely in UUID-ish ids).
const HANDLE_ID_SEPARATOR = '::';

/** Canvas handle id for an element outlet: `<elementId>::<handleId>`. */
export function encodeHandleId(elementId: string, handleId: string): string {
  return `${elementId}${HANDLE_ID_SEPARATOR}${handleId}`;
}

/** Split an encoded element-handle id; null for anything else (e.g. "block"). */
export function decodeHandleId(encoded: string): { elementId: string; handleId: string } | null {
  const index = encoded.indexOf(HANDLE_ID_SEPARATOR);
  if (index <= 0) return null;
  const elementId = encoded.slice(0, index);
  const handleId = encoded.slice(index + HANDLE_ID_SEPARATOR.length);
  return handleId ? { elementId, handleId } : null;
}

export interface GraphNodeData {
  block: BlockT;
  /** True when a BlockToBlockConnection leaves this block — renders the block-level source handle. */
  hasNextEdge: boolean;
  [key: string]: unknown;
}

export interface GraphNode {
  id: string;
  type: 'block';
  position: { x: number; y: number };
  data: GraphNodeData;
}

/**
 * The connection parts an edge was built from — carried on the edge so
 * deletion can route to the right Disconnect mutation without parsing ids.
 */
export interface GraphEdgeData {
  kind: 'b2b' | 'c2b';
  sourceBlockID: string;
  sourceBlockElementID?: string;
  sourceHandleID?: string;
  [key: string]: unknown;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  data: GraphEdgeData;
}

export interface FlowGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** A connectable outlet inside an element (button, list row, condition handle, …). */
export interface ElementHandle {
  id: string;
  label: string;
}

/** Diagonal step (px) separating blocks that would otherwise sit on the same spot — the render nudge's hop, and `placeNewBlock`'s. */
export const NUDGE_PX = 28;

interface GraphInput {
  blocks: readonly BlockT[];
  connections: readonly ConnectionT[];
}

/**
 * The blocks a block-level "next" edge leaves. The ONE thing a node needs from
 * the connections — it decides whether the card's bottom outlet is drawn lit —
 * split out so the node projection can be keyed on this set rather than on the
 * whole connection list.
 */
export function nextEdgeSources(connections: readonly ConnectionT[]): ReadonlySet<string> {
  return new Set(connections.filter((c) => c.__typename === 'BlockToBlockConnection').map((c) => c.sourceBlockID));
}

/**
 * Blocks → nodes.
 *
 * `previous` is the last projection, and a block that has not changed gets its
 * OLD node object back — same reference, same `data`. That is what makes the
 * memoised `BlockNode` skip: every element setter answers with a new block and
 * therefore a new `blocks` array, and without this every card on the canvas
 * re-rendered for a button renamed in one of them. "Not changed" is the block
 * reference, the projected position — which includes the duplicate nudge, so a
 * neighbour moving off a shared coordinate re-projects the block it was
 * stacked on — and the lit state of the "next" outlet.
 */
export function toNodes(
  blocks: readonly BlockT[],
  nextSources: ReadonlySet<string>,
  previous: readonly GraphNode[] = [],
): GraphNode[] {
  const before = new Map(previous.map((node) => [node.id, node]));

  // Deterministic duplicate-coordinate nudge: same iteration order in, same
  // offsets out — blocks dropped on the exact same spot fan out diagonally.
  const seenCoordinates = new Map<string, number>();
  return blocks.map((block) => {
    const key = `${block.positionX}:${block.positionY}`;
    const duplicates = seenCoordinates.get(key) ?? 0;
    seenCoordinates.set(key, duplicates + 1);
    const x = block.positionX + duplicates * NUDGE_PX;
    const y = block.positionY + duplicates * NUDGE_PX;
    const hasNextEdge = nextSources.has(block.id);

    const held = before.get(block.id);
    if (
      held &&
      held.data.block === block &&
      held.data.hasNextEdge === hasNextEdge &&
      held.position.x === x &&
      held.position.y === y
    ) {
      return held;
    }
    return { id: block.id, type: 'block', position: { x, y }, data: { block, hasNextEdge } };
  });
}

/**
 * Connections → edges. Needs the blocks only for their ids: an edge whose end
 * is not on the canvas is dropped rather than drawn to nowhere.
 */
export function toEdges(blocks: readonly BlockT[], connections: readonly ConnectionT[]): GraphEdge[] {
  const blockIds = new Set(blocks.map((block) => block.id));
  const edges: GraphEdge[] = [];
  for (const connection of connections) {
    if (!blockIds.has(connection.sourceBlockID) || !blockIds.has(connection.targetBlockID)) continue;
    if (connection.__typename === 'BlockToBlockConnection') {
      edges.push({
        id: `b2b:${connection.sourceBlockID}:${connection.targetBlockID}`,
        source: connection.sourceBlockID,
        target: connection.targetBlockID,
        sourceHandle: BLOCK_SOURCE_HANDLE,
        data: { kind: 'b2b', sourceBlockID: connection.sourceBlockID },
      });
    } else if (connection.__typename === 'ComponentToBlockConnection') {
      edges.push({
        id: `c2b:${connection.sourceBlockElementID}:${connection.sourceHandleID}`,
        source: connection.sourceBlockID,
        target: connection.targetBlockID,
        // Same encoding BlockNode uses for its element <Handle> ids, so
        // existing edges anchor to the right outlet.
        sourceHandle: encodeHandleId(connection.sourceBlockElementID, connection.sourceHandleID),
        data: {
          kind: 'c2b',
          sourceBlockID: connection.sourceBlockID,
          sourceBlockElementID: connection.sourceBlockElementID,
          sourceHandleID: connection.sourceHandleID,
        },
      });
    }
  }
  return edges;
}

/**
 * The whole projection at once. The canvas memoises the two halves separately
 * (nodes on the blocks, edges on the connections); this is for everything that
 * wants both from one flow — layout, the tests, anything offline.
 */
export function toGraph(flow: GraphInput): FlowGraph {
  return {
    nodes: toNodes(flow.blocks, nextEdgeSources(flow.connections)),
    edges: toEdges(flow.blocks, flow.connections),
  };
}

/**
 * Connection outlets an element exposes, per typename (ComponentHandleIDs:
 * buttons, list rows, condition handle, nextBlockHandleID, chat-trigger
 * handleID). Unknown typenames expose none — never crash.
 */
export function extractHandles(element: ElementT): ElementHandle[] {
  switch (element.__typename) {
    case 'WidgetTextAndButtonBlockElement':
      return element.buttons.map((button, i) => ({
        id: button.id,
        label: templateStrToString(button.title) || `Button ${i + 1}`,
      }));
    case 'WhatsAppTextAndButtonsBlockElement':
    case 'WhatsAppTextAndURLBlockElement':
      return element.buttons.map((button, i) => ({
        id: button.id,
        label: templateStrToString(button.title) || `Button ${i + 1}`,
      }));
    case 'WhatsAppListBlockElement':
      return element.rows.map((row, i) => ({
        id: row.id,
        label: templateStrToString(row.title) || `Row ${i + 1}`,
      }));
    case 'WhatsAppTemplateBlockElement':
      // Quick-reply buttons are the template's connectable outlets.
      return (element.whatsAppTemplate?.buttons ?? []).flatMap((button) =>
        button.__typename === 'WhatsAppTemplateQuickReplyButton'
          ? [{ id: button.id, label: button.text || 'Quick reply' }]
          : [],
      );
    case 'SetConditionBlockElement':
      return [{ id: element.handleID, label: 'Condition met' }];
    case 'WidgetEntryPointBlockElement':
    case 'DefaultReplyBlockElement':
      return [{ id: element.nextBlockHandleID, label: 'Next' }];
    case 'TriggeredMessageBlockElement':
    case 'WhatsAppOneTimeNotificationBlockElement':
    case 'WhatsAppScheduledMessageBlockElement':
      return [{ id: element.handleID, label: 'Next' }];
    default:
      return [];
  }
}

/** A drag-to-connect drop, routed to its mutation family. */
export type ConnectPlan =
  | { kind: 'block'; request: { sourceBlockID: string; targetBlockID: string } }
  | {
      kind: 'component';
      request: { sourceBlockID: string; sourceBlockElementID: string; sourceHandleID: string; targetBlockID: string };
    };

/**
 * onConnect payload → mutation request. The block-level handle (or a
 * handle-less source) routes to ConnectBlocks; an encoded element handle
 * routes to ConnectComponent. Unrecognizable handles yield null — never fire
 * a guessed request.
 */
export function planConnection(
  source: string,
  sourceHandle: string | null | undefined,
  target: string,
): ConnectPlan | null {
  if (!sourceHandle || sourceHandle === BLOCK_SOURCE_HANDLE) {
    return { kind: 'block', request: { sourceBlockID: source, targetBlockID: target } };
  }
  const decoded = decodeHandleId(sourceHandle);
  if (!decoded) return null;
  return {
    kind: 'component',
    request: {
      sourceBlockID: source,
      sourceBlockElementID: decoded.elementId,
      sourceHandleID: decoded.handleId,
      targetBlockID: target,
    },
  };
}

/** An edge deletion, routed to its Disconnect mutation. */
export type DisconnectPlan =
  | { kind: 'block'; sourceBlockID: string }
  | { kind: 'component'; sourceBlockElementID: string; sourceHandleID: string };

/** Edge data → disconnect variables; null on foreign/incomplete edges. */
export function planDisconnect(data: GraphEdgeData | undefined): DisconnectPlan | null {
  if (!data) return null;
  if (data.kind === 'b2b') return { kind: 'block', sourceBlockID: data.sourceBlockID };
  if (data.kind === 'c2b' && data.sourceBlockElementID && data.sourceHandleID) {
    return {
      kind: 'component',
      sourceBlockElementID: data.sourceBlockElementID,
      sourceHandleID: data.sourceHandleID,
    };
  }
  return null;
}
