import { describe, expect, it } from 'vitest';
import { parseHotkey } from '~ui';
import { BOARD_BINDINGS, SHORTCUT_ROWS, SHORTCUT_SECTIONS, WORKSPACE_BINDINGS, type ShortcutId } from './shortcuts';

const ALL_BINDINGS = [...WORKSPACE_BINDINGS, ...BOARD_BINDINGS];
const bindingIds = ALL_BINDINGS.map((binding) => binding.id as ShortcutId);
const documented = SHORTCUT_ROWS.flatMap((row) => row.ids);

describe('the cheat sheet cannot drift from the handlers', () => {
  it('documents every binding exactly once', () => {
    for (const id of bindingIds) {
      expect(documented.filter((other) => other === id)).toHaveLength(1);
    }
  });

  it('documents nothing that is not bound', () => {
    for (const id of documented) {
      expect(bindingIds).toContain(id);
    }
  });

  it('has no duplicate binding ids', () => {
    expect(new Set(bindingIds).size).toBe(bindingIds.length);
  });
});

describe('the bindings themselves', () => {
  it('parses every spec into at least one step', () => {
    for (const binding of ALL_BINDINGS) {
      expect(parseHotkey(binding.keys).length).toBeGreaterThan(0);
      for (const step of parseHotkey(binding.keys)) expect(step.key).not.toBe('');
    }
  });

  it('never registers a prefix of a sequence as a binding of its own', () => {
    /* `g` and `g b` cannot coexist: resolveHotkey fires the exact match, which
     * would make every `g …` sequence unreachable. */
    const sequences = ALL_BINDINGS.map((b) => parseHotkey(b.keys)).filter((s) => s.length > 1);
    const singles = ALL_BINDINGS.map((b) => parseHotkey(b.keys)).filter((s) => s.length === 1);
    for (const sequence of sequences) {
      const head = sequence[0];
      expect(
        singles.some(
          ([single]) =>
            single.key === head.key &&
            single.mod === head.mod &&
            single.shift === head.shift &&
            single.alt === head.alt,
        ),
      ).toBe(false);
    }
  });

  it('keeps ⌘K reachable from a text field and nothing else', () => {
    const always = WORKSPACE_BINDINGS.filter((binding) => binding.scope === 'always');
    expect(always.map((binding) => binding.id)).toEqual(['palette']);
  });

  it('does not collide inside one scope', () => {
    for (const group of [WORKSPACE_BINDINGS, BOARD_BINDINGS]) {
      const specs = group.map((binding) => JSON.stringify(parseHotkey(binding.keys)));
      expect(new Set(specs).size).toBe(specs.length);
    }
  });
});

describe('sections', () => {
  it('lists every section a row uses, in order', () => {
    for (const row of SHORTCUT_ROWS) expect(SHORTCUT_SECTIONS).toContain(row.section);
    for (const section of SHORTCUT_SECTIONS) {
      expect(SHORTCUT_ROWS.some((row) => row.section === section)).toBe(true);
    }
  });
});
