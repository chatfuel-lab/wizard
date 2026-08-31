import { describe, expect, it } from 'vitest';
import {
  MAX_IGNORED,
  MAX_IGNORED_QUESTION_LENGTH,
  addIgnored,
  parseIgnored,
  removeIgnored,
  serializeIgnored,
  type IgnoredGap,
} from './gapsStorage';

const NOW = Date.parse('2026-08-18T10:00:00.000Z');
const entry = (question: string, minutesAgo = 0): IgnoredGap => ({ question, ignoredAt: NOW - minutesAgo * 60_000 });

describe('reading a stored value back', () => {
  it('round-trips what it wrote', () => {
    const list = [entry('Do you sell gift cards?'), entry('catering minimum?', 10)];
    expect(parseIgnored(serializeIgnored(list), NOW)).toEqual(list);
  });

  it('accepts the envelope shape as well as the bare array', () => {
    const raw = JSON.stringify({ ignored: [{ question: 'gift cards?', ignoredAt: NOW }] });
    expect(parseIgnored(raw, NOW)).toEqual([entry('gift cards?')]);
  });

  it('returns nothing for an empty or missing value', () => {
    expect(parseIgnored(null)).toEqual([]);
    expect(parseIgnored(undefined)).toEqual([]);
    expect(parseIgnored('')).toEqual([]);
    expect(parseIgnored('   ')).toEqual([]);
  });
});

describe('a value it did not write', () => {
  it('does not throw on anything', () => {
    /* The id is a plain string in a namespace shared with every other feature,
       so "somebody else's JSON" is a real case, not a hypothetical. */
    const hostile = [
      'not json at all',
      '{',
      '[',
      'null',
      'true',
      '42',
      '"a string"',
      '{"ignored":"not an array"}',
      '[[[]]]',
      '[null,null]',
      '{}',
    ];
    for (const raw of hostile) expect(() => parseIgnored(raw, NOW)).not.toThrow();
    for (const raw of hostile) expect(parseIgnored(raw, NOW)).toEqual([]);
  });

  it('keeps the entries it can repair and drops the ones it cannot', () => {
    const raw = JSON.stringify([
      { question: 'gift cards?', ignoredAt: NOW },
      { question: '   ' },
      { question: 42 },
      'a bare string',
      null,
      { ignoredAt: NOW },
      { question: 'catering minimum?', ignoredAt: 'yesterday' },
    ]);
    const parsed = parseIgnored(raw, NOW);
    expect(parsed.map((item) => item.question)).toEqual(['gift cards?', 'catering minimum?']);
    /* A timestamp it cannot read becomes "now" rather than NaN, which would
       sort unpredictably and print "unknown" forever. */
    expect(parsed[1]!.ignoredAt).toBe(NOW);
  });

  it('truncates a question long enough to blow up the stored value', () => {
    const raw = JSON.stringify([{ question: 'x'.repeat(MAX_IGNORED_QUESTION_LENGTH * 3), ignoredAt: NOW }]);
    expect(parseIgnored(raw, NOW)[0]!.question).toHaveLength(MAX_IGNORED_QUESTION_LENGTH);
  });

  it('caps a list somebody grew past the limit', () => {
    const raw = JSON.stringify(
      Array.from({ length: MAX_IGNORED * 2 }, (_, index) => entry(`question ${index}`, index)),
    );
    expect(parseIgnored(raw, NOW)).toHaveLength(MAX_IGNORED);
  });

  it('drops an exact duplicate but keeps a near one', () => {
    const raw = JSON.stringify([entry('Gift cards?'), entry('gift cards?', 1), entry('gift card?', 2)]);
    expect(parseIgnored(raw, NOW).map((item) => item.question)).toEqual(['Gift cards?', 'gift card?']);
  });

  it('sorts newest first however the stored value was ordered', () => {
    const raw = JSON.stringify([entry('older', 100), entry('newest', 0), entry('middle', 50)]);
    expect(parseIgnored(raw, NOW).map((item) => item.question)).toEqual(['newest', 'middle', 'older']);
  });
});

describe('adding and removing', () => {
  it('puts a new dismissal at the front', () => {
    expect(addIgnored([entry('older', 10)], 'gift cards?', NOW).map((item) => item.question)).toEqual([
      'gift cards?',
      'older',
    ]);
  });

  it('moves an existing dismissal to the front rather than storing it twice', () => {
    const list = addIgnored([entry('Gift cards?', 10), entry('other', 20)], 'gift cards?', NOW);
    expect(list.map((item) => item.question)).toEqual(['gift cards?', 'other']);
  });

  it('refuses a question with nothing in it', () => {
    expect(addIgnored([entry('kept')], '   ', NOW).map((item) => item.question)).toEqual(['kept']);
  });

  it('drops the oldest once the list is full', () => {
    const full = Array.from({ length: MAX_IGNORED }, (_, index) => entry(`question ${index}`, index));
    const list = addIgnored(full, 'the newest one', NOW);
    expect(list).toHaveLength(MAX_IGNORED);
    expect(list[0]!.question).toBe('the newest one');
    expect(list.some((item) => item.question === `question ${MAX_IGNORED - 1}`)).toBe(false);
  });

  it('un-ignores by text, ignoring case and surrounding space', () => {
    const list = [entry('Gift cards?'), entry('catering minimum?')];
    expect(removeIgnored(list, '  gift CARDS? ').map((item) => item.question)).toEqual(['catering minimum?']);
  });

  it('leaves the list alone when nothing matches', () => {
    const list = [entry('Gift cards?')];
    expect(removeIgnored(list, 'nothing like it')).toEqual(list);
  });
});

describe('writing', () => {
  it('never serialises more than the cap', () => {
    const oversized = Array.from({ length: MAX_IGNORED * 2 }, (_, index) => entry(`question ${index}`, index));
    expect(JSON.parse(serializeIgnored(oversized))).toHaveLength(MAX_IGNORED);
  });
});
