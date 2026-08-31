import type { BlockT } from '../types';

/**
 * The enclosing block out of an element-setter response without knowing the
 * family-specific root field name — the single value carrying a blockElements
 * list (same erasure trick as pickCreatedFlow). Undefined when no value in the
 * payload carries one, which useBlockMutation tolerates.
 */
export function pickBlock(data: Record<string, unknown>): BlockT | undefined {
  for (const value of Object.values(data)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      Array.isArray((value as { blockElements?: unknown }).blockElements)
    ) {
      return value as BlockT;
    }
  }
  return undefined;
}

/**
 * The freshly created entry: present in `after`, absent from `before`. The one
 * diff both create recipes run — over `blocks` for a new block, over
 * `blockElements` for a new element.
 */
export function findNewId(before: readonly { id: string }[], after: readonly { id: string }[]): string | null {
  const known = new Set(before.map((item) => item.id));
  return after.find((item) => !known.has(item.id))?.id ?? null;
}
