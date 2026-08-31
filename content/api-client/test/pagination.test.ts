import { describe, expect, it } from 'vitest';
import { paginate, type ConnectionLike } from '../src/pagination';
import type { TypedDoc } from '../src/module-client';

/**
 * The walk ends when the server says so — and the server is the one thing here
 * that cannot be relied on to say it. `paginate` is a shared primitive whose
 * only caller today (useGapScan) carries its own ten-page cap, so the discipline
 * that keeps it terminating lives in a caller rather than in the function; these
 * are the two ends it now owns itself.
 */
interface Page {
  conn: ConnectionLike<number>;
}

const DOC = {} as TypedDoc<Page, Record<string, unknown>>;

interface Server {
  readonly calls: number;
  query<TData>(): Promise<TData>;
}

/** A server that answers with the pages given, then repeats the last one forever. */
function server(pages: ConnectionLike<number>[]): Server {
  const state = { calls: 0 };
  return {
    get calls() {
      return state.calls;
    },
    query<TData>(): Promise<TData> {
      const conn = pages[Math.min(state.calls, pages.length - 1)]!;
      state.calls += 1;
      return Promise.resolve({ conn } as TData);
    },
  };
}

const page = (nodes: number[], endCursor: string | null, hasNextPage = true): ConnectionLike<number> => ({
  edges: nodes.map((node) => ({ node })),
  pageInfo: { endCursor, hasNextPage },
});

async function collect(gen: AsyncGenerator<number[], void, void>): Promise<number[][]> {
  const out: number[][] = [];
  for await (const nodes of gen) out.push(nodes);
  return out;
}

describe('paginate', () => {
  it('walks to the end the server declares', async () => {
    const src = server([page([1, 2], 'c1'), page([3], null, false)]);
    expect(await collect(paginate(src, DOC, {}, (d) => d.conn))).toEqual([[1, 2], [3]]);
    expect(src.calls).toBe(2);
  });

  it('refuses a cursor the server hands back a second time', async () => {
    const src = server([page([1], 'same'), page([2], 'same')]);
    await expect(collect(paginate(src, DOC, {}, (d) => d.conn))).rejects.toThrow(/repeated a cursor/);
    // Two answers read, and then it stopped — not a third, and not forever.
    expect(src.calls).toBe(2);
  });

  it('stops after maxPages, without calling the failure a failure', async () => {
    const src = server([page([1], 'c1'), page([2], 'c2'), page([3], 'c3')]);
    expect(await collect(paginate(src, DOC, {}, (d) => d.conn, { maxPages: 2 }))).toEqual([[1], [2]]);
    expect(src.calls).toBe(2);
  });

  it('ends on a page that promises more but names no cursor', async () => {
    const src = server([page([1], null)]);
    expect(await collect(paginate(src, DOC, {}, (d) => d.conn))).toEqual([[1]]);
    expect(src.calls).toBe(1);
  });
});
