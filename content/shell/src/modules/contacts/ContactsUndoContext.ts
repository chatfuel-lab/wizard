import { createContext, useContext } from 'react';

export interface UndoEntry {
  /** What the toast and the palette say: "Undo — 12 contacts moved to Won". */
  label: string;
  run: () => void | Promise<void>;
}

export interface ContactsUndoValue {
  entry: UndoEntry | null;
  /** Offer an undo, or clear with null. The caller owns the compensating call. */
  push: (entry: UndoEntry | null) => void;
  /** Run and clear. Safe to call twice; the second does nothing. */
  run: () => void;
  clear: () => void;
}

/**
 * Where an undo entry lives — the one genuinely cross-surface piece of state.
 *
 * An edit happens inside a surface (the table's bulk bar, the record page's
 * stage select), but `⌘Z` is bound once at the workspace above all of them.
 * Without a shared home the hotkey would have to reach into whichever surface
 * happens to be mounted.
 *
 * **One entry, not a stack.** Every undo here is a compensating forward
 * mutation — there is no history API and `updatedAt` is re-stamped by the undo
 * itself — so a second undo would not restore an earlier state, it would just
 * write again. A deep history would promise something this API cannot do.
 *
 * The provider goes in `ContactsApp`; the hook is consumed strictly below it
 * (validator pass 10b).
 */
export const ContactsUndoContext = createContext<ContactsUndoValue | null>(null);

export function useContactsUndo(): ContactsUndoValue {
  const value = useContext(ContactsUndoContext);
  if (!value) throw new Error('useContactsUndo must be used inside <ContactsApp>');
  return value;
}
