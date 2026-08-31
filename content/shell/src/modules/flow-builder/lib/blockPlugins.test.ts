import { describe, expect, it } from 'vitest';
import { getDocMeta } from '~api';
import {
  BLOCK_PLUGIN_CATALOG,
  blockOriginUnderPointer,
  blockPluginsForFlow,
  findNewBlockId,
  pickCreatedFlow,
  placeNewBlock,
} from './blockPlugins';
import type { FlowT } from '../types';

const NEUTRAL_KEYS = [
  'setCondition',
  'setContactProperty',
  'clearContactProperty',
  'sendJson',
  'summarizeChat',
  'redirectToFlow',
  'aiAgent',
];

const flow = (platform: string, blockIds: string[] = []): FlowT =>
  ({
    __typename: 'RegularFlow',
    id: 'flow-1',
    name: 'Flow',
    platform,
    startingPointBlock: null,
    entryPoints: [],
    blocks: blockIds.map((id) => ({ __typename: 'RegularContentBlock', id, positionX: 0, positionY: 0 })),
    connections: [],
  }) as unknown as FlowT;

const at = (positionX: number, positionY: number) => ({ positionX, positionY });

describe('BLOCK_PLUGIN_CATALOG', () => {
  it('has unique keys and a document per entry', () => {
    expect(new Set(BLOCK_PLUGIN_CATALOG.map((p) => p.key)).size).toBe(BLOCK_PLUGIN_CATALOG.length);
    for (const plugin of BLOCK_PLUGIN_CATALOG) expect(getDocMeta(plugin.document).kind).toBe('mutation');
  });

  it('flags exactly the aiAgent family as needing a template', () => {
    expect(BLOCK_PLUGIN_CATALOG.filter((p) => p.needsTemplate).map((p) => p.key)).toEqual(['aiAgent']);
  });

  it('flags the entry-point families and nothing else', () => {
    expect(BLOCK_PLUGIN_CATALOG.filter((p) => p.entryPoint).map((p) => p.key)).toEqual([
      'widgetEntryPoint',
      'triggeredMessage',
      'whatsAppOneTimeNotification',
      'whatsAppScheduledMessage',
    ]);
  });

  it('gives every family a connected-create document except the entry points', () => {
    for (const plugin of BLOCK_PLUGIN_CATALOG) {
      if (plugin.entryPoint) {
        expect(plugin.connectedDocument, plugin.key).toBeUndefined();
      } else {
        expect(plugin.connectedDocument && getDocMeta(plugin.connectedDocument).kind, plugin.key).toBe('mutation');
      }
    }
  });
});

describe('blockPluginsForFlow', () => {
  it('offers widget + neutral families on a widget flow, never WhatsApp ones', () => {
    const keys = blockPluginsForFlow(flow('widget')).map((p) => p.key);
    expect(keys).toContain('widgetTextAndButtons');
    expect(keys).toContain('widgetImage');
    expect(keys).toContain('widgetSwitchToHuman');
    expect(keys).toContain('widgetEntryPoint');
    for (const neutral of NEUTRAL_KEYS) expect(keys).toContain(neutral);
    expect(keys.some((key) => key.startsWith('whatsApp'))).toBe(false);
    expect(keys).not.toContain('triggeredMessage');
    expect(keys).not.toContain('instagramSwitchToHuman');
    expect(keys).not.toContain('tiktokSwitchToHuman');
  });

  it('offers whatsapp + neutral families on a WhatsApp flow, never widget ones', () => {
    const keys = blockPluginsForFlow(flow('whatsapp')).map((p) => p.key);
    expect(keys).toContain('whatsAppText');
    expect(keys).toContain('whatsAppTemplate');
    expect(keys).toContain('triggeredMessage');
    expect(keys).toContain('whatsAppOneTimeNotification');
    expect(keys).toContain('whatsAppScheduledMessage');
    for (const neutral of NEUTRAL_KEYS) expect(keys).toContain(neutral);
    expect(keys.some((key) => key.startsWith('widget'))).toBe(false);
  });

  it('falls back to the neutral set alone on unknown platforms', () => {
    expect(blockPluginsForFlow(flow('facebook')).map((p) => p.key)).toEqual(NEUTRAL_KEYS);
    expect(blockPluginsForFlow(flow('brand-new-platform')).map((p) => p.key)).toEqual(NEUTRAL_KEYS);
  });
});

describe('pickCreatedFlow', () => {
  it('finds the slim FlowBlocksSlim payload regardless of the root field name', () => {
    const slim = { id: 'flow-1', blocks: [{ id: 'blk-1' }] };
    expect(pickCreatedFlow({ sendJsonCreateWithBlock: slim })).toBe(slim);
    expect(pickCreatedFlow({ __typename: 'Mutation', widgetEPCreate: slim })).toBe(slim);
  });

  it('also accepts the full FlowParts shape the four legacy ops return', () => {
    const next = flow('widget', ['blk-1']);
    expect(pickCreatedFlow({ whatsAppTextCreateWithBlock: next })).toBe(next);
  });

  it('returns undefined for empty and non-flow payloads', () => {
    expect(pickCreatedFlow({})).toBeUndefined();
    expect(pickCreatedFlow({ something: null })).toBeUndefined();
    expect(pickCreatedFlow({ something: { id: 'x' } })).toBeUndefined();
  });
});

describe('findNewBlockId', () => {
  it('spots the block id that was not in the flow before (slim shapes)', () => {
    expect(findNewBlockId({ blocks: [{ id: 'blk-1' }] }, { blocks: [{ id: 'blk-1' }, { id: 'blk-new-1' }] })).toBe(
      'blk-new-1',
    );
  });

  it('accepts full FlowParts snapshots on either side', () => {
    expect(findNewBlockId(flow('widget', ['blk-1']), flow('widget', ['blk-1', 'blk-new-1']))).toBe('blk-new-1');
  });

  it('returns null when nothing was added', () => {
    expect(findNewBlockId(flow('widget', ['blk-1']), flow('widget', ['blk-1']))).toBeNull();
  });
});

describe('placeNewBlock', () => {
  it('rounds float viewport coordinates to the server Int grid', () => {
    expect(placeNewBlock([], 100.4, -20.6)).toEqual({ x: 100, y: -21 });
  });

  it('keeps the spot when no block is within 40px', () => {
    expect(placeNewBlock([at(0, 0)], 100, 100)).toEqual({ x: 100, y: 100 });
    expect(placeNewBlock([at(100, 159)], 100, 200)).toEqual({ x: 100, y: 200 });
  });

  it('nudges diagonally off an occupied spot, deterministically', () => {
    const blocks = [at(100, 100)];
    // Two 28px hops: the first lands still inside the 40px square.
    expect(placeNewBlock(blocks, 100, 100)).toEqual({ x: 156, y: 156 });
    expect(placeNewBlock(blocks, 100, 100)).toEqual({ x: 156, y: 156 });
    // 40px proximity counts, not just exact overlap.
    expect(placeNewBlock(blocks, 120, 90)).toEqual({ x: 148, y: 118 });
  });

  it('walks past a whole stack of occupied spots and always terminates', () => {
    const blocks = [at(100, 100), at(128, 128), at(156, 156)];
    expect(placeNewBlock(blocks, 100, 100)).toEqual({ x: 212, y: 212 });
  });
});

describe('blockOriginUnderPointer', () => {
  it('puts the card centred under the pointer with its title line at the pointer', () => {
    /* A card is 256 wide; its origin is its top-left. Dropped at the pointer
       unadjusted it would hang down and to the right of where the hand let go. */
    expect(blockOriginUnderPointer({ x: 500, y: 300 })).toEqual({ x: 372, y: 280 });
  });

  it('composes with placeNewBlock: under the pointer, then nudged off anything already there', () => {
    const origin = blockOriginUnderPointer({ x: 500, y: 300 });
    expect(placeNewBlock([at(372, 280)], origin.x, origin.y)).toEqual({ x: 428, y: 336 });
    expect(placeNewBlock([], origin.x, origin.y)).toEqual({ x: 372, y: 280 });
  });
});
