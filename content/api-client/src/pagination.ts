import type { TypedDoc } from './module-client';
import { ChatfuelGraphQLError } from './errors';

/**
 * Relay-ish connection shape. There is no shared PageInfo type or cursor
 * scalar in the schema — each connection has its own — but they all satisfy
 * this structural shape with string cursors on the wire.
 */
export interface ConnectionLike<TNode> {
  edges?: ReadonlyArray<{ node: TNode } | null | undefined> | null;
  pageInfo: { endCursor?: string | null; hasNextPage: boolean };
}

interface QueryExecutor {
  query<TData, TVars>(doc: TypedDoc<TData, TVars>, variables: TVars): Promise<TData>;
}

/** Pages walked before the loop stops on its own, when the caller names no limit. */
const DEFAULT_MAX_PAGES = 1_000;

/**
 * Sequential cursor pagination for Node scripts (BotsList, catalog
 * queries). One page of nodes per yield; stops when hasNextPage is false.
 * Sequential by construction — "never fetch a page while one is in flight"
 * (pagination.md). `baseVars` must already contain the page-size var (first).
 *
 * Two ends to the walk that the server's own answer cannot be trusted to
 * provide. `maxPages` stops it cleanly after that many pages — the caller
 * asked for no more. A cursor that comes back a second time throws instead:
 * `hasNextPage: true` with a cursor that does not advance is a server that has
 * promised a page it will not give, and yielding the same page forever is a
 * worse answer than saying so. Neither is reachable through today's only
 * caller (useGapScan caps itself at ten pages), and neither should have to be
 * a rule the next caller happens to know.
 */
export async function* paginate<TData, TVars extends Record<string, unknown>, TNode>(
  client: QueryExecutor,
  doc: TypedDoc<TData, TVars>,
  baseVars: TVars,
  select: (data: TData) => ConnectionLike<TNode> | null | undefined,
  options: { cursorVar?: string; maxPages?: number } = {},
): AsyncGenerator<TNode[], void, void> {
  const cursorVar = options.cursorVar ?? 'after';
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
  const seen = new Set<string>();
  let cursor: string | undefined;
  for (let page = 1; ; page += 1) {
    const vars = (cursor === undefined ? { ...baseVars } : { ...baseVars, [cursorVar]: cursor }) as TVars;
    const data = await client.query(doc, vars);
    const conn = select(data);
    if (!conn) return;
    const nodes = (conn.edges ?? []).flatMap((edge) => (edge ? [edge.node] : []));
    yield nodes;
    if (!conn.pageInfo.hasNextPage || conn.pageInfo.endCursor == null) return;
    if (page >= maxPages) return;
    if (seen.has(conn.pageInfo.endCursor)) {
      throw new Error(`paginate: the server repeated a cursor after ${page} pages — the walk would never end`);
    }
    seen.add(conn.pageInfo.endCursor);
    cursor = conn.pageInfo.endCursor;
  }
}

/**
 * Heuristic detector for a stale-`after` failure (pagination.md: "a stale
 * cursor can produce an invalid-cursor error — recover by refetching from
 * the start"). The exact server shape is undocumented; matches "cursor" in
 * the message or extensions.code.
 */
export function isInvalidCursorError(err: unknown): boolean {
  if (!(err instanceof ChatfuelGraphQLError)) return false;
  return err.errors.some((e) => /cursor/i.test(e.message) || /cursor/i.test(String(e.extensions?.code ?? '')));
}
