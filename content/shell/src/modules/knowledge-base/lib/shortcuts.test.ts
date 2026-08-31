import { describe, expect, it } from 'vitest';
import { SHORTCUT_ROWS, SHORTCUT_SECTIONS, WORKSPACE_BINDINGS, type ShortcutId } from './shortcuts';

const documented = new Set<ShortcutId>(SHORTCUT_ROWS.flatMap((row) => row.ids));
const bound = new Set<ShortcutId>(WORKSPACE_BINDINGS.map((binding) => binding.id));

describe('shortcuts', () => {
  it('documents every binding', () => {
    for (const id of bound) expect(documented.has(id), `${id} fires but is not in the ? sheet`).toBe(true);
  });

  it('binds every documented row', () => {
    for (const id of documented) expect(bound.has(id), `${id} is documented but nothing fires it`).toBe(true);
  });

  it('binds each id exactly once', () => {
    expect(WORKSPACE_BINDINGS.length).toBe(bound.size);
  });

  it('uses a section the sheet renders', () => {
    for (const row of SHORTCUT_ROWS) expect(SHORTCUT_SECTIONS).toContain(row.section);
  });

  it('keeps the two typing-safe bindings in the always scope', () => {
    for (const id of ['palette', 'save'] as const) {
      expect(WORKSPACE_BINDINGS.find((binding) => binding.id === id)?.scope).toBe('always');
    }
  });

  it('gives every row at least one chip', () => {
    for (const row of SHORTCUT_ROWS) expect(row.chips.length).toBeGreaterThan(0);
  });
});
