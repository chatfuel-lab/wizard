import { useEffect, useRef, useState } from 'react';
import { Alert, Button, ConfirmDialog, Dialog, Input, Label } from '~ui';
import type { AutomationRecord } from '../../types';
import { NAME_MAX, nameError } from './RuleName';

/**
 * The two small dialogs behind a rule's overflow menu. Both resolve = close;
 * reject = the error shows inline and the dialog stays (the ConfirmDialog
 * contract). Duplicate asks for a name first (prefilled "<name> (copy)"), so it
 * keeps its own form over `Dialog`; Delete is the plain confirm shape and rides
 * the shared `ConfirmDialog`, with a reminder that the toast offers
 * "Restore rule".
 */

export interface DuplicateRuleDialogProps {
  open: boolean;
  source: AutomationRecord;
  onClose: () => void;
  /** Runs the composite; reject with a message to keep the dialog open. */
  onDuplicate: (name: string) => Promise<void>;
}

export function DuplicateRuleDialog({ open, source, onClose, onDuplicate }: DuplicateRuleDialogProps) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(`${source.name ?? 'Rule'} (copy)`.slice(0, NAME_MAX));
      setError(null);
      setBusy(false);
    }
  }, [open, source.name]);

  const submit = async () => {
    const problem = nameError(name);
    if (problem) {
      setError(problem);
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onDuplicate(name.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Duplicate rule"
      size="sm"
      initialFocusRef={inputRef}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" loading={busy} onClick={() => void submit()}>
            Duplicate
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <p className="text-sm text-text-muted">
          A copy of “{source.name ?? 'this rule'}” in the same source with every setting as it is now. It starts turned
          off.
        </p>
        <div className="flex flex-col gap-1">
          <Label htmlFor="duplicate-rule-name" hint={`${name.length} / ${NAME_MAX}`}>
            Name
          </Label>
          <Input
            id="duplicate-rule-name"
            ref={inputRef}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            maxLength={NAME_MAX}
            aria-invalid={error ? true : undefined}
            disabled={busy}
          />
        </div>
        {error ? <Alert tone="danger">{error}</Alert> : null}
      </form>
    </Dialog>
  );
}

export interface DeleteRuleDialogProps {
  open: boolean;
  rule: AutomationRecord;
  onClose: () => void;
  onDelete: () => Promise<void>;
}

export function DeleteRuleDialog({ open, rule, onClose, onDelete }: DeleteRuleDialogProps) {
  return (
    <ConfirmDialog open={open} onClose={onClose} title="Delete rule" confirmLabel="Delete" onConfirm={onDelete}>
      <p>Delete “{rule.name ?? 'this rule'}”? Conversations it was catching go back to the source’s Default rules.</p>
      <p className="text-text-muted">
        The toast offers “Restore rule” for a minute afterwards — it comes back as a new rule with the same settings.
      </p>
    </ConfirmDialog>
  );
}
