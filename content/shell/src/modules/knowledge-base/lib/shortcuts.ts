/**
 * Every keyboard binding in the module, as data, in one place.
 *
 * Two consumers read this list — `useHotkeys` (what fires) and the `?` sheet
 * (what is documented) — and `shortcuts.test.ts` asserts they cover each other
 * exactly (bookings' rule).
 *
 * `mod+s` is `scope: 'always'` because a draft is being typed INSIDE a text
 * field when it is pressed, and so is `mod+k`.
 */
import type { HotkeyBinding } from '~ui';

export type WorkspaceShortcutId =
  | 'palette'
  | 'help'
  | 'search'
  | 'undo'
  | 'save'
  | 'refresh'
  | 'new'
  | 'import'
  | 'export'
  | 'prevSource'
  | 'nextSource';

export type ShortcutId = WorkspaceShortcutId;

export type ShortcutSection = 'Global' | 'Sources' | 'This source';

export const WORKSPACE_BINDINGS: HotkeyBinding<WorkspaceShortcutId>[] = [
  { id: 'palette', keys: 'mod+k', scope: 'always' },
  { id: 'save', keys: 'mod+s', scope: 'always' },
  { id: 'undo', keys: 'mod+z' },
  { id: 'help', keys: '?' },
  { id: 'search', keys: '/' },
  { id: 'refresh', keys: 'r' },
  { id: 'new', keys: 'n' },
  { id: 'import', keys: 'i' },
  { id: 'export', keys: 'e' },
  { id: 'prevSource', keys: '[' },
  { id: 'nextSource', keys: ']' },
];

export interface ShortcutRow {
  /** The bindings this row documents. The test asserts coverage both ways. */
  ids: readonly ShortcutId[];
  label: string;
  section: ShortcutSection;
  /** Kbd groups, rendered side by side. */
  chips: readonly (readonly string[])[];
  /** Rendered between the chips — "to", "or". Omit for a plain gap. */
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
    ids: ['save'],
    label: 'Save everything unsaved',
    section: 'Global',
    chips: [['mod', 's']],
    note: 'Long text and lists are drafts; switches and pickers save on change.',
  },
  {
    ids: ['undo'],
    label: 'Undo the last change',
    section: 'Global',
    chips: [['mod', 'z']],
    note: 'A compensating write, not a revert. Restoring a deleted catalog item re-creates it, so it gets a new id.',
  },
  {
    ids: ['refresh'],
    label: 'Refresh',
    section: 'Global',
    chips: [['r']],
    note: 'The knowledge base has no live channel — this is how it catches up with an edit made elsewhere.',
  },
  { ids: ['help'], label: 'This sheet', section: 'Global', chips: [['?']] },

  {
    ids: ['search'],
    label: 'Search',
    section: 'Sources',
    chips: [['/']],
    note: 'Focuses the search box on the page, or the rail when the page has none.',
  },
  {
    ids: ['prevSource', 'nextSource'],
    label: 'Previous / next source',
    section: 'Sources',
    chips: [['['], [']']],
    joiner: 'or',
  },

  {
    ids: ['new'],
    label: 'Add an entry',
    section: 'This source',
    chips: [['n']],
    note: 'A new FAQ, a new product — whatever the open source creates.',
  },
  {
    ids: ['import'],
    label: 'Import',
    section: 'This source',
    chips: [['i']],
    note: 'A file, pasted text or a page from your website.',
  },
  { ids: ['export'], label: 'Export', section: 'This source', chips: [['e']], note: 'CSV, or JSON with everything.' },
];

export const SHORTCUT_SECTIONS: readonly ShortcutSection[] = ['Global', 'Sources', 'This source'];
