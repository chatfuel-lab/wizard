import { describe, expect, it } from 'vitest';
import { CSV_BOM } from '~ui';
import {
  FAQ_CSV_HEADER,
  detectDelimiter,
  faqFileName,
  hasHeaderRow,
  parseCsv,
  parseFaqCsv,
  parseFaqJson,
  toCsv,
  toFaqEntries,
  toJson,
  unguardCell,
  type FaqPair,
} from './faqCsv';

/** Every shape that has ever broken a CSV round trip, in one list. */
const NASTY: FaqPair[] = [
  { question: 'Do you ship beans?', answer: 'Yes, anywhere in Germany.' },
  { question: 'What about commas, quotes and "both"?', answer: 'A comma, a "quote", and both: "a, b".' },
  { question: 'Multi-line?', answer: 'Line one\nline two\r\nline three' },
  { question: 'Leading space?', answer: '  indented, on purpose  ' },
  { question: '=cmd|/c calc', answer: '-5 is not a formula either' },
  { question: 'Empty answer?', answer: '' },
  { question: 'Only quotes', answer: '""' },
];

describe('unguardCell', () => {
  it('takes the formula guard back off, and only the guard', () => {
    expect(unguardCell("'=SUM(A1)")).toBe('=SUM(A1)');
    expect(unguardCell("'@cmd")).toBe('@cmd');
    /* A quote that is not defusing anything is text and stays. */
    expect(unguardCell("'tis a quote")).toBe("'tis a quote");
  });
});

describe('toCsv', () => {
  it('writes the header once and CRLF rows, with no BOM of its own', () => {
    const csv = toCsv([]);
    expect(csv).toBe(`${FAQ_CSV_HEADER.join(',')}\r\n`);
    expect(csv.startsWith(CSV_BOM)).toBe(false);
    expect(CSV_BOM).toHaveLength(1);
    expect(CSV_BOM.charCodeAt(0)).toBe(0xfeff);
  });

  it('puts a multi-line answer in one quoted field', () => {
    const csv = toCsv([{ question: 'q', answer: 'a\nb' }]);
    expect(csv).toBe('Question,Answer\r\nq,"a\nb"\r\n');
    /* The embedded newline must not have become a row. */
    expect(parseCsv(csv)).toHaveLength(2);
  });
});

describe('parseCsv', () => {
  it('reads quotes, doubled quotes, embedded commas and every line ending', () => {
    expect(parseCsv('a,b\r\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    expect(parseCsv('a,b\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    expect(parseCsv('a,b\rc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    expect(parseCsv('"a,1","say ""hi"""')).toEqual([['a,1', 'say "hi"']]);
    expect(parseCsv('"line\none",x')).toEqual([['line\none', 'x']]);
  });

  it('drops the BOM, blank lines and the phantom row a trailing newline leaves', () => {
    expect(parseCsv(`${CSV_BOM}a,b\r\n`)).toEqual([['a', 'b']]);
    expect(parseCsv('a,b\n\n\nc,d\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('keeps empty cells, including a trailing one', () => {
    expect(parseCsv('a,,c')).toEqual([['a', '', 'c']]);
    expect(parseCsv('a,b,')).toEqual([['a', 'b', '']]);
    expect(parseCsv('"",x')).toEqual([['', 'x']]);
  });

  it('treats a bare quote inside an unquoted field as text', () => {
    expect(parseCsv('5" pipe,yes')).toEqual([['5" pipe', 'yes']]);
  });

  it('guesses the delimiter outside quotes, and takes an override', () => {
    expect(detectDelimiter('a;b;c')).toBe(';');
    expect(detectDelimiter('a\tb\tc')).toBe('\t');
    /* A comma-laden answer must not outvote the real separator. */
    expect(detectDelimiter('Question;"a, b, c, d"')).toBe(';');
    /* Nothing to go on: comma. */
    expect(detectDelimiter('one column')).toBe(',');
    expect(parseCsv('a;b\nc;d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    expect(parseCsv('a;b', { delimiter: ',' })).toEqual([['a;b']]);
  });
});

describe('toFaqEntries', () => {
  it('drops a header row and only a header row', () => {
    expect(hasHeaderRow(['Question', 'Answer'])).toBe(true);
    expect(hasHeaderRow(['question', ''])).toBe(true);
    expect(hasHeaderRow(['Do you ship?', 'Yes'])).toBe(false);
    expect(hasHeaderRow(['Question mark', 'Answer'])).toBe(false);
    /* One-letter columns are data, not a header — see the note on hasHeaderRow. */
    expect(hasHeaderRow(['q', 'a'])).toBe(false);
    expect(
      toFaqEntries([
        ['Question', 'Answer'],
        ['q', 'a'],
      ]),
    ).toEqual([{ question: 'q', answer: 'a' }]);
    expect(toFaqEntries([['q', 'a']])).toEqual([{ question: 'q', answer: 'a' }]);
  });

  it('takes the first two columns, keeps whitespace, and skips rows blank in both', () => {
    expect(toFaqEntries([['q', 'a', 'ignored']])).toEqual([{ question: 'q', answer: 'a' }]);
    expect(toFaqEntries([['q']])).toEqual([{ question: 'q', answer: '' }]);
    expect(toFaqEntries([['  q  ', ' a ']])).toEqual([{ question: '  q  ', answer: ' a ' }]);
    expect(toFaqEntries([['   ', '  ']])).toEqual([]);
  });
});

describe('the round trip', () => {
  it('gives back exactly what it was handed', () => {
    expect(parseFaqCsv(toCsv(NASTY))).toEqual(NASTY);
    expect(parseFaqCsv(CSV_BOM + toCsv(NASTY))).toEqual(NASTY);
  });

  it('survives a second lap, so re-exporting an import does not drift', () => {
    expect(parseFaqCsv(toCsv(parseFaqCsv(toCsv(NASTY))))).toEqual(NASTY);
  });

  it('round-trips through JSON too', () => {
    expect(parseFaqJson(toJson(NASTY))).toEqual(
      NASTY.filter((entry) => entry.question.trim() !== '' || entry.answer.trim() !== ''),
    );
    expect(toJson([{ question: 'q', answer: 'a' }])).toBe('[\n  {\n    "question": "q",\n    "answer": "a"\n  }\n]\n');
  });
});

describe('parseFaqJson', () => {
  it('takes a bare array or a faqs wrapper, and never throws', () => {
    expect(parseFaqJson('[{"question":"q","answer":"a"}]')).toEqual([{ question: 'q', answer: 'a' }]);
    expect(parseFaqJson('{"faqs":[{"question":"q","answer":"a"}]}')).toEqual([{ question: 'q', answer: 'a' }]);
    expect(parseFaqJson('not json at all')).toEqual([]);
    expect(parseFaqJson('{"nope":1}')).toEqual([]);
  });

  it('skips the entries it cannot read instead of failing the file', () => {
    expect(parseFaqJson('[{"question":"q"},null,42,{"answer":"a"},{"question":"  "}]')).toEqual([
      { question: 'q', answer: '' },
      { question: '', answer: 'a' },
    ]);
  });
});

describe('faqFileName', () => {
  it('counts in the name, singular included', () => {
    expect(faqFileName('csv', 9)).toBe('faq-9-entries.csv');
    expect(faqFileName('json', 1)).toBe('faq-1-entry.json');
    expect(faqFileName('csv', 0)).toBe('faq-0-entries.csv');
  });
});
