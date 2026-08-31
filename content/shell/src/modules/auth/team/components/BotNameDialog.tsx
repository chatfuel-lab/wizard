import { useEffect, useState } from 'react';
import { Alert, Button, Dialog, FormField, Input, useToast } from '~ui';
import { messageForError } from '../../lib/copy';
import { useTeam } from '../TeamContext';

export interface BotNameDialogProps {
  open: boolean;
  onClose: () => void;
  /** Null = create a new bot; a row = rename that one. */
  bot: { id: string; name: string } | null;
}

const MAX = 80;

/**
 * One dialog for both namings, because they ask the same question and refuse
 * for the same reasons. Creating is the slower of the two — a bot is made in
 * Chatfuel before the name means anything — so the button says what is
 * happening rather than leaving a still dialog behind.
 */
export function BotNameDialog({ open, onClose, bot }: BotNameDialogProps) {
  const team = useTeam();
  const toast = useToast();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(bot?.name ?? '');
    setError(null);
    setBusy(false);
  }, [open, bot]);

  const trimmed = name.trim();
  const invalid = trimmed.length === 0 || trimmed.length > MAX;

  const submit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (invalid || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (bot) {
        await team.renameBot(bot.id, trimmed);
        toast.show({ tone: 'success', title: `Renamed to ${trimmed}` });
      } else {
        await team.createBot(trimmed);
        toast.show({ tone: 'success', title: `${trimmed} is ready` });
      }
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
      title={bot ? 'Rename bot' : 'New bot'}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={invalid} loading={busy}>
            {bot ? 'Rename' : 'Create bot'}
          </Button>
        </>
      }
    >
      <form className="flex flex-col gap-3" onSubmit={submit}>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <FormField label="Name">
          {(a11y) => (
            <Input
              {...a11y}
              value={name}
              autoFocus
              maxLength={MAX}
              onChange={(event) => setName(event.target.value)}
              placeholder="Support, Sales, Bookings…"
            />
          )}
        </FormField>
      </form>
    </Dialog>
  );
}
