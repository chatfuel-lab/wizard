import { describe, expect, it } from 'vitest';
import { SalesStageV2 } from '~api/generated/deals/graphql';
import { stageForKey } from './stageKeys';

describe('stageForKey', () => {
  it('maps 1-6 to the six columns in board order', () => {
    expect(stageForKey('1', null)).toBe(SalesStageV2.New);
    expect(stageForKey('2', null)).toBe(SalesStageV2.Sorting);
    expect(stageForKey('3', null)).toBe(SalesStageV2.Ready);
    expect(stageForKey('4', null)).toBe(SalesStageV2.WorkingOn);
    expect(stageForKey('5', null)).toBe(SalesStageV2.Won);
    expect(stageForKey('6', null)).toBe(SalesStageV2.Lost);
  });

  it('ignores a digit key that has no column', () => {
    expect(stageForKey('0', SalesStageV2.New)).toBeNull();
    expect(stageForKey('7', SalesStageV2.New)).toBeNull();
    expect(stageForKey('a', SalesStageV2.New)).toBeNull();
    expect(stageForKey('Enter', SalesStageV2.New)).toBeNull();
  });

  it('steps one column with [ and ]', () => {
    expect(stageForKey(']', SalesStageV2.New)).toBe(SalesStageV2.Sorting);
    expect(stageForKey('[', SalesStageV2.Sorting)).toBe(SalesStageV2.New);
    expect(stageForKey(']', SalesStageV2.Won)).toBe(SalesStageV2.Lost);
  });

  it('does NOT wrap at either end', () => {
    // New -> Lost on one keypress would be a destructive surprise.
    expect(stageForKey('[', SalesStageV2.New)).toBeNull();
    expect(stageForKey(']', SalesStageV2.Lost)).toBeNull();
  });

  it('cannot step from a card with no stage', () => {
    expect(stageForKey(']', null)).toBeNull();
    expect(stageForKey('[', undefined)).toBeNull();
    // ...but a digit still works: it sets a stage rather than moving from one.
    expect(stageForKey('3', null)).toBe(SalesStageV2.Ready);
  });
});
