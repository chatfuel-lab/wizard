import { describe, expect, it } from 'vitest';
import {
  detectDelimiter,
  looksLikeHeader,
  noteText,
  parseImport,
  parseQa,
  parseTableWith,
  sniffFormat,
  stripBom,
  tokenize,
} from './importParse';

describe('tokenize', () => {
  it('reads quoted fields with embedded commas and newlines', () => {
    const csv = 'question,answer\n"Do you ship, worldwide?","Yes.\nEverywhere except Antarctica."\n';
    expect(tokenize(csv, ',')).toEqual([
      ['question', 'answer'],
      ['Do you ship, worldwide?', 'Yes.\nEverywhere except Antarctica.'],
    ]);
  });

  it('reads doubled quotes as one literal quote', () => {
    expect(tokenize('a,"He said ""hi"""', ',')).toEqual([['a', 'He said "hi"']]);
  });

  it('survives a BOM and CRLF', () => {
    const csv = '\uFEFFq,a\r\nHow?,Like this.\r\n';
    expect(tokenize(csv, ',')).toEqual([
      ['q', 'a'],
      ['How?', 'Like this.'],
    ]);
  });

  it('keeps a CRLF inside a quoted field as a plain newline', () => {
    expect(tokenize('"one\r\ntwo",x', ',')).toEqual([['one\ntwo', 'x']]);
  });

  it('drops the empty record a trailing newline leaves behind', () => {
    expect(tokenize('a,b\n\n\n', ',')).toEqual([['a', 'b']]);
  });

  it('handles tabs', () => {
    expect(tokenize('q\ta\nHow?\tSo.\n', '\t')).toEqual([
      ['q', 'a'],
      ['How?', 'So.'],
    ]);
  });

  it('strips a BOM once', () => {
    expect(stripBom('\uFEFFx')).toBe('x');
    expect(stripBom('x')).toBe('x');
  });
});

describe('detectDelimiter', () => {
  it('finds tabs even when a cell holds commas', () => {
    const tsv = 'title\tdescription\nSofa\tBlue, soft, and large\nChair\tRed, hard\n';
    expect(detectDelimiter(tsv)).toBe('\t');
  });

  it('finds semicolons in a European export', () => {
    expect(detectDelimiter('title;price\nChair;29,00\nTable;99,00\n')).toBe(';');
  });

  it('finds pipes', () => {
    expect(detectDelimiter('q|a\nHow?|So.\nWhen?|Now.\n')).toBe('|');
  });

  it('defaults to a comma when nothing is consistent', () => {
    expect(detectDelimiter('just one line of prose')).toBe(',');
  });
});

describe('looksLikeHeader', () => {
  it('accepts words over numbers', () => {
    expect(
      looksLikeHeader([
        ['title', 'price'],
        ['Sofa', '299'],
      ]),
    ).toBe(true);
  });

  it('rejects a first row that is already data', () => {
    expect(
      looksLikeHeader([
        ['Sofa', '299'],
        ['Chair', '99'],
      ]),
    ).toBe(false);
  });

  it('rejects duplicate and empty labels', () => {
    expect(
      looksLikeHeader([
        ['q', 'q'],
        ['a', 'b'],
      ]),
    ).toBe(false);
    expect(
      looksLikeHeader([
        ['q', ''],
        ['a', 'b'],
      ]),
    ).toBe(false);
  });

  it('accepts a words-over-words header', () => {
    expect(
      looksLikeHeader([
        ['question', 'answer'],
        ['Do you ship?', 'Yes'],
      ]),
    ).toBe(true);
  });
});

describe('parseImport — tables', () => {
  it('uses the header row as columns and leaves it out of the rows', () => {
    const parsed = parseImport('question,answer\nDo you ship?,Yes\nRefunds?,30 days\n');
    expect(parsed.format).toBe('table');
    expect(parsed.headerUsed).toBe(true);
    expect(parsed.columns).toEqual(['question', 'answer']);
    expect(parsed.rows.map((row) => row.cells)).toEqual([
      ['Do you ship?', 'Yes'],
      ['Refunds?', '30 days'],
    ]);
  });

  it('synthesizes column names when the first row is data', () => {
    const parsed = parseImport('Sofa,299\nChair,99\n');
    expect(parsed.headerUsed).toBe(false);
    expect(parsed.columns).toEqual(['Column 1', 'Column 2']);
    expect(parsed.rows).toHaveLength(2);
  });

  it('pads a short row and says so', () => {
    const parsed = parseImport('a,b,c\n1,2,3\n4,5\n');
    const short = parsed.rows[1]!;
    expect(short.cells).toEqual(['4', '5', '']);
    expect(short.note).toEqual({ kind: 'ragged', expected: 3, got: 2 });
    expect(noteText(short.note!)).toContain('2 columns');
  });

  it('re-parses with an explicit delimiter and header answer', () => {
    const text = 'Sofa;299\nChair;99\n';
    const asData = parseTableWith(text, ';', false);
    expect(asData.rows).toHaveLength(2);
    const asHeader = parseTableWith(text, ';', true);
    expect(asHeader.columns).toEqual(['Sofa', '299']);
    expect(asHeader.rows).toHaveLength(1);
  });
});

describe('parseQa — the four heuristics', () => {
  it('heading: a markdown heading owns the block under it', () => {
    const rows = parseQa('## Do you ship worldwide?\nYes, everywhere.\n\nStill yes.\n\n## Refunds?\nWithin 30 days.\n');
    expect(rows.map((row) => row.cells)).toEqual([
      ['Do you ship worldwide?', 'Yes, everywhere.\n\nStill yes.'],
      ['Refunds?', 'Within 30 days.'],
    ]);
    expect(rows[0]!.note).toEqual({ kind: 'guessed', rule: 'heading' });
  });

  it('labelled: Q:/A: pairs, and a question mark inside the answer stays in it', () => {
    const rows = parseQa(
      'Q: How do I return an item?\nA: Post it back. Not sure how? Call us.\nQ: When?\nA: Within 30 days.\n',
    );
    expect(rows.map((row) => row.cells)).toEqual([
      ['How do I return an item?', 'Post it back. Not sure how? Call us.'],
      ['When?', 'Within 30 days.'],
    ]);
    expect(rows[0]!.note).toEqual({ kind: 'guessed', rule: 'labelled' });
  });

  it('labelled: Question:/Answer: spelled out', () => {
    const rows = parseQa('Question: Where are you?\nAnswer: Berlin.\n');
    expect(rows[0]!.cells).toEqual(['Where are you?', 'Berlin.']);
  });

  it('bold: a line that is nothing but bold text', () => {
    const rows = parseQa(
      '**Do you deliver on Sundays?**\nNo, Monday to Saturday.\n\n__What about holidays?__\nClosed.\n',
    );
    expect(rows.map((row) => row.cells)).toEqual([
      ['Do you deliver on Sundays?', 'No, Monday to Saturday.'],
      ['What about holidays?', 'Closed.'],
    ]);
    expect(rows[1]!.note).toEqual({ kind: 'guessed', rule: 'bold' });
  });

  it('trailing-question: a line ending in ? followed by a paragraph', () => {
    const rows = parseQa(
      'Can I pay by card?\n\nYes, all major cards.\n\nDo you have parking?\n\nTwo spaces behind the shop.\n',
    );
    expect(rows.map((row) => row.cells)).toEqual([
      ['Can I pay by card?', 'Yes, all major cards.'],
      ['Do you have parking?', 'Two spaces behind the shop.'],
    ]);
    expect(rows[0]!.note).toEqual({ kind: 'guessed', rule: 'trailing-question' });
    expect(noteText(rows[0]!.note!)).toContain('Guessed');
  });

  it('marks a question with nothing under it', () => {
    const rows = parseQa('## Returns\n## Shipping\nWe ship on Mondays.\n');
    expect(rows[0]!.note).toEqual({ kind: 'no-answer' });
    expect(rows[0]!.cells[1]).toBe('');
  });

  it('gives every row a stable id', () => {
    const rows = parseQa('Q: a?\nA: b\nQ: c?\nA: d\n');
    expect(rows.map((row) => row.id)).toEqual(['qa-1', 'qa-2']);
  });
});

describe('sniffFormat', () => {
  it('calls a rectangle a table', () => {
    expect(sniffFormat('q,a\n1,2\n3,4\n')).toBe('table');
  });

  it('calls a support page prose', () => {
    expect(
      sniffFormat(
        '## Shipping\nWe ship on Mondays, Wednesdays, and Fridays.\n\n## Returns\nWithin 30 days, no questions asked.\n',
      ),
    ).toBe('qa');
  });

  it('calls a single line prose', () => {
    expect(sniffFormat('Do you ship worldwide? Yes.')).toBe('qa');
  });

  it('parses prose as qa end to end', () => {
    const parsed = parseImport('Q: Hi?\nA: Hello.\n');
    expect(parsed.format).toBe('qa');
    expect(parsed.columns).toEqual(['Question', 'Answer']);
    expect(parsed.delimiter).toBe(null);
  });
});
