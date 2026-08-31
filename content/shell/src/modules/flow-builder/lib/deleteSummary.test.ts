import { describe, expect, it } from 'vitest';
import { deleteSummary } from './deleteSummary';

const block = (name: string, elements: number) => ({
  name,
  blockElements: Array.from({ length: elements }, (_, index) => index),
});

describe('deleteSummary', () => {
  it('says nothing when there is nothing to delete', () => {
    expect(deleteSummary([])).toBe('');
  });

  it('names one block and counts what is inside it', () => {
    expect(deleteSummary([block('Welcome', 3)])).toBe('“Welcome”, its 3 elements and its connections will be deleted.');
  });

  it('keeps the singular for one element', () => {
    expect(deleteSummary([block('Welcome', 1)])).toBe('“Welcome”, its 1 element and its connections will be deleted.');
  });

  it('leaves the element clause out of an empty block', () => {
    expect(deleteSummary([block('Welcome', 0)])).toBe('“Welcome” and its connections will be deleted.');
  });

  it('totals the elements across a multi-selection', () => {
    expect(deleteSummary([block('a', 3), block('b', 0), block('c', 2)])).toBe(
      'These 3 blocks, their 5 elements and all their connections will be deleted.',
    );
  });

  it('drops the element clause when a whole selection is empty', () => {
    expect(deleteSummary([block('a', 0), block('b', 0)])).toBe(
      'These 2 blocks and all their connections will be deleted.',
    );
  });
});
