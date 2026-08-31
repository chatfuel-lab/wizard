import { useEffect, useId, useRef, useState } from 'react';
import { Alert, Button, Dialog, Input, Label, Spinner } from '~ui';
import { messageOf } from '../lib/errors';

export interface NewConversationDialogProps {
  open: boolean;
  onClose: () => void;
  /** Rejects on failure; the dialog shows why and stays open. */
  onCreate: (contactId: string) => Promise<void>;
}

/**
 * Start a conversation with a contact who has not written in.
 *
 * It asks for a contact id, and it says so plainly rather than dressing it
 * up: the inbox's operations have no contact search — `ChatList` searches
 * contacts WITH a conversation, which is exactly the set this dialog is not
 * for — and the contacts module's own operations may not be imported across
 * the module boundary. So the id comes from wherever the operator found the
 * person: the Contacts module, a deep link (`/livechat?contact=<id>`), a
 * CRM. `CreateConversation` is "ensure a conversation exists", so an id that
 * already has one simply opens it.
 */
export function NewConversationDialog({ open, onClose, onCreate }: NewConversationDialogProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [contactId, setContactId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) return;
    setContactId('');
    setError(null);
  }, [open]);

  const submit = async () => {
    const trimmed = contactId.trim();
    if (trimmed === '' || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onCreate(trimmed);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title="New conversation"
      size="sm"
      initialFocusRef={inputRef}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy || contactId.trim() === ''}>
            {busy ? <Spinner size={14} /> : null}
            {busy ? 'Opening…' : 'Open conversation'}
          </Button>
        </>
      }
    >
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Label
          htmlFor={inputId}
          hint="From the Contacts module, or the id in a /livechat?contact=… link. A contact who already has a conversation gets that one opened."
        >
          Contact id
        </Label>
        <Input
          ref={inputRef}
          id={inputId}
          value={contactId}
          onChange={(event) => setContactId(event.target.value)}
          placeholder="e.g. a1b2c3d4…"
          autoComplete="off"
          spellCheck={false}
          disabled={busy}
        />
        {error ? (
          <Alert tone="danger" title="Could not open a conversation">
            {error}
          </Alert>
        ) : null}
      </form>
    </Dialog>
  );
}
