/**
 * Every keyboard binding in the flow builder, in one place — the same shape,
 * and for the same reason, as `deals/lib/shortcuts.ts`.
 *
 * Two consumers read this list rather than restate it: `useHotkeys` in
 * `FlowCanvas` binds `HOTKEYS`, and the `?` sheet renders `SHORTCUT_ROWS`.
 * `flowShortcuts.test.ts` asserts the two cover each other exactly, which is
 * what makes "the cheat sheet cannot drift" a gate rather than a hope.
 *
 * ## One binding list, one root
 *
 * Everything here goes through `useHotkeys({ rootRef })` on the EDITOR element
 * — header, canvas and inspector — the palette's ⌘K and the sheet's `?`
 * included. That is the embed rule made mechanical: this module may be one
 * panel of somebody else's application, and ⌘K pressed in the host's own
 * search box is the host's. Not the canvas element alone: `InspectorHost`
 * moves focus into its column on open, and a root that ended at the canvas
 * edge lost every key the moment a block was clicked. The canvas's chrome
 * — toolbar, block palette, minimap — is inside the editor too, so ⌘K from
 * inside the block palette's search box is still ours.
 *
 * ## The keys themselves
 *
 * Backspace as well as Delete, and this is not belt-and-braces. On a Mac laptop
 * there is no Delete key at all — the one printed `delete` sends Backspace — so
 * a canvas bound only to Delete has no keyboard deletion on half the machines
 * that will ever open it.
 *
 * Undo and redo share one binding, and the handler reads the Shift key off the
 * event. `mod+shift+z` cannot be registered as its own binding: the matcher
 * ignores Shift for single-character keys — deliberately, because `?` IS
 * Shift+/ and demanding a Shift match there would make every punctuation
 * binding unreachable — so `mod+z` and `mod+shift+z` would both match both
 * keystrokes, and whichever was listed first would win them both.
 *
 * Tools take a digit AND a letter — `1`/`V` for Select, `2`/`H` for Pan — as
 * every drawing tool since Illustrator has: the digit is what the strip prints
 * on the button and the letter is what the hand already knows.
 *
 * `mod+k` is `always` so the palette opens from inside the block palette's
 * search box, which is the one text field on the canvas. Everything else
 * stands down while typing, which is what keeps `/`, `?`, `V` and `H` from
 * being unusable in any field.
 */
import type { HotkeyBinding } from '~ui';

export type FlowShortcutId =
  | 'delete'
  | 'selectAll'
  | 'clear'
  | 'undo'
  | 'toolSelect'
  | 'toolPan'
  | 'toolConnect'
  | 'toolAdd'
  | 'place'
  | 'palette'
  | 'search'
  | 'help'
  | 'fit'
  | 'test';

export type ShortcutSection = 'Global' | 'Tools' | 'Select' | 'Edit';

export const HOTKEYS: readonly HotkeyBinding<FlowShortcutId>[] = [
  { id: 'palette', keys: 'mod+k', scope: 'always' },
  { id: 'search', keys: '/' },
  { id: 'help', keys: '?' },
  { id: 'undo', keys: 'mod+z' },
  { id: 'delete', keys: 'Delete' },
  { id: 'delete', keys: 'Backspace' },
  { id: 'selectAll', keys: 'mod+a' },
  { id: 'clear', keys: 'Escape' },
  { id: 'toolSelect', keys: '1' },
  { id: 'toolSelect', keys: 'v' },
  { id: 'toolPan', keys: '2' },
  { id: 'toolPan', keys: 'h' },
  { id: 'toolConnect', keys: '3' },
  { id: 'toolAdd', keys: '4' },
  { id: 'place', keys: 'Enter' },
  { id: 'fit', keys: 'f' },
  { id: 'test', keys: 't' },
];

/**
 * Bindings the canvas resolves on its own root element rather than through
 * the window listener, and the reason is what `useHotkeys` does with a match:
 * it calls `preventDefault`. Enter on a focused button inside the canvas
 * chrome — a tool, a zoom control — is that button's activation, and a window
 * binding on Enter would swallow it for every button on the canvas. So Enter
 * fires only when the canvas root ITSELF has focus, which is the one place it
 * can mean "put the picked block here". Still in `HOTKEYS`, still on the
 * sheet: one list, two listeners, and this constant is the seam.
 */
export const ROOT_ONLY_SHORTCUTS: readonly FlowShortcutId[] = ['place'];

export interface ShortcutRow {
  /** The bindings this row documents. The test asserts coverage both ways. */
  ids: readonly FlowShortcutId[];
  label: string;
  section: ShortcutSection;
  /** Kbd groups, rendered side by side. */
  chips: readonly (readonly string[])[];
  /** Rendered between the chips — "or", "then". Omit for a plain gap. */
  joiner?: string;
  /** A caveat worth reading in the sheet itself. */
  note?: string;
}

export const SHORTCUT_ROWS: readonly ShortcutRow[] = [
  {
    ids: ['palette'],
    label: 'Command palette',
    section: 'Global',
    chips: [['mod', 'k']],
    note: 'Works inside the block search too.',
  },
  { ids: ['search'], label: 'Find a block by name', section: 'Global', chips: [['/']] },
  { ids: ['help'], label: 'This sheet', section: 'Global', chips: [['?']] },
  {
    ids: ['test'],
    label: 'Open or collapse the test chat',
    section: 'Global',
    chips: [['t']],
    note: 'Collapsing keeps the conversation — the dot on the pill is it still running.',
  },
  {
    ids: ['fit'],
    label: 'Fit the flow on screen',
    section: 'Global',
    chips: [['f']],
    note: 'With blocks selected, fits just those.',
  },

  { ids: ['toolSelect'], label: 'Select', section: 'Tools', chips: [['1'], ['v']], joiner: 'or' },
  {
    ids: ['toolPan'],
    label: 'Pan',
    section: 'Tools',
    chips: [['2'], ['h']],
    joiner: 'or',
    note: 'Dragging the background pans; blocks still drag. Space held does the same in any tool.',
  },
  {
    ids: ['toolConnect'],
    label: 'Connect',
    section: 'Tools',
    chips: [['3']],
    note: 'Click a block, then the block it should lead to.',
  },
  {
    ids: ['toolAdd'],
    label: 'Add a block',
    section: 'Tools',
    chips: [['4']],
    note: 'Opens the block palette. Pick one, then click the canvas where it should go.',
  },
  {
    ids: ['place'],
    label: 'Place the picked block at the centre',
    section: 'Tools',
    chips: [['enter']],
  },

  { ids: ['selectAll'], label: 'Select every block', section: 'Select', chips: [['mod', 'a']] },
  {
    ids: ['clear'],
    label: 'Clear the selection',
    section: 'Select',
    chips: [['esc']],
    note: 'Also drops a picked block, or a half-made connection.',
  },

  {
    ids: ['delete'],
    label: 'Delete the selection',
    section: 'Edit',
    chips: [['delete'], ['backspace']],
    joiner: 'or',
    note: 'Blocks are confirmed first; a selected connection goes at once.',
  },
  {
    ids: ['undo'],
    label: 'Undo, redo',
    section: 'Edit',
    chips: [
      ['mod', 'z'],
      ['shift', 'mod', 'z'],
    ],
    note: 'Deleting a block cannot be undone — the API has no undelete — and ⌘Z will say so.',
  },
];

export const SHORTCUT_SECTIONS: readonly ShortcutSection[] = ['Global', 'Tools', 'Select', 'Edit'];
