import { describe, expect, it } from 'vitest';
import { isTypingTarget, parseBindings, resolveHotkey } from '~ui';
import { HOTKEYS } from '../lib/flowShortcuts';

/**
 * The canvas's binding list, against the matcher that will actually see it.
 *
 * Two claims are worth holding down here, and neither is visible to `tsc`.
 *
 * The first is the reason undo and redo share one binding: the matcher ignores
 * Shift for single-character keys, so `mod+z` and `mod+shift+z` match each
 * other's keystrokes and registering both would hand one of them to whichever
 * was listed first. The handler reads `event.shiftKey` instead.
 *
 * The second is that none of these fire while something is being typed into.
 * ⌘Z in an inspector field has to stay that field's undo, and Delete in a name
 * field has to delete a character rather than the block — a canvas that gets
 * that wrong destroys work while the user is looking at a text cursor.
 */
const parsed = parseBindings(HOTKEYS);

const press = (key: string, modifiers: { meta?: boolean; shift?: boolean; alt?: boolean } = {}, typing = false) =>
  resolveHotkey(
    parsed,
    {
      key,
      metaKey: modifiers.meta ?? false,
      ctrlKey: false,
      shiftKey: modifiers.shift ?? false,
      altKey: modifiers.alt ?? false,
    },
    null,
    0,
    typing,
  );

describe('canvas hotkeys', () => {
  it('binds the keys the canvas claims to bind', () => {
    expect(press('Delete').fired).toBe('delete');
    expect(press('Backspace').fired).toBe('delete');
    expect(press('a', { meta: true }).fired).toBe('selectAll');
    expect(press('Escape').fired).toBe('clear');
    expect(press('z', { meta: true }).fired).toBe('undo');
  });

  it('cannot tell ⇧⌘Z from ⌘Z, which is why the handler reads the event', () => {
    /* Both resolve to the same id. If redo were its own binding, one of these
       two keystrokes would fire the wrong one of them. */
    expect(press('Z', { meta: true, shift: true }).fired).toBe('undo');
  });

  it('stands down inside anything being typed into', () => {
    for (const [key, modifiers] of [
      ['Delete', {}],
      ['Backspace', {}],
      ['a', { meta: true }],
      ['z', { meta: true }],
      ['Z', { meta: true, shift: true }],
    ] as const) {
      const result = press(key, modifiers, true);
      expect(result.fired).toBeNull();
      /* Unconsumed as well as unfired: the hook preventDefaults whatever it
         consumes, and swallowing ⌘Z over a text field would take the browser's
         own undo with it. */
      expect(result.consumed).toBe(false);
    }
  });

  it('agrees with the hook about what counts as typing', () => {
    expect(isTypingTarget('INPUT', false, 'text')).toBe(true);
    expect(isTypingTarget('TEXTAREA', false)).toBe(true);
    expect(isTypingTarget('DIV', true)).toBe(true);
    expect(isTypingTarget('DIV', false)).toBe(false);
  });

  it('leaves a bare letter alone, so typing on the canvas is never a shortcut', () => {
    expect(press('z').fired).toBeNull();
    expect(press('a').fired).toBeNull();
  });
});
