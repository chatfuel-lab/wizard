import { describe, expect, it } from 'vitest';
import {
  canReorder,
  duplicateMarks,
  entryChars,
  faqDragSentence,
  filterRows,
  findingChip,
  findingsByRow,
  highlight,
  severityTone,
  isFaqSort,
  listFindings,
  matchesQuery,
  occurrences,
  rowsChars,
  sortRows,
  summaryLine,
  visibleRows,
} from './faqList';
import type { Finding } from './lint';
import type { FaqRow } from '../types';

const row = (key: string, question: string, answer: string): FaqRow => ({ key, question, answer });

const LIST: FaqRow[] = [
  row('k1', 'Do you ship beans?', 'Yes, anywhere in Germany.'),
  row('k2', 'How much is delivery?', 'Free over 40 EUR.'),
  row('k3', 'Are you open on Sunday?', 'No. Monday to Saturday only, and Saturday closes early at 18:00.'),
  row('k4', 'do you SHIP beans!', 'Only within Berlin.'),
];

describe('sorting', () => {
  it('leaves position alone and copies rather than mutating', () => {
    const sorted = sortRows(LIST, 'position');
    expect(sorted.map((r) => r.key)).toEqual(['k1', 'k2', 'k3', 'k4']);
    expect(sorted).not.toBe(LIST);
  });

  it('sorts A to Z and by longest answer', () => {
    expect(sortRows(LIST, 'alpha').map((r) => r.key)).toEqual(['k3', 'k4', 'k1', 'k2']);
    expect(sortRows(LIST, 'longest').map((r) => r.key)).toEqual(['k3', 'k1', 'k4', 'k2']);
  });

  it('keeps equal keys in reading order', () => {
    const tie = [row('a', 'a', 'xx'), row('b', 'b', 'xx'), row('c', 'c', 'xx')];
    expect(sortRows(tie, 'longest').map((r) => r.key)).toEqual(['a', 'b', 'c']);
  });

  it('lets only the real order be dragged', () => {
    expect(canReorder('position')).toBe(true);
    expect(canReorder('alpha')).toBe(false);
    expect(canReorder('longest')).toBe(false);
    expect(isFaqSort('alpha')).toBe(true);
    expect(isFaqSort('nonsense')).toBe(false);
  });
});

describe('search', () => {
  it('matches the question or the answer, case-insensitively', () => {
    expect(matchesQuery(LIST[0]!, 'SHIP')).toBe(true);
    expect(matchesQuery(LIST[0]!, 'germany')).toBe(true);
    expect(matchesQuery(LIST[0]!, 'sunday')).toBe(false);
    /* An empty query is not a filter. */
    expect(matchesQuery(LIST[0]!, '   ')).toBe(true);
  });

  it('does NOT match a scattered subsequence — the reason this is not the ~ui matcher', () => {
    expect(matchesQuery(row('x', 'Do you ship beans?', 'Yes'), 'dysb')).toBe(false);
  });

  it('filters and combines with the sort', () => {
    expect(filterRows(LIST, 'ship').map((r) => r.key)).toEqual(['k1', 'k4']);
    expect(filterRows(LIST, '').map((r) => r.key)).toEqual(['k1', 'k2', 'k3', 'k4']);
    expect(visibleRows(LIST, 'alpha', 'ship').map((r) => r.key)).toEqual(['k4', 'k1']);
  });
});

describe('highlighting', () => {
  it('finds every occurrence, not just the first', () => {
    expect(occurrences('a bean is a bean', 'bean')).toEqual([
      { start: 2, end: 6 },
      { start: 12, end: 16 },
    ]);
    expect(occurrences('anything', '  ')).toEqual([]);
  });

  it('never overlaps its own match', () => {
    expect(occurrences('aaaa', 'aa')).toEqual([
      { start: 0, end: 2 },
      { start: 2, end: 4 },
    ]);
  });

  it('splits into plain and matched segments, and leaves an unmatched string whole', () => {
    expect(highlight('Ship beans', 'ship')).toEqual([
      { text: 'Ship', match: true },
      { text: ' beans', match: false },
    ]);
    expect(highlight('Ship beans', 'oat')).toEqual([{ text: 'Ship beans', match: false }]);
  });
});

describe('duplicate pairing', () => {
  it('marks every member of the group, including the first', () => {
    const marks = duplicateMarks(LIST);
    expect([...marks.keys()].sort()).toEqual(['k1', 'k4']);
    expect(marks.get('k1')).toEqual({ group: 1, index: 1, total: 2, others: ['k4'] });
    expect(marks.get('k4')).toEqual({ group: 1, index: 2, total: 2, others: ['k1'] });
  });

  it('numbers separate groups separately and handles three of a kind', () => {
    const marks = duplicateMarks([
      row('a', 'Where?', '1'),
      row('b', 'When?', '2'),
      row('c', 'where!', '3'),
      row('d', 'WHEN', '4'),
      row('e', 'when', '5'),
    ]);
    expect(marks.get('a')?.group).toBe(1);
    expect(marks.get('c')?.group).toBe(1);
    expect(marks.get('b')?.group).toBe(2);
    expect(marks.get('e')).toEqual({ group: 2, index: 3, total: 3, others: ['b', 'd'] });
  });

  it('does not pair two rows that have no question at all', () => {
    expect(duplicateMarks([row('a', '', 'x'), row('b', '   ', 'y')]).size).toBe(0);
  });
});

describe('findings', () => {
  const finding = (id: string, item?: string): Finding => ({
    id,
    source: 'faq',
    severity: 'warning',
    title: id,
    detail: '',
    ...(item === undefined ? {} : { item }),
  });

  it('names the finding in three words and keeps the sentence for the tooltip', () => {
    expect(findingChip(finding('faq.long.k1', 'k1'))).toBe('Long answer');
    expect(findingChip(finding('faq.noanswer.k1', 'k1'))).toBe('No answer');
    expect(findingChip(finding('faq.noquestion.k1', 'k1'))).toBe('No question');
    expect(findingChip(finding('faq.duplicate.k1', 'k1'))).toBe('Asked twice');
    /* Anything the lint grows later still renders, just with its own words. */
    expect(findingChip(finding('faq.something.new', 'k1'))).toBe('faq.something.new');
    expect(severityTone('blocker')).toBe('danger');
    expect(severityTone('warning')).toBe('warning');
    expect(severityTone('tip')).toBe('neutral');
  });

  it('buckets by row and keeps the list-wide ones apart', () => {
    const findings = [finding('a', 'k1'), finding('b', 'k1'), finding('c', 'k2'), finding('thin')];
    expect(
      findingsByRow(findings)
        .get('k1')
        ?.map((f) => f.id),
    ).toEqual(['a', 'b']);
    expect(
      findingsByRow(findings)
        .get('k2')
        ?.map((f) => f.id),
    ).toEqual(['c']);
    expect(findingsByRow(findings).has('thin')).toBe(false);
    expect(listFindings(findings).map((f) => f.id)).toEqual(['thin']);
  });
});

describe('the drag sentence', () => {
  it('names the entry rather than its local key, in the singular and the plural', () => {
    expect(faqDragSentence('start', 1, 'Do you ship?', null)).toBe(
      'Picked up Do you ship?. Drag over another entry, or press Escape to cancel.',
    );
    expect(faqDragSentence('start', 3, 'Do you ship?', null)).toBe(
      'Picked up 3 entries. Drag over another entry, or press Escape to cancel.',
    );
    expect(faqDragSentence('over', 1, 'a', null)).toBe('Not over an entry.');
    expect(faqDragSentence('over', 1, 'a', 'Where are you?')).toBe('Over Where are you?.');
    expect(faqDragSentence('drop', 2, 'a', 'Where are you?')).toBe('Dropped 2 entries on Where are you?.');
    expect(faqDragSentence('cancel', 1, 'a', null)).toBe('Cancelled. a stayed where it was.');
  });
});

describe('character arithmetic', () => {
  it('still counts a pair — the budget breakdown reads it, the toolbar no longer prints it', () => {
    expect(entryChars({ question: 'abc', answer: 'de' })).toBe(5);
    expect(
      rowsChars([
        { question: 'abc', answer: 'de' },
        { question: '', answer: '' },
      ]),
    ).toBe(5);
  });

  it('summarises what is in the list without a character count', () => {
    expect(summaryLine(1, 1)).toBe('1 entry');
    expect(summaryLine(9, 9)).toBe('9 entries');
    expect(summaryLine(9, 3)).toBe('9 entries \u00b7 3 shown');
  });
});
