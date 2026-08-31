import { describe, expect, it } from 'vitest';
import { parseHotkey } from '~ui';
import { BINDINGS, EVENT_ROW_BINDINGS, SHORTCUT_ROWS, SHORTCUT_SECTIONS, type ShortcutId } from './shortcuts';

const ALL = [...BINDINGS, ...EVENT_ROW_BINDINGS];
const boundIds = ALL.map((binding) => binding.id as ShortcutId);

/**
 * The two consumers of this list have to cover each other exactly: a key that
 * fires and is not written down is the one nobody finds, and a row documenting
 * a key nothing listens to is worse than no row at all.
 */
describe('the bindings and the sheet cover each other', () => {
  it('documents every binding exactly once', () => {
    const documented = SHORTCUT_ROWS.flatMap((row) => row.ids);
    expect([...documented].sort()).toEqual([...boundIds].sort());
    expect(new Set(documented).size).toBe(documented.length);
  });

  it('files every row under a section that renders', () => {
    for (const row of SHORTCUT_ROWS) expect(SHORTCUT_SECTIONS).toContain(row.section);
    for (const section of SHORTCUT_SECTIONS) {
      expect(SHORTCUT_ROWS.some((row) => row.section === section)).toBe(true);
    }
  });

  it('gives a row as many chip groups as it documents bindings', () => {
    for (const row of SHORTCUT_ROWS) expect(row.chips).toHaveLength(row.ids.length);
  });
});

describe('the bindings themselves', () => {
  it('binds no key twice inside one scope', () => {
    for (const scope of [BINDINGS, EVENT_ROW_BINDINGS]) {
      const keys = scope.map((binding) => binding.keys);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('parses every spec into at least one step', () => {
    for (const binding of ALL) {
      const steps = parseHotkey(binding.keys);
      expect(steps.length).toBeGreaterThan(0);
      for (const step of steps) expect(step.key).not.toBe('');
    }
  });

  it('lets the palette be opened from inside a text field, and nothing else', () => {
    // It is pressed while a name is being typed as often as not.
    const always = ALL.filter((binding) => binding.scope === 'always');
    expect(always.map((binding) => binding.id)).toEqual(['palette']);
  });

  it('keeps the event-row keys off the module scope', () => {
    /* They act on the row that has focus. On the window listener they would
       reorder whichever event happened to be first, from anywhere. */
    const moduleKeys = BINDINGS.map((binding) => binding.keys);
    for (const binding of EVENT_ROW_BINDINGS) expect(moduleKeys).not.toContain(binding.keys);
  });
});
