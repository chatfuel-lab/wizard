import { describe, expect, it } from 'vitest';
import {
  BLOCK_SOURCE_HANDLE,
  decodeHandleId,
  encodeHandleId,
  extractHandles,
  nextEdgeSources,
  planConnection,
  planDisconnect,
  toEdges,
  toGraph,
  toNodes,
} from './graph';
import { templateStrFromString } from './templateStr';
import type { BlockT, ConnectionT, ElementT } from '../types';

const block = (id: string, x: number, y: number, elements: unknown[] = []): BlockT =>
  ({
    __typename: 'RegularContentBlock',
    id,
    name: `Block ${id}`,
    positionX: x,
    positionY: y,
    platform: 'widget',
    isStartingPoint: false,
    blockElements: elements,
  }) as unknown as BlockT;

const b2b = (source: string, target: string): ConnectionT => ({
  __typename: 'BlockToBlockConnection',
  id: `synthesized-${Math.random()}`, // per-request id — must never be used as a key
  sourceBlockID: source,
  targetBlockID: target,
});

const c2b = (source: string, elementId: string, handleId: string, target: string): ConnectionT => ({
  __typename: 'ComponentToBlockConnection',
  id: `synthesized-${Math.random()}`,
  sourceBlockID: source,
  sourceBlockElementID: elementId,
  sourceHandleID: handleId,
  targetBlockID: target,
});

describe('toGraph', () => {
  it('maps blocks to nodes at their server positions', () => {
    const graph = toGraph({ blocks: [block('a', 100, 200), block('b', 400, 80)], connections: [] });
    expect(graph.nodes.map((n) => ({ id: n.id, ...n.position }))).toEqual([
      { id: 'a', x: 100, y: 200 },
      { id: 'b', x: 400, y: 80 },
    ]);
    expect(graph.nodes.every((n) => n.type === 'block')).toBe(true);
  });

  it('nudges exact-duplicate coordinates deterministically so nodes never stack', () => {
    const blocks = [block('a', 100, 100), block('b', 100, 100), block('c', 100, 100)];
    const first = toGraph({ blocks, connections: [] });
    const second = toGraph({ blocks, connections: [] });
    const positions = first.nodes.map((n) => n.position);
    expect(new Set(positions.map((p) => `${p.x}:${p.y}`)).size).toBe(3);
    expect(positions[0]).toEqual({ x: 100, y: 100 }); // first stays put
    expect(second.nodes.map((n) => n.position)).toEqual(positions); // deterministic
  });

  it('keys edges on connection parts, never on the synthesized connection id', () => {
    const graph = toGraph({
      blocks: [block('a', 0, 0), block('b', 300, 0)],
      connections: [b2b('a', 'b'), c2b('a', 'el-1', 'btn-1', 'b')],
    });
    const again = toGraph({
      blocks: [block('a', 0, 0), block('b', 300, 0)],
      connections: [b2b('a', 'b'), c2b('a', 'el-1', 'btn-1', 'b')],
    });
    expect(graph.edges.map((e) => e.id)).toEqual(['b2b:a:b', 'c2b:el-1:btn-1']);
    expect(again.edges.map((e) => e.id)).toEqual(graph.edges.map((e) => e.id)); // stable across "fetches"
  });

  it('routes block-to-block edges through the block-level handle and component edges through their encoded handle', () => {
    const graph = toGraph({
      blocks: [block('a', 0, 0), block('b', 300, 0)],
      connections: [b2b('a', 'b'), c2b('a', 'el-1', 'btn-1', 'b')],
    });
    const [blockEdge, componentEdge] = graph.edges;
    expect(blockEdge).toMatchObject({ source: 'a', target: 'b', sourceHandle: BLOCK_SOURCE_HANDLE });
    // Must match the Handle ids BlockNode renders (encodeHandleId), or the
    // edge floats detached from its outlet.
    expect(componentEdge).toMatchObject({ source: 'a', target: 'b', sourceHandle: encodeHandleId('el-1', 'btn-1') });
  });

  it('carries the connection parts on edge data for disconnect routing', () => {
    const graph = toGraph({
      blocks: [block('a', 0, 0), block('b', 300, 0)],
      connections: [b2b('a', 'b'), c2b('a', 'el-1', 'btn-1', 'b')],
    });
    expect(graph.edges.map((e) => e.data)).toEqual([
      { kind: 'b2b', sourceBlockID: 'a' },
      { kind: 'c2b', sourceBlockID: 'a', sourceBlockElementID: 'el-1', sourceHandleID: 'btn-1' },
    ]);
  });

  it('flags hasNextEdge only on blocks with an outbound block-to-block connection', () => {
    const graph = toGraph({
      blocks: [block('a', 0, 0), block('b', 300, 0)],
      connections: [b2b('a', 'b')],
    });
    expect(graph.nodes.find((n) => n.id === 'a')?.data.hasNextEdge).toBe(true);
    expect(graph.nodes.find((n) => n.id === 'b')?.data.hasNextEdge).toBe(false);
  });

  it('drops edges pointing at blocks missing from the flow', () => {
    const graph = toGraph({
      blocks: [block('a', 0, 0)],
      connections: [b2b('a', 'ghost'), c2b('ghost', 'el', 'h', 'a')],
    });
    expect(graph.edges).toEqual([]);
  });

  it('is exactly the two halves composed', () => {
    const blocks = [block('a', 0, 0), block('b', 300, 0), block('c', 300, 0)];
    const connections = [b2b('a', 'b'), c2b('b', 'el-1', 'btn-1', 'c'), b2b('c', 'ghost')];
    const graph = toGraph({ blocks, connections });
    expect(graph.nodes).toEqual(toNodes(blocks, nextEdgeSources(connections)));
    expect(graph.edges).toEqual(toEdges(blocks, connections));
  });
});

describe('nextEdgeSources', () => {
  it('collects the source of every block-to-block connection and nothing else', () => {
    const sources = nextEdgeSources([b2b('a', 'b'), c2b('b', 'el', 'h', 'c'), b2b('c', 'a')]);
    expect([...sources].sort()).toEqual(['a', 'c']);
  });
});

/**
 * The reuse contract. `BlockNode` is memoised on `data`, so whether a card
 * re-renders after a rename is decided by whether the projection hands back
 * the same node object — which is a thing only this test can see.
 */
describe('toNodes', () => {
  const none = new Set<string>();

  it('hands back the previous node object for a block that did not change', () => {
    const a = block('a', 0, 0);
    const b = block('b', 300, 0);
    const first = toNodes([a, b], none);
    // A rename: one block replaced, the array new — what every setter does.
    const renamed = { ...b, name: 'Renamed' } as BlockT;
    const second = toNodes([a, renamed], none, first);
    expect(second[0]).toBe(first[0]);
    expect(second[1]).not.toBe(first[1]);
    expect(second[1]?.data.block).toBe(renamed);
  });

  it('projects afresh when the position moved, even for the same block reference', () => {
    const a = block('a', 0, 0);
    const first = toNodes([a], none);
    const moved = { ...a, positionX: 48 } as BlockT;
    const second = toNodes([moved], none, first);
    expect(second[0]).not.toBe(first[0]);
    expect(second[0]?.position).toEqual({ x: 48, y: 0 });
  });

  it('projects afresh when the next outlet lights up or goes dark', () => {
    const a = block('a', 0, 0);
    const first = toNodes([a], none);
    const second = toNodes([a], new Set(['a']), first);
    expect(second[0]).not.toBe(first[0]);
    expect(second[0]?.data.hasNextEdge).toBe(true);
    const third = toNodes([a], none, second);
    expect(third[0]).not.toBe(second[0]);
    expect(third[0]?.data.hasNextEdge).toBe(false);
  });

  it('re-projects a stacked block whose nudge changed because its neighbour moved away', () => {
    const a = block('a', 100, 100);
    const b = block('b', 100, 100); // nudged off `a`
    const first = toNodes([a, b], none);
    expect(first[1]?.position).not.toEqual({ x: 100, y: 100 });
    const aMoved = { ...a, positionX: 400 } as BlockT;
    const second = toNodes([aMoved, b], none, first);
    // `b` is the same reference, but it is no longer stacked, so it comes home.
    expect(second[1]).not.toBe(first[1]);
    expect(second[1]?.position).toEqual({ x: 100, y: 100 });
  });

  it('is indifferent to which previous projection it is given', () => {
    const a = block('a', 0, 0);
    const b = block('b', 300, 0);
    const bare = toNodes([a, b], none);
    const stranger = toNodes([block('z', 9, 9)], none);
    expect(toNodes([a, b], none, stranger)).toEqual(bare);
    expect(toNodes([a, b], none)).toEqual(bare);
  });
});

describe('toEdges', () => {
  it('needs the blocks only to drop edges whose ends are not on the canvas', () => {
    const connections = [b2b('a', 'b'), b2b('a', 'ghost'), c2b('ghost', 'el', 'h', 'a')];
    expect(toEdges([block('a', 0, 0), block('b', 0, 0)], connections).map((e) => e.id)).toEqual(['b2b:a:b']);
    // Renaming a block changes nothing an edge is built from.
    const renamed = [block('a', 0, 0), { ...block('b', 0, 0), name: 'Other' } as BlockT];
    expect(toEdges(renamed, connections)).toEqual(toEdges([block('a', 0, 0), block('b', 0, 0)], connections));
  });
});

describe('extractHandles', () => {
  const tstr = templateStrFromString;

  it('widget buttons become handles labelled by title', () => {
    const element = {
      __typename: 'WidgetTextAndButtonBlockElement',
      id: 'el-1',
      buttons: [
        { __typename: 'WidgetContinueFlowButton', id: 'btn-1', title: tstr('Talk to sales') },
        { __typename: 'WidgetOpenURLButton', id: 'btn-2', title: tstr(''), url: tstr('https://x.test') },
      ],
    } as unknown as ElementT;
    expect(extractHandles(element)).toEqual([
      { id: 'btn-1', label: 'Talk to sales' },
      { id: 'btn-2', label: 'Button 2' },
    ]);
  });

  it('WhatsApp list rows become handles', () => {
    const element = {
      __typename: 'WhatsAppListBlockElement',
      id: 'el-2',
      rows: [
        { id: 'row-1', title: tstr('Pricing') },
        { id: 'row-2', title: tstr('') },
      ],
    } as unknown as ElementT;
    expect(extractHandles(element)).toEqual([
      { id: 'row-1', label: 'Pricing' },
      { id: 'row-2', label: 'Row 2' },
    ]);
  });

  it('condition, entry-point and chat-trigger elements expose their single handle', () => {
    expect(
      extractHandles({ __typename: 'SetConditionBlockElement', id: 'e', handleID: 'h-cond' } as unknown as ElementT),
    ).toEqual([{ id: 'h-cond', label: 'Condition met' }]);
    expect(
      extractHandles({
        __typename: 'WidgetEntryPointBlockElement',
        id: 'e',
        nextBlockHandleID: 'h-next',
      } as unknown as ElementT),
    ).toEqual([{ id: 'h-next', label: 'Next' }]);
    expect(
      extractHandles({
        __typename: 'TriggeredMessageBlockElement',
        id: 'e',
        handleID: 'h-tm',
      } as unknown as ElementT),
    ).toEqual([{ id: 'h-tm', label: 'Next' }]);
  });

  it('unknown element typenames expose no handles instead of crashing', () => {
    const element = { __typename: 'BrandNewShinyBlockElement', id: 'e' } as unknown as ElementT;
    expect(extractHandles(element)).toEqual([]);
  });
});

describe('encodeHandleId / decodeHandleId', () => {
  it('round-trips element + handle ids', () => {
    expect(decodeHandleId(encodeHandleId('el-1', 'btn-1'))).toEqual({ elementId: 'el-1', handleId: 'btn-1' });
    // Handle ids containing single colons survive (only "::" is structural).
    expect(decodeHandleId(encodeHandleId('el-1', 'h:with:colons'))).toEqual({
      elementId: 'el-1',
      handleId: 'h:with:colons',
    });
  });

  it('returns null for non-encoded ids (block handle, raw handle ids)', () => {
    expect(decodeHandleId(BLOCK_SOURCE_HANDLE)).toBeNull();
    expect(decodeHandleId('btn-1')).toBeNull();
    expect(decodeHandleId('::dangling')).toBeNull();
    expect(decodeHandleId('el-1::')).toBeNull();
  });
});

describe('planConnection', () => {
  it('routes the block-level handle (and handle-less drops) to ConnectBlocks', () => {
    const expected = { kind: 'block', request: { sourceBlockID: 'a', targetBlockID: 'b' } };
    expect(planConnection('a', BLOCK_SOURCE_HANDLE, 'b')).toEqual(expected);
    expect(planConnection('a', null, 'b')).toEqual(expected);
  });

  it('routes encoded element handles to ConnectComponent with the element id split out', () => {
    expect(planConnection('a', encodeHandleId('el-1', 'btn-1'), 'b')).toEqual({
      kind: 'component',
      request: { sourceBlockID: 'a', sourceBlockElementID: 'el-1', sourceHandleID: 'btn-1', targetBlockID: 'b' },
    });
  });

  it('refuses to guess on unrecognizable handles', () => {
    expect(planConnection('a', 'not-an-encoded-handle', 'b')).toBeNull();
  });
});

describe('planDisconnect', () => {
  it('routes b2b edge data to DisconnectBlocks vars', () => {
    expect(planDisconnect({ kind: 'b2b', sourceBlockID: 'a' })).toEqual({ kind: 'block', sourceBlockID: 'a' });
  });

  it('routes c2b edge data to DisconnectComponent vars', () => {
    expect(
      planDisconnect({ kind: 'c2b', sourceBlockID: 'a', sourceBlockElementID: 'el-1', sourceHandleID: 'btn-1' }),
    ).toEqual({ kind: 'component', sourceBlockElementID: 'el-1', sourceHandleID: 'btn-1' });
  });

  it('returns null for foreign or incomplete edges', () => {
    expect(planDisconnect(undefined)).toBeNull();
    expect(planDisconnect({ kind: 'c2b', sourceBlockID: 'a' })).toBeNull();
  });
});
