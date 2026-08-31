/**
 * Every keyboard binding in the module, in one place.
 *
 * This exists because the alternative is already on disk: `guide.md` has
 * documented "`Escape` clears the selection" since S4 and nothing implements
 * it. A cheat sheet, a `Kbd` hint and a handler that each hold their own copy
 * of the key map will drift, and the drift is invisible — no test fails, no
 * type breaks, the doc is just quietly wrong.
 *
 * So there is one list, and two consumers read it rather than restate it:
 *
 * - **Handlers.** `WORKSPACE_BINDINGS` goes straight into `useHotkeys`.
 *   `BOARD_BINDINGS` does *not* — a key pressed on a focused card belongs to
 *   that card, not to a window listener — but the board resolves it with the
 *   same `resolveHotkey` over the same specs, so the source is still shared.
 * - **The `?` sheet**, which renders `SHORTCUT_ROWS`.
 *
 * `shortcuts.test.ts` asserts the two sides cover each other exactly. That is
 * what makes "the cheat sheet cannot drift" a gate instead of a comment.
 */
import type { HotkeyBinding } from '~ui';

export type WorkspaceShortcutId =
  'palette' | 'help' | 'search' | 'undo' | 'refresh' | 'goBoard' | 'goTable' | 'goForecast';

export type BoardShortcutId =
  | 'stage1'
  | 'stage2'
  | 'stage3'
  | 'stage4'
  | 'stage5'
  | 'stage6'
  | 'stagePrev'
  | 'stageNext'
  | 'focusUp'
  | 'focusDown'
  | 'focusLeft'
  | 'focusRight'
  | 'focusStart'
  | 'focusEnd'
  | 'extendUp'
  | 'extendDown'
  | 'open'
  | 'toggleSelect'
  | 'selectColumn'
  | 'clear';

export type ShortcutId = WorkspaceShortcutId | BoardShortcutId;

export type ShortcutSection = 'Global' | 'Move around' | 'Select' | 'Change stage';

/**
 * Workspace bindings: one window listener, above all three views.
 *
 * `mod+k` is `always` so the palette opens from inside the table's search box —
 * that is the one place a user reaches for it most. Everything else stands
 * down while typing, which is what keeps `/` and `?` from being unusable.
 */
export const WORKSPACE_BINDINGS: HotkeyBinding<WorkspaceShortcutId>[] = [
  { id: 'palette', keys: 'mod+k', scope: 'always' },
  { id: 'undo', keys: 'mod+z' },
  { id: 'help', keys: '?' },
  { id: 'search', keys: '/' },
  { id: 'refresh', keys: 'r' },
  { id: 'goBoard', keys: 'g b' },
  { id: 'goTable', keys: 'g t' },
  { id: 'goForecast', keys: 'g f' },
];

/**
 * Board bindings, resolved against the focused card rather than the window.
 *
 * `[` and `]` step one stage and **do not wrap** (`lib/stageKeys.ts`): New → Lost
 * on a single keypress is a destructive surprise, and the two ends are exactly
 * where a user holding the key would land.
 */
export const BOARD_BINDINGS: HotkeyBinding<BoardShortcutId>[] = [
  { id: 'stage1', keys: '1' },
  { id: 'stage2', keys: '2' },
  { id: 'stage3', keys: '3' },
  { id: 'stage4', keys: '4' },
  { id: 'stage5', keys: '5' },
  { id: 'stage6', keys: '6' },
  { id: 'stagePrev', keys: '[' },
  { id: 'stageNext', keys: ']' },
  { id: 'focusUp', keys: 'arrowup' },
  { id: 'focusDown', keys: 'arrowdown' },
  { id: 'focusLeft', keys: 'arrowleft' },
  { id: 'focusRight', keys: 'arrowright' },
  { id: 'focusStart', keys: 'home' },
  { id: 'focusEnd', keys: 'end' },
  { id: 'extendUp', keys: 'shift+arrowup' },
  { id: 'extendDown', keys: 'shift+arrowdown' },
  { id: 'open', keys: 'enter' },
  { id: 'toggleSelect', keys: 'space' },
  { id: 'selectColumn', keys: 'mod+a' },
  { id: 'clear', keys: 'escape' },
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
  { ids: ['search'], label: 'Search deals', section: 'Global', chips: [['/']] },
  {
    ids: ['undo'],
    label: 'Undo the last stage change',
    section: 'Global',
    chips: [['mod', 'z']],
    note: 'Sends the cards back, but the server re-stamps their sort time — they return to the top of the column and their ageing resets.',
  },
  { ids: ['refresh'], label: 'Refresh', section: 'Global', chips: [['r']] },
  { ids: ['help'], label: 'This sheet', section: 'Global', chips: [['?']] },
  {
    ids: ['goBoard', 'goTable', 'goForecast'],
    label: 'Go to board, table or forecast',
    section: 'Global',
    chips: [['g'], ['b'], ['t'], ['f']],
    joiner: 'then',
  },

  {
    ids: ['focusUp', 'focusDown', 'focusLeft', 'focusRight'],
    label: 'Move between cards',
    section: 'Move around',
    chips: [['up'], ['down'], ['left'], ['right']],
    note: 'Left and right hold your place in the column and skip a collapsed one.',
  },
  {
    ids: ['focusStart', 'focusEnd'],
    label: 'First or last card in the column',
    section: 'Move around',
    chips: [['home'], ['end']],
  },
  { ids: ['open'], label: 'Open the deal', section: 'Move around', chips: [['enter']] },

  { ids: ['toggleSelect'], label: 'Select the card', section: 'Select', chips: [['space']] },
  {
    ids: ['extendUp', 'extendDown'],
    label: 'Extend the selection',
    section: 'Select',
    chips: [
      ['shift', 'up'],
      ['shift', 'down'],
    ],
  },
  {
    ids: ['selectColumn'],
    label: 'Select the whole column',
    section: 'Select',
    chips: [['mod', 'a']],
    note: 'The column, not the board — six columns of twenty is not a selection anyone wants.',
  },
  { ids: ['clear'], label: 'Clear the selection', section: 'Select', chips: [['esc']] },

  {
    ids: ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6'],
    label: 'Move to stage 1–6',
    section: 'Change stage',
    chips: [['1'], ['6']],
    joiner: 'to',
    note: 'Applies to the selection when the focused card is part of it.',
  },
  {
    ids: ['stagePrev', 'stageNext'],
    label: 'Step one stage',
    section: 'Change stage',
    chips: [['['], [']']],
    note: 'No wrapping: New and Lost are the ends.',
  },
];

export const SHORTCUT_SECTIONS: ShortcutSection[] = ['Global', 'Move around', 'Select', 'Change stage'];
