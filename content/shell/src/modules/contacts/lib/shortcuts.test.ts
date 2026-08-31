import { describe, expect, it } from 'vitest';
import { parseHotkey } from '~ui';
import { SHORTCUT_ROWS, SHORTCUT_SECTIONS, WORKSPACE_BINDINGS, type WorkspaceShortcutId } from './shortcuts';

const bindingIds = WORKSPACE_BINDINGS.map((binding) => binding.id);
const documented = SHORTCUT_ROWS.flatMap((row) => row.ids);

describe('the cheat sheet cannot drift from the handlers', () => {
  it('documents every binding exactly once', () => {
    for (const id of bindingIds) {
      expect(documented.filter((other) => other === id)).toHaveLength(1);
    }
  });

  it('documents nothing that is not bound', () => {
    for (const id of documented) {
      expect(bindingIds).toContain(id as WorkspaceShortcutId);
    }
  });

  it('has no duplicate binding ids', () => {
    expect(new Set(bindingIds).size).toBe(bindingIds.length);
  });
});

describe('rows whose keys belong to a ~ui primitive', () => {
  it('carry no binding id, because this module does not bind them', () => {
    for (const row of SHORTCUT_ROWS) {
      if (row.source === 'ui') expect(row.ids).toHaveLength(0);
      else expect(row.ids.length).toBeGreaterThan(0);
    }
  });

  it('are the only rows allowed to be empty', () => {
    for (const row of SHORTCUT_ROWS) {
      if (row.ids.length === 0) expect(row.source).toBe('ui');
    }
  });
});

describe('the bindings themselves', () => {
  it('parses every spec into at least one step with a key', () => {
    for (const binding of WORKSPACE_BINDINGS) {
      const steps = parseHotkey(binding.keys);
      expect(steps.length).toBeGreaterThan(0);
      for (const step of steps) expect(step.key).not.toBe('');
    }
  });

  it('never registers a prefix of a sequence as a binding of its own', () => {
    /* `g` and `g l` cannot coexist: resolveHotkey fires the exact match, which
       would make every `g …` sequence unreachable. */
    const sequences = WORKSPACE_BINDINGS.map((b) => parseHotkey(b.keys)).filter((s) => s.length > 1);
    const singles = WORKSPACE_BINDINGS.map((b) => parseHotkey(b.keys)).filter((s) => s.length === 1);
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

  it('keeps only the palette reachable from inside a text field', () => {
    const always = WORKSPACE_BINDINGS.filter((binding) => binding.scope === 'always');
    expect(always.map((binding) => binding.id)).toEqual(['palette']);
  });

  it('does not bind one keystroke twice', () => {
    const specs = WORKSPACE_BINDINGS.map((binding) => JSON.stringify(parseHotkey(binding.keys)));
    expect(new Set(specs).size).toBe(specs.length);
  });
});

describe('sections', () => {
  it('lists every section a row uses, and no empty ones', () => {
    for (const row of SHORTCUT_ROWS) expect(SHORTCUT_SECTIONS).toContain(row.section);
    for (const section of SHORTCUT_SECTIONS) {
      expect(SHORTCUT_ROWS.some((row) => row.section === section)).toBe(true);
    }
  });
});
