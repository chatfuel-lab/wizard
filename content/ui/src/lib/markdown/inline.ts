import { safeHref } from './href';
import type { MarkdownSpan } from './types';

/* Nested emphasis has to stop somewhere: eight asterisks in a row recurse once
   per delimiter pair, and a model that emits forty of them should cost forty
   characters of work rather than an exponential. Past this depth the remainder
   is text. */
const MAX_INLINE_DEPTH = 6;

const ESCAPABLE = new Set(['\\', '`', '*', '_', '[', ']', '(', ')', '#', '+', '-', '.', '!', '|', '>', '~']);

/** Word characters, for the `snake_case` rule below. */
const isWordChar = (char: string | undefined): boolean => char !== undefined && /[\p{L}\p{N}]/u.test(char);

/**
 * Inline markup inside one block's text.
 *
 * Exported because a caller sometimes has one line rather than a document — a
 * run step's detail, a table cell, a conversation preview — and re-running the
 * block scanner over a phrase would let a stray `#` turn it into a heading.
 *
 * The underscore rule is the one that is not obvious: an underscore only opens
 * emphasis when the character before it is not a word character, and only
 * closes when the character after it is not one either. Without that,
 * `chatfuel_gql-create_service` renders as "chatfuelgql-createservice" with
 * "gql-create" in italics — and tool ids are exactly what this text is full of.
 * Asterisks need no such rule because nobody writes `a*b` and means it.
 */
export function parseInline(text: string, depth = 0): MarkdownSpan[] {
  const spans: MarkdownSpan[] = [];
  let literal = '';

  const flush = () => {
    if (literal !== '') {
      spans.push({ kind: 'text', text: literal });
      literal = '';
    }
  };

  const pairs = findPairs(text);
  /* See `findEmphasisClose`: the first `from` that scanned to the end without
     finding a closer, per delimiter. Everything at or after it fails too. */
  const noClose: Record<string, number> = { '*': Infinity, _: Infinity };

  let i = 0;
  while (i < text.length) {
    const char = text[i]!;

    /* A backslash escape is the author saying "this is a character, not
       markup". It wins over every rule below, including the code span. */
    if (char === '\\' && i + 1 < text.length && ESCAPABLE.has(text[i + 1]!)) {
      literal += text[i + 1];
      i += 2;
      continue;
    }

    if (char === '`') {
      /* A code span is delimited by a RUN of backticks, and the closing run
         must be the same length — that is how a code span holds a backtick. */
      let openLength = 0;
      while (text[i + openLength] === '`') openLength += 1;
      const from = i + openLength;
      const close = findRun(text, from, openLength);
      if (close === -1) {
        /* No closing run yet: the backticks are characters. This is the
           streaming case — the run closes a few tokens later. */
        literal += '`'.repeat(openLength);
        i += openLength;
        continue;
      }
      flush();
      /* One leading and one trailing space are stripped, which is what lets a
         code span hold a bare backtick. */
      spans.push({ kind: 'code', text: stripOneSpace(text.slice(from, close)) });
      i = close + openLength;
      continue;
    }

    if (depth < MAX_INLINE_DEPTH && char === '*' && text[i + 1] === '*') {
      const found = findDelimiter(text, i + 2, '**');
      /* A closing run longer than two belongs to the emphasis INSIDE this one:
         in a triple-asterisk run the strong pair is the outer two, so the close
         is taken from the END of the run and the leftover asterisk stays in the
         slice, where the recursive call reads it as italics. Taking the first
         two would leave a stray asterisk outside the bold instead. */
      const run = found === -1 ? 0 : asteriskRun(text, found);
      const close = found === -1 ? -1 : found + run - 2;
      if (close > i + 1) {
        flush();
        spans.push({ kind: 'strong', spans: parseInline(text.slice(i + 2, close), depth + 1) });
        i = close + 2;
        continue;
      }
    }

    if (depth < MAX_INLINE_DEPTH && (char === '*' || char === '_')) {
      const opens = char === '*' || !isWordChar(text[i - 1]);
      if (opens) {
        const close = findEmphasisClose(text, i + 1, char, noClose);
        if (close !== -1) {
          flush();
          spans.push({ kind: 'em', spans: parseInline(text.slice(i + 1, close), depth + 1) });
          i = close + 1;
          continue;
        }
      }
    }

    /* An image becomes its alt text; nothing is fetched. */
    if (char === '!' && text[i + 1] === '[') {
      const image = matchLink(text, i + 1, pairs);
      if (image) {
        literal += image.label;
        i = image.end;
        continue;
      }
    }

    if (char === '[') {
      const link = matchLink(text, i, pairs);
      if (link) {
        const href = safeHref(link.target);
        const label =
          depth < MAX_INLINE_DEPTH ? parseInline(link.label, depth + 1) : [{ kind: 'text' as const, text: link.label }];
        flush();
        /* A target we will not follow still had words in front of it. */
        if (href === null) spans.push(...label);
        else spans.push({ kind: 'link', href, spans: label });
        i = link.end;
        continue;
      }
    }

    literal += char;
    i += 1;
  }

  flush();
  return spans;
}

/** Index of the next run of exactly `length` backticks at or after `from`. */
function findRun(text: string, from: number, length: number): number {
  for (let i = from; i < text.length; i += 1) {
    if (text[i] !== '`') continue;
    let run = 0;
    while (text[i + run] === '`') run += 1;
    if (run === length) return i;
    i += run - 1;
  }
  return -1;
}

/** Length of the run of asterisks starting at `at`. */
function asteriskRun(text: string, at: number): number {
  let run = 0;
  while (text[at + run] === '*') run += 1;
  return run;
}

/** Index of the next unescaped `delimiter` at or after `from`. */
function findDelimiter(text: string, from: number, delimiter: string): number {
  for (let i = from; i <= text.length - delimiter.length; i += 1) {
    if (text[i] === '\\') {
      i += 1;
      continue;
    }
    if (text.startsWith(delimiter, i)) return i;
  }
  return -1;
}

/**
 * Closing index for a single-character emphasis run.
 *
 * For an underscore the closer must not be followed by a word character, which
 * is the other half of the `snake_case` rule: in `a_b_c` neither underscore may
 * close, so the whole thing stays literal.
 *
 * `noClose` is what keeps that rule from costing a square. Whether a position
 * may close depends only on the text at that position, never on where the scan
 * started — so once one scan has walked to the end without finding a closer,
 * every later opener is walking the same barren tail. ` _a` repeated is the
 * shape that hurts: every underscore opens, none may close, and without the
 * memo each one re-reads the rest of the message. The early return for an empty
 * run is deliberately NOT memoised — it says something about `from`, not about
 * the tail.
 */
function findEmphasisClose(text: string, from: number, delimiter: string, noClose: Record<string, number>): number {
  if (from >= noClose[delimiter]!) return -1;
  for (let i = from; i < text.length; i += 1) {
    if (text[i] === '\\') {
      i += 1;
      continue;
    }
    if (text[i] !== delimiter) continue;
    /* An empty run is not emphasis. */
    if (i === from) return -1;
    if (delimiter === '_' && isWordChar(text[i + 1])) continue;
    if (delimiter === '*' && text[i + 1] === '*') continue;
    return i;
  }
  noClose[delimiter] = from;
  return -1;
}

interface LinkMatch {
  label: string;
  target: string;
  /** Index just past the closing paren. */
  end: number;
}

/**
 * Where every bracket and paren in the text closes, in one pass.
 *
 * This exists for cost, not for grammar. Scanning forward from each `[` for its
 * `]` is the obvious way to match a link and it is quadratic: a message of
 * `[[[[[…`, or of `[x[x[x…`, gives every opener a full read of the rest of the
 * text. That is a shape a model emits and a contact can paste, and at sixty
 * thousand characters it cost seconds — per parse, and this parse runs on every
 * frame of a stream. A stack costs one pass and answers every lookup.
 *
 * The pairing is the same one the forward scan computed. Both are last-in
 * first-out: an opener takes the nearest unclaimed closer, so the innermost
 * `[` in `[[x]` matches and the outer one goes unmatched, exactly as a depth
 * counter starting at the outer one would have found.
 *
 * Escapes are skipped here with the same unconditional two-character step
 * `parseInline` takes, so the two walks never fall out of phase — a `[` the
 * caller reaches unescaped is a `[` this pass pushed.
 */
interface Pairs {
  bracket: Map<number, number>;
  paren: Map<number, number>;
}

function findPairs(text: string): Pairs {
  const bracket = new Map<number, number>();
  const paren = new Map<number, number>();
  const openBrackets: number[] = [];
  const openParens: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '\\') {
      i += 1;
      continue;
    }
    if (char === '[') openBrackets.push(i);
    else if (char === ']') {
      const open = openBrackets.pop();
      if (open !== undefined) bracket.set(open, i);
    } else if (char === '(') openParens.push(i);
    else if (char === ')') {
      const open = openParens.pop();
      if (open !== undefined) paren.set(open, i);
    }
  }
  return { bracket, paren };
}

/** A bracketed label followed by a parenthesised target, starting at `at`. */
function matchLink(text: string, at: number, pairs: Pairs): LinkMatch | null {
  const close = pairs.bracket.get(at);
  if (close === undefined || text[close + 1] !== '(') return null;

  const end = pairs.paren.get(close + 1);
  if (end === undefined) return null;

  const target = text.slice(close + 2, end);
  /* A title after the URL is dropped rather than folded into the href, which
     would produce a target that no longer parses. */
  const spaced = target.search(/\s/);
  return {
    label: text.slice(at + 1, close),
    target: spaced === -1 ? target : target.slice(0, spaced),
    end: end + 1,
  };
}

function stripOneSpace(text: string): string {
  if (text.length >= 2 && text.startsWith(' ') && text.endsWith(' ') && text.trim() !== '') {
    return text.slice(1, -1);
  }
  return text;
}
