/**
 * What the FAQ list SHOWS, as pure functions: the sort, the search, the
 * highlighting, the duplicate pairing and the character arithmetic. The list's
 * state — order, selection, editing, dirty — is `faqDraftStore.ts`; this file
 * only ever derives.
 *
 * Two decisions live here rather than in the component:
 *
 * 1. **Search is a substring match, not the fuzzy one `~ui` ships.**
 *    `matchScore` is a subsequence matcher, and a subsequence of a 600-character
 *    answer is very nearly any short query — a fuzzy FAQ search filters nothing
 *    out. So: case-insensitive `includes`, over the question and the answer
 *    separately, with EVERY occurrence highlighted rather than the first (in a
 *    long answer the first hit is often off screen).
 * 2. **Sorting is a reading order, never the saved one.** Position is the order
 *    the assistant reads, and it is the only order that is written. Alphabetical
 *    and longest-answer are lenses for finding something in a list of eighty;
 *    they turn reordering OFF, because a drop index in a sorted list means
 *    nothing once the lens is removed.
 */
import { highlightRanges, type HighlightSegment, type TagProps, type TextRange } from '~ui';
import type { FaqRow } from '../types';
import { normalizeQuestion, type Finding, type Severity } from './lint';

export type FaqSort = 'position' | 'alpha' | 'longest';

export const FAQ_SORTS: readonly { id: FaqSort; label: string }[] = [
  { id: 'position', label: 'The order the AI reads' },
  { id: 'alpha', label: 'A to Z' },
  { id: 'longest', label: 'Longest answer first' },
];

export const isFaqSort = (raw: string): raw is FaqSort => FAQ_SORTS.some((sort) => sort.id === raw);

/** Only position is the real order, so only position can be dragged. */
export const canReorder = (sort: FaqSort): boolean => sort === 'position';

/** What one entry costs the assistant's budget — the same arithmetic `budget.ts` totals. */
export const entryChars = (row: { question: string; answer: string }): number =>
  row.question.length + row.answer.length;

export const rowsChars = (rows: readonly { question: string; answer: string }[]): number =>
  rows.reduce((sum, row) => sum + entryChars(row), 0);

/**
 * The list, in the chosen reading order.
 *
 * Stable in every arm: `Array.prototype.sort` keeps the input order for equal
 * keys, so two answers of the same length stay in the order the AI reads them
 * rather than swapping between renders.
 */
export function sortRows(rows: readonly FaqRow[], sort: FaqSort): FaqRow[] {
  if (sort === 'position') return [...rows];
  if (sort === 'alpha') return [...rows].sort((a, b) => a.question.localeCompare(b.question));
  return [...rows].sort((a, b) => b.answer.length - a.answer.length);
}

/** Every occurrence of `query` in `text`, case-insensitive. Empty for an empty query. */
export function occurrences(text: string, query: string): TextRange[] {
  const needle = query.trim().toLocaleLowerCase();
  if (needle === '') return [];
  const haystack = text.toLocaleLowerCase();
  const ranges: TextRange[] = [];
  let at = haystack.indexOf(needle);
  while (at !== -1) {
    ranges.push({ start: at, end: at + needle.length });
    at = haystack.indexOf(needle, at + needle.length);
  }
  return ranges;
}

/** Plain/matched segments for rendering. One segment, unmatched, when nothing hits. */
export const highlight = (text: string, query: string): HighlightSegment[] =>
  highlightRanges(text, occurrences(text, query));

export const matchesQuery = (row: FaqRow, query: string): boolean => {
  const needle = query.trim().toLocaleLowerCase();
  if (needle === '') return true;
  return row.question.toLocaleLowerCase().includes(needle) || row.answer.toLocaleLowerCase().includes(needle);
};

export const filterRows = (rows: readonly FaqRow[], query: string): FaqRow[] =>
  query.trim() === '' ? [...rows] : rows.filter((row) => matchesQuery(row, query));

/** Sort then filter — what the list renders, and the id list every range-select runs against. */
export const visibleRows = (rows: readonly FaqRow[], sort: FaqSort, query: string): FaqRow[] =>
  filterRows(sortRows(rows, sort), query);

/**
 * Where a row sits among its duplicates.
 *
 * The lint flags the SECOND and later copies; a person looking at one flagged
 * row still has to hunt for the other. So every member of a duplicate group —
 * the first included — gets its group number, its position in it, and the keys
 * of the others, which is what makes "2 of 2 · show the first" possible.
 */
export interface DuplicateMark {
  /** 1-based, so the chip can say "Duplicate 2". */
  group: number;
  index: number;
  total: number;
  /** The other rows asking the same question, in list order. */
  others: string[];
}

export function duplicateMarks(rows: readonly FaqRow[]): Map<string, DuplicateMark> {
  const groups = new Map<string, FaqRow[]>();
  for (const row of rows) {
    const identity = normalizeQuestion(row.question);
    /* A blank question is not a duplicate of another blank question — it is its
       own finding, and grouping them would pair two unrelated empty rows. */
    if (identity === '') continue;
    const bucket = groups.get(identity);
    if (bucket) bucket.push(row);
    else groups.set(identity, [row]);
  }

  const marks = new Map<string, DuplicateMark>();
  let group = 0;
  for (const bucket of groups.values()) {
    if (bucket.length < 2) continue;
    group += 1;
    bucket.forEach((row, index) => {
      marks.set(row.key, {
        group,
        index: index + 1,
        total: bucket.length,
        others: bucket.filter((other) => other.key !== row.key).map((other) => other.key),
      });
    });
  }
  return marks;
}

/** Findings that name a row, keyed by that row. */
export function findingsByRow(findings: readonly Finding[]): Map<string, Finding[]> {
  const byRow = new Map<string, Finding[]>();
  for (const finding of findings) {
    if (finding.item === undefined) continue;
    const bucket = byRow.get(finding.item);
    if (bucket) bucket.push(finding);
    else byRow.set(finding.item, [finding]);
  }
  return byRow;
}

/**
 * A chip-sized name for a finding.
 *
 * The finding's own `title` quotes the question ("Very long answer: \"How should
 * I store coffee?\"") because the Overview shows it out of context. On the row
 * itself the question is right there, so the chip says only what is wrong and
 * the tooltip carries the sentence.
 */
export function findingChip(finding: Finding): string {
  if (finding.id.startsWith('faq.noquestion.')) return 'No question';
  if (finding.id.startsWith('faq.noanswer.')) return 'No answer';
  if (finding.id.startsWith('faq.long.')) return 'Long answer';
  if (finding.id.startsWith('faq.duplicate.')) return 'Asked twice';
  return finding.title;
}

export const severityTone = (severity: Severity): NonNullable<TagProps['tone']> =>
  severity === 'blocker' ? 'danger' : severity === 'warning' ? 'warning' : 'neutral';

/** Findings about the list as a whole — "No FAQs", "Only a few" — which no row can carry. */
export const listFindings = (findings: readonly Finding[]): Finding[] =>
  findings.filter((finding) => finding.item === undefined);

/**
 * What a screen reader hears during a drag.
 *
 * `useDragSession`'s own wording says "Over faq-7", which is a local key and
 * means nothing to anybody. Deliberately vague about WHERE the drop will land —
 * before or after depends on the direction of travel, and the sentence
 * `announceMoved` says once the drop has happened is the accurate one.
 */
export function faqDragSentence(
  phase: 'start' | 'over' | 'drop' | 'cancel',
  count: number,
  label: string,
  target: string | null,
): string {
  const what = count === 1 ? label : `${count} entries`;
  switch (phase) {
    case 'start':
      return `Picked up ${what}. Drag over another entry, or press Escape to cancel.`;
    case 'over':
      return target === null ? 'Not over an entry.' : `Over ${target}.`;
    case 'drop':
      return target === null ? `Dropped ${what}.` : `Dropped ${what} on ${target}.`;
    case 'cancel':
      return `Cancelled. ${what} stayed where it was.`;
  }
}

/**
 * "9 entries · 1 480 characters", plus "3 shown" while a search is narrowing.
 * One line, because the header already carries the whole budget.
 */
export function summaryLine(total: number, shown: number): string {
  const entries = total === 1 ? '1 entry' : `${total} entries`;
  return shown === total ? entries : `${entries} · ${shown} shown`;
}
