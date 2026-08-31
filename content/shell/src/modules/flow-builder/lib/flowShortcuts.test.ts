import { describe, expect, it } from 'vitest';
import { parseHotkey } from '~ui';
import { HOTKEYS, ROOT_ONLY_SHORTCUTS, SHORTCUT_ROWS, SHORTCUT_SECTIONS, type FlowShortcutId } from './flowShortcuts';

const boundIds = [...new Set(HOTKEYS.map((binding) => binding.id))];
const documented = SHORTCUT_ROWS.flatMap((row) => row.ids);

describe('the cheat sheet cannot drift from the handlers', () => {
  it('documents every bound id exactly once', () => {
    for (const id of boundIds) {
      expect(documented.filter((other) => other === id)).toHaveLength(1);
    }
  });

  it('documents nothing that is not bound', () => {
    for (const id of documented) {
      expect(boundIds).toContain(id);
    }
  });

  it('shows every key an id is bound to, and no key it is not', () => {
    /* A row's chips are what the reader will press. `mod`, `shift` and the
       named keys are spelled the way `Kbd` wants them; the test only cares that
       the SET of keys per id is the same on both sides. */
    const kbdToSpec: Record<string, string> = { esc: 'escape' };
    const chipsFor = (id: FlowShortcutId) =>
      SHORTCUT_ROWS.filter((row) => row.ids.includes(id))
        .flatMap((row) => row.chips)
        .map((chip) => chip.map((key) => kbdToSpec[key] ?? key).join('+'));
    const specsFor = (id: FlowShortcutId) =>
      HOTKEYS.filter((binding) => binding.id === id).map((binding) => binding.keys.toLowerCase());

    for (const id of boundIds) {
      const chips = chipsFor(id).map((chip) => JSON.stringify(parseHotkey(chip)));
      const specs = specsFor(id).map((spec) => JSON.stringify(parseHotkey(spec)));
      /* Undo's row also shows ⇧⌘Z, which is one binding read two ways — the
         one documented exception, and it is the sheet showing MORE, never less. */
      for (const spec of specs) expect(chips).toContain(spec);
      if (id !== 'undo') expect(chips.sort()).toEqual(specs.sort());
    }
  });
});

describe('the bindings themselves', () => {
  it('parses every spec into at least one step', () => {
    for (const binding of HOTKEYS) {
      const steps = parseHotkey(binding.keys);
      expect(steps.length).toBeGreaterThan(0);
      for (const step of steps) expect(step.key).not.toBe('');
    }
  });

  it('never binds one keystroke to two ids', () => {
    /* Two entries MAY share an id (Delete and Backspace both delete; `1` and
       `v` both select). Two ids may not share a keystroke — the matcher fires
       the first, and the second is silently unreachable. Shift is dropped for
       single characters here because the matcher drops it too: `shift+1` and
       `1` are the same keystroke to it. */
    const seen = new Map<string, FlowShortcutId>();
    for (const binding of HOTKEYS) {
      const key = JSON.stringify(
        parseHotkey(binding.keys).map((step) => ({
          ...step,
          shift: step.key.length > 1 ? step.shift : false,
        })),
      );
      const holder = seen.get(key);
      if (holder !== undefined) expect(holder).toBe(binding.id);
      seen.set(key, binding.id);
    }
  });

  it('keeps ⌘K reachable from a text field and nothing else', () => {
    const always = HOTKEYS.filter((binding) => binding.scope === 'always');
    expect(always.map((binding) => binding.id)).toEqual(['palette']);
  });

  it('never registers a prefix of a sequence as a binding of its own', () => {
    const sequences = HOTKEYS.map((b) => parseHotkey(b.keys)).filter((s) => s.length > 1);
    const singles = HOTKEYS.map((b) => parseHotkey(b.keys)).filter((s) => s.length === 1);
    for (const sequence of sequences) {
      const head = sequence[0]!;
      expect(
        singles.some(
          ([single]) =>
            single!.key === head.key &&
            single!.mod === head.mod &&
            single!.shift === head.shift &&
            single!.alt === head.alt,
        ),
      ).toBe(false);
    }
  });

  it('gives every tool a digit, and the two every drawing tool has taught a letter as well', () => {
    const keysOf = (id: FlowShortcutId) => HOTKEYS.filter((b) => b.id === id).map((b) => b.keys);
    expect(keysOf('toolSelect')).toEqual(['1', 'v']);
    expect(keysOf('toolPan')).toEqual(['2', 'h']);
    expect(keysOf('toolConnect')).toEqual(['3']);
    expect(keysOf('toolAdd')).toEqual(['4']);
  });

  it('keeps the root-only bindings inside the list, so the sheet still sees them', () => {
    for (const id of ROOT_ONLY_SHORTCUTS) {
      expect(boundIds).toContain(id);
      expect(documented).toContain(id);
    }
    /* Exactly Enter: the reason for the seam is Enter activating buttons, and
       nothing else earns its own listener. */
    expect(HOTKEYS.filter((b) => ROOT_ONLY_SHORTCUTS.includes(b.id)).map((b) => b.keys)).toEqual(['Enter']);
  });
});

describe('sections', () => {
  it('lists every section a row uses, in order, and no empty ones', () => {
    for (const row of SHORTCUT_ROWS) expect(SHORTCUT_SECTIONS).toContain(row.section);
    for (const section of SHORTCUT_SECTIONS) {
      expect(SHORTCUT_ROWS.some((row) => row.section === section)).toBe(true);
    }
  });
});
