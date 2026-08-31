/**
 * Every keyboard binding in the module, as data, in one place.
 *
 * Two consumers read this list - `useHotkeys` (what fires) and the `?` sheet
 * (what is documented) - and `shortcuts.test.ts` asserts they cover each other
 * exactly. A binding that fires and is not written down is the one people never
 * find; a row that documents a key nothing listens to is worse.
 *
 * `mod+k` is `scope: 'always'` because it is pressed while a name is being
 * typed as often as not.
 *
 * `EVENT_ROW_BINDINGS` is a second scope: those keys belong to a focused event
 * row, not to the module, so they are resolved by the list itself against the
 * row the grip is on. Same table, same `resolveHotkey`, one place to read.
 */
import type { HotkeyBinding } from '~ui';

export type WorkspaceShortcutId =
  'palette' | 'help' | 'undo' | 'refresh' | 'newSet' | 'newEvent' | 'prevSet' | 'nextSet';

export type EventRowShortcutId = 'moveEventUp' | 'moveEventDown';

export type ShortcutId = WorkspaceShortcutId | EventRowShortcutId;

export type ShortcutSection = 'Global' | 'Sets' | 'This set';

export const BINDINGS: HotkeyBinding<WorkspaceShortcutId>[] = [
  { id: 'palette', keys: 'mod+k', scope: 'always' },
  { id: 'undo', keys: 'mod+z' },
  { id: 'help', keys: '?' },
  { id: 'refresh', keys: 'r' },
  { id: 'newSet', keys: 'n' },
  { id: 'newEvent', keys: 'e' },
  { id: 'prevSet', keys: '[' },
  { id: 'nextSet', keys: ']' },
];

/** Resolved on the focused event row by `EventsBlock`, not by the window listener. */
export const EVENT_ROW_BINDINGS: HotkeyBinding<EventRowShortcutId>[] = [
  { id: 'moveEventUp', keys: 'alt+arrowup' },
  { id: 'moveEventDown', keys: 'alt+arrowdown' },
];

export interface ShortcutRow {
  /** The bindings this row documents. The test asserts coverage both ways. */
  ids: readonly ShortcutId[];
  label: string;
  section: ShortcutSection;
  /** Kbd groups, rendered side by side. */
  chips: readonly (readonly string[])[];
  /** Rendered between the chips - "to", "or". Omit for a plain gap. */
  joiner?: string;
  /** A caveat worth reading in the sheet itself. */
  note?: string;
}

export const SHORTCUT_ROWS: ShortcutRow[] = [
  {
    ids: ['palette'],
    label: 'Command palette',
    section: 'Global',
    chips: [['mod', 'k']],
    note: 'Works inside a text field too.',
  },
  {
    ids: ['undo'],
    label: 'Undo the last change',
    section: 'Global',
    chips: [['mod', 'z']],
    note: 'A compensating write, not a revert: restoring a deleted event gives it a new id.',
  },
  { ids: ['refresh'], label: 'Reload the sets', section: 'Global', chips: [['r']] },
  { ids: ['help'], label: 'This sheet', section: 'Global', chips: [['?']] },

  { ids: ['newSet'], label: 'New event set', section: 'Sets', chips: [['n']] },
  { ids: ['prevSet', 'nextSet'], label: 'Previous / next set', section: 'Sets', chips: [['['], [']']], joiner: 'or' },

  { ids: ['newEvent'], label: 'Add an event', section: 'This set', chips: [['e']] },
  {
    ids: ['moveEventUp', 'moveEventDown'],
    label: 'Move the focused event',
    section: 'This set',
    chips: [
      ['alt', 'up'],
      ['alt', 'down'],
    ],
    note: 'The order is stored, and Meta reads it in that order.',
  },
];

export const SHORTCUT_SECTIONS: readonly ShortcutSection[] = ['Global', 'Sets', 'This set'];
