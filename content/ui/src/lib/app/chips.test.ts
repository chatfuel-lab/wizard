import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SEPARATORS,
  acceptItems,
  focusAfterRemove,
  hasSeparator,
  isDuplicate,
  itemLength,
  nextFocusIndex,
  normalizeItem,
  rejectionMessage,
  rejectionSummary,
  splitInput,
} from './chips';

describe('splitInput', () => {
  it('splits on commas, semicolons and newlines by default', () => {
    expect(splitInput('a,b;c\nd')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('keeps the raw pieces untrimmed — normalisation is a separate step', () => {
    expect(splitInput('a, b ,c')).toEqual(['a', ' b ', 'c']);
  });

  it('drops the empty piece a trailing separator leaves behind', () => {
    expect(splitInput('a, b,')).toEqual(['a', ' b']);
    expect(splitInput('a,,b')).toEqual(['a', 'b']);
    expect(splitInput(',a')).toEqual(['a']);
  });

  it('drops whitespace-only pieces', () => {
    expect(splitInput('a, , \n ,b')).toEqual(['a', 'b']);
    expect(splitInput('   ')).toEqual([]);
    expect(splitInput('')).toEqual([]);
  });

  it('returns a single piece when there is no separator', () => {
    expect(splitInput('one keyword')).toEqual(['one keyword']);
  });

  it('honours a custom separator set', () => {
    expect(splitInput('a b\tc', /\s+/)).toEqual(['a', 'b', 'c']);
    /* Commas are ordinary characters under a whitespace-only separator. */
    expect(splitInput('a,b c', /\s+/)).toEqual(['a,b', 'c']);
  });

  it('is unaffected by a global flag on the separator', () => {
    const separators = /[,;]/g;
    expect(splitInput('a,b;c', separators)).toEqual(['a', 'b', 'c']);
    expect(splitInput('d,e', separators)).toEqual(['d', 'e']);
  });
});

describe('hasSeparator', () => {
  it('answers the paste-vs-type question', () => {
    expect(hasSeparator('a,b')).toBe(true);
    expect(hasSeparator('a b')).toBe(false);
    expect(hasSeparator('line\nline')).toBe(true);
  });

  it('gives the same answer twice with a stateful regex', () => {
    const sticky = /[,]/g;
    expect(hasSeparator('a,b', sticky)).toBe(true);
    expect(hasSeparator('a,b', sticky)).toBe(true);
    expect(DEFAULT_SEPARATORS.flags).toBe('');
  });
});

describe('normalizeItem', () => {
  it('trims by default', () => {
    expect(normalizeItem('  sale  ')).toBe('sale');
    expect(normalizeItem('\t\n')).toBe('');
  });

  it('defers to a custom normaliser instead of trimming', () => {
    expect(normalizeItem('  Ref-Link  ', (item) => item.trim().toLowerCase())).toBe('ref-link');
    /* The custom one is the whole rule — no implicit trim afterwards. */
    expect(normalizeItem(' x ', (item) => item.toUpperCase())).toBe(' X ');
  });
});

describe('itemLength', () => {
  it('counts code points, so an emoji is one character', () => {
    expect(itemLength('abc')).toBe(3);
    expect(itemLength('👍')).toBe(1);
    expect('👍'.length).toBe(2);
    expect(itemLength('naïve')).toBe(5);
  });
});

describe('isDuplicate', () => {
  it('is case-insensitive by default', () => {
    expect(isDuplicate(['Sale', 'promo'], 'sale')).toBe(true);
    expect(isDuplicate(['Sale'], 'SALE')).toBe(true);
    expect(isDuplicate(['Sale'], 'sales')).toBe(false);
  });

  it('can be exact', () => {
    expect(isDuplicate(['Sale'], 'sale', false)).toBe(false);
    expect(isDuplicate(['Sale'], 'Sale', false)).toBe(true);
  });

  it('folds non-ASCII letters too', () => {
    expect(isDuplicate(['ÜBER'], 'über')).toBe(true);
    expect(isDuplicate(['straße'], 'STRASSE')).toBe(false);
  });

  it('is false against an empty list', () => {
    expect(isDuplicate([], 'anything')).toBe(false);
  });
});

describe('acceptItems — the plain path', () => {
  it('appends normalised items in the order offered', () => {
    const result = acceptItems(['a'], [' b ', 'c']);
    expect(result.next).toEqual(['a', 'b', 'c']);
    expect(result.accepted).toEqual(['b', 'c']);
    expect(result.rejected).toEqual([]);
  });

  it('never mutates the current list', () => {
    const current = ['a'];
    acceptItems(current, ['b']);
    expect(current).toEqual(['a']);
  });

  it('rejects whitespace-only as empty, with the raw item preserved', () => {
    const result = acceptItems([], ['   ']);
    expect(result.next).toEqual([]);
    expect(result.rejected).toEqual([{ item: '   ', reason: 'empty', message: 'Nothing to add' }]);
  });

  it('returns the same list for an empty batch', () => {
    expect(acceptItems(['a'], [])).toEqual({ next: ['a'], accepted: [], rejected: [] });
  });
});

describe('acceptItems — duplicates', () => {
  it('rejects a duplicate of an existing chip, case-insensitively', () => {
    const result = acceptItems(['Sale'], ['sale']);
    expect(result.next).toEqual(['Sale']);
    expect(result.rejected[0]).toMatchObject({ item: 'sale', reason: 'duplicate' });
  });

  it('rejects a duplicate inside one paste — the first copy wins', () => {
    const result = acceptItems([], ['a', 'A', 'b', 'a']);
    expect(result.next).toEqual(['a', 'b']);
    expect(result.rejected.map((r) => r.item)).toEqual(['A', 'a']);
    expect(result.rejected.every((r) => r.reason === 'duplicate')).toBe(true);
  });

  it('keeps duplicates when dedupe is off', () => {
    expect(acceptItems(['a'], ['a', 'a'], { dedupe: false }).next).toEqual(['a', 'a', 'a']);
  });

  it('dedupes on the normalised form', () => {
    expect(acceptItems(['sale'], ['  SALE  ']).rejected[0]?.reason).toBe('duplicate');
  });
});

describe('acceptItems — maxItems', () => {
  it('accepts the first k of an over-limit batch and rejects the rest', () => {
    const result = acceptItems(['a'], ['b', 'c', 'd', 'e'], { maxItems: 3 });
    expect(result.next).toEqual(['a', 'b', 'c']);
    expect(result.accepted).toEqual(['b', 'c']);
    expect(result.rejected).toEqual([
      { item: 'd', reason: 'limit', message: 'Up to 3 items' },
      { item: 'e', reason: 'limit', message: 'Up to 3 items' },
    ]);
  });

  it('rejects everything when already full', () => {
    const result = acceptItems(['a', 'b'], ['c'], { maxItems: 2 });
    expect(result.next).toEqual(['a', 'b']);
    expect(result.rejected[0]?.reason).toBe('limit');
  });

  it('a duplicate into a full field says duplicate, not limit', () => {
    const result = acceptItems(['a', 'b'], ['A'], { maxItems: 2 });
    expect(result.rejected[0]?.reason).toBe('duplicate');
  });

  it('a rejected item does not consume a slot', () => {
    /* 'zz' fails validation, so 'c' still fits into the one slot left. */
    const result = acceptItems(['a', 'b'], ['zz', 'c'], {
      maxItems: 3,
      validate: (item) => (item === 'zz' ? 'no' : null),
    });
    expect(result.next).toEqual(['a', 'b', 'c']);
  });
});

describe('acceptItems — maxLength', () => {
  it('rejects a chip longer than the per-item limit', () => {
    const result = acceptItems([], ['short', 'far too long for this'], { maxLength: 8 });
    expect(result.next).toEqual(['short']);
    expect(result.rejected[0]).toEqual({
      item: 'far too long for this',
      reason: 'too-long',
      message: 'Keep each item under 8 characters',
    });
  });

  it('measures after normalisation, so padding does not count', () => {
    expect(acceptItems([], ['   abc   '], { maxLength: 3 }).next).toEqual(['abc']);
  });

  it('measures in code points', () => {
    expect(acceptItems([], ['👍👍👍'], { maxLength: 3 }).next).toEqual(['👍👍👍']);
    expect(acceptItems([], ['👍👍👍👍'], { maxLength: 3 }).rejected[0]?.reason).toBe('too-long');
  });

  it('accepts exactly the limit', () => {
    expect(acceptItems([], ['abc'], { maxLength: 3 }).next).toEqual(['abc']);
  });
});

describe('acceptItems — validate and normalize', () => {
  const noSpaces = (item: string) => (/\s/.test(item) ? 'No spaces in a ref link' : null);

  it("uses validate's own message", () => {
    const result = acceptItems([], ['ok', 'not ok'], { validate: noSpaces });
    expect(result.next).toEqual(['ok']);
    expect(result.rejected).toEqual([{ item: 'not ok', reason: 'invalid', message: 'No spaces in a ref link' }]);
  });

  it('validates the normalised item, so surrounding whitespace is not a violation', () => {
    expect(acceptItems([], ['  ok  '], { validate: noSpaces }).next).toEqual(['ok']);
  });

  it('runs a custom normaliser before every rule', () => {
    const result = acceptItems(['ref-a'], ['  REF-A ', 'REF-B'], {
      normalize: (item) => item.trim().toLowerCase(),
    });
    expect(result.next).toEqual(['ref-a', 'ref-b']);
    expect(result.rejected[0]?.reason).toBe('duplicate');
  });

  it('checks length before validate — a too-long item is too-long, whatever else it is', () => {
    const result = acceptItems([], ['too long here'], { maxLength: 4, validate: noSpaces });
    expect(result.rejected[0]?.reason).toBe('too-long');
  });
});

describe('rejectionMessage', () => {
  it('names the limit it is about', () => {
    expect(rejectionMessage('limit', { maxItems: 5 })).toBe('Up to 5 items');
    expect(rejectionMessage('too-long', { maxLength: 12 })).toBe('Keep each item under 12 characters');
  });
});

describe('rejectionSummary', () => {
  it('is null when nothing real was rejected', () => {
    expect(rejectionSummary([])).toBeNull();
    expect(rejectionSummary(acceptItems([], ['a', ' ', ''], {}).rejected)).toBeNull();
  });

  it('is the one message for a single rejection', () => {
    const { rejected } = acceptItems(['a'], ['a']);
    expect(rejectionSummary(rejected)).toBe('Already added');
  });

  it('counts a uniform batch', () => {
    const { rejected } = acceptItems(['a'], ['b', 'c', 'd'], { maxItems: 1 });
    expect(rejectionSummary(rejected)).toBe('Up to 1 item (3 items)');
  });

  it('falls back to a plain count when the reasons differ', () => {
    const { rejected } = acceptItems(['a'], ['a', 'toolong'], { maxLength: 3 });
    expect(rejectionSummary(rejected)).toBe('2 items not added');
  });

  it('ignores empties when counting', () => {
    const { rejected } = acceptItems(['a'], ['', 'a']);
    expect(rejectionSummary(rejected)).toBe('Already added');
  });
});

describe('nextFocusIndex — from the input', () => {
  const onInput = (count: number, extra: Partial<Parameters<typeof nextFocusIndex>[1]> = {}) => ({
    count,
    focused: count,
    inputEmpty: true,
    caretAtStart: true,
    ...extra,
  });

  it('Backspace on an empty draft steps onto the last chip', () => {
    expect(nextFocusIndex('Backspace', onInput(3))).toBe(2);
  });

  it('Backspace with a draft is ordinary editing', () => {
    expect(nextFocusIndex('Backspace', onInput(3, { inputEmpty: false }))).toBeNull();
  });

  it('← at the caret start steps onto the last chip', () => {
    expect(nextFocusIndex('ArrowLeft', onInput(2, { inputEmpty: false, caretAtStart: true }))).toBe(1);
  });

  it('← inside typed text is the browser’s', () => {
    expect(nextFocusIndex('ArrowLeft', onInput(2, { inputEmpty: false, caretAtStart: false }))).toBeNull();
  });

  it('nothing to step onto when there are no chips', () => {
    expect(nextFocusIndex('Backspace', onInput(0))).toBeNull();
    expect(nextFocusIndex('ArrowLeft', onInput(0))).toBeNull();
  });

  it('→ and Delete on the input are not moves', () => {
    expect(nextFocusIndex('ArrowRight', onInput(3))).toBeNull();
    expect(nextFocusIndex('Delete', onInput(3))).toBeNull();
  });
});

describe('nextFocusIndex — on a chip', () => {
  const onChip = (count: number, focused: number) => ({
    count,
    focused,
    inputEmpty: true,
    caretAtStart: true,
  });

  it('← and → step between chips without wrapping', () => {
    expect(nextFocusIndex('ArrowLeft', onChip(3, 1))).toBe(0);
    expect(nextFocusIndex('ArrowLeft', onChip(3, 0))).toBeNull();
    expect(nextFocusIndex('ArrowRight', onChip(3, 1))).toBe(2);
  });

  it('→ from the last chip lands on the input', () => {
    expect(nextFocusIndex('ArrowRight', onChip(3, 2))).toBe(3);
  });

  it('Home / End jump to the first chip and the input', () => {
    expect(nextFocusIndex('Home', onChip(3, 2))).toBe(0);
    expect(nextFocusIndex('Home', onChip(3, 0))).toBeNull();
    expect(nextFocusIndex('End', onChip(3, 0))).toBe(3);
  });

  it('Escape returns to the input', () => {
    expect(nextFocusIndex('Escape', onChip(3, 1))).toBe(3);
  });

  it('other keys are not moves', () => {
    expect(nextFocusIndex('Enter', onChip(3, 1))).toBeNull();
    expect(nextFocusIndex('a', onChip(3, 1))).toBeNull();
    expect(nextFocusIndex('Backspace', onChip(3, 1))).toBeNull();
  });
});

describe('focusAfterRemove', () => {
  it('Backspace steps back to the previous chip', () => {
    expect(focusAfterRemove(3, 2, 'Backspace')).toBe(1);
    expect(focusAfterRemove(3, 1, 'Backspace')).toBe(0);
  });

  it('Backspace on the first chip stays on the new first chip', () => {
    expect(focusAfterRemove(3, 0, 'Backspace')).toBe(0);
  });

  it('removing the only chip lands on the input, whichever key', () => {
    /* One chip gone → count 0 → position 0 IS the input. */
    expect(focusAfterRemove(1, 0, 'Backspace')).toBe(0);
    expect(focusAfterRemove(1, 0, 'Delete')).toBe(0);
  });

  it('Delete stays put, on whatever slid into the slot', () => {
    expect(focusAfterRemove(3, 0, 'Delete')).toBe(0);
    expect(focusAfterRemove(3, 1, 'Delete')).toBe(1);
  });

  it('Delete on the last chip lands on the input', () => {
    expect(focusAfterRemove(3, 2, 'Delete')).toBe(2);
  });
});
