import { describe, expect, it } from 'vitest';
import {
  isModifierKey,
  isTypingTarget,
  matchStep,
  parseBindings,
  parseHotkey,
  resolveHotkey,
  SEQUENCE_TIMEOUT_MS,
  type HotkeyEventLike,
} from './hotkeys';

const press = (key: string, mods: Partial<HotkeyEventLike> = {}): HotkeyEventLike => ({
  key,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...mods,
});

describe('parseHotkey', () => {
  it('reads modifiers in any order and lowercases the key', () => {
    expect(parseHotkey('mod+Shift+K')).toEqual([{ key: 'k', mod: true, shift: true, alt: false }]);
    expect(parseHotkey('Shift+mod+k')).toEqual([{ key: 'k', mod: true, shift: true, alt: false }]);
  });

  it('treats cmd, meta and ctrl as the same modifier', () => {
    for (const spec of ['cmd+k', 'meta+k', 'ctrl+k', 'mod+k']) {
      expect(parseHotkey(spec)[0].mod).toBe(true);
    }
  });

  it('splits a whitespace-separated sequence into steps', () => {
    expect(parseHotkey('g b')).toEqual([
      { key: 'g', mod: false, shift: false, alt: false },
      { key: 'b', mod: false, shift: false, alt: false },
    ]);
  });

  it('normalises space and survives a literal plus', () => {
    expect(parseHotkey('space')[0].key).toBe('space');
    expect(parseHotkey('mod++')[0]).toEqual({ key: '+', mod: true, shift: false, alt: false });
  });
});

describe('matchStep', () => {
  const modK = parseHotkey('mod+k')[0];

  it('accepts either meta or ctrl for mod', () => {
    expect(matchStep(press('k', { metaKey: true }), modK)).toBe(true);
    expect(matchStep(press('k', { ctrlKey: true }), modK)).toBe(true);
    expect(matchStep(press('k'), modK)).toBe(false);
  });

  it('is case-insensitive about the key', () => {
    expect(matchStep(press('K', { metaKey: true }), modK)).toBe(true);
  });

  it('ignores shift for a printable key, because the character already encodes it', () => {
    /* `?` arrives as key '?' with shiftKey true on every layout that has it. */
    const question = parseHotkey('?')[0];
    expect(matchStep(press('?', { shiftKey: true }), question)).toBe(true);
    expect(matchStep(press('?'), question)).toBe(true);
  });

  it('enforces shift for a named key, so Shift+ArrowUp is not ArrowUp', () => {
    const up = parseHotkey('arrowup')[0];
    const shiftUp = parseHotkey('shift+arrowup')[0];
    expect(matchStep(press('ArrowUp'), up)).toBe(true);
    expect(matchStep(press('ArrowUp', { shiftKey: true }), up)).toBe(false);
    expect(matchStep(press('ArrowUp', { shiftKey: true }), shiftUp)).toBe(true);
  });

  it('rejects a stray alt', () => {
    expect(matchStep(press('k', { metaKey: true, altKey: true }), modK)).toBe(false);
  });
});

describe('isTypingTarget', () => {
  it('counts textareas, selects, text inputs and contenteditable', () => {
    expect(isTypingTarget('TEXTAREA', false)).toBe(true);
    expect(isTypingTarget('SELECT', false)).toBe(true);
    expect(isTypingTarget('INPUT', false, 'text')).toBe(true);
    expect(isTypingTarget('INPUT', false, 'search')).toBe(true);
    expect(isTypingTarget('DIV', true)).toBe(true);
  });

  it('does not count controls that hold no text', () => {
    expect(isTypingTarget('INPUT', false, 'checkbox')).toBe(false);
    expect(isTypingTarget('INPUT', false, 'radio')).toBe(false);
    expect(isTypingTarget('INPUT', false, 'range')).toBe(false);
    expect(isTypingTarget('DIV', false)).toBe(false);
    expect(isTypingTarget('BUTTON', false)).toBe(false);
  });

  it('treats a typeless input as text', () => {
    expect(isTypingTarget('INPUT', false)).toBe(true);
  });
});

describe('isModifierKey', () => {
  it('is true for the keys that are only ever held', () => {
    for (const key of ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock']) {
      expect(isModifierKey(key)).toBe(true);
    }
    expect(isModifierKey('k')).toBe(false);
  });
});

describe('resolveHotkey', () => {
  const bindings = parseBindings([
    { id: 'palette', keys: 'mod+k', scope: 'always' },
    { id: 'help', keys: '?' },
    { id: 'goBoard', keys: 'g b' },
    { id: 'goTable', keys: 'g t' },
    { id: 'selectAll', keys: 'mod+a' },
  ] as const);

  it('fires a single-step binding and consumes the event', () => {
    const result = resolveHotkey(bindings, press('k', { metaKey: true }), null, 0, false);
    expect(result).toEqual({ fired: 'palette', pending: null, consumed: true });
  });

  it('leaves an unknown key alone', () => {
    const result = resolveHotkey(bindings, press('q'), null, 0, false);
    expect(result).toEqual({ fired: null, pending: null, consumed: false });
  });

  it('holds a sequence prefix, then fires the whole thing', () => {
    const first = resolveHotkey(bindings, press('g'), null, 0, false);
    expect(first.fired).toBeNull();
    expect(first.consumed).toBe(true);
    expect(first.pending?.candidates.sort()).toEqual(['goBoard', 'goTable']);

    const second = resolveHotkey(bindings, press('b'), first.pending, 10, false);
    expect(second).toEqual({ fired: 'goBoard', pending: null, consumed: true });
  });

  it('drops a prefix that has gone stale', () => {
    const first = resolveHotkey(bindings, press('g'), null, 0, false);
    const late = resolveHotkey(bindings, press('b'), first.pending, SEQUENCE_TIMEOUT_MS + 1, false);
    expect(late).toEqual({ fired: null, pending: null, consumed: false });
  });

  it('re-reads a failed second key as a fresh first one', () => {
    /* g, g, b must reach `g b` rather than swallowing the second g. */
    const first = resolveHotkey(bindings, press('g'), null, 0, false);
    const second = resolveHotkey(bindings, press('g'), first.pending, 10, false);
    expect(second.fired).toBeNull();
    expect(second.pending?.depth).toBe(1);
    expect(resolveHotkey(bindings, press('b'), second.pending, 20, false).fired).toBe('goBoard');
  });

  it('stands down inside a typing target unless the scope says always', () => {
    expect(resolveHotkey(bindings, press('?'), null, 0, true).fired).toBeNull();
    expect(resolveHotkey(bindings, press('a', { metaKey: true }), null, 0, true).fired).toBeNull();
    expect(resolveHotkey(bindings, press('k', { metaKey: true }), null, 0, true).fired).toBe('palette');
  });

  it('never lets a held modifier cancel a pending sequence', () => {
    const first = resolveHotkey(bindings, press('g'), null, 0, false);
    const held = resolveHotkey(bindings, press('Shift'), first.pending, 10, false);
    expect(held.consumed).toBe(false);
    expect(held.pending).toBe(first.pending);
    expect(resolveHotkey(bindings, press('t'), held.pending, 20, false).fired).toBe('goTable');
  });
});
