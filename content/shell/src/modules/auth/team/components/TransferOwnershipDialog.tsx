import { useEffect, useState } from 'react';
import { Alert, Button, Checkbox, Dialog, Label, Select, useToast } from '~ui';
import { useTeam } from '../TeamContext';
import { messageForError } from '../../lib/copy';
import { transferCandidates } from '../lib/teamStore';

export interface TransferOwnershipDialogProps {
  open: boolean;
  onClose: () => void;
  /** Preselected when the dialog was opened from a member's row menu. */
  preselect?: string | null;
}

const personLabel = (name: string | null, email: string | null, role: string): string =>
  `${name ?? email ?? 'Unknown'}${name && email ? ` (${email})` : ''} — ${role}`;

/**
 * Hand the workspace over. One owner exists at a time (the SQL has a partial
 * unique index saying so), so this is a swap, not a grant: the current owner
 * becomes an admin in the same transaction. That is the part people miss,
 * which is why it is a checkbox and not a sentence.
 */
export function TransferOwnershipDialog({ open, onClose, preselect }: TransferOwnershipDialogProps) {
  const team = useTeam();
  const toast = useToast();
  const candidates = transferCandidates(team.state.members, team.me.id);

  const [target, setTarget] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTarget(preselect ?? candidates[0]?.userId ?? '');
    setUnderstood(false);
    setBusy(false);
    setError(null);
    // Re-seeded on every open; the candidate list is a render-time derivation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preselect]);

  const confirm = async () => {
    if (!target || !understood) return;
    setBusy(true);
    setError(null);
    try {
      await team.transferOwnership(target);
      const member = team.state.members.find((m) => m.userId === target);
      toast.show({
        tone: 'success',
        title: `${member?.name ?? member?.email ?? 'They'} now own this workspace`,
        description: 'You are an admin from here on.',
      });
      /* The provider is still holding "owner" for this session — the user menu
         would keep saying so. The page itself stays put: a re-fetch for a known
         member never unmounts the shell (see AuthRouter). */
      team.refetchMembership();
      onClose();
    } catch (err) {
      setError(messageForError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Transfer ownership"
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={busy}
            disabled={!target || !understood}
            onClick={() => void confirm()}
          >
            Transfer ownership
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-sm text-text">
        {candidates.length === 0 ? (
          <p className="text-text-muted">
            There is nobody to hand the workspace to yet. Invite someone and make them an admin first.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <Label>New owner</Label>
              <Select
                aria-label="New owner"
                value={target}
                onChange={setTarget}
                options={candidates.map((m) => ({
                  value: m.userId,
                  label: personLabel(m.name, m.email, m.role),
                }))}
                className="w-full"
              />
            </div>
            <Checkbox
              checked={understood}
              onChange={setUnderstood}
              label="I understand I become an admin and can no longer transfer or delete this workspace."
            />
          </>
        )}
        {error ? <Alert tone="danger">{error}</Alert> : null}
      </div>
    </Dialog>
  );
}
