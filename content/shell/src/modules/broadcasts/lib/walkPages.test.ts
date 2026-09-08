import { describe, expect, it } from 'vitest';
import { walkPages, type Page } from './walkPages';

const pages = <T>(...list: Page<T>[]) => {
  const asked: (string | null)[] = [];
  let i = 0;
  const fetchPage = (after: string | null): Promise<Page<T>> => {
    asked.push(after);
    return Promise.resolve(list[Math.min(i++, list.length - 1)]);
  };
  return { asked, fetchPage };
};

describe('walkPages', () => {
  it('reads every page and asks for each one with the cursor before it', async () => {
    const { asked, fetchPage } = pages<number>(
      { nodes: [1, 2], next: 'a' },
      { nodes: [3], next: 'b' },
      { nodes: [4], next: null },
    );
    expect(await walkPages(fetchPage, 10)).toEqual([1, 2, 3, 4]);
    expect(asked).toEqual([null, 'a', 'b']);
  });

  it('stops at the cap and keeps what it read', async () => {
    // A connection that never runs out and never repeats itself: every page carries a
    // fresh cursor and says there is another one, so the cap is the only thing that
    // ends this walk.
    let n = 0;
    const asked: (string | null)[] = [];
    const fetchPage = (after: string | null): Promise<Page<number>> => {
      asked.push(after);
      n += 1;
      return Promise.resolve({ nodes: [n], next: `c${n}` });
    };
    expect(await walkPages(fetchPage, 3)).toEqual([1, 2, 3]);
    expect(asked).toEqual([null, 'c1', 'c2']);
  });

  it('stops when the server hands back a cursor it already gave', async () => {
    const { asked, fetchPage } = pages<number>(
      { nodes: [1], next: 'a' },
      { nodes: [2], next: 'b' },
      { nodes: [3], next: 'a' },
      { nodes: [99], next: 'c' },
    );
    expect(await walkPages(fetchPage, 100)).toEqual([1, 2, 3]);
    expect(asked).toEqual([null, 'a', 'b']);
  });

  it('reads one page and no more when that page is the last', async () => {
    const { asked, fetchPage } = pages<number>({ nodes: [1], next: null });
    expect(await walkPages(fetchPage, 10)).toEqual([1]);
    expect(asked).toEqual([null]);
  });

  it('asks for nothing at all when the cap is zero', async () => {
    const { asked, fetchPage } = pages<number>({ nodes: [1], next: 'a' });
    expect(await walkPages(fetchPage, 0)).toEqual([]);
    expect(asked).toEqual([]);
  });
});
