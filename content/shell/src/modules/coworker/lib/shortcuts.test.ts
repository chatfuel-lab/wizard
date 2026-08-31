import { describe, expect, it } from 'vitest';
import { SHORTCUT_ROWS, SHORTCUT_SECTIONS, WORKSPACE_BINDINGS, type ShortcutId } from './shortcuts';

const bound = new Set<ShortcutId>(WORKSPACE_BINDINGS.map((b) => b.id));
const documented = new Set<ShortcutId>(SHORTCUT_ROWS.flatMap((row) => row.ids));

describe('shortcuts', () => {
  it('documents every binding, and binds everything it documents', () => {
    expect([...bound].filter((id) => !documented.has(id))).toEqual([]);
    expect([...documented].filter((id) => !bound.has(id))).toEqual([]);
  });

  it('documents each binding exactly once', () => {
    const ids = SHORTCUT_ROWS.flatMap((row) => row.ids);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('files every row under a section the sheet renders', () => {
    for (const row of SHORTCUT_ROWS) expect(SHORTCUT_SECTIONS).toContain(row.section);
  });

  it('gives every row as many chip groups as it has ids', () => {
    for (const row of SHORTCUT_ROWS) expect(row.chips.length).toBe(row.ids.length);
  });

  it('binds each key once', () => {
    const keys = WORKSPACE_BINDINGS.map((b) => b.keys);
    expect(keys.length).toBe(new Set(keys).size);
  });

  it('keeps single letters out of text fields, and the palette in them', () => {
    for (const binding of WORKSPACE_BINDINGS) {
      const always = binding.scope === 'always';
      expect(always).toBe(binding.keys.startsWith('mod+'));
    }
  });
});
