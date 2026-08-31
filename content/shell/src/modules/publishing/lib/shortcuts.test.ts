import { describe, expect, it } from 'vitest';
import { parseHotkey } from '~ui';
import {
  CALENDAR_BINDINGS,
  COMPOSER_BINDINGS,
  SHORTCUT_ROWS,
  SHORTCUT_SECTIONS,
  WORKSPACE_BINDINGS,
  shortcutChips,
  type ShortcutId,
} from './shortcuts';

const ALL_BINDINGS = [...WORKSPACE_BINDINGS, ...CALENDAR_BINDINGS, ...COMPOSER_BINDINGS];
const bindingIds = ALL_BINDINGS.map((binding) => binding.id as ShortcutId);
const documented = SHORTCUT_ROWS.flatMap((row) => row.ids);

const spec = (keys: string): string => JSON.stringify(parseHotkey(keys));

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

  it('gives every row as many chip groups as it documents bindings', () => {
    for (const row of SHORTCUT_ROWS) {
      if (row.source === 'ui') continue;
      expect(row.chips).toHaveLength(row.ids.length);
    }
  });

  it('prints, on every row, the keys the binding actually fires on', () => {
    /* Counting the chips is not enough: a row with the right number of the
       wrong keys reads as documentation and is a lie. */
    for (const row of SHORTCUT_ROWS) {
      if (row.source === 'ui') continue;
      row.ids.forEach((id, index) => {
        expect(row.chips[index]).toEqual(shortcutChips(id));
      });
    }
  });
});

describe('the keys anything else prints', () => {
  it('are the binding keys themselves, for every id there is', () => {
    /* `shortcutChips` is what the ⌘K palette prints beside a command, so an id
       it cannot answer for is a palette row with no key on it. */
    for (const binding of ALL_BINDINGS) {
      const chips = shortcutChips(binding.id as ShortcutId);
      expect(chips.length).toBeGreaterThan(0);
      /* Every key on its own chip, and nothing invented or lost: rejoining
         them reproduces the spec once its two separators are normalised. */
      expect(chips.join(' ')).toBe(binding.keys.replace(/[+\s]+/g, ' '));
    }
  });
});

describe('rows whose keys belong to a design-system primitive', () => {
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

  it('still print at least one key, or the row says nothing at all', () => {
    for (const row of SHORTCUT_ROWS) expect(row.chips.length).toBeGreaterThan(0);
  });
});

describe('the bindings themselves', () => {
  it('parses every spec into at least one step with a key', () => {
    for (const binding of ALL_BINDINGS) {
      const steps = parseHotkey(binding.keys);
      expect(steps.length).toBeGreaterThan(0);
      for (const step of steps) expect(step.key).not.toBe('');
    }
  });

  it('does not bind one keystroke twice inside a set', () => {
    for (const group of [WORKSPACE_BINDINGS, CALENDAR_BINDINGS, COMPOSER_BINDINGS]) {
      const specs = group.map((binding) => spec(binding.keys));
      expect(new Set(specs).size).toBe(specs.length);
    }
  });

  it('keeps the calendar out of the workspace listener, which is live beside it', () => {
    /* Both listeners are armed at once while the calendar is the view on
       screen, so a key claimed by both would fire two handlers. */
    const workspace = new Set(WORKSPACE_BINDINGS.map((binding) => spec(binding.keys)));
    for (const binding of CALENDAR_BINDINGS) expect(workspace.has(spec(binding.keys))).toBe(false);
  });

  it('never registers a prefix of a sequence as a binding of its own', () => {
    /* A binding on `g` would make every `g …` sequence unreachable, because
       resolveHotkey fires the exact match. */
    const steps = ALL_BINDINGS.map((binding) => parseHotkey(binding.keys));
    const sequences = steps.filter((one) => one.length > 1);
    const singles = steps.filter((one) => one.length === 1);
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

  it('reaches into a text field only with a modifier', () => {
    /* The bare letters are the reason: `n` typed into a caption has to stay an
       `n`. The composer's two are held down with ⌘/Ctrl and are pressed while
       the caption box has focus, which is exactly when they have to work. */
    for (const binding of ALL_BINDINGS) {
      expect(binding.scope === 'always').toBe(binding.keys.startsWith('mod+'));
    }
  });

  it('gives the composer ids of its own, bound nowhere else', () => {
    const elsewhere = new Set([...WORKSPACE_BINDINGS, ...CALENDAR_BINDINGS].map((b) => b.id as string));
    for (const binding of COMPOSER_BINDINGS) expect(elsewhere.has(binding.id)).toBe(false);
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
