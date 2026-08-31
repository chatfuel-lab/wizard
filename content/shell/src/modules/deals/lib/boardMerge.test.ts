import { describe, expect, it } from 'vitest';
import { insertSorted, removeFromAll, timeOfCard, type BoardOrder, type TimeOf } from './boardMerge';

/** Fixed epoch — the reducer stamps optimistic times, so tests never read the clock. */
const BASE = Date.UTC(2026, 7, 11, 12, 0);
const iso = (minutesAgo: number) => new Date(BASE - minutesAgo * 60_000).toISOString();

/** id → minutes ago, mirroring how dealsStore reads the sort key out of byId. */
const times: Record<string, number> = { a: 1, b: 5, c: 2, x: 3 };
const timeOf: TimeOf = (id) => (id in times ? timeOfCard({ id, lastSalesStageUpdateTime: iso(times[id]!) }) : 0);

const board = (): BoardOrder => ({ New: ['a', 'b'], Won: ['c'] });

describe('timeOfCard', () => {
  it('sorts an absent or unparseable time last', () => {
    expect(timeOfCard(undefined)).toBe(0);
    expect(timeOfCard({ id: 'a', lastSalesStageUpdateTime: null })).toBe(0);
    expect(timeOfCard({ id: 'a', lastSalesStageUpdateTime: 'not a date' })).toBe(0);
    expect(timeOfCard({ id: 'a', lastSalesStageUpdateTime: iso(0) })).toBe(BASE);
  });
});

describe('removeFromAll', () => {
  it('drops the id from every column', () => {
    const next = removeFromAll(board(), 'a');
    expect(next.New).toEqual(['b']);
    expect(next.Won).toEqual(['c']);
  });

  it('returns the same reference when nothing matched', () => {
    const order = board();
    expect(removeFromAll(order, 'zzz')).toBe(order);
  });

  it('keeps the identity of columns it did not touch', () => {
    const order = board();
    const next = removeFromAll(order, 'a');
    expect(next.Won).toBe(order.Won);
  });
});

describe('insertSorted', () => {
  it('keeps lastSalesStageUpdateTime desc order', () => {
    expect(insertSorted(['a', 'b'], 'x', timeOf)).toEqual(['a', 'x', 'b']);
  });

  it('dedupes by id (optimistic move + subscription echo)', () => {
    expect(insertSorted(['a'], 'a', timeOf)).toEqual(['a']);
  });

  it('puts an id with no known time last', () => {
    expect(insertSorted(['a', 'b'], 'unknown', timeOf)).toEqual(['a', 'b', 'unknown']);
  });
});
