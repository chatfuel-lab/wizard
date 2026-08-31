import { describe, expect, it } from 'vitest';
import { chatTitle, FALLBACK_TITLE, isServerTitle, oneLine, truncateTitle } from './titles';

describe('isServerTitle', () => {
  it('rejects the empties and the stringified nulls the API actually sends', () => {
    expect(isServerTitle(null)).toBe(false);
    expect(isServerTitle(undefined)).toBe(false);
    expect(isServerTitle('')).toBe(false);
    expect(isServerTitle('   ')).toBe(false);
    expect(isServerTitle('null')).toBe(false);
    expect(isServerTitle('NULL')).toBe(false);
    expect(isServerTitle('undefined')).toBe(false);
  });

  it('keeps a title that merely looks unusual', () => {
    expect(isServerTitle('None')).toBe(true);
    expect(isServerTitle('nullable fields')).toBe(true);
    expect(isServerTitle('0')).toBe(true);
  });
});

describe('truncateTitle', () => {
  it('leaves anything that fits alone', () => {
    expect(truncateTitle('Short', 20)).toBe('Short');
    expect(truncateTitle('Exactly twenty chars', 20)).toBe('Exactly twenty chars');
  });

  it('cuts on a word boundary when that keeps most of the budget', () => {
    expect(truncateTitle('Add a colour consultation, 45 minutes', 20)).toBe('Add a colour…');
  });

  it('cuts hard when the boundary would leave a fragment', () => {
    // The only space is at index 4, well under 60% of 20.
    expect(truncateTitle('Help supercalifragilistic', 20)).toBe('Help supercalifragil…');
  });
});

describe('oneLine', () => {
  it('takes the first non-empty line and collapses its whitespace', () => {
    expect(oneLine('\n\n  How is   my pipeline?  \nmore')).toBe('How is my pipeline?');
  });
  it('is empty for content that is only whitespace', () => {
    expect(oneLine('  \n \t ')).toBe('');
  });
});

describe('chatTitle', () => {
  it('prefers the operator title, verbatim', () => {
    const title = chatTitle({ operatorTitle: 'Price list.', serverTitle: 'Can you read my price list?' });
    // No sentence trimming: they typed the full stop, so it stays.
    expect(title).toEqual({ text: 'Price list.', source: 'operator' });
  });

  it('falls to the server title and drops its full stop', () => {
    expect(chatTitle({ serverTitle: 'Open the pipeline for me.' })).toEqual({
      text: 'Open the pipeline for me',
      source: 'server',
    });
  });

  it('keeps a question mark — the question is what the chat is about', () => {
    expect(chatTitle({ serverTitle: 'How is my pipeline doing?' }).text).toBe('How is my pipeline doing?');
  });

  it('falls past the literal "null" to the first message', () => {
    expect(chatTitle({ serverTitle: 'null', preview: 'Can you read my price list?' })).toEqual({
      text: 'Can you read my price list?',
      source: 'preview',
    });
  });

  it('falls all the way to a fixed label', () => {
    expect(chatTitle({ serverTitle: null, preview: '' })).toEqual({
      text: FALLBACK_TITLE,
      source: 'none',
    });
  });

  it('truncates whichever source won', () => {
    const long = 'Add a colour consultation, 45 minutes, 80 euros, with a patch test included';
    expect(chatTitle({ serverTitle: long }).text.length).toBeLessThanOrEqual(53);
    expect(chatTitle({ operatorTitle: long }, 20).text).toBe('Add a colour…');
  });

  it('flattens a markdown preview to one line', () => {
    expect(chatTitle({ preview: '```json\n{ "a": 1 }\n```' }).text).toBe('```json');
  });
});
