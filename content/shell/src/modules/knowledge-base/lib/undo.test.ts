import { describe, expect, it } from 'vitest';
import { isExpired, undoCaveat, undoLabel, UNDO_TTL_MS, type UndoEntry } from './undo';

const at = 1_000;

describe('undoLabel', () => {
  it('is null with nothing offered', () => {
    expect(undoLabel(null)).toBeNull();
  });

  it('names the field it would restore', () => {
    expect(undoLabel({ kind: 'field', field: 'companyName', label: 'Company name', at })).toBe('Undo company name');
  });

  it('counts what a bulk restore brings back', () => {
    expect(undoLabel({ kind: 'faqs', what: 'delete', count: 1, at })).toBe('Restore FAQ');
    expect(undoLabel({ kind: 'faqs', what: 'delete', count: 4, at })).toBe('Restore 4 FAQs');
    expect(undoLabel({ kind: 'items', what: 'delete', count: 3, at })).toBe('Restore 3 items');
  });

  it('has a label for every kind', () => {
    const entries: UndoEntry[] = [
      { kind: 'field', field: 'phone', label: 'Phone', at },
      { kind: 'faqs', what: 'reorder', count: 0, at },
      { kind: 'faqs', what: 'add', count: 1, at },
      { kind: 'faqs', what: 'edit', count: 1, at },
      { kind: 'faqs', what: 'import', count: 7, at },
      { kind: 'hours', at },
      { kind: 'item', title: 'Tea', what: 'delete', at },
      { kind: 'item', title: 'Tea', what: 'edit', at },
      { kind: 'item', title: 'Tea', what: 'availability', at },
      { kind: 'items', count: 2, what: 'availability', at },
    ];
    for (const entry of entries) expect(undoLabel(entry)).toBeTruthy();
  });
});

describe('undoCaveat', () => {
  it('warns that a restored item gets a new id', () => {
    expect(undoCaveat({ kind: 'item', title: 'Tea', what: 'delete', at })).toContain('new id');
    expect(undoCaveat({ kind: 'items', count: 2, what: 'delete', at })).toContain('new id');
  });

  it('says nothing for changes that keep their id', () => {
    expect(undoCaveat({ kind: 'item', title: 'Tea', what: 'edit', at })).toBeNull();
    expect(undoCaveat({ kind: 'faqs', what: 'reorder', count: 0, at })).toBeNull();
  });
});

describe('isExpired', () => {
  it('expires exactly at the TTL', () => {
    const entry: UndoEntry = { kind: 'hours', at };
    expect(isExpired(entry, at + UNDO_TTL_MS - 1)).toBe(false);
    expect(isExpired(entry, at + UNDO_TTL_MS)).toBe(true);
  });
});
