/**
 * What the import WILL do, worked out before it does any of it.
 *
 * The review step is the point of this whole wizard. Chatfuel has no
 * ingestion: every row here becomes a real FAQ entry or a real catalog product
 * through the same mutation the editor uses, it spends the same character
 * budget, and a mistake is a mistake a customer reads back. So the plan is
 * computed in full — every row, every duplicate, every problem and the exact
 * character cost — and shown, and only then applied.
 *
 * Pure. The component holds no rules; it renders these rows and sends actions.
 */
import { faqChars } from './budget';
import { applyMapping, FIELDS, type ColumnMapping, type DraftValues, type ImportField } from './importMapping';
import type { ImportNote, ImportParse } from './importParse';
import type { ImportTarget } from './knowledgeParams';

/** What a row duplicates: something already saved, or an earlier row of this same file. */
export type DuplicateOf = { kind: 'existing' } | { kind: 'row'; id: string };

export interface PlanRow {
  /** From the parse; stable across edits so the table does not re-key while typing. */
  id: string;
  values: DraftValues;
  /** How the parser found this row, when it had to guess. */
  note: ImportNote | null;
  duplicate: DuplicateOf | null;
  /** Off by default for a duplicate; a person can turn any row on or off. */
  skip: boolean;
  /** True once a person set `skip` themselves — after that, re-deduping leaves it alone. */
  skipTouched: boolean;
  /** Blocking: the row cannot be created at all. */
  problems: readonly string[];
  /** Worth knowing, not blocking. */
  warnings: readonly string[];
}

/**
 * The identity two rows are compared on: the question, or the product title.
 *
 * Case and punctuation folded, because "Do you ship worldwide?" and "Do you
 * ship worldwide" are the same FAQ and importing both teaches the assistant to
 * answer twice.
 */
export function dedupeKey(values: DraftValues, target: ImportTarget): string {
  const raw = target === 'faq' ? (values.question ?? '') : (values.title ?? '');
  return raw
    .toLowerCase()
    .replace(/[\s\u00a0]+/g, ' ')
    .replace(/[?!.,:;'"«»„“”‘’()-]/g, '')
    .trim();
}

/** Blocking problems — the fields the API refuses to create without. */
export function rowProblems(values: DraftValues, target: ImportTarget): string[] {
  const problems: string[] = [];
  for (const field of FIELDS[target]) {
    if (field.required && (values[field.id] ?? '').trim() === '') problems.push(`${field.label} is empty.`);
  }
  return problems;
}

/** Things a person should see but that do not stop the row. */
export function rowWarnings(values: DraftValues, target: ImportTarget): string[] {
  const warnings: string[] = [];
  if (target !== 'products') return warnings;
  const amount = (values.amount ?? '').trim();
  /* `applyMapping` already normalized what it could read, so anything left
   * that is not a plain number is text the sheet had in the price column. */
  if (amount !== '' && !/^\d+(\.\d{1,2})?$/.test(amount))
    warnings.push('The price could not be read; this product will be created without one.');
  return warnings;
}

/** One row's share of the character budget, by the same model `budget.ts` uses. */
export function draftChars(values: DraftValues, target: ImportTarget): number {
  if (target === 'faq') return faqChars([{ question: values.question ?? '', answer: values.answer ?? '' }]);
  const amount = (values.amount ?? '').trim();
  const currency = (values.currency ?? '').trim();
  return (
    (values.title ?? '').length +
    (values.description ?? '').length +
    (amount === '' ? 0 : amount.length + currency.length)
  );
}

export interface PlanInput {
  parse: ImportParse;
  mapping: ColumnMapping;
  target: ImportTarget;
  /** What is already saved: the questions, or the product titles. */
  existing: readonly string[];
}

/**
 * Mark every row that repeats something.
 *
 * Runs over the whole list on every edit rather than incrementally: editing
 * the question that made row 9 a duplicate has to un-mark row 9, and an
 * incremental version of that is a bug waiting for a Friday.
 */
function markDuplicates(rows: readonly PlanRow[], target: ImportTarget, existing: readonly string[]): PlanRow[] {
  const saved = new Set(
    existing
      .map((value) => dedupeKey(target === 'faq' ? { question: value } : { title: value }, target))
      .filter((key) => key !== ''),
  );
  const seen = new Map<string, string>();
  return rows.map((row) => {
    const key = dedupeKey(row.values, target);
    let duplicate: DuplicateOf | null = null;
    if (key !== '') {
      if (saved.has(key)) duplicate = { kind: 'existing' };
      else if (seen.has(key)) duplicate = { kind: 'row', id: seen.get(key)! };
      else seen.set(key, row.id);
    }
    /* Duplicates arrive switched off and a row that stops being one switches
     * back on — but only while nobody has touched the checkbox. A person who
     * deliberately re-imported a duplicate must not have that undone by their
     * next keystroke in another row. */
    const skip = row.skipTouched ? row.skip : duplicate !== null;
    if (duplicate === row.duplicate && skip === row.skip) return row;
    return { ...row, duplicate, skip };
  });
}

export function buildPlan({ parse, mapping, target, existing }: PlanInput): PlanRow[] {
  const rows = parse.rows.map((row) => {
    const values = applyMapping(row.cells, mapping, target);
    return {
      id: row.id,
      values,
      note: row.note,
      duplicate: null,
      skip: false,
      skipTouched: false,
      problems: rowProblems(values, target),
      warnings: rowWarnings(values, target),
    };
  });
  return markDuplicates(rows, target, existing);
}

export function editRow(
  rows: readonly PlanRow[],
  id: string,
  field: ImportField,
  value: string,
  target: ImportTarget,
  existing: readonly string[],
): PlanRow[] {
  const next = rows.map((row) => {
    if (row.id !== id) return row;
    const values = { ...row.values, [field]: value };
    return { ...row, values, problems: rowProblems(values, target), warnings: rowWarnings(values, target) };
  });
  return markDuplicates(next, target, existing);
}

export const setSkip = (rows: readonly PlanRow[], id: string, skip: boolean): PlanRow[] =>
  rows.map((row) => (row.id === id ? { ...row, skip, skipTouched: true } : row));

export const setSkipAll = (rows: readonly PlanRow[], skip: boolean): PlanRow[] =>
  rows.map((row) => ({ ...row, skip, skipTouched: true }));

/** Rows that will actually be written, in file order. */
export const acceptedRows = (rows: readonly PlanRow[]): PlanRow[] =>
  rows.filter((row) => !row.skip && row.problems.length === 0);

export interface PlanCounts {
  total: number;
  accepted: number;
  skipped: number;
  duplicates: number;
  invalid: number;
  /** Characters the accepted rows will add to the AI's budget. */
  chars: number;
}

export function planCounts(rows: readonly PlanRow[], target: ImportTarget): PlanCounts {
  const accepted = acceptedRows(rows);
  return {
    total: rows.length,
    accepted: accepted.length,
    skipped: rows.filter((row) => row.skip).length,
    duplicates: rows.filter((row) => row.duplicate !== null).length,
    invalid: rows.filter((row) => row.problems.length > 0).length,
    chars: accepted.reduce((sum, row) => sum + draftChars(row.values, target), 0),
  };
}

/** How a row is named in a result line — the question, or the title. */
export const rowLabel = (row: PlanRow, target: ImportTarget): string =>
  ((target === 'faq' ? row.values.question : row.values.title) ?? '').trim() || 'Untitled row';

// ---------------------------------------------------------------------------
// The result
// ---------------------------------------------------------------------------

export interface RowFailure {
  label: string;
  message: string;
}

/**
 * What actually happened.
 *
 * `attempted` is separate from `created` + `failed` on purpose: products are
 * created one call at a time and the knowledge base can fill up halfway
 * through, so "we tried 20, 12 exist, 3 were refused, 5 were never sent" is a
 * sentence this has to be able to say. An import that says "done" after
 * writing twelve of twenty is a lie a person only discovers from a customer.
 */
export interface ApplyReport {
  target: ImportTarget;
  planned: number;
  created: number;
  failed: readonly RowFailure[];
  /** Set when the run stopped early — the knowledge base has no room left. */
  stoppedAtLimit: boolean;
}

export const attemptedCount = (report: ApplyReport): number => report.created + report.failed.length;

export const isPartial = (report: ApplyReport): boolean => report.created < report.planned;

export interface ApplySummary {
  tone: 'success' | 'warning' | 'danger';
  title: string;
  description: string;
}

/** The sentence the apply step shows. Never claims more than happened. */
export function applySummary(report: ApplyReport): ApplySummary {
  const what = report.target === 'faq' ? 'FAQ entries' : 'products';
  const created = `${report.created} of ${report.planned} ${what} created.`;
  if (report.created === report.planned && report.failed.length === 0) {
    return { tone: 'success', title: 'Import finished', description: created };
  }
  if (report.created === 0) {
    return {
      tone: 'danger',
      title: 'Nothing was imported',
      description: report.stoppedAtLimit
        ? 'The knowledge base is full — remove or shorten something and try again.'
        : created,
    };
  }
  const notSent = report.planned - attemptedCount(report);
  const parts = [created];
  if (report.failed.length > 0) parts.push(`${report.failed.length} refused.`);
  if (notSent > 0) parts.push(`${notSent} not sent.`);
  if (report.stoppedAtLimit) parts.push('The knowledge base filled up part way through.');
  return { tone: 'warning', title: 'Import finished part way', description: parts.join(' ') };
}
