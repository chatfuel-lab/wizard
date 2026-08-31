import { describe, expect, it } from 'vitest';
import { SalesStageV2 } from '~api/generated/deals/graphql';
import {
  columnIds,
  firstFocusable,
  nextFocus,
  positionOf,
  rangeIds,
  resolveFocus,
  type BoardOrder,
} from './boardFocus';

/** New has 4, Sorting is empty, Ready has 2, WorkingOn has 5, Won 1, Lost 0. */
const ORDER: BoardOrder = {
  [SalesStageV2.New]: ['n1', 'n2', 'n3', 'n4'],
  [SalesStageV2.Sorting]: [],
  [SalesStageV2.Ready]: ['r1', 'r2'],
  [SalesStageV2.WorkingOn]: ['w1', 'w2', 'w3', 'w4', 'w5'],
  [SalesStageV2.Won]: ['won1'],
  [SalesStageV2.Lost]: [],
};

const move = (current: string | null, key: string, collapsed: SalesStageV2[] = []) =>
  nextFocus({ order: ORDER, collapsed, current, key });

describe('positionOf', () => {
  it('finds a card and returns null for one that is not there', () => {
    expect(positionOf(ORDER, 'r2')).toEqual({ stage: SalesStageV2.Ready, index: 1 });
    expect(positionOf(ORDER, 'gone')).toBeNull();
    expect(positionOf(ORDER, null)).toBeNull();
  });
});

describe('firstFocusable', () => {
  it('skips empty and collapsed columns', () => {
    expect(firstFocusable(ORDER, [])).toBe('n1');
    expect(firstFocusable(ORDER, [SalesStageV2.New])).toBe('r1');
    expect(firstFocusable(ORDER, [SalesStageV2.New, SalesStageV2.Ready])).toBe('w1');
  });

  it('is null when there is nothing to focus at all', () => {
    const empty: BoardOrder = {
      [SalesStageV2.New]: [],
      [SalesStageV2.Sorting]: [],
      [SalesStageV2.Ready]: [],
      [SalesStageV2.WorkingOn]: [],
      [SalesStageV2.Won]: [],
      [SalesStageV2.Lost]: [],
    };
    expect(firstFocusable(empty, [])).toBeNull();
  });
});

describe('vertical movement', () => {
  it('steps within the column', () => {
    expect(move('n1', 'ArrowDown')).toBe('n2');
    expect(move('n2', 'ArrowUp')).toBe('n1');
  });

  it('clamps at both ends instead of wrapping', () => {
    expect(move('n4', 'ArrowDown')).toBe('n4');
    expect(move('n1', 'ArrowUp')).toBe('n1');
  });

  it('jumps to the ends with Home and End', () => {
    expect(move('w3', 'Home')).toBe('w1');
    expect(move('w3', 'End')).toBe('w5');
  });
});

describe('horizontal movement', () => {
  it('holds the row and skips the empty column between', () => {
    /* Sorting is empty, so New → Ready. */
    expect(move('n2', 'ArrowRight')).toBe('r2');
  });

  it('clamps to the last card when the next column is shorter', () => {
    expect(move('n4', 'ArrowRight')).toBe('r2');
    expect(move('w5', 'ArrowRight')).toBe('won1');
  });

  it('skips a collapsed column', () => {
    expect(move('n1', 'ArrowRight', [SalesStageV2.Ready])).toBe('w1');
  });

  it('stays put at the edges', () => {
    expect(move('n1', 'ArrowLeft')).toBe('n1');
    expect(move('won1', 'ArrowRight')).toBe('won1');
  });

  it('goes back left through the same lane', () => {
    expect(move('r1', 'ArrowLeft')).toBe('n1');
    expect(move('w4', 'ArrowLeft')).toBe('r2');
  });
});

describe('starting from nothing', () => {
  it('lands on the first focusable card for any navigation key', () => {
    for (const key of ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End']) {
      expect(move(null, key)).toBe('n1');
    }
  });

  it('does the same when the focused card has gone', () => {
    expect(move('vanished', 'ArrowDown')).toBe('n1');
  });

  it('recovers when the focused card is inside a column that just collapsed', () => {
    expect(move('n2', 'ArrowDown', [SalesStageV2.New])).toBe('r1');
  });
});

describe('keys that are not ours', () => {
  it('returns null so the caller does not preventDefault', () => {
    for (const key of ['Enter', ' ', 'a', 'Escape', 'Tab', '1']) {
      expect(move('n1', key)).toBeNull();
    }
  });
});

describe('resolveFocus', () => {
  it('keeps a card that is still there', () => {
    expect(resolveFocus(ORDER, [], 'w3')).toBe('w3');
  });

  it('falls back to the first focusable when it is gone', () => {
    expect(resolveFocus(ORDER, [], 'removed')).toBe('n1');
    expect(resolveFocus(ORDER, [], null)).toBe('n1');
  });
});

describe('columnIds', () => {
  it('is the whole column the focused card is in', () => {
    expect(columnIds(ORDER, 'r2')).toEqual(['r1', 'r2']);
    expect(columnIds(ORDER, null)).toEqual([]);
  });

  it('returns a copy, so a caller cannot mutate the store through it', () => {
    const ids = columnIds(ORDER, 'n1');
    ids.push('x');
    expect(ORDER[SalesStageV2.New]).toHaveLength(4);
  });
});

describe('rangeIds', () => {
  it('covers the span in either direction', () => {
    expect(rangeIds(ORDER, 'w2', 'w4')).toEqual(['w2', 'w3', 'w4']);
    expect(rangeIds(ORDER, 'w4', 'w2')).toEqual(['w2', 'w3', 'w4']);
  });

  it('is a single card when anchor and target are the same', () => {
    expect(rangeIds(ORDER, 'w2', 'w2')).toEqual(['w2']);
  });

  it('refuses to span two columns', () => {
    expect(rangeIds(ORDER, 'n1', 'r1')).toBeNull();
  });

  it('is null when either end is missing', () => {
    expect(rangeIds(ORDER, null, 'w1')).toBeNull();
    expect(rangeIds(ORDER, 'w1', 'gone')).toBeNull();
  });
});
