import { describe, expect, it } from 'vitest';
import { computeAutoLayout } from './layout';
import type { BlockT, ConnectionT } from '../types';

const block = (id: string, opts: { start?: boolean; entryPoint?: boolean } = {}): BlockT =>
  ({
    __typename: opts.entryPoint ? 'WidgetEntryPointContentBlock' : 'RegularContentBlock',
    id,
    name: `Block ${id}`,
    positionX: 999,
    positionY: 999,
    platform: 'widget',
    isStartingPoint: opts.start ?? false,
    ...(opts.entryPoint ? { isEntryPointEnabled: false } : {}),
    blockElements: [],
  }) as unknown as BlockT;

const edge = (source: string, target: string): ConnectionT => ({
  __typename: 'BlockToBlockConnection',
  id: `synth-${source}-${target}`,
  sourceBlockID: source,
  targetBlockID: target,
});

describe('computeAutoLayout', () => {
  it('lays a chain out left to right from the starting point', () => {
    const updates = computeAutoLayout({
      blocks: [block('c'), block('a', { start: true }), block('b')],
      connections: [edge('a', 'b'), edge('b', 'c')],
    });
    expect(updates).toEqual([
      { blockID: 'a', positionX: 0, positionY: 0 },
      { blockID: 'b', positionX: 320, positionY: 0 },
      { blockID: 'c', positionX: 640, positionY: 0 },
    ]);
  });

  it('stacks same-depth blocks by id and is idempotent', () => {
    const flow = {
      blocks: [block('root', { start: true }), block('z'), block('a')],
      connections: [edge('root', 'z'), edge('root', 'a')],
    };
    const first = computeAutoLayout(flow);
    expect(first).toEqual([
      { blockID: 'a', positionX: 320, positionY: 0 },
      { blockID: 'root', positionX: 0, positionY: 0 },
      { blockID: 'z', positionX: 320, positionY: 220 },
    ]);
    expect(computeAutoLayout(flow)).toEqual(first);
  });

  it('treats entry-point blocks and inbound-free blocks as roots', () => {
    const updates = computeAutoLayout({
      blocks: [block('ep', { entryPoint: true }), block('orphan'), block('next')],
      connections: [edge('ep', 'next')],
    });
    const byId = Object.fromEntries(updates.map((u) => [u.blockID, u]));
    expect(byId.ep.positionX).toBe(0);
    expect(byId.orphan.positionX).toBe(0);
    expect(byId.next.positionX).toBe(320);
  });

  it('parks cycle-only blocks in one trailing column', () => {
    const updates = computeAutoLayout({
      blocks: [block('a', { start: true }), block('loop1'), block('loop2')],
      // loop1 <-> loop2 with inbound edges each — unreachable from a, no root.
      connections: [edge('loop1', 'loop2'), edge('loop2', 'loop1')],
    });
    const byId = Object.fromEntries(updates.map((u) => [u.blockID, u]));
    expect(byId.a.positionX).toBe(0);
    expect(byId.loop1.positionX).toBe(320);
    expect(byId.loop2.positionX).toBe(320);
    expect(byId.loop1.positionY).not.toBe(byId.loop2.positionY);
  });

  it('ignores self-edges and returns every block exactly once', () => {
    const updates = computeAutoLayout({
      blocks: [block('a', { start: true }), block('b')],
      connections: [edge('a', 'a'), edge('a', 'b')],
    });
    expect(updates.map((u) => u.blockID).sort()).toEqual(['a', 'b']);
  });

  it('returns an empty update list for an empty flow', () => {
    expect(computeAutoLayout({ blocks: [], connections: [] })).toEqual([]);
  });
});
