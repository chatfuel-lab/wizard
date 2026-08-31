import { describe, expect, it } from 'vitest';
import { getDocMeta } from '~api';
import { PLUGIN_CATALOG, findNewElementId, pickCreatedBlock, pluginsForBlock } from './plugins';
import type { BlockT } from '../types';

const NEUTRAL_KEYS = ['setCondition', 'setContactProperty', 'clearContactProperty', 'sendJson', 'summarizeChat'];

const block = (platform: string, elementIds: string[] = []): BlockT =>
  ({
    __typename: 'RegularContentBlock',
    id: 'blk-1',
    name: 'Block',
    positionX: 0,
    positionY: 0,
    platform,
    isStartingPoint: false,
    blockElements: elementIds.map((id) => ({ __typename: 'WidgetTextAndButtonBlockElement', id })),
  }) as unknown as BlockT;

describe('PLUGIN_CATALOG', () => {
  it('has unique keys and a document per entry', () => {
    expect(new Set(PLUGIN_CATALOG.map((p) => p.key)).size).toBe(PLUGIN_CATALOG.length);
    for (const plugin of PLUGIN_CATALOG) expect(getDocMeta(plugin.document).kind).toBe('mutation');
  });
});

describe('pluginsForBlock', () => {
  it('offers widget + neutral plugins on a widget block, never WhatsApp ones', () => {
    const keys = pluginsForBlock(block('widget')).map((p) => p.key);
    expect(keys).toContain('widgetTextAndButtons');
    expect(keys).toContain('widgetImage');
    expect(keys).toContain('widgetSwitchToHuman');
    for (const neutral of NEUTRAL_KEYS) expect(keys).toContain(neutral);
    expect(keys.some((key) => key.startsWith('whatsApp'))).toBe(false);
    expect(keys).not.toContain('instagramSwitchToHuman');
    expect(keys).not.toContain('tiktokSwitchToHuman');
  });

  it('offers whatsapp + neutral plugins on a WhatsApp block, never widget ones', () => {
    const keys = pluginsForBlock(block('whatsapp')).map((p) => p.key);
    expect(keys).toContain('whatsAppText');
    expect(keys).toContain('whatsAppSwitchToHuman');
    for (const neutral of NEUTRAL_KEYS) expect(keys).toContain(neutral);
    expect(keys.some((key) => key.startsWith('widget'))).toBe(false);
  });

  it('falls back to the neutral set alone on unknown platforms', () => {
    expect(pluginsForBlock(block('facebook')).map((p) => p.key)).toEqual(NEUTRAL_KEYS);
    expect(pluginsForBlock(block('brand-new-platform')).map((p) => p.key)).toEqual(NEUTRAL_KEYS);
  });
});

describe('pickCreatedBlock', () => {
  it('finds the enclosing block regardless of the root field name', () => {
    const next = block('widget', ['el-1']);
    expect(pickCreatedBlock({ widgetImageCreateInBlock: next })).toBe(next);
    expect(pickCreatedBlock({ __typename: 'Mutation', sendJsonCreateInBlock: next })).toBe(next);
  });

  it('returns undefined for empty and non-block payloads', () => {
    expect(pickCreatedBlock({})).toBeUndefined();
    expect(pickCreatedBlock({ something: null })).toBeUndefined();
    expect(pickCreatedBlock({ something: { id: 'x' } })).toBeUndefined();
  });
});

describe('findNewElementId', () => {
  it('spots the element id that was not in the block before', () => {
    expect(findNewElementId(block('widget', ['el-1']), block('widget', ['el-1', 'el-new-1']))).toBe('el-new-1');
  });

  it('returns null when nothing was added', () => {
    expect(findNewElementId(block('widget', ['el-1']), block('widget', ['el-1']))).toBeNull();
  });
});
