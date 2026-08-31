import { Button, Dialog } from '~ui';

export interface DirtyGuardDialogProps {
  open: boolean;
  count: number;
  onSave: () => void;
  onDiscard: () => void;
  onStay: () => void;
}

/**
 * Leaving a source with unsaved edits.
 *
 * Three ways out and no default-destructive one: Save writes and then goes,
 * Discard throws the edits away and goes, Stay is the escape hatch and is also
 * what Escape and the backdrop do. The count is there because "you have
 * unsaved changes" is a different decision at one field and at nine.
 */
export function DirtyGuardDialog({ open, count, onSave, onDiscard, onStay }: DirtyGuardDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onStay}
      title={count === 1 ? 'One unsaved change' : `${count} unsaved changes`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onStay}>
            Stay here
          </Button>
          <Button variant="secondary" size="sm" onClick={onDiscard}>
            Discard
          </Button>
          <Button variant="primary" size="sm" onClick={onSave}>
            Save and go
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-muted">Leaving this source now would lose what you typed.</p>
    </Dialog>
  );
}
