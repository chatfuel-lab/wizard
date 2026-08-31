import { describe, expect, it } from 'vitest';
import { removeBy, sortByDesc, upsertBy } from '../src/merge';

interface Item {
  id: string | null;
  v: number;
}

describe('upsertBy', () => {
  it('replaces by key instead of appending', () => {
    const list: Item[] = [
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
    ];
    const out = upsertBy(list, [{ id: 'a', v: 10 }], (i) => i.id);
    expect(out).toEqual([
      { id: 'a', v: 10 },
      { id: 'b', v: 2 },
    ]);
  });

  it('appends unknown keys and always appends null keys (nullable Message.id safety)', () => {
    const list: Item[] = [{ id: 'a', v: 1 }];
    const out = upsertBy(
      list,
      [
        { id: null, v: 2 },
        { id: null, v: 3 },
        { id: 'c', v: 4 },
      ],
      (i) => i.id,
    );
    expect(out).toHaveLength(4);
    expect(out[3]).toEqual({ id: 'c', v: 4 });
  });

  it('de-dupes within the incoming batch too', () => {
    const out = upsertBy<Item>(
      [],
      [
        { id: 'x', v: 1 },
        { id: 'x', v: 2 },
      ],
      (i) => i.id,
    );
    expect(out).toEqual([{ id: 'x', v: 2 }]);
  });

  it('does not mutate inputs', () => {
    const list: Item[] = [{ id: 'a', v: 1 }];
    upsertBy(list, [{ id: 'a', v: 9 }], (i) => i.id);
    expect(list[0]?.v).toBe(1);
  });
});

describe('removeBy', () => {
  it('drops matching entries', () => {
    const list: Item[] = [
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
    ];
    expect(removeBy(list, 'a', (i) => i.id)).toEqual([{ id: 'b', v: 2 }]);
  });
});

describe('sortByDesc', () => {
  it('sorts RFC3339 timestamps newest-first', () => {
    const list = [{ t: '2026-01-01T00:00:00Z' }, { t: '2026-08-11T12:00:00Z' }, { t: '2025-12-31T23:59:59Z' }];
    expect(sortByDesc(list, (i) => i.t).map((i) => i.t)).toEqual([
      '2026-08-11T12:00:00Z',
      '2026-01-01T00:00:00Z',
      '2025-12-31T23:59:59Z',
    ]);
  });

  it('sorts numbers descending and does not mutate', () => {
    const list = [{ n: 1 }, { n: 3 }, { n: 2 }];
    expect(sortByDesc(list, (i) => i.n).map((i) => i.n)).toEqual([3, 2, 1]);
    expect(list.map((i) => i.n)).toEqual([1, 3, 2]);
  });
});
