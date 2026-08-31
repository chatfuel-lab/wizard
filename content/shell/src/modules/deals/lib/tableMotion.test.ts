import { describe, expect, it } from 'vitest';
import { MAX_ROW_FLASH, enteredIndexes, sortSignature } from './tableMotion';

describe('enteredIndexes', () => {
  it('finds the arrivals at their place in the new order', () => {
    expect(enteredIndexes(['a', 'b'], ['a', 'new', 'b'])).toEqual([1]);
    expect(enteredIndexes(['a', 'b'], ['x', 'a', 'b', 'y'])).toEqual([0, 3]);
  });

  it('says nothing about the first page: that is the table appearing, not rows arriving', () => {
    expect(enteredIndexes([], ['a', 'b', 'c'])).toEqual([]);
  });

  it('ignores removals and reorders — only what is new gets flashed', () => {
    expect(enteredIndexes(['a', 'b', 'c'], ['c', 'a'])).toEqual([]);
  });

  it('gives up past the cap rather than strobing half the table', () => {
    const next = Array.from({ length: MAX_ROW_FLASH + 1 }, (_, at) => `n${at}`);
    expect(enteredIndexes(['a'], [...next, 'a'])).toEqual([]);
    expect(enteredIndexes(['a'], [...next.slice(1), 'a'])).toHaveLength(MAX_ROW_FLASH);
  });
});

describe('sortSignature', () => {
  it('is stable for the same sort and different for a different one', () => {
    expect(sortSignature({ key: 'amount', dir: 'asc' })).toBe(sortSignature({ key: 'amount', dir: 'asc' }));
    expect(sortSignature({ key: 'amount', dir: 'desc' })).not.toBe(sortSignature({ key: 'amount', dir: 'asc' }));
  });

  it('gives no sort a signature of its own, so clearing one is a change', () => {
    expect(sortSignature(null)).toBe('');
  });
});
