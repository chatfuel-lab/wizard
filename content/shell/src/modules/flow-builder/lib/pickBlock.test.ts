import { describe, expect, it } from 'vitest';
import { findNewId, pickBlock } from './pickBlock';
import type { BlockT } from '../types';

const block = (elementIds: string[] = []): BlockT =>
  ({
    __typename: 'RegularContentBlock',
    id: 'blk-1',
    name: 'Block',
    positionX: 0,
    positionY: 0,
    platform: 'widget',
    isStartingPoint: false,
    blockElements: elementIds.map((id) => ({ __typename: 'WidgetTextAndButtonBlockElement', id })),
  }) as unknown as BlockT;

describe('pickBlock', () => {
  it('finds the enclosing block regardless of the root field name', () => {
    const next = block(['el-1']);
    expect(pickBlock({ widgetTextAndButtonsUpdateText: next })).toBe(next);
    expect(pickBlock({ __typename: 'Mutation', sendJsonUpdateURL: next })).toBe(next);
  });

  it('returns undefined for empty and non-block payloads', () => {
    expect(pickBlock({})).toBeUndefined();
    expect(pickBlock({ something: null })).toBeUndefined();
    expect(pickBlock({ something: { id: 'x' } })).toBeUndefined();
  });
});

describe('findNewId', () => {
  it('spots the id that was not there before', () => {
    expect(findNewId([{ id: 'a' }], [{ id: 'a' }, { id: 'b' }])).toBe('b');
  });

  it('returns null when nothing was added', () => {
    expect(findNewId([{ id: 'a' }], [{ id: 'a' }])).toBeNull();
    expect(findNewId([], [])).toBeNull();
  });
});
