import { describe, expect, it } from 'vitest';
import {
  asString,
  isRecord,
  nextEntryId,
  parseStoredList,
  removeEntry,
  renameEntry,
  serializeStoredList,
  upsertEntry,
} from './savedViewsCore';

const NOW = Date.parse('2026-08-18T12:00:00.000Z');
const CAP = 40;
const MAX_NAME = 60;

interface Entry {
  id: string;
  name: string;
}

/** The kind of sanitizer a caller writes: repair what it can, drop what it cannot. */
const sanitize = (value: unknown, index: number): Entry | null => {
  if (!isRecord(value)) return null;
  const name = (asString(value.name) ?? '').trim().slice(0, MAX_NAME);
  return {
    id: asString(value.id)?.trim() || `view-${index + 1}`,
    name: name === '' ? 'Untitled view' : name,
  };
};

const parse = (raw: string | null | undefined) => parseStoredList(raw, sanitize, CAP);

const entry = (over: Partial<Entry> = {}): Entry => ({ id: 'v1', name: 'Mine', ...over });

describe('nothing read back can throw', () => {
  it('treats a missing item as never stored', () => {
    expect(parse(null)).toEqual({ entries: [], empty: true });
    expect(parse(undefined)).toEqual({ entries: [], empty: true });
    expect(parse('   ')).toEqual({ entries: [], empty: true });
  });

  it('treats unreadable JSON as never stored rather than as a crash', () => {
    expect(parse('{oh no').empty).toBe(true);
    expect(parse('"a string"').empty).toBe(true);
    expect(parse('42').empty).toBe(true);
  });

  it('distinguishes a stored empty list from nothing stored', () => {
    expect(parse('[]')).toEqual({ entries: [], empty: false });
  });

  it('accepts both the bare array and the envelope', () => {
    const one = [{ id: 'a', name: 'A' }];
    expect(parse(JSON.stringify(one)).entries).toHaveLength(1);
    expect(parse(JSON.stringify({ views: one })).entries).toHaveLength(1);
  });

  it('repairs what the sanitizer can and drops what it cannot', () => {
    const raw = JSON.stringify([null, 42, { id: 'ok', name: '  Trimmed  ' }, { name: '' }]);
    expect(parse(raw).entries.map((view) => view.name)).toEqual(['Trimmed', 'Untitled view']);
  });

  it('drops a duplicate id rather than showing two rows that fight', () => {
    const raw = JSON.stringify([
      { id: 'same', name: 'First' },
      { id: 'same', name: 'Second' },
    ]);
    expect(parse(raw).entries.map((view) => view.name)).toEqual(['First']);
  });

  it('caps the list, reading and writing', () => {
    const many = Array.from({ length: CAP + 10 }, (_, index) => ({ id: `v${index}`, name: `View ${index}` }));
    const { entries } = parse(JSON.stringify(many));
    expect(entries).toHaveLength(CAP);
    expect(JSON.parse(serializeStoredList(many, CAP))).toHaveLength(CAP);
  });

  it('round-trips through storage', () => {
    const list = [entry({ id: 'a', name: 'A' }), entry({ id: 'b', name: 'B' })];
    expect(parse(serializeStoredList(list, CAP)).entries).toEqual(list);
  });
});

describe('editing the list', () => {
  it('replaces by id and puts the newest first', () => {
    const list = [entry({ id: 'a', name: 'A' }), entry({ id: 'b', name: 'B' })];
    expect(upsertEntry(list, entry({ id: 'b', name: 'B2' }), CAP).map((view) => view.name)).toEqual(['B2', 'A']);
  });

  it('renames, and refuses to rename to nothing', () => {
    const list = [entry({ id: 'a', name: 'A' })];
    expect(renameEntry(list, 'a', '  New  ', MAX_NAME)[0].name).toBe('New');
    expect(renameEntry(list, 'a', '   ', MAX_NAME)[0].name).toBe('A');
  });

  it('removes by id', () => {
    const list = [entry({ id: 'a' }), entry({ id: 'b' })];
    expect(removeEntry(list, 'a').map((view) => view.id)).toEqual(['b']);
  });

  it('never hands out an id already taken', () => {
    const taken = [entry({ id: `mine-${NOW.toString(36)}` })];
    expect(nextEntryId(taken, 'Mine', NOW)).toBe(`mine-${NOW.toString(36)}-2`);
    expect(nextEntryId([], '  ✳︎  ', NOW)).toBe(`view-${NOW.toString(36)}`);
  });
});
