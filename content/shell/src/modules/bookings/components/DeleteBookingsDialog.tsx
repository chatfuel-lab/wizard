import { Button, Dialog } from '~ui';
import { nameList } from '../lib/announce';
import { displayCustomerName } from '../lib/appointmentsColumns';
import type { BookingRecord } from '../types';

export interface DeleteBookingsDialogProps {
  /** The bookings about to go, or empty for closed. */
  targets: readonly BookingRecord[];
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The one delete confirmation, calendar and appointments alike. Delete asks
 * first because it cannot be undone: there is no restore mutation, and
 * re-creating would mint a new id that no chat message, link or Google
 * Calendar event points at (`lib/undo.ts`). The dialog names who is affected
 * — `displayCustomerName`, so a Google-Calendar-imported booking is named by
 * its event — so a wrong selection is caught here rather than in a toast.
 * Focus lands on the dialog's Close, never on the danger button.
 */
export function DeleteBookingsDialog({ targets, busy, onConfirm, onCancel }: DeleteBookingsDialogProps) {
  const count = targets.length;
  const names = nameList(targets.map(displayCustomerName));
  return (
    <Dialog
      open={count > 0}
      onClose={onCancel}
      title={count === 1 ? 'Delete this booking?' : `Delete ${count} bookings?`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={busy}>
            {count === 1 ? 'Delete' : `Delete ${count}`}
          </Button>
        </>
      }
    >
      <p className="text-body text-text">
        {count === 1 ? `${names}'s booking` : `The bookings for ${names}`} will be removed for good.
      </p>
      <p className="mt-2 text-label text-text-muted">
        Deleting cannot be undone — there is no restore in the booking API. To keep the record but free the slot, mark
        it Canceled instead.
      </p>
    </Dialog>
  );
}
