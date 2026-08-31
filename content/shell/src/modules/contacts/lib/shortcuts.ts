/**
 * Every key this module binds, in one list, plus the rows the `?` sheet prints.
 *
 * The reason it is one file rather than two is the failure it prevents: a cheat
 * sheet, a `Kbd` hint and a handler that each keep their own copy of the map
 * drift apart silently. No test fails, no type breaks — the documentation is
 * just quietly wrong. `shortcuts.test.ts` asserts the bindings and the rows
 * cover each other exactly, which turns "the sheet cannot lie" into a gate.
 *
 * Two things are deliberately NOT here:
 *
 * - **The table's own keys.** Arrow / Enter / Space inside the list come from
 *   `~ui`'s `DataTable rowNavigation`, not from us. They are still worth
 *   printing — a reader does not care which package implements them — so they
 *   are rows with `source: 'ui'` and no binding id, and the test asserts that
 *   pairing holds in both directions.
 * - **Anything a surface binds for itself.** A key pressed on a focused row
 *   belongs to that row. If a surface grows one, it adds the binding AND its
 *   row here, and the test is what makes that non-optional.
 */
import type { HotkeyBinding } from '~ui';

export type WorkspaceShortcutId =
  'palette' | 'help' | 'search' | 'undo' | 'refresh' | 'closeRecord' | 'goList' | 'goFields' | 'goAudience';

export type ShortcutSection = 'Global' | 'Go to' | 'In the list';

/**
 * One window listener, above all three surfaces.
 *
 * `mod+k` is the only `always` binding: the palette has to open from inside
 * the search box, which is exactly where a person reaches for it. Everything
 * else stands down while typing, which is what keeps `/`, `?` and `r` usable
 * as bare keys at all.
 */
export const WORKSPACE_BINDINGS: HotkeyBinding<WorkspaceShortcutId>[] = [
  { id: 'palette', keys: 'mod+k', scope: 'always' },
  { id: 'undo', keys: 'mod+z' },
  { id: 'help', keys: '?' },
  { id: 'search', keys: '/' },
  { id: 'refresh', keys: 'r' },
  { id: 'closeRecord', keys: 'escape' },
  { id: 'goList', keys: 'g l' },
  { id: 'goFields', keys: 'g f' },
  { id: 'goAudience', keys: 'g a' },
];

export interface ShortcutRow {
  /**
   * The bindings this row documents. Empty ONLY for `source: 'ui'` rows, whose
   * keys belong to a `~ui` primitive rather than to this module.
   */
  ids: readonly WorkspaceShortcutId[];
  label: string;
  section: ShortcutSection;
  /** Who implements it. Default 'module'. */
  source?: 'module' | 'ui';
  /** Kbd groups, rendered side by side. */
  chips: readonly (readonly string[])[];
  /** Printed between the chips — "then", "or". Omit for a plain gap. */
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
    note: 'Works inside a text field too — every other key here stands down while you type.',
  },
  { ids: ['search'], label: 'Search contacts', section: 'Global', chips: [['/']] },
  {
    ids: ['undo'],
    label: 'Undo the last bulk change',
    section: 'Global',
    chips: [['mod', 'z']],
    note: 'One step only: the undo is a second write, not a rollback — this API keeps no history to restore.',
  },
  { ids: ['refresh'], label: 'Refresh', section: 'Global', chips: [['r']] },
  { ids: ['closeRecord'], label: 'Close the open contact', section: 'Global', chips: [['esc']] },
  { ids: ['help'], label: 'This sheet', section: 'Global', chips: [['?']] },

  {
    ids: ['goList', 'goFields', 'goAudience'],
    label: 'Contacts, Fields or Audience',
    section: 'Go to',
    chips: [['g'], ['l'], ['f'], ['a']],
    joiner: 'then',
  },

  {
    ids: [],
    source: 'ui',
    label: 'Move between rows',
    section: 'In the list',
    chips: [['up'], ['down']],
  },
  { ids: [], source: 'ui', label: 'Open the contact', section: 'In the list', chips: [['enter']] },
  { ids: [], source: 'ui', label: 'Select the row', section: 'In the list', chips: [['space']] },
];

export const SHORTCUT_SECTIONS: ShortcutSection[] = ['Global', 'Go to', 'In the list'];
