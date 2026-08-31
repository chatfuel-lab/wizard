/**
 * Every keyboard binding in the module, as data, in one place.
 *
 * Two consumers read this list — `useHotkeys` (what fires) and the `?` sheet
 * (what is documented) — and `shortcuts.test.ts` asserts they cover each other
 * exactly (bookings' rule).
 *
 * WORKSPACE_BINDINGS go straight into `useHotkeys`, scoped to the module root.
 * `mod+s` is `scope: 'always'` because a draft is being typed INSIDE a text
 * field when it is pressed.
 */
import type { HotkeyBinding } from '~ui';

export type WorkspaceShortcutId =
  'palette' | 'help' | 'search' | 'undo' | 'save' | 'refresh' | 'newRule' | 'prevScope' | 'nextScope';

export type ShortcutId = WorkspaceShortcutId;

export type ShortcutSection = 'Global' | 'Sources';

export const WORKSPACE_BINDINGS: HotkeyBinding<WorkspaceShortcutId>[] = [
  { id: 'palette', keys: 'mod+k', scope: 'always' },
  { id: 'save', keys: 'mod+s', scope: 'always' },
  { id: 'undo', keys: 'mod+z' },
  { id: 'help', keys: '?' },
  { id: 'search', keys: '/' },
  { id: 'refresh', keys: 'r' },
  { id: 'newRule', keys: 'n' },
  { id: 'prevScope', keys: '[' },
  { id: 'nextScope', keys: ']' },
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
    label: 'Save every unsaved draft',
    section: 'Global',
    chips: [['mod', 's']],
    note: 'Prompts and lists are drafts; switches and selects save on change.',
  },
  {
    ids: ['undo'],
    label: 'Undo the last change',
    section: 'Global',
    chips: [['mod', 'z']],
    note: 'A compensating write. Deleting a rule can be undone — it re-creates the rule with a new id.',
  },
  { ids: ['newRule'], label: 'New rule', section: 'Global', chips: [['n']] },
  { ids: ['refresh'], label: 'Refresh', section: 'Global', chips: [['r']] },
  { ids: ['help'], label: 'This sheet', section: 'Global', chips: [['?']] },

  {
    ids: ['search'],
    label: 'Search the sources',
    section: 'Sources',
    chips: [['/']],
    note: 'Focuses the search box above the rail.',
  },
  {
    ids: ['prevScope', 'nextScope'],
    label: 'Previous / next source',
    section: 'Sources',
    chips: [['['], [']']],
    joiner: 'or',
  },
];

export const SHORTCUT_SECTIONS: readonly ShortcutSection[] = ['Global', 'Sources'];
