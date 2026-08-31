/**
 * Every keyboard binding in the module, as data, in one place.
 *
 * Two consumers read this list — `useHotkeys` (what fires) and the `?` sheet
 * (what is documented) — and `shortcuts.test.ts` asserts they cover each other
 * exactly. Deals earned that test the hard way: its guide documented a key for
 * two stages while nothing implemented it.
 *
 * WORKSPACE_BINDINGS go straight into `useHotkeys` above every section.
 * CALENDAR_BINDINGS do NOT: a key pressed on a focused event block belongs to
 * that block (the calendar track resolves them with the same `resolveHotkey`
 * over these specs). `space` (grab) and the arrows/Enter/Escape WHILE grabbed
 * are handled by `~ui`'s TimeGrid itself and listed here only so the sheet
 * documents them; the module never double-handles a key the grid
 * `preventDefault`s. Selection is `x`, not Space, for that reason.
 */
import type { HotkeyBinding } from '~ui';

export type WorkspaceShortcutId =
  | 'palette'
  | 'help'
  | 'search'
  | 'undo'
  | 'refresh'
  | 'newBooking'
  | 'today'
  | 'prev'
  | 'next'
  | 'modeDay'
  | 'modeWeek'
  | 'modeMonth'
  | 'goCalendar'
  | 'goAppointments'
  | 'goStaff'
  | 'goServices'
  | 'goSettings'
  | 'goInsights';

export type CalendarShortcutId =
  | 'status1'
  | 'status2'
  | 'status3'
  | 'status4'
  | 'status5'
  | 'focusUp'
  | 'focusDown'
  | 'focusLeft'
  | 'focusRight'
  | 'focusStart'
  | 'focusEnd'
  | 'open'
  | 'toggleSelect'
  | 'selectAll'
  | 'clear'
  | 'grab'
  | 'nudgeEarlier'
  | 'nudgeLater'
  | 'nudgeColumnLeft'
  | 'nudgeColumnRight'
  | 'growEnd'
  | 'shrinkEnd'
  | 'delete';

export type ShortcutId = WorkspaceShortcutId | CalendarShortcutId;

export type ShortcutSection = 'Global' | 'Calendar' | 'Move around' | 'Select' | 'Change' | 'Sections';

export const WORKSPACE_BINDINGS: HotkeyBinding<WorkspaceShortcutId>[] = [
  { id: 'palette', keys: 'mod+k', scope: 'always' },
  { id: 'undo', keys: 'mod+z' },
  { id: 'help', keys: '?' },
  { id: 'search', keys: '/' },
  { id: 'refresh', keys: 'r' },
  { id: 'newBooking', keys: 'n' },
  { id: 'today', keys: 't' },
  { id: 'prev', keys: '[' },
  { id: 'next', keys: ']' },
  { id: 'modeDay', keys: 'd' },
  { id: 'modeWeek', keys: 'w' },
  { id: 'modeMonth', keys: 'm' },
  { id: 'goCalendar', keys: 'g c' },
  { id: 'goAppointments', keys: 'g a' },
  { id: 'goStaff', keys: 'g s' },
  { id: 'goServices', keys: 'g v' },
  { id: 'goSettings', keys: 'g e' },
  { id: 'goInsights', keys: 'g i' },
];

/** Resolved on a focused event block, not on the window. Digits follow `STATUS_META` (Pending has none). */
export const CALENDAR_BINDINGS: HotkeyBinding<CalendarShortcutId>[] = [
  { id: 'status1', keys: '1' },
  { id: 'status2', keys: '2' },
  { id: 'status3', keys: '3' },
  { id: 'status4', keys: '4' },
  { id: 'status5', keys: '5' },
  { id: 'focusUp', keys: 'arrowup' },
  { id: 'focusDown', keys: 'arrowdown' },
  { id: 'focusLeft', keys: 'arrowleft' },
  { id: 'focusRight', keys: 'arrowright' },
  { id: 'focusStart', keys: 'home' },
  { id: 'focusEnd', keys: 'end' },
  { id: 'open', keys: 'enter' },
  { id: 'toggleSelect', keys: 'x' },
  { id: 'selectAll', keys: 'mod+a' },
  { id: 'clear', keys: 'escape' },
  { id: 'grab', keys: 'space' },
  { id: 'nudgeEarlier', keys: 'shift+arrowup' },
  { id: 'nudgeLater', keys: 'shift+arrowdown' },
  { id: 'nudgeColumnLeft', keys: 'shift+arrowleft' },
  { id: 'nudgeColumnRight', keys: 'shift+arrowright' },
  { id: 'growEnd', keys: 'alt+shift+arrowdown' },
  { id: 'shrinkEnd', keys: 'alt+shift+arrowup' },
  { id: 'delete', keys: 'delete' },
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
  { ids: ['newBooking'], label: 'New booking', section: 'Global', chips: [['n']] },
  {
    ids: ['search'],
    label: 'Search appointments',
    section: 'Global',
    chips: [['/']],
    note: 'Filters the loaded rows — the API has no server-side search over bookings.',
  },
  {
    ids: ['undo'],
    label: 'Undo the last change',
    section: 'Global',
    chips: [['mod', 'z']],
    note: 'Sends the booking back with a second update. Deleting cannot be undone — it asks first.',
  },
  { ids: ['refresh'], label: 'Refresh', section: 'Global', chips: [['r']] },
  { ids: ['help'], label: 'This sheet', section: 'Global', chips: [['?']] },

  { ids: ['today'], label: 'Jump to today', section: 'Calendar', chips: [['t']] },
  { ids: ['prev', 'next'], label: 'Previous / next period', section: 'Calendar', chips: [['['], [']']], joiner: 'or' },
  {
    ids: ['modeDay', 'modeWeek', 'modeMonth'],
    label: 'Day / week / month',
    section: 'Calendar',
    chips: [['d'], ['w'], ['m']],
    joiner: 'or',
  },

  {
    ids: ['focusUp', 'focusDown'],
    label: 'Earlier / later booking',
    section: 'Move around',
    chips: [['↑'], ['↓']],
    joiner: 'or',
  },
  {
    ids: ['focusLeft', 'focusRight'],
    label: 'Previous / next column',
    section: 'Move around',
    chips: [['←'], ['→']],
    joiner: 'or',
  },
  {
    ids: ['focusStart', 'focusEnd'],
    label: 'First / last booking',
    section: 'Move around',
    chips: [['home'], ['end']],
    joiner: 'or',
  },
  { ids: ['open'], label: 'Open the booking', section: 'Move around', chips: [['enter']] },

  { ids: ['toggleSelect'], label: 'Select / deselect', section: 'Select', chips: [['x']] },
  { ids: ['selectAll'], label: 'Select every booking in view', section: 'Select', chips: [['mod', 'a']] },
  { ids: ['clear'], label: 'Clear the selection', section: 'Select', chips: [['esc']] },

  {
    ids: ['status1', 'status2', 'status3', 'status4', 'status5'],
    label: 'Confirmed · Attended · No-show · Reschedule · Canceled',
    section: 'Change',
    chips: [['1'], ['2'], ['3'], ['4'], ['5']],
    note: 'Applies to the selection, or to the focused booking. There is no key for Pending — a booking cannot go back to it.',
  },
  {
    ids: ['grab'],
    label: 'Grab the booking to move it with the keyboard',
    section: 'Change',
    chips: [['space']],
    note: 'Then arrows move (Shift for an hour, Alt+↑/↓ resize), Enter drops, Esc cancels. The grid owns the keys while a booking is grabbed.',
  },
  {
    ids: ['nudgeEarlier', 'nudgeLater'],
    label: 'Move 15 minutes earlier / later',
    section: 'Change',
    chips: [
      ['shift', '↑'],
      ['shift', '↓'],
    ],
    joiner: 'or',
  },
  {
    ids: ['nudgeColumnLeft', 'nudgeColumnRight'],
    label: 'Move to the previous / next column',
    section: 'Change',
    chips: [
      ['shift', '←'],
      ['shift', '→'],
    ],
    joiner: 'or',
    note: 'A day, or a specialist when the calendar is by specialist.',
  },
  {
    ids: ['shrinkEnd', 'growEnd'],
    label: 'Shorter / longer by 15 minutes',
    section: 'Change',
    chips: [
      ['alt', 'shift', '↑'],
      ['alt', 'shift', '↓'],
    ],
    joiner: 'or',
  },
  { ids: ['delete'], label: 'Delete', section: 'Change', chips: [['delete']], note: 'Asks first.' },

  { ids: ['goCalendar'], label: 'Calendar', section: 'Sections', chips: [['g', 'c']] },
  { ids: ['goAppointments'], label: 'Appointments', section: 'Sections', chips: [['g', 'a']] },
  { ids: ['goStaff'], label: 'Staff', section: 'Sections', chips: [['g', 's']] },
  { ids: ['goServices'], label: 'Services', section: 'Sections', chips: [['g', 'v']] },
  { ids: ['goSettings'], label: 'Settings', section: 'Sections', chips: [['g', 'e']] },
  { ids: ['goInsights'], label: 'Insights', section: 'Sections', chips: [['g', 'i']] },
];

export const SHORTCUT_SECTIONS: readonly ShortcutSection[] = [
  'Global',
  'Calendar',
  'Move around',
  'Select',
  'Change',
  'Sections',
];
