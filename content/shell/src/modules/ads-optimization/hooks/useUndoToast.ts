import { useEffect } from 'react';
import { useToast } from '~ui';
import { useAdsUndo } from '../AdsUndoContext';

/**
 * The toast that carries the undo offer: it appears when a label is pushed,
 * and the offer itself expires with the toast.
 */
export function useUndoToast(): void {
  const undo = useAdsUndo();
  const toast = useToast();

  useEffect(() => {
    if (!undo.label) return;
    toast.show({
      tone: 'info',
      title: undo.label,
      action: { label: 'Undo', onClick: undo.run },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one toast per offer: keyed on the label alone, so a re-created runner or toast api does not replay it
  }, [undo.label]);
}
