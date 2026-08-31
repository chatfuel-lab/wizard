/**
 * Every keyboard binding in the inbox, in one place.
 *
 * Same shape as the deals module's, for the same reason: a cheat sheet, a
 * `Kbd` hint and a handler that each hold their own copy of the key map will
 * drift, and the drift is invisible — nothing fails, the sheet is just quietly
 * wrong. So there is one list; `useHotkeys` reads it and the `?` sheet renders
 * it, and `inboxShortcuts.test.ts` asserts the two cover each other exactly.
 *
 * The letters are Gmail's, which is to say everyone's: `j`/`k` walk the list,
 * `e` is "done with this one" — here, closing it to a flow — and `a` assigns.
 * All of them stand down while typing, which is what keeps them from being a
 * hazard in the composer: an operator writing "take a look" must not close the
 * conversation on the `e`. `mod+k` is the exception, `always`, so the palette
 * opens from inside the search box and the composer both — that is where an
 * operator's hands are.
 */
import type { HotkeyBinding } from '~ui';

export type InboxShortcutId = 'palette' | 'help' | 'search' | 'next' | 'prev' | 'close' | 'assign';

export type InboxShortcutSection = 'Global' | 'Conversation';

export const INBOX_BINDINGS: HotkeyBinding<InboxShortcutId>[] = [
  { id: 'palette', keys: 'mod+k', scope: 'always' },
  { id: 'help', keys: '?' },
  { id: 'search', keys: '/' },
  { id: 'next', keys: 'j' },
  { id: 'prev', keys: 'k' },
  { id: 'close', keys: 'e' },
  { id: 'assign', keys: 'a' },
];

export interface InboxShortcutRow {
  /** The bindings this row documents. The test asserts coverage both ways. */
  ids: readonly InboxShortcutId[];
  label: string;
  section: InboxShortcutSection;
  /** Kbd groups, rendered side by side. */
  chips: readonly (readonly string[])[];
  /** A caveat worth reading in the sheet itself. */
  note?: string;
}

export const INBOX_SHORTCUT_ROWS: InboxShortcutRow[] = [
  {
    ids: ['palette'],
    label: 'Command palette',
    section: 'Global',
    chips: [['mod', 'k']],
    note: 'Works inside the search box and the composer too.',
  },
  { ids: ['search'], label: 'Search conversations', section: 'Global', chips: [['/']] },
  { ids: ['help'], label: 'This sheet', section: 'Global', chips: [['?']] },
  {
    ids: ['next', 'prev'],
    label: 'Next or previous conversation',
    section: 'Conversation',
    chips: [['j'], ['k']],
    note: 'Stops at the ends of the list rather than wrapping.',
  },
  {
    ids: ['close'],
    label: 'Close to a flow',
    section: 'Conversation',
    chips: [['e']],
    note: 'Closing hands the contact back to the bot — you pick which flow runs.',
  },
  { ids: ['assign'], label: 'Assign', section: 'Conversation', chips: [['a']] },
];

export const INBOX_SHORTCUT_SECTIONS: InboxShortcutSection[] = ['Global', 'Conversation'];
