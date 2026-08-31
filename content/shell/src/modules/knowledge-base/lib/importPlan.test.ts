import { describe, expect, it } from 'vitest';
import {
  acceptedRows,
  applySummary,
  buildPlan,
  dedupeKey,
  draftChars,
  editRow,
  planCounts,
  rowLabel,
  setSkip,
  setSkipAll,
  type ApplyReport,
} from './importPlan';
import { guessMapping } from './importMapping';
import { parseImport } from './importParse';

const faqPlan = (csv: string, existing: readonly string[] = []) => {
  const parse = parseImport(csv, 'table');
  return buildPlan({ parse, mapping: guessMapping(parse.columns, 'faq'), target: 'faq', existing });
};

describe('dedupeKey', () => {
  it('folds case, punctuation and spacing', () => {
    expect(dedupeKey({ question: 'Do you ship worldwide?' }, 'faq')).toBe(
      dedupeKey({ question: 'do you  ship worldwide' }, 'faq'),
    );
  });

  it('is the title for products', () => {
    expect(dedupeKey({ title: 'Blue Sofa' }, 'products')).toBe('blue sofa');
  });
});

describe('buildPlan', () => {
  it('maps every row and finds no problems in a clean file', () => {
    const rows = faqPlan('question,answer\nDo you ship?,Yes\nRefunds?,30 days\n');
    expect(rows).toHaveLength(2);
    expect(rows[0]!.values).toEqual({ question: 'Do you ship?', answer: 'Yes' });
    expect(rows.every((row) => row.problems.length === 0)).toBe(true);
    expect(rows.every((row) => !row.skip)).toBe(true);
  });

  it('flags a row with an empty required field and blocks it', () => {
    const rows = faqPlan('question,answer\nDo you ship?,\n');
    expect(rows[0]!.problems).toEqual(['Answer is empty.']);
    expect(acceptedRows(rows)).toEqual([]);
  });

  it('flags a duplicate of something already saved and skips it by default', () => {
    const rows = faqPlan('question,answer\nDo you ship?,Yes\nRefunds?,30 days\n', ['do you ship']);
    expect(rows[0]!.duplicate).toEqual({ kind: 'existing' });
    expect(rows[0]!.skip).toBe(true);
    expect(rows[1]!.duplicate).toBe(null);
    expect(rows[1]!.skip).toBe(false);
  });

  it('flags a duplicate of an earlier row in the same file', () => {
    const rows = faqPlan('question,answer\nDo you ship?,Yes\nDo you ship?,Also yes\n');
    expect(rows[1]!.duplicate).toEqual({ kind: 'row', id: rows[0]!.id });
    expect(rows[0]!.duplicate).toBe(null);
  });

  it('warns about an unreadable price without blocking the product', () => {
    const parse = parseImport('title,price\nSofa,call us\n', 'table');
    const rows = buildPlan({
      parse,
      mapping: guessMapping(parse.columns, 'products'),
      target: 'products',
      existing: [],
    });
    expect(rows[0]!.problems).toEqual([]);
    expect(rows[0]!.warnings[0]).toContain('could not be read');
    expect(acceptedRows(rows)).toHaveLength(1);
  });
});

describe('editing', () => {
  it('re-validates the edited row', () => {
    const rows = faqPlan('question,answer\nDo you ship?,\n');
    const fixed = editRow(rows, rows[0]!.id, 'answer', 'Yes', 'faq', []);
    expect(fixed[0]!.problems).toEqual([]);
  });

  it('clears the duplicate flag when the question is edited to something new', () => {
    const rows = faqPlan('question,answer\nDo you ship?,Yes\n', ['do you ship']);
    expect(rows[0]!.skip).toBe(true);
    const fixed = editRow(rows, rows[0]!.id, 'question', 'Do you ship to Brazil?', 'faq', ['do you ship']);
    expect(fixed[0]!.duplicate).toBe(null);
    expect(fixed[0]!.skip).toBe(false);
  });

  it('keeps a hand-set skip through a later edit', () => {
    const rows = faqPlan('question,answer\nDo you ship?,Yes\nRefunds?,30 days\n');
    const kept = setSkip(rows, rows[1]!.id, true);
    const edited = editRow(kept, rows[0]!.id, 'answer', 'Yes, worldwide', 'faq', []);
    expect(edited[1]!.skip).toBe(true);
  });

  it('turns everything off and on', () => {
    const rows = faqPlan('question,answer\na?,b\nc?,d\n');
    expect(setSkipAll(rows, true).every((row) => row.skip)).toBe(true);
    expect(setSkipAll(setSkipAll(rows, true), false).every((row) => !row.skip)).toBe(true);
  });
});

describe('counts and cost', () => {
  it('counts what will happen and what it costs', () => {
    const rows = faqPlan('question,answer\nDo you ship?,Yes\nRefunds?,\nDo you ship?,Yes\n', []);
    const counts = planCounts(rows, 'faq');
    expect(counts).toEqual({
      total: 3,
      accepted: 1,
      skipped: 1, // the in-file duplicate
      duplicates: 1,
      invalid: 1, // the empty answer
      chars: 'Do you ship?'.length + 'Yes'.length,
    });
  });

  it('costs a product by title, description and price', () => {
    expect(draftChars({ title: 'Sofa', description: 'Blue', amount: '299', currency: 'EUR' }, 'products')).toBe(
      4 + 4 + 3 + 3,
    );
    expect(draftChars({ title: 'Sofa', description: '', amount: '', currency: 'EUR' }, 'products')).toBe(4);
  });

  it('names a row by its question or title', () => {
    const rows = faqPlan('question,answer\nDo you ship?,Yes\n');
    expect(rowLabel(rows[0]!, 'faq')).toBe('Do you ship?');
    expect(rowLabel({ ...rows[0]!, values: {} }, 'faq')).toBe('Untitled row');
  });
});

describe('applySummary', () => {
  const report = (over: Partial<ApplyReport>): ApplyReport => ({
    target: 'products',
    planned: 20,
    created: 20,
    failed: [],
    stoppedAtLimit: false,
    ...over,
  });

  it('is a success only when everything landed', () => {
    expect(applySummary(report({})).tone).toBe('success');
  });

  it('never claims success for a partial import', () => {
    const summary = applySummary(
      report({ created: 12, failed: [{ label: 'Chair', message: 'Another item already has this title.' }] }),
    );
    expect(summary.tone).toBe('warning');
    expect(summary.description).toContain('12 of 20');
    expect(summary.description).toContain('1 refused.');
    expect(summary.description).toContain('7 not sent.');
  });

  it('says the knowledge base filled up', () => {
    const summary = applySummary(report({ created: 5, stoppedAtLimit: true }));
    expect(summary.description).toContain('filled up');
  });

  it('is a failure when nothing landed', () => {
    const summary = applySummary(report({ created: 0, planned: 4, stoppedAtLimit: true }));
    expect(summary.tone).toBe('danger');
    expect(summary.description).toContain('full');
  });
});
