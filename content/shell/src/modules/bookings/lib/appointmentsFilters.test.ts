import { describe, expect, it } from 'vitest';
import { filterGroupLabel, toggleFilterEntry } from './appointmentsFilters';

const ALL = ['a', 'b', 'c', 'd'];

describe('appointmentsFilters', () => {
  it('unticking one from "all" means everything but that one, in canonical order', () => {
    expect(toggleFilterEntry(ALL, [], 'b')).toEqual(['a', 'c', 'd']);
    expect(toggleFilterEntry(ALL, [], 'a')).toEqual(['b', 'c', 'd']);
  });

  it('ticking and unticking inside a partial selection', () => {
    expect(toggleFilterEntry(ALL, ['a', 'c'], 'c')).toEqual(['a']);
    expect(toggleFilterEntry(ALL, ['c', 'a'], 'd')).toEqual(['a', 'c', 'd']); // canonical order, not click order
    expect(toggleFilterEntry(ALL, ['a'], 'a')).toEqual([]); // the last one off = nothing narrowed
  });

  it('completing the set goes back to "all" (empty), so the URL drops the key', () => {
    expect(toggleFilterEntry(ALL, ['a', 'b', 'c'], 'd')).toEqual([]);
  });

  it('a stale id from the URL survives a click on something else', () => {
    // 'zzz' is not offered any more (deleted specialist) but was in the URL.
    expect(toggleFilterEntry(ALL, ['zzz', 'a'], 'b')).toEqual(['a', 'b']);
  });

  it('labels: all, one, two, first +N, and unknown ids print themselves', () => {
    const name = (id: string) => ({ a: 'Alex', b: 'Bea', c: 'Cy' })[id];
    expect(filterGroupLabel([], name, 'All specialists')).toBe('All specialists');
    expect(filterGroupLabel(['a'], name, 'All')).toBe('Alex');
    expect(filterGroupLabel(['a', 'b'], name, 'All')).toBe('Alex, Bea');
    expect(filterGroupLabel(['a', 'b', 'c'], name, 'All')).toBe('Alex +2');
    expect(filterGroupLabel(['ghost'], name, 'All')).toBe('ghost');
  });
});
