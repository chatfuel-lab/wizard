import { parseInline } from './inline';
import type { MarkdownBlock, MarkdownList, MarkdownListItem, TableAlign } from './types';

const FENCE_RE = /^ {0,3}(```|~~~)[ \t]*([^`\s]*)/;
const CLOSING_FENCE_RE = /^ {0,3}(```|~~~)[ \t]*$/;
const HEADING_RE = /^ {0,3}(#{1,6})[ \t]+(.*)$/;
const RULE_RE = /^ {0,3}(?:-{3,}|\*{3,}|_{3,})[ \t]*$/;
const QUOTE_RE = /^ {0,3}> ?(.*)$/;
const LIST_RE = /^([ \t]*)(?:([-*+])|(\d{1,9})[.)])[ \t]+(.*)$/;
const TABLE_RE = /^ {0,3}\|/;
const BLANK_RE = /^[ \t]*$/;

/* A quote inside a quote inside a quote is already unusual; past that it is a
   model emitting a wall of angle brackets and the remainder renders as text. */
const MAX_QUOTE_DEPTH = 3;

export interface ParseMarkdownOptions {
  /** Nesting depth for blockquotes. Internal; callers never pass it. */
  quoteDepth?: number;
}

/**
 * Parse a whole message into blocks.
 *
 * Called on every frame of a stream with a slightly longer string each time,
 * so it stays a single pass over the lines with no backtracking: the cost is
 * linear in the text, and the text is a chat message.
 */
export function parseMarkdown(text: string, options: ParseMarkdownOptions = {}): MarkdownBlock[] {
  const quoteDepth = options.quoteDepth ?? 0;
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    if (BLANK_RE.test(line)) {
      i += 1;
      continue;
    }

    const fence = FENCE_RE.exec(line);
    if (fence) {
      const marker = fence[1]!;
      const language = fence[2]!.trim();
      const body: string[] = [];
      let closed = false;
      i += 1;
      while (i < lines.length) {
        const inner = lines[i]!;
        if (CLOSING_FENCE_RE.test(inner) && inner.trim().startsWith(marker)) {
          closed = true;
          i += 1;
          break;
        }
        body.push(inner);
        i += 1;
      }
      blocks.push({
        kind: 'code',
        language: language === '' ? null : language,
        code: body.join('\n'),
        closed,
      });
      continue;
    }

    if (RULE_RE.test(line)) {
      blocks.push({ kind: 'rule' });
      i += 1;
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      /* Four hashes and deeper clamp to level 3 rather than being ignored: the
         words are still a heading, and this document has three sizes. */
      const level = Math.min(heading[1]!.length, 3) as 1 | 2 | 3;
      blocks.push({ kind: 'heading', level, spans: parseInline(stripTrailingHashes(heading[2]!)) });
      i += 1;
      continue;
    }

    if (QUOTE_RE.test(line)) {
      const inner: string[] = [];
      while (i < lines.length) {
        const match = QUOTE_RE.exec(lines[i]!);
        if (!match) break;
        inner.push(match[1]!);
        i += 1;
      }
      const body = inner.join('\n');
      blocks.push({
        kind: 'quote',
        blocks:
          quoteDepth + 1 >= MAX_QUOTE_DEPTH
            ? [{ kind: 'paragraph', spans: parseInline(body) }]
            : parseMarkdown(body, { quoteDepth: quoteDepth + 1 }),
      });
      continue;
    }

    if (TABLE_RE.test(line)) {
      const rows: string[] = [];
      while (i < lines.length && TABLE_RE.test(lines[i]!)) {
        rows.push(lines[i]!);
        i += 1;
      }
      blocks.push(buildTable(rows));
      continue;
    }

    if (LIST_RE.test(line)) {
      const consumed = buildList(lines, i);
      blocks.push({ kind: 'list', list: consumed.list });
      i = consumed.next;
      continue;
    }

    /* A paragraph runs to the first blank line or the first line that starts
       some other block. Without that second half a bullet written straight
       under a sentence would be swallowed into it, which is how most models
       write a list. */
    const paragraph: string[] = [line];
    i += 1;
    while (i < lines.length && !BLANK_RE.test(lines[i]!) && !startsBlock(lines[i]!)) {
      paragraph.push(lines[i]!);
      i += 1;
    }
    blocks.push({ kind: 'paragraph', spans: parseInline(paragraph.join('\n').trim()) });
  }

  return blocks;
}

function startsBlock(line: string): boolean {
  return (
    FENCE_RE.test(line) ||
    RULE_RE.test(line) ||
    HEADING_RE.test(line) ||
    QUOTE_RE.test(line) ||
    TABLE_RE.test(line) ||
    LIST_RE.test(line)
  );
}

/** A closing run of hashes on a heading is decoration, not text. */
function stripTrailingHashes(text: string): string {
  return text.replace(/[ \t]+#+[ \t]*$/, '').trim();
}

/* Tabs count as four columns when deciding whether an item is nested. Two
   spaces is enough to nest, which is what every model emits; four is what the
   old reference implementation wanted, and both work. */
function indentWidth(prefix: string): number {
  let width = 0;
  for (const char of prefix) width += char === '\t' ? 4 : 1;
  return width;
}

interface ListRun {
  list: MarkdownList;
  next: number;
}

interface RawChild {
  ordered: boolean;
  start: number;
  texts: string[];
}

function buildList(lines: string[], from: number): ListRun {
  const first = LIST_RE.exec(lines[from]!)!;
  const ordered = first[3] !== undefined;
  const list: MarkdownList = {
    ordered,
    start: ordered ? Number.parseInt(first[3]!, 10) : 1,
    items: [],
  };

  /* Raw text per item, so a wrapped line can be appended before anything is
     parsed — inline markup can straddle the line break. */
  const rawItems: { text: string; child: RawChild | null }[] = [];
  let i = from;

  while (i < lines.length) {
    const line = lines[i]!;
    if (BLANK_RE.test(line)) break;

    const match = LIST_RE.exec(line);
    if (match) {
      const indent = indentWidth(match[1]!);
      const itemOrdered = match[3] !== undefined;
      const content = match[4]!;

      if (indent >= 2 && rawItems.length > 0) {
        const parent = rawItems[rawItems.length - 1]!;
        parent.child ??= {
          ordered: itemOrdered,
          start: itemOrdered ? Number.parseInt(match[3]!, 10) : 1,
          texts: [],
        };
        parent.child.texts.push(content);
      } else {
        /* A bullet list touching a numbered list is two lists, not one with a
           confused marker. */
        if (itemOrdered !== ordered) break;
        rawItems.push({ text: content, child: null });
      }
      i += 1;
      continue;
    }

    /* A wrapped line: indented, and not the start of some other block. */
    if (rawItems.length > 0 && /^[ \t]+\S/.test(line) && !startsBlock(line)) {
      const parent = rawItems[rawItems.length - 1]!;
      const child = parent.child;
      if (child && child.texts.length > 0) {
        child.texts[child.texts.length - 1] += `\n${line.trim()}`;
      } else {
        parent.text += `\n${line.trim()}`;
      }
      i += 1;
      continue;
    }

    break;
  }

  for (const raw of rawItems) {
    const item: MarkdownListItem = { spans: parseInline(raw.text) };
    if (raw.child) {
      item.child = {
        ordered: raw.child.ordered,
        start: raw.child.start,
        items: raw.child.texts.map((each) => ({ spans: parseInline(each) })),
      };
    }
    list.items.push(item);
  }

  return { list, next: i };
}

const DELIMITER_CELL_RE = /^:?-+:?$/;

/** Split one table line on unescaped pipes, dropping the row markers. */
function splitRow(line: string): string[] {
  const trimmed = line.trim();
  const cells: string[] = [];
  let current = '';
  /* The leading pipe is the row marker, not a cell boundary. */
  for (let i = trimmed.startsWith('|') ? 1 : 0; i < trimmed.length; i += 1) {
    const char = trimmed[i]!;
    if (char === '\\' && trimmed[i + 1] === '|') {
      current += '|';
      i += 1;
      continue;
    }
    if (char === '|') {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  /* A trailing pipe closes the last cell; without one — the streaming case,
     where the row is still being typed — whatever has arrived is a cell. */
  if (current.trim() !== '') cells.push(current.trim());
  return cells;
}

function alignOf(cell: string): TableAlign {
  const left = cell.startsWith(':');
  const right = cell.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'end';
  return 'start';
}

function buildTable(lines: string[]): MarkdownBlock {
  const rows = lines.map(splitRow);
  const delimiter = rows[1];
  const isDelimiter =
    delimiter !== undefined && delimiter.length > 0 && delimiter.every((cell) => DELIMITER_CELL_RE.test(cell));

  const inline = (row: string[]) => row.map((cell) => parseInline(cell));

  if (isDelimiter) {
    return {
      kind: 'table',
      header: inline(rows[0]!),
      align: delimiter.map(alignOf),
      rows: rows.slice(2).map(inline),
    };
  }

  /* No delimiter row yet — see rule 2. Every line is a body row, and the
     first one is promoted the moment the delimiter arrives. */
  return { kind: 'table', header: null, align: [], rows: rows.map(inline) };
}
