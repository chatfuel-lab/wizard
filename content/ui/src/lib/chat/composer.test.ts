import { describe, expect, it } from 'vitest';
import { canSend, insertText, nextComposerHeight } from './composer';

describe('canSend', () => {
  it('needs something to send', () => {
    expect(canSend({ text: '' })).toBe(false);
    expect(canSend({ text: '   \n\t ' })).toBe(false);
    expect(canSend({ text: 'hello' })).toBe(true);
  });

  it('lets attachments be the whole message', () => {
    expect(canSend({ text: '', attachmentCount: 1 })).toBe(true);
    expect(canSend({ text: '   ', attachmentCount: 2 })).toBe(true);
  });

  it('stays shut while the composer itself is unavailable', () => {
    expect(canSend({ text: 'hello', disabled: true })).toBe(false);
    expect(canSend({ text: '', attachmentCount: 3, disabled: true })).toBe(false);
  });

  it('stays shut while a send is already in flight', () => {
    expect(canSend({ text: 'hello', sending: true })).toBe(false);
    expect(canSend({ text: '', attachmentCount: 1, sending: true })).toBe(false);
  });
});

describe('nextComposerHeight', () => {
  it('grows with the content between the floor and the ceiling', () => {
    expect(nextComposerHeight(20, 36, 160)).toBe(36);
    expect(nextComposerHeight(72, 36, 160)).toBe(72);
    expect(nextComposerHeight(600, 36, 160)).toBe(160);
  });

  it('shrinks back down when the text is deleted', () => {
    expect(nextComposerHeight(36, 36, 160)).toBe(36);
  });

  it('never returns a ceiling below the floor', () => {
    expect(nextComposerHeight(500, 80, 40)).toBe(80);
  });

  it('falls back to the floor when the measurement is not a number', () => {
    expect(nextComposerHeight(Number.NaN, 36, 160)).toBe(36);
    expect(nextComposerHeight(72, Number.NaN, 160)).toBe(72);
  });

  it('treats an unreadable ceiling as no ceiling, never as a collapse', () => {
    /* getComputedStyle answers 'none' for an unset max-height, which parses to
       NaN. Clamping to the floor there would swallow the text being typed. */
    expect(nextComposerHeight(240, 36, Number.NaN)).toBe(240);
  });
});

describe('insertText', () => {
  it('goes where the caret is', () => {
    expect(insertText('hello world', 5, 5, ',')).toEqual({ value: 'hello, world', caret: 6 });
  });

  it('replaces the selection, as typing would', () => {
    expect(insertText('hello world', 6, 11, 'there')).toEqual({ value: 'hello there', caret: 11 });
  });

  it('lands the caret after what it put in, so a second pick follows the first', () => {
    const first = insertText('', 0, 0, '🙂');
    const second = insertText(first.value, first.caret, first.caret, '👍');
    expect(second.value).toBe('🙂👍');
  });

  it('tolerates a stale selection — inverted or past the end', () => {
    /* (3,1) is the selection "bc" read backwards — the same selection as (1,3). */
    expect(insertText('abc', 3, 1, 'X')).toEqual(insertText('abc', 1, 3, 'X'));
    expect(insertText('abc', 3, 1, 'X').value).toBe('aX');
    expect(insertText('abc', 40, 40, 'X')).toEqual({ value: 'abcX', caret: 4 });
    expect(insertText('abc', Number.NaN, Number.NaN, 'X').value).toBe('abcX');
  });

  it('with empty text, still replaces the selection — the same thing typing nothing over it does', () => {
    expect(insertText('abc', 1, 2, '')).toEqual({ value: 'ac', caret: 1 });
    expect(insertText('abc', 1, 1, '')).toEqual({ value: 'abc', caret: 1 });
  });
});
