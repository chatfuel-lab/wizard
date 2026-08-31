/**
 * List-merge helpers per chatfuel-core pagination.md: de-dupe by key
 * (replace, don't append); live updates carry no position — re-sort client-side.
 *
 * Chat list: upsertBy(edges, incoming, (c) => c.id) then
 * sortByDesc(..., (c) => c.lastConversationMessageTime).
 * Messages: upsertBy(..., (m) => m.clientId) — merge by clientId, never the
 * nullable Message.id (gotcha #3).
 *
 * A null key is not a key: such an item cannot be recognised on a later page,
 * so it is appended rather than replaced. A caller seeing duplicates is keying
 * on something nullable, which is gotcha #3 and not a merge bug.
 *
 * Nothing in this package calls these yet — the chat and message lists they
 * were written for live in the app a scaffold produces, which vendors this
 * source and owns every line it runs. They are surface, not dead code.
 */

export function upsertBy<T>(
  list: readonly T[],
  incoming: readonly T[],
  key: (item: T) => string | null | undefined,
): T[] {
  const out = [...list];
  const index = new Map<string, number>();
  out.forEach((item, i) => {
    const k = key(item);
    if (k != null) index.set(k, i);
  });
  for (const item of incoming) {
    const k = key(item);
    const at = k != null ? index.get(k) : undefined;
    if (at !== undefined) {
      out[at] = item;
    } else {
      if (k != null) index.set(k, out.length);
      out.push(item);
    }
  }
  return out;
}

export function removeBy<T>(list: readonly T[], keyValue: string, key: (item: T) => string | null | undefined): T[] {
  return list.filter((item) => key(item) !== keyValue);
}

/** Non-mutating descending sort. Works for RFC3339 Time strings (lexical order == chronological). */
export function sortByDesc<T>(list: readonly T[], value: (item: T) => string | number): T[] {
  return [...list].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    if (va === vb) return 0;
    return va < vb ? 1 : -1;
  });
}
