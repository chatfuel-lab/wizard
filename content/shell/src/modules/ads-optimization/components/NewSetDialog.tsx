import { Button, Dialog, Input } from '~ui';

export interface NewSetDialogProps {
  /** The name being typed, or null while the dialog is closed. */
  name: string | null;
  onName: (next: string | null) => void;
  busy: boolean;
  onCreate: (name: string) => void;
}

/** Names a set before it exists; creating is the workspace's write. */
export function NewSetDialog({ name, onName, busy, onCreate }: NewSetDialogProps) {
  return (
    <Dialog
      open={name !== null}
      onClose={() => onName(null)}
      title="New event set"
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onName(null)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={!name?.trim()}
            onClick={() => onCreate((name ?? '').trim())}
          >
            Create
          </Button>
        </div>
      }
    >
      <Input
        value={name ?? ''}
        onChange={(event) => onName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || !name?.trim()) return;
          event.preventDefault();
          onCreate(name.trim());
        }}
        placeholder="Spring campaign"
        aria-label="Name"
        autoFocus
      />
    </Dialog>
  );
}
