import { createContext, useContext } from 'react';
import type { SavedViewsState } from './hooks/useSavedViews';
import type { SavedView } from './lib/savedViews';

export interface ContactsViewsValue extends SavedViewsState {
  /**
   * Apply a saved view by id. The workspace owns the URL, so it is the only
   * thing that can write the filter and the density; a surface that also wants
   * the saved column layout reads `lastApplied` below.
   */
  apply: (id: string) => void;
  /**
   * The view the workspace applied last, stamped. A surface adopts its columns
   * by watching `at` — idempotent, and it does not fire for a filter change
   * that came from anywhere else.
   */
  lastApplied: { view: SavedView; at: number } | null;
}

/**
 * Where saved views live — the second genuinely cross-surface piece of state.
 *
 * They are read in two places that cannot see each other: `SavedViewsMenu`,
 * which the list renders in its toolbar, and the ⌘K palette, which the
 * workspace renders above every surface. Two `useSavedViews()` calls would mean
 * two reads of the same storage item, two copies of the list, and a view saved
 * in the menu that the palette does not know about until a reload.
 *
 * One item, one list, one loader. The provider goes in `ContactsApp`'s
 * workspace; the hook is consumed strictly below it (validator pass 10b).
 */
export const ContactsViewsContext = createContext<ContactsViewsValue | null>(null);

export function useContactsViews(): ContactsViewsValue {
  const value = useContext(ContactsViewsContext);
  if (!value) throw new Error('useContactsViews must be used inside <ContactsApp>');
  return value;
}
