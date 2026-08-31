import { Button, Dialog } from '~ui';

export interface DirtyGuardDialogProps {
  open: boolean;
  count: number;
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
  onStay: () => void;
}

/**
 * The navigation guard for drafts (see `lib/drafts.ts`). Leaving a view, a
 * source or a card with unsaved prompts / lists asks: Save (writes them all,
 * sequentially, then leaves), Discard (drops them, leaves), Stay.
 */
export function DirtyGuardDialog({ open, count, onSave, onDiscard, onStay }: DirtyGuardDialogProps) {
  return (
    <Dialog open={open} onClose={onStay} title="Unsaved changes" size="sm">
      <p className="text-sm text-text">
        {count === 1 ? 'One draft has not been saved.' : `${count} drafts have not been saved.`} Save them before you
        go, or discard them?
      </p>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onStay}>
          Stay
        </Button>
        <Button variant="secondary" size="sm" onClick={onDiscard}>
          Discard
        </Button>
        <Button variant="primary" size="sm" onClick={() => void onSave()}>
          Save and go
        </Button>
      </div>
    </Dialog>
  );
}
