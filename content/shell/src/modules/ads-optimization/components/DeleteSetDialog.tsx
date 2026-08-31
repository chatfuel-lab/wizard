import { Button, Dialog } from '~ui';
import { setName } from '../lib/summary';
import type { EventSetView } from '../types';

export interface DeleteSetDialogProps {
  /** The set queued for deletion, or null while the dialog is closed. */
  set: EventSetView | null;
  busy: boolean;
  onCancel: () => void;
  onDelete: (set: EventSetView) => void;
}

/** Confirms the one destructive write the module cannot undo. */
export function DeleteSetDialog({ set, busy, onCancel, onDelete }: DeleteSetDialogProps) {
  return (
    <Dialog
      open={set !== null}
      onClose={onCancel}
      title={set ? `Delete ${setName(set)}?` : 'Delete'}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={busy}
            onClick={() => {
              if (set) onDelete(set);
            }}
          >
            Delete
          </Button>
        </div>
      }
    >
      <p className="text-body text-text-muted">
        Its ads go back to the default set, and the conversions it reported stop being sent. This cannot be undone.
      </p>
    </Dialog>
  );
}
