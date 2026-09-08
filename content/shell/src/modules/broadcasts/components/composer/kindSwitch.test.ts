import { describe, expect, it } from 'vitest';
import { sampleFlow } from '../../lib/samples';
import { newPairOf } from './kindSwitch';

describe('the pair a kind switch added', () => {
  it('is the entry point that was not there before, with its settings element and its template element', () => {
    const before = sampleFlow({ kind: 'scheduled' });
    const added = sampleFlow({ kind: 'now' });
    const renamed = {
      ...added,
      entryPoints: [{ ...added.entryPoints[0]!, id: 'blk-new' }],
      blocks: [
        {
          ...added.blocks[0]!,
          id: 'blk-new',
          blockElements: [{ ...added.blocks[0]!.blockElements[0]!, id: 'el-new' }],
        },
        {
          ...added.blocks[1]!,
          id: 'blk-new-template',
          blockElements: [{ ...added.blocks[1]!.blockElements[0]!, id: 'el-new-template' }],
        },
      ],
      connections: [{ ...added.connections[0]!, sourceBlockID: 'blk-new', targetBlockID: 'blk-new-template' }],
    };
    const withPair = {
      ...before,
      entryPoints: [...before.entryPoints, ...renamed.entryPoints],
      blocks: [...before.blocks, ...renamed.blocks],
      connections: [...before.connections, ...renamed.connections],
    };
    expect(newPairOf(withPair, 'blk-settings')).toEqual({
      entryBlockId: 'blk-new',
      settingsElementId: 'el-new',
      payloadElementId: 'el-new-template',
    });
    expect(newPairOf(before, 'blk-settings')).toBeNull();
  });
});
