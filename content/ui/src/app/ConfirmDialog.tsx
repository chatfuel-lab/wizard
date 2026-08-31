import { useEffect, useState, type ReactNode } from 'react';
import { Dialog } from '../overlay/Dialog';
import { Button } from '../primitives/Button';
import { Alert } from '../primitives/Alert';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** What is about to happen and what it costs — one or two sentences. */
  children: ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'default';
  /** Resolve = done (the dialog closes); reject = the reason shows inline and the dialog stays. */
  onConfirm: () => Promise<void> | void;
  /** The rejection → the sentence shown inline. Defaults to the error's own message. */
  errorMessage?: (err: unknown) => string;
}

const defaultErrorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/**
 * "Are you sure?", with the failure staying inside the dialog.
 *
 * The point is that last part: a confirm that closes on a rejected write and
 * shows a toast somewhere else leaves the reader unsure whether the thing
 * happened at all. This keeps the dialog open, prints the reason where they
 * are already looking, and lets them try again. Destructive actions with no
 * compensating call — the ones undo cannot cover — are what sits behind it.
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  children,
  confirmLabel,
  tone = 'danger',
  onConfirm,
  errorMessage = defaultErrorMessage,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Re-opened for a different row: last time's failure is not this row's. */
  useEffect(() => {
    if (!open) {
      setBusy(false);
      setError(null);
    }
  }, [open]);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            size="sm"
            loading={busy}
            onClick={() => void confirm()}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-body text-text">
        {children}
        {/* Alert takes its own role from the tone — danger already announces. */}
        {error ? <Alert tone="danger">{error}</Alert> : null}
      </div>
    </Dialog>
  );
}
