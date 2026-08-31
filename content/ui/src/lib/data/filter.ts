/**
 * Client-side fuzzy matching for Combobox and the command palette.
 *
 * Deliberately small and predictable rather than clever. Two properties matter
 * more than match quality here: a user typing the exact label must always see
 * it first, and the same query must always produce the same order — a scorer
 * that reshuffles equal-scoring rows between keystrokes reads as a broken list.
 * Ties therefore fall back to input order, which Array.prototype.sort preserves.
 */

/** Half-open [start, end) into the matched string. */
export interface TextRange {
  start: number;
  end: number;
}

export interface FilterResult<T> {
  item: T;
  score: number;
  /** Which of the item's texts produced the match. */
  index: number;
  /** Ranges into that text, ready for highlighting. */
  ranges: TextRange[];
}

/**
 * One searchable text of an item, optionally down-weighted.
 *
 * `weight` scales the whole match before the field penalty: 0.5 turns a
 * prefix hit into something between a mid-word hit and a scattered one on a
 * full-weight text. It is how a description — prose that happens to contain
 * the letters — is kept from outranking a label that actually starts with
 * them, without dropping the description from the search entirely.
 */
export type FilterText = string | { text: string; weight?: number };

/* Score tiers are 200+ apart and the penalties below can never reach that, so
 * a contiguous match can never lose to a scattered one. */
const TIER_PREFIX = 1000;
const TIER_WORD_START = 800;
const TIER_CONTAINS = 600;
const TIER_SUBSEQUENCE = 300;
const GAP_PENALTY = 5;
const LENGTH_PENALTY_CAP = 100;
/* Later texts are worth less, so a hit on the label outranks a hit on a
 * keyword — otherwise a short keyword beats the label it describes purely by
 * being shorter. Capped so the total in-tier penalty (100 + 75) can never
 * reach the 200-point gap between tiers. */
const FIELD_PENALTY = 25;
const FIELD_PENALTY_STEPS = 3;

function isWordBoundary(text: string, index: number): boolean {
  if (index === 0) return true;
  return !/[\p{L}\p{N}]/u.test(text[index - 1]!);
}

function mergeAdjacent(ranges: TextRange[]): TextRange[] {
  const merged: TextRange[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && last.end === range.start) last.end = range.end;
    else merged.push({ ...range });
  }
  return merged;
}

/**
 * Character ranges of `query` inside `text`, or null when it does not match.
 *
 * A contiguous hit always wins; failing that, a left-to-right greedy
 * subsequence. Greedy is not optimal ("ab" against "a-a-b" could match tighter)
 * but it is O(n), stable, and the near-misses it produces are ones a user
 * cannot distinguish anyway.
 */
export function matchRanges(text: string, query: string): TextRange[] | null {
  if (query === '') return [];
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();

  const at = haystack.indexOf(needle);
  if (at !== -1) return [{ start: at, end: at + needle.length }];

  const ranges: TextRange[] = [];
  let cursor = 0;
  for (const char of needle) {
    const found = haystack.indexOf(char, cursor);
    if (found === -1) return null;
    ranges.push({ start: found, end: found + 1 });
    cursor = found + 1;
  }
  return mergeAdjacent(ranges);
}

/** Higher is better. -1 means no match at all. An empty query matches everything at 0. */
export function matchScore(text: string, query: string): number {
  if (query === '') return 0;
  const ranges = matchRanges(text, query);
  if (ranges === null) return -1;

  const first = ranges[0]!;
  const contiguous = ranges.length === 1 && first.end - first.start === query.length;
  let tier = TIER_SUBSEQUENCE;
  if (contiguous) {
    if (first.start === 0) tier = TIER_PREFIX;
    else if (isWordBoundary(text, first.start)) tier = TIER_WORD_START;
    else tier = TIER_CONTAINS;
  }

  /* Shorter texts win ties: "New" should beat "New from webhook" for "new".
   * Floored at 0 so a very long scattered query can never score below the -1
   * that means "did not match at all". */
  return Math.max(0, tier - (ranges.length - 1) * GAP_PENALTY - Math.min(text.length, LENGTH_PENALTY_CAP));
}

function textOf(entry: FilterText): string {
  return typeof entry === 'string' ? entry : entry.text;
}

function weightOf(entry: FilterText): number {
  return typeof entry === 'string' ? 1 : (entry.weight ?? 1);
}

/**
 * Ranks items by their best-matching text.
 *
 * `toTexts` returns every searchable text for an item, most important first —
 * typically `[label, description, ...keywords]`. The winning index comes back in
 * the result so a caller can highlight the label only when the label is what
 * actually matched, instead of underlining random characters.
 */
export function filterItems<T>(
  items: readonly T[],
  query: string,
  toTexts: (item: T) => FilterText | readonly FilterText[],
): FilterResult<T>[] {
  const trimmed = query.trim();
  const results: FilterResult<T>[] = [];

  /* Plain loops, not forEach: TypeScript does not track assignments made inside
   * a callback, so `bestScore` would stay narrowed to its initializer. */
  for (const item of items) {
    const raw = toTexts(item);
    const texts: readonly FilterText[] = typeof raw === 'string' ? [raw] : 'length' in raw ? raw : [raw];
    let bestScore = 0;
    let bestIndex = -1;

    for (let index = 0; index < texts.length; index += 1) {
      const entry = texts[index]!;
      const raw = matchScore(textOf(entry), trimmed);
      /* Match-or-not is the `-1` sentinel, never the sign of the score: a long
       * scattered query can legitimately score near zero. */
      if (raw === -1) continue;
      const score = raw * weightOf(entry) - Math.min(index, FIELD_PENALTY_STEPS) * FIELD_PENALTY;
      if (bestIndex === -1 || score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }

    if (bestIndex !== -1) {
      results.push({
        item,
        score: bestScore,
        index: bestIndex,
        ranges: matchRanges(textOf(texts[bestIndex]!), trimmed) ?? [],
      });
    }
  }

  /* Stable sort: equal scores keep the caller's order. */
  return results.sort((a, b) => b.score - a.score);
}

export interface FilterAcrossResult<G, T> extends FilterResult<T> {
  /** The group the item came from — the reader still needs to know what kind of thing a row is. */
  group: G;
}

/**
 * Ranks grouped items — a palette's sections — as ONE list, best hit first.
 *
 * Groups are not a ranking unit, and that is a decision. Ranking each group by
 * its own best hit and emitting the group whole put a weak hit in a strong
 * group above a strong hit in a weak one: for "sho" the inbox palette listed
 * "Show contact details" (a label prefix), then "Close to a flow" (s…h…o
 * scattered through its description) because it shared the leading group, and
 * only then "Keyboard shortcuts" (a label word start). Rows compete on their
 * own score here; the group rides along on each result so the renderer can
 * still say where the row came from.
 *
 * Ties keep the author's order — group order first, item order within — which
 * is what a stable sort over the groups' concatenation gives for free. On an
 * empty query every row ties at 0, so browsing IS the author's order and a
 * renderer can section it by consecutive group as it always did.
 */
export function filterAcross<G extends { items: readonly T[] }, T>(
  groups: readonly G[],
  query: string,
  toTexts: (item: T) => FilterText | readonly FilterText[],
): FilterAcrossResult<G, T>[] {
  const entries: { item: T; group: G }[] = [];
  for (const group of groups) for (const item of group.items) entries.push({ item, group });
  return filterItems(entries, query, (entry) => toTexts(entry.item)).map((result) => ({
    item: result.item.item,
    group: result.item.group,
    score: result.score,
    index: result.index,
    ranges: result.ranges,
  }));
}

export interface HighlightSegment {
  text: string;
  match: boolean;
}

/** Splits `text` into alternating plain/matched segments for rendering. */
export function highlightRanges(text: string, ranges: readonly TextRange[]): HighlightSegment[] {
  if (ranges.length === 0) return text === '' ? [] : [{ text, match: false }];

  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor) segments.push({ text: text.slice(cursor, range.start), match: false });
    segments.push({ text: text.slice(range.start, range.end), match: true });
    cursor = range.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });
  return segments;
}
