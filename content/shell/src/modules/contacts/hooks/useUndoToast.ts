import { useEffect } from 'react';
import { useToast } from '~ui';
import { useContactsUndo } from '../ContactsUndoContext';

/** How long the toast that carries an undo offer stays on screen. ⌘Z outlives it. */
const UNDO_TOAST_MS = 10_000;

/**
 * One toast per offer. The id is reused so a second bulk run replaces the
 * first rather than stacking; the offer itself is the shared undo offer's to
 * expire, so ⌘Z keeps working after the toast fades.
 */
export function useUndoToast(): void {
  const undo = useContactsUndo();
  const toast = useToast();

  useEffect(() => {
    const entry = undo.entry;
    if (!entry) {
      /* The offer is gone — it was taken, or it aged out. A toast still saying
         "Undo" would point at a run that has already been undone. */
      toast.dismiss('contacts-undo');
      return;
    }
    toast.show({
      id: 'contacts-undo',
      title: entry.label,
      description: 'Undo writes the old values back — this API keeps no history to roll back to.',
      action: { label: 'Undo', onClick: undo.run },
      duration: UNDO_TOAST_MS,
    });
  }, [undo.entry, undo.run, toast]);
}
