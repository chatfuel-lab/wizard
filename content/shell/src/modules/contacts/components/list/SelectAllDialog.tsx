import { Button, Dialog } from '~ui';
import { selectAllLabel, type SelectAllPlan } from '../../lib/tableSelection';

export interface SelectAllDialogProps {
  open: boolean;
  onClose: () => void;
  plan: SelectAllPlan;
  serverCount: number | null;
  /** Confirms the fill; the caller closes the dialog and starts the paging loop. */
  onConfirm: () => void;
}

/** The confirm step before a select-all fill starts paging. */
export function SelectAllDialog({ open, onClose, plan, serverCount, onConfirm }: SelectAllDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Select everything that matches"
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm}>
            Select {plan.target.toLocaleString()}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <p className="text-body text-text">{selectAllLabel(plan, serverCount)}</p>
        {plan.needsMore ? (
          <p className="text-meta text-text-muted">
            The rows have to be loaded before they can be acted on, so this pages through the list first. It may take a
            moment.
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
