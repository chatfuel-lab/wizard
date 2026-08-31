/**
 * Every keyboard binding in the module, as data, in one place.
 *
 * Three consumers read this list — `useHotkeys` (what fires), the `?` sheet
 * (what is documented) and the ⌘K palette (which prints, beside a command, the
 * key that does the same thing) — and `shortcuts.test.ts` asserts they cover
 * each other exactly. A key that fires and is not written down is the one
 * nobody finds; a row documenting a key nothing listens to is worse than no row
 * at all; and a palette with its own copy of the map goes wrong in silence.
 *
 * Three sets, because three different components install them and each one is
 * only live where its keys mean something:
 *
 * - **`WORKSPACE_BINDINGS`** go straight into `useHotkeys`, scoped to the module
 *   root, above all three views.
 * - **`CALENDAR_BINDINGS`** are installed by the calendar itself. Stepping a
 *   period needs the day the calendar is anchored on, and that anchor is the
 *   calendar's own state — the workspace could not honour `]` if it wanted to.
 *   Only one view is mounted at a time, so there is nothing to arbitrate.
 * - **`COMPOSER_BINDINGS`** are installed by the composer, and only while it is
 *   open. Both are `scope: 'always'`, because the caption box has focus when
 *   either is pressed and a binding that stood down while typing would never
 *   fire at all.
 *
 * Escape is deliberately NOT a binding. It closes the composer, but the dialog's
 * own dismiss already does that, and binding it a second time would put two
 * handlers on one keystroke. It is documented as a `source: 'ui'` row instead —
 * a reader does not care which layer implements a key.
 */
import type { HotkeyBinding } from '~ui';

export type WorkspaceShortcutId =
  'palette' | 'help' | 'filter' | 'refresh' | 'newPost' | 'goCalendar' | 'goQueue' | 'goLibrary';

export type CalendarShortcutId = 'today' | 'prevPeriod' | 'nextPeriod' | 'modeMonth' | 'modeWeek' | 'modeList';

export type ComposerShortcutId = 'composerPrimary' | 'composerDraft';

export type ShortcutId = WorkspaceShortcutId | CalendarShortcutId | ComposerShortcutId;

export type ShortcutSection = 'Global' | 'Go to' | 'On the calendar' | 'In the queue' | 'In the composer';

/**
 * One window listener, above all three views.
 *
 * Every one of these but the palette is `not-typing`, the default: they are
 * bare letters, and a bare letter typed into the composer's caption has to stay
 * a letter. ⌘K is held down with a modifier, so it can be `always` without ever
 * eating a character.
 */
export const WORKSPACE_BINDINGS: HotkeyBinding<WorkspaceShortcutId>[] = [
  { id: 'palette', keys: 'mod+k', scope: 'always' },
  { id: 'help', keys: '?' },
  { id: 'filter', keys: '/' },
  { id: 'refresh', keys: 'r' },
  { id: 'newPost', keys: 'n' },
  /* `g` then a letter, which is how every other module in this app switches
     view. A digit would be quicker and it is what publishing was first built
     with — but the shortcut somebody already knows is worth more than the one
     that saves them a keystroke, and in one module here a digit already means
     something else entirely. */
  { id: 'goCalendar', keys: 'g c' },
  { id: 'goQueue', keys: 'g q' },
  { id: 'goLibrary', keys: 'g l' },
];

/**
 * The calendar's own keys, installed by the calendar and live only while it is
 * the view on screen.
 *
 * `[` and `]` step whatever period is drawn — a week in the week grid, a month
 * in the month grid. One pair for both, rather than a key per unit: what a step
 * is worth is the shape on screen, and a reader looking at a week already knows
 * that.
 */
export const CALENDAR_BINDINGS: HotkeyBinding<CalendarShortcutId>[] = [
  { id: 'today', keys: 't' },
  { id: 'prevPeriod', keys: '[' },
  { id: 'nextPeriod', keys: ']' },
  { id: 'modeMonth', keys: 'm' },
  { id: 'modeWeek', keys: 'w' },
  { id: 'modeList', keys: 'a' },
];

/**
 * The composer's two, live only while it is open.
 *
 * They mirror the two buttons in its footer exactly, including which of publish
 * and schedule the primary means — the key does what the button says, or the
 * pair have drifted.
 */
export const COMPOSER_BINDINGS: HotkeyBinding<ComposerShortcutId>[] = [
  { id: 'composerPrimary', keys: 'mod+enter', scope: 'always' },
  { id: 'composerDraft', keys: 'mod+s', scope: 'always' },
];

export interface ShortcutRow {
  /**
   * The bindings this row documents. Empty ONLY for `source: 'ui'` rows, whose
   * keys belong to a design-system primitive rather than to this module.
   */
  ids: readonly ShortcutId[];
  label: string;
  section: ShortcutSection;
  /** Who implements it. Default 'module'. */
  source?: 'module' | 'ui';
  /** Kbd groups, rendered side by side. */
  chips: readonly (readonly string[])[];
  /** Rendered between the chips — "or", "then". Omit for a plain gap. */
  joiner?: string;
  /** A caveat worth reading in the sheet itself. */
  note?: string;
}

export const SHORTCUT_ROWS: ShortcutRow[] = [
  { ids: ['palette'], label: 'Command palette', section: 'Global', chips: [['mod', 'k']] },
  { ids: ['newPost'], label: 'New post', section: 'Global', chips: [['n']] },
  {
    ids: ['filter'],
    label: 'Filter this view',
    section: 'Global',
    chips: [['/']],
    note: 'The queue by status, the library by kind. The calendar has no filter.',
  },
  {
    ids: ['refresh'],
    label: 'Refresh',
    section: 'Global',
    chips: [['r']],
    note: 'Re-reads the queue and the account. Pulling the library down from Instagram again is its own button.',
  },
  { ids: ['help'], label: 'This sheet', section: 'Global', chips: [['?']] },

  {
    ids: ['goCalendar', 'goQueue', 'goLibrary'],
    label: 'Calendar, Queue or Library',
    section: 'Go to',
    chips: [
      ['g', 'c'],
      ['g', 'q'],
      ['g', 'l'],
    ],
    joiner: 'or',
  },

  { ids: ['today'], label: 'Jump to today', section: 'On the calendar', chips: [['t']] },
  {
    ids: ['prevPeriod', 'nextPeriod'],
    label: 'Previous / next period',
    section: 'On the calendar',
    chips: [['['], [']']],
    joiner: 'or',
    note: 'A week in the week grid, a month in the month grid. The list runs end to end and has nothing to page.',
  },
  {
    ids: ['modeMonth', 'modeWeek', 'modeList'],
    label: 'Month / week / list',
    section: 'On the calendar',
    chips: [['m'], ['w'], ['a']],
    joiner: 'or',
  },
  {
    ids: [],
    source: 'ui',
    label: 'Move a post with the keyboard',
    section: 'On the calendar',
    chips: [['space']],
    note: 'On the week grid: Space picks up the focused post, arrows move it, Enter drops it, Escape puts it back. A published post cannot be moved.',
  },

  {
    ids: [],
    source: 'ui',
    label: 'Move between rows',
    section: 'In the queue',
    chips: [['up'], ['down']],
    joiner: 'or',
  },
  { ids: [], source: 'ui', label: 'Open the post', section: 'In the queue', chips: [['enter']] },
  { ids: [], source: 'ui', label: 'Select the row', section: 'In the queue', chips: [['space']] },

  {
    ids: ['composerPrimary'],
    label: 'Publish, or schedule',
    section: 'In the composer',
    chips: [['mod', 'enter']],
    note: 'Whichever the button says: scheduling when a time is set, publishing when it is not.',
  },
  {
    ids: ['composerDraft'],
    label: 'Save a draft',
    section: 'In the composer',
    chips: [['mod', 's']],
    note: 'Stores whatever is written, finished or not, and drops the time.',
  },
  {
    ids: [],
    source: 'ui',
    label: 'Close the composer',
    section: 'In the composer',
    chips: [['esc']],
    note: 'Nothing is saved. While a post is going out it stays open.',
  },
];

export const SHORTCUT_SECTIONS: readonly ShortcutSection[] = [
  'Global',
  'Go to',
  'On the calendar',
  'In the queue',
  'In the composer',
];

const ALL_BINDINGS = [...WORKSPACE_BINDINGS, ...CALENDAR_BINDINGS, ...COMPOSER_BINDINGS];

/**
 * `'mod+enter'` → `['mod', 'enter']`: one `Kbd` group, ready to render.
 *
 * Both separators, because a spec uses both and they mean different things:
 * `+` is keys held together (`mod+k`) and a space is keystrokes one after the
 * other (`g c`). Either way each key gets its own chip — a reader presses them
 * one at a time regardless, and a single chip reading "g c" is a key nobody has.
 */
const chipsFor = (keys: string): readonly string[] => keys.split(/[+\s]+/).filter(Boolean);

const CHIPS = new Map<ShortcutId, readonly string[]>(
  ALL_BINDINGS.map((binding) => [binding.id as ShortcutId, chipsFor(binding.keys)]),
);

/**
 * The keys a binding fires on, for anything that wants to print them.
 *
 * The palette reads this rather than carrying its own copy: a command and the
 * key that does the same thing are one fact, and two places to write it down is
 * one place to get it wrong. An id nothing binds prints nothing, which is the
 * only truthful answer — and `shortcuts.test.ts` walks every binding through
 * here so the empty answer stays unreachable.
 */
export const shortcutChips = (id: ShortcutId): readonly string[] => CHIPS.get(id) ?? [];
