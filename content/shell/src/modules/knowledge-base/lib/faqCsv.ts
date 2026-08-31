/**
 * FAQs ⇄ CSV and JSON. Pure, React-free, and deliberately symmetric: the
 * import wizard reads this file too, so whatever `toCsv` writes `parseCsv` +
 * `toFaqEntries` must give back byte for byte.
 *
 * Three decisions worth knowing before touching any of it:
 *
 * 1. **The round trip is the contract.** An answer is prose — it contains
 *    commas, quotation marks and paragraph breaks — so RFC 4180 quoting is not
 *    a nicety here, it is the whole job. `faqCsv.test.ts` round-trips the ugly
 *    cases rather than asserting a golden string.
 * 2. **The formula guard is reversible.** A cell starting with `=`, `+`, `-`,
 *    `@` or a control character is executed by every spreadsheet that opens it,
 *    and a question can arrive here from a customer's own message (the Gaps
 *    source), so the shared `csvEscape` prefixes it with `'` on the way out
 *    (plain numbers and phone-shaped cells excepted — they are not formulas).
 *    That prefix would otherwise become part of the text on re-import, so
 *    `toFaqEntries` strips exactly one `'` when a formula character follows
 *    it. The one thing it cannot represent is an answer that genuinely begins
 *    `'=`, which nothing has ever needed.
 * 3. **`parseCsv` guesses nothing.** It returns the grid as written — no
 *    trimming, no header handling, no type coercion. Everything opinionated
 *    lives in `toFaqEntries`, so the wizard can show the raw grid in a preview
 *    and let a person map the columns themselves.
 *
 * The one guess it does make is the DELIMITER, and only because a European
 * Excel writes `;` by default and a file that parses as one giant column is
 * indistinguishable from a broken import to the person holding it.
 */

import { CSV_BOM, csvText } from '~ui';

/** The pair, and nothing else — this file must not depend on the wire types. */
export interface FaqPair {
  question: string;
  answer: string;
}

export const FAQ_CSV_HEADER: readonly string[] = ['Question', 'Answer'];

/** Delimiters `detectDelimiter` will consider, best-guess order — comma wins a tie. */
export const CSV_DELIMITERS: readonly string[] = [',', ';', '\t'];

/** The inverse of the shared escape's guard: one `'` that is only there to defuse the next character. */
const GUARD_PREFIX = /^'(?=[=+\-@\t\r])/;

/** Header + one row per entry, CRLF-terminated, no BOM (the caller adds one for Excel). */
export function toCsv(entries: readonly FaqPair[]): string {
  return csvText([FAQ_CSV_HEADER, ...entries.map((entry) => [entry.question, entry.answer])]);
}

/**
 * The same list as JSON — the export people actually re-import, because it has
 * no quoting rules to get wrong. An array, not an object with a `faqs` key: it
 * is the shape `fuelyConfigSetFAQs` takes.
 */
export function toJson(entries: readonly FaqPair[]): string {
  return `${JSON.stringify(
    entries.map(({ question, answer }) => ({ question, answer })),
    null,
    2,
  )}\n`;
}

/**
 * Which delimiter the first line is written with.
 *
 * Counted outside quotes, because a single answer full of commas would
 * otherwise outvote the real separator on a semicolon file.
 */
export function detectDelimiter(text: string): string {
  const counts = new Map<string, number>(CSV_DELIMITERS.map((delimiter) => [delimiter, 0]));
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    if (char === '"') {
      if (quoted && text[index + 1] === '"') index += 1;
      else quoted = !quoted;
      continue;
    }
    if (quoted) continue;
    if (char === '\n' || char === '\r') break;
    const seen = counts.get(char);
    if (seen !== undefined) counts.set(char, seen + 1);
  }
  let best = CSV_DELIMITERS[0]!;
  let bestCount = 0;
  for (const delimiter of CSV_DELIMITERS) {
    const count = counts.get(delimiter)!;
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
}

export interface ParseCsvOptions {
  /** Override the guess. The wizard offers this when the preview looks wrong. */
  delimiter?: string;
}

/**
 * CSV text → a grid of raw cells.
 *
 * RFC 4180 with the two leniencies every real file needs: CR, LF and CRLF all
 * end a line, and a bare `"` in the middle of an unquoted field is a literal
 * quote rather than an error — a person typing 5" pipe into a spreadsheet is
 * not writing malformed CSV, they are writing an answer.
 *
 * A blank line produces no row at all, which is also what makes a trailing
 * newline harmless. The one thing that costs: a final line consisting of a
 * single empty quoted field is dropped with it, and an FAQ with no question
 * and no answer is not a row anybody meant to import.
 */
export function parseCsv(text: string, options: ParseCsvOptions = {}): string[][] {
  const source = text.startsWith(CSV_BOM) ? text.slice(1) : text;
  const delimiter = options.delimiter ?? detectDelimiter(source);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  /* True once anything — a character or an opening quote — has been read into
     the current field. It is what separates a real row from the phantom one a
     trailing newline would otherwise leave behind. */
  let started = false;

  const endField = () => {
    row.push(field);
    field = '';
    started = false;
  };
  const endRow = () => {
    endField();
    if (row.length > 1 || row[0] !== '') rows.push(row);
    row = [];
  };

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]!;

    if (quoted) {
      if (char !== '"') {
        field += char;
        continue;
      }
      /* `""` inside a quoted field is one literal quote. */
      if (source[index + 1] === '"') {
        field += '"';
        index += 1;
        continue;
      }
      quoted = false;
      continue;
    }

    if (char === '"' && !started) {
      quoted = true;
      started = true;
      continue;
    }
    if (char === delimiter) {
      endField();
      continue;
    }
    if (char === '\n') {
      endRow();
      continue;
    }
    if (char === '\r') {
      if (source[index + 1] === '\n') index += 1;
      endRow();
      continue;
    }
    field += char;
    started = true;
  }

  if (started || field !== '' || row.length > 0) endRow();
  return rows;
}

/** Cells this file wrote, unwrapped: one leading `'` that is only defusing a formula. */
export const unguardCell = (cell: string): string => cell.replace(GUARD_PREFIX, '');

/**
 * Does this row name the columns rather than hold data?
 *
 * English only and deliberately so — a wrong guess here silently eats the first
 * FAQ, so it fires on the words this module's own export writes and the handful
 * every other tool writes, and on nothing else. `q` and `a` are NOT in the list
 * for exactly that reason: an FAQ whose question is literally "Q" is rare, and
 * losing it to a guess is worse than reading one extra header row as data.
 */
export function hasHeaderRow(row: readonly string[]): boolean {
  const first = (row[0] ?? '').trim().toLocaleLowerCase();
  const second = (row[1] ?? '').trim().toLocaleLowerCase();
  const isQuestion = first === 'question' || first === 'questions' || first === 'faq';
  const isAnswer = second === 'answer' || second === 'answers' || second === 'reply' || second === 'response';
  return isQuestion && (second === '' || isAnswer);
}

/**
 * A parsed grid → FAQ pairs: the header dropped if there is one, the first two
 * columns taken, and rows that are blank in both dropped.
 *
 * Nothing is trimmed. Leading and trailing spaces survived the quoting on
 * purpose, and eating them here would break the round trip for the one kind of
 * answer that needs them — a list whose lines are indented.
 */
export function toFaqEntries(grid: readonly (readonly string[])[]): FaqPair[] {
  const body = grid.length > 0 && hasHeaderRow(grid[0]!) ? grid.slice(1) : grid;
  const entries: FaqPair[] = [];
  for (const row of body) {
    const question = unguardCell(row[0] ?? '');
    const answer = unguardCell(row[1] ?? '');
    if (question.trim() === '' && answer.trim() === '') continue;
    entries.push({ question, answer });
  }
  return entries;
}

/** The whole import in one call: text → pairs. */
export const parseFaqCsv = (text: string, options?: ParseCsvOptions): FaqPair[] =>
  toFaqEntries(parseCsv(text, options));

/**
 * JSON → pairs, for the file this module's own JSON export wrote.
 *
 * Takes a bare array or an object with a `faqs` array, because those are the
 * two shapes anyone would hand it. Anything that is not an object with two
 * string-ish fields is skipped rather than thrown on: half a file is a better
 * import result than an error message about character 4 812.
 */
export function parseFaqJson(text: string): FaqPair[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { faqs?: unknown } | null)?.faqs)
      ? (parsed as { faqs: unknown[] }).faqs
      : [];
  const entries: FaqPair[] = [];
  for (const item of list) {
    if (typeof item !== 'object' || item === null) continue;
    const record = item as Record<string, unknown>;
    const question = typeof record.question === 'string' ? record.question : '';
    const answer = typeof record.answer === 'string' ? record.answer : '';
    if (question.trim() === '' && answer.trim() === '') continue;
    entries.push({ question, answer });
  }
  return entries;
}

/** `faq-9-entries.csv` — the count is in the name so two exports never collide silently. */
export const faqFileName = (kind: 'csv' | 'json', count: number): string =>
  `faq-${count}-${count === 1 ? 'entry' : 'entries'}.${kind}`;
