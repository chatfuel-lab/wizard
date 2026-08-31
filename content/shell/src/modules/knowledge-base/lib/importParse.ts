/**
 * Text a person pasted, dropped or pointed at → rows to review.
 *
 * There is no ingestion API here. Chatfuel takes no files, no URLs, no
 * chunking and no embeddings: the knowledge base is FAQ pairs and catalog
 * items, and nothing else. So an "import" is entirely local — parse the text
 * in the browser, show exactly what will be created, and then create it with
 * the same mutations the editor uses. This file is the parsing half.
 *
 * Two shapes come in and one shape goes out:
 *
 *   table  CSV/TSV, delimiter detected, RFC-4180 quoting, BOM and CRLF
 *          tolerated, header detected rather than assumed.
 *   qa     prose — a support page, an FAQ document, an exported Notion page.
 *          Four named heuristics, in priority order, each of which can be
 *          wrong; every row it produces says which one produced it so the
 *          review step can show the guess instead of hiding it.
 *
 * Both come out as `columns` + `rows of cells`, so `importMapping` has one job
 * and the review table has one shape.
 *
 * The CSV tokeniser is deliberately in THIS file rather than borrowed from the
 * FAQ/catalog export helpers: those serialize a known list for download, this
 * one has to survive whatever a person's spreadsheet produced.
 */

export type Delimiter = ',' | '\t' | ';' | '|';
export const DELIMITERS: readonly Delimiter[] = [',', '\t', ';', '|'];

export type ImportFormat = 'table' | 'qa';

/**
 * The four ways a question is recognised in prose, worst last:
 *
 *   heading            `## How do I return an item?` + the block under it
 *   labelled           `Q: …` / `A: …`, also `Question:` / `Answer:`
 *   bold               a line that is nothing but `**How do I return an item?**`
 *   trailing-question  a line that ends in `?` followed by a paragraph
 *
 * The last one is a genuine guess — a rhetorical question inside an answer
 * looks exactly like it — which is why every row carries the rule that made it.
 */
export type QaRule = 'heading' | 'labelled' | 'bold' | 'trailing-question';

export type ImportNote =
  | { kind: 'guessed'; rule: QaRule }
  /** The row had a different number of cells than the header; padded or trimmed. */
  | { kind: 'ragged'; expected: number; got: number }
  /** A question with nothing under it. */
  | { kind: 'no-answer' };

export interface ImportRow {
  /** Stable for the life of this parse — the review table keys and edits on it. */
  id: string;
  cells: readonly string[];
  /** Why this row might be wrong. Null when the text said it plainly. */
  note: ImportNote | null;
}

export interface ImportParse {
  format: ImportFormat;
  /** Null for prose. */
  delimiter: Delimiter | null;
  /** Header labels, or synthesized ones when the first row is data. */
  columns: readonly string[];
  /** True when the first row was read as a header and is therefore NOT in `rows`. */
  headerUsed: boolean;
  rows: readonly ImportRow[];
}

/** One line for the review step, so a guess is visible rather than silent. */
export function noteText(note: ImportNote): string {
  switch (note.kind) {
    case 'guessed':
      switch (note.rule) {
        case 'heading':
          return 'Question taken from a heading.';
        case 'labelled':
          return 'Question and answer taken from Q:/A: labels.';
        case 'bold':
          return 'Question taken from a bold line.';
        case 'trailing-question':
          return 'Guessed: a line ending in a question mark, answered by the paragraph under it.';
      }
      break;
    case 'ragged':
      return `Row had ${note.got} columns, not ${note.expected}.`;
    case 'no-answer':
      return 'No answer found under this question.';
  }
  return '';
}

// ---------------------------------------------------------------------------
// Delimited text
// ---------------------------------------------------------------------------

/** A BOM survives every copy-paste and turns the first header into `\uFEFFQuestion`. */
export const stripBom = (text: string): string => (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);

/**
 * RFC-4180 with the parts real files actually use.
 *
 * A quoted field may hold the delimiter, a newline and `""` for a literal
 * quote. CRLF is normalized to LF everywhere INCLUDING inside quotes: a stray
 * `\r` at the end of a cell is invisible in the review table and then very
 * visible in the answer the assistant reads out.
 */
export function tokenize(text: string, delimiter: Delimiter): string[][] {
  const source = stripBom(text).replace(/\r\n?/g, '\n');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]!;
    if (quoted) {
      if (char !== '"') {
        cell += char;
      } else if (source[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = false;
      }
      continue;
    }
    if (char === '"' && cell === '') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  /* A file ends with a newline; that is not an empty last record. */
  return rows.filter((entry) => entry.some((value) => value.trim() !== ''));
}

/**
 * Which delimiter, decided by tokenising with each and asking which one
 * produced a consistent table.
 *
 * Counting separators on the first line is the obvious approach and it is
 * wrong: one address field with a comma in it beats a whole tab-separated
 * file. A candidate that yields more than one column on most rows, with the
 * same count on each, is the delimiter.
 */
export function detectDelimiter(text: string): Delimiter {
  let best: { delimiter: Delimiter; score: number } = { delimiter: ',', score: -1 };
  for (const delimiter of DELIMITERS) {
    const shape = tableShape(text, delimiter);
    if (shape === null) continue;
    /* Width breaks ties: "a;b,c" is one 2-column semicolon table, not three
     * comma columns of nonsense, only when the semicolons are consistent. */
    const score = shape.consistent * 10 + Math.min(shape.width, 8);
    if (score > best.score) best = { delimiter, score };
  }
  return best.delimiter;
}

/**
 * How table-shaped is this text under this delimiter?
 *
 * Measured against the MOST COMMON row width, not the first row's: one row
 * with a stray extra delimiter is a ragged row to note, not a reason to
 * declare the whole file prose.
 */
function tableShape(text: string, delimiter: Delimiter): { width: number; consistent: number } | null {
  const widths = tokenize(text, delimiter)
    .slice(0, 50)
    .map((row) => row.length);
  if (widths.length === 0) return null;
  const counts = new Map<number, number>();
  for (const width of widths) counts.set(width, (counts.get(width) ?? 0) + 1);
  let width = widths[0]!;
  let seen = 0;
  for (const [candidate, count] of counts) {
    if (count > seen) {
      width = candidate;
      seen = count;
    }
  }
  if (width < 2) return null;
  return { width, consistent: seen / widths.length };
}

const NUMERIC = /^[-+]?[\d.,\s]+%?$/;

/**
 * Is the first row labels or data?
 *
 * Three signals, all of which a real header has: every cell filled, no
 * duplicates, and nothing that reads as a number. The fourth is the strongest
 * and only exists when there is a second row — a column that is text on row 1
 * and a number on row 2 is a header over a price.
 */
export function looksLikeHeader(rows: readonly string[][]): boolean {
  const first = rows[0];
  if (!first || first.length === 0) return false;
  const cells = first.map((cell) => cell.trim());
  if (cells.some((cell) => cell === '')) return false;
  if (new Set(cells.map((cell) => cell.toLowerCase())).size !== cells.length) return false;
  if (cells.some((cell) => NUMERIC.test(cell))) return false;

  const second = rows[1];
  if (!second) return true;
  const numericBelow = cells.some((_cell, index) => {
    const below = (second[index] ?? '').trim();
    return below !== '' && NUMERIC.test(below);
  });
  /* No numbers anywhere is still a header far more often than not — a header
   * row of words over rows of words is the normal FAQ export. */
  return numericBelow || cells.every((cell) => cell.length <= 40);
}

/** `Column 1`, `Column 2` … for a file that starts straight in on the data. */
export const positionalColumns = (count: number): string[] =>
  Array.from({ length: count }, (_unused, index) => `Column ${index + 1}`);

/**
 * Rows out of an already-tokenised table.
 *
 * `width` is the widest row, not the header's width: a spreadsheet that
 * exported one row with an extra trailing comma must not silently drop a cell.
 * Short rows are padded and NOTED, never dropped.
 */
function shapeTable(raw: readonly string[][], delimiter: Delimiter, headerUsed: boolean): ImportParse {
  const width = Math.max(1, ...raw.map((row) => row.length));
  const header = headerUsed ? (raw[0] ?? []) : [];
  const body = headerUsed ? raw.slice(1) : raw;
  const columns = headerUsed
    ? /* A trailing delimiter leaves an unnamed column; it still has data under it. */
      Array.from({ length: width }, (_unused, index) => header[index]?.trim() || `Column ${index + 1}`)
    : positionalColumns(width);

  return {
    format: 'table',
    delimiter,
    headerUsed,
    columns,
    rows: body.map((row, index) => ({
      id: `row-${index + 1}`,
      cells: Array.from({ length: width }, (_unused, at) => (row[at] ?? '').trim()),
      note: row.length === width ? null : { kind: 'ragged', expected: width, got: row.length },
    })),
  };
}

// ---------------------------------------------------------------------------
// Prose
// ---------------------------------------------------------------------------

const HEADING = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;
const LABELLED_Q = /^\s*(?:q|question|faq)\s*[:.)\-\u2014]\s*(.+)$/i;
const LABELLED_A = /^\s*(?:a|answer|ans)\s*[:.)\-\u2014]\s*(.*)$/i;
const BOLD_LINE = /^\s*(?:\*\*|__)(.+?)(?:\*\*|__)\s*:?\s*$/;
/** A whole line that is a question. Long lines are prose that happens to ask something. */
const QUESTION_LINE = /^(.{3,200}\?)\s*$/;

interface OpenQuestion {
  question: string;
  rule: QaRule;
  answer: string[];
}

/**
 * Prose → question/answer pairs.
 *
 * A line-by-line machine rather than a block split, because the four shapes
 * disagree about where a block ends: `Q:`/`A:` are adjacent lines, a markdown
 * heading owns everything until the next heading, and a bare question owns the
 * paragraph under it. What they agree on is that a NEW question closes the
 * previous one, and that is the whole rule below.
 */
/** One collected question, as a row. Pure, so the loop below can stay a plain loop. */
function finishQa(open: OpenQuestion, index: number): ImportRow {
  const answer = open.answer
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return {
    id: `qa-${index}`,
    cells: [open.question, answer],
    note: answer === '' ? { kind: 'no-answer' } : { kind: 'guessed', rule: open.rule },
  };
}

export function parseQa(text: string): ImportRow[] {
  const lines = stripBom(text).replace(/\r\n?/g, '\n').split('\n');
  const rows: ImportRow[] = [];
  let open: OpenQuestion | null = null;
  /* Set by an explicit `A:` label: everything after it is answer, even a line
   * that ends in a question mark. */
  let answering = false;

  /* Every mutation of `open` happens here in the loop body rather than in a
   * helper closure — a `close()`/`start()` pair reads better and makes the
   * compiler narrow `open` to `never` halfway down, which is a lie. */
  for (const line of lines) {
    const heading = HEADING.exec(line);
    const labelledQ = heading ? null : LABELLED_Q.exec(line);
    const labelledA = heading || labelledQ ? null : LABELLED_A.exec(line);
    const bold = heading || labelledQ || labelledA ? null : BOLD_LINE.exec(line);
    /* A question mark inside an answer belongs to that answer; only a line
     * that starts a NEW block is allowed to open one. */
    /* Annotated: `trailing` decides `opener`, which decides the next `open`,
     * which this line reads — a circle the inference cannot walk on its own. */
    const trailing: RegExpExecArray | null =
      heading || labelledQ || labelledA || bold || answering || (open !== null && open.answer.length === 0)
        ? null
        : QUESTION_LINE.exec(line.trim());

    /* A heading with no question mark can still be an FAQ entry ("Returns"),
     * so headings open a question either way — the review step is where a
     * person throws out the ones that are section titles. */
    const opener: [string, QaRule] | null = heading
      ? [heading[2]!, 'heading']
      : labelledQ
        ? [labelledQ[1]!, 'labelled']
        : bold
          ? [bold[1]!, 'bold']
          : trailing
            ? [trailing[1]!, 'trailing-question']
            : null;

    if (opener) {
      if (open) rows.push(finishQa(open, rows.length + 1));
      open = { question: opener[0].trim(), rule: opener[1], answer: [] };
      answering = false;
      continue;
    }

    if (labelledA && open) {
      open.rule = 'labelled';
      answering = true;
      if (labelledA[1]!.trim() !== '') open.answer.push(labelledA[1]!.trim());
      continue;
    }

    if (open) open.answer.push(line.trim());
  }
  if (open) rows.push(finishQa(open, rows.length + 1));
  return rows;
}

// ---------------------------------------------------------------------------
// The entry point
// ---------------------------------------------------------------------------

/**
 * Table or prose?
 *
 * A delimiter that produces a rectangle over several rows wins; anything else
 * is prose. Deliberately biased towards prose: reading a support page as a
 * one-column table produces rows nobody can map, while reading a table as
 * prose produces nothing at all and the person switches the toggle.
 */
export function sniffFormat(text: string): ImportFormat {
  const delimiter = detectDelimiter(text);
  if (tokenize(text, delimiter).length < 2) return 'qa';
  const shape = tableShape(text, delimiter);
  return shape !== null && shape.consistent >= 0.6 ? 'table' : 'qa';
}

export function parseImport(text: string, format: ImportFormat | 'auto' = 'auto'): ImportParse {
  const resolved = format === 'auto' ? sniffFormat(text) : format;
  if (resolved === 'qa')
    return { format: 'qa', delimiter: null, columns: ['Question', 'Answer'], headerUsed: false, rows: parseQa(text) };
  const delimiter = detectDelimiter(text);
  const raw = tokenize(text, delimiter);
  return shapeTable(raw, delimiter, looksLikeHeader(raw));
}

/**
 * Re-parse with an explicit delimiter or an explicit header answer — the parse
 * step is where a person corrects the guess, and flipping "first row is a
 * header" has to re-label the columns, not just move a row.
 */
export function parseTableWith(text: string, delimiter: Delimiter, headerUsed?: boolean): ImportParse {
  const raw = tokenize(text, delimiter);
  return shapeTable(raw, delimiter, headerUsed ?? looksLikeHeader(raw));
}
