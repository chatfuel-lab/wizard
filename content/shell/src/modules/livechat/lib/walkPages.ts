/**
 * Read a whole cursor-paged connection, with the two ends a `for (;;)` does not have.
 *
 * A walk that stops only when the server says `hasNextPage: false` is a loop whose exit
 * condition lives on the other side of the network. Two answers end it there and nowhere
 * here: a page count that never runs out, and a cursor that never moves. Neither is
 * exotic — a paging bug on the backend produces both, and the tab does not fail, it
 * grows: memory climbs, nothing renders, and the page is gone with nothing said about
 * why. So the walk carries its own two ends.
 *
 * `cap` bounds the ordinary case and is chosen per caller: it is not an error budget but
 * an answer to "how much of this can a person use", so hitting it returns what was read
 * rather than throwing. The repeated cursor is the other case — a server that hands back
 * one it already gave has stopped making progress, whatever it says about a next page.
 */
export interface Page<T> {
  readonly nodes: readonly T[];
  /** The cursor to ask for next, or null when this was the last page. */
  readonly next: string | null;
}

export async function walkPages<T>(fetchPage: (after: string | null) => Promise<Page<T>>, cap: number): Promise<T[]> {
  const all: T[] = [];
  const seen = new Set<string>();
  let after: string | null = null;
  for (let page = 0; page < cap; page += 1) {
    const { nodes, next } = await fetchPage(after);
    all.push(...nodes);
    if (next === null || seen.has(next)) break;
    seen.add(next);
    after = next;
  }
  return all;
}
