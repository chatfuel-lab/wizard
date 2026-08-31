import { useEffect, useId, useRef, useState } from 'react';
import { Button, Dialog, Input, Label } from '~ui';

export interface RenameDialogProps {
  open: boolean;
  /** What the row says today — the server's title, or the operator's own. */
  currentTitle: string;
  /** Their own name for it, if they already set one; null clears back to the server's. */
  operatorTitle: string | null;
  onClose: () => void;
  onSubmit: (title: string | null) => void;
}

/**
 * Rename, on an API that has no rename.
 *
 * The name goes into `frontendStateStorage` — the per-conversation map the
 * server keeps for the client, and the only writable string the conversation
 * owns. That is worth saying to the operator rather than hiding, for one
 * reason: **the assistant can read it.** So the sheet says so, and the reset
 * control genuinely unsets the key rather than writing an empty string, which
 * the API rejects outright.
 *
 * A dialog and not an inline editor in the row, because the rail is not the
 * only place this is reached from: the `⋯` menu opens it and the ⌘K palette
 * opens it. One control, every caller.
 */
export function RenameDialog({ open, currentTitle, operatorTitle, onClose, onSubmit }: RenameDialogProps) {
  const [draft, setDraft] = useState(operatorTitle ?? currentTitle);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  /* Re-seeded on every open, not once at mount: the dialog is mounted for the
     whole life of the surface and opened against a different chat each time. */
  useEffect(() => {
    if (open) setDraft(operatorTitle ?? currentTitle);
  }, [open, operatorTitle, currentTitle]);

  const save = () => {
    onSubmit(draft.trim() === '' ? null : draft);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Rename chat"
      size="sm"
      initialFocusRef={inputRef}
      footer={
        <>
          {operatorTitle !== null ? (
            <Button
              variant="ghost"
              onClick={() => {
                onSubmit(null);
                onClose();
              }}
            >
              Reset
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </>
      }
    >
      <Label
        htmlFor={inputId}
        hint="Stored with the conversation, so it follows you between browsers — and the assistant can read it."
      >
        Name
      </Label>
      <Input
        id={inputId}
        ref={inputRef}
        value={draft}
        maxLength={120}
        placeholder={currentTitle}
        className="mt-2"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            save();
          }
        }}
      />
    </Dialog>
  );
}
