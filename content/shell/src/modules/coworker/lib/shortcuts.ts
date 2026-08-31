/**
 * Every keyboard binding in the module, as data, in one place.
 *
 * Two consumers read this list — `useHotkeys` (what fires) and the `?` sheet
 * (what is documented) — and `shortcuts.test.ts` asserts they cover each other
 * exactly (bookings' rule).
 *
 * **Everything is `not-typing` except the palette.** These are single letters,
 * and the surface they live on is mostly a text box — `n` inside a half-written
 * message must be an `n`. `useHotkeys` gets that right from the scope alone.
 */
import type { HotkeyBinding } from '~ui';

export type ShortcutId = 'palette' | 'help' | 'newChat' | 'search' | 'nextChat' | 'prevChat' | 'focusComposer';

export const WORKSPACE_BINDINGS: HotkeyBinding<ShortcutId>[] = [
  { id: 'palette', keys: 'mod+k', scope: 'always' },
  { id: 'help', keys: '?' },
  { id: 'newChat', keys: 'n' },
  { id: 'search', keys: '/' },
  { id: 'nextChat', keys: 'j' },
  { id: 'prevChat', keys: 'k' },
  { id: 'focusComposer', keys: 'c' },
];

export type ShortcutSection = 'Chats' | 'The assistant';

export interface ShortcutRow {
  /** The bindings this row documents. The test asserts coverage both ways. */
  ids: readonly ShortcutId[];
  label: string;
  section: ShortcutSection;
  /** Kbd groups, rendered side by side. */
  chips: readonly (readonly string[])[];
  /** Rendered between the chips — "or", "to". Omit for a plain gap. */
  joiner?: string;
}

export const SHORTCUT_ROWS: ShortcutRow[] = [
  { ids: ['palette'], label: 'Command palette', section: 'The assistant', chips: [['mod', 'k']] },
  { ids: ['newChat'], label: 'New chat', section: 'Chats', chips: [['n']] },
  { ids: ['search'], label: 'Search your chats', section: 'Chats', chips: [['/']] },
  {
    ids: ['nextChat', 'prevChat'],
    label: 'Next / previous chat',
    section: 'Chats',
    chips: [['j'], ['k']],
    joiner: 'or',
  },
  { ids: ['focusComposer'], label: 'Write a message', section: 'The assistant', chips: [['c']] },
  { ids: ['help'], label: 'This sheet', section: 'The assistant', chips: [['?']] },
];

export const SHORTCUT_SECTIONS: readonly ShortcutSection[] = ['Chats', 'The assistant'];
