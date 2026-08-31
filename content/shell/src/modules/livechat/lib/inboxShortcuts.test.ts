import { describe, expect, it } from 'vitest';
import { isTypingTarget, parseBindings, parseHotkey, resolveHotkey } from '~ui';
import { INBOX_BINDINGS, INBOX_SHORTCUT_ROWS, INBOX_SHORTCUT_SECTIONS, type InboxShortcutId } from './inboxShortcuts';

const bindingIds = INBOX_BINDINGS.map((binding) => binding.id);
const documented = INBOX_SHORTCUT_ROWS.flatMap((row) => row.ids);

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

  it('lists every section a row uses, in order', () => {
    for (const row of INBOX_SHORTCUT_ROWS) expect(INBOX_SHORTCUT_SECTIONS).toContain(row.section);
    for (const section of INBOX_SHORTCUT_SECTIONS) {
      expect(INBOX_SHORTCUT_ROWS.some((row) => row.section === section)).toBe(true);
    }
  });
});

describe('the bindings themselves', () => {
  it('parses every spec into at least one step', () => {
    for (const binding of INBOX_BINDINGS) {
      const steps = parseHotkey(binding.keys);
      expect(steps.length).toBeGreaterThan(0);
      for (const step of steps) expect(step.key).not.toBe('');
    }
  });

  it('keeps ⌘K reachable from a text field and nothing else', () => {
    const always = INBOX_BINDINGS.filter((binding) => binding.scope === 'always');
    expect(always.map((binding) => binding.id)).toEqual(['palette']);
  });

  it('does not collide', () => {
    const specs = INBOX_BINDINGS.map((binding) => JSON.stringify(parseHotkey(binding.keys)));
    expect(new Set(specs).size).toBe(specs.length);
  });
});

/**
 * The bindings against the matcher that will actually see them — the same
 * check the flow builder's canvas runs, because the claim it holds down is
 * the one `tsc` cannot: a letter typed into the composer stays a letter.
 */
describe('the embed rule', () => {
  const parsed = parseBindings(INBOX_BINDINGS);
  const press = (key: string, modifiers: { meta?: boolean; shift?: boolean } = {}, typing = false) =>
    resolveHotkey(
      parsed,
      {
        key,
        metaKey: modifiers.meta ?? false,
        ctrlKey: false,
        shiftKey: modifiers.shift ?? false,
        altKey: false,
      },
      null,
      0,
      typing,
    );

  it('binds the keys the sheet claims to bind', () => {
    const expected: [string, InboxShortcutId][] = [
      ['j', 'next'],
      ['k', 'prev'],
      ['e', 'close'],
      ['a', 'assign'],
      ['/', 'search'],
      ['?', 'help'],
    ];
    for (const [key, id] of expected) {
      expect(press(key, { shift: key === '?' }).fired).toBe(id);
    }
    expect(press('k', { meta: true }).fired).toBe('palette');
  });

  it('letters typed into the composer stay letters', () => {
    // "take a look" must not close the conversation on the e, assign it on
    // the a, or walk the list on the k. Unconsumed too: the hook preventDefaults
    // whatever it consumes, and swallowing a letter over a textarea drops it.
    for (const key of ['j', 'k', 'e', 'a', '/', '?']) {
      const result = press(key, { shift: key === '?' }, true);
      expect(result.fired).toBeNull();
      expect(result.consumed).toBe(false);
    }
  });

  it('opens the palette from inside a text field all the same', () => {
    expect(press('k', { meta: true }, true).fired).toBe('palette');
  });

  it('agrees with the hook about what counts as typing', () => {
    // The composer is a textarea; the search box is an input of type search.
    expect(isTypingTarget('TEXTAREA', false)).toBe(true);
    expect(isTypingTarget('INPUT', false, 'search')).toBe(true);
    expect(isTypingTarget('BUTTON', false)).toBe(false);
    expect(isTypingTarget('DIV', false)).toBe(false);
  });
});
