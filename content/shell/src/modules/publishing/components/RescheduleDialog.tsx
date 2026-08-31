import { useEffect, useState } from 'react';
import { Button, DateField, Dialog, TimeInput } from '~ui';
import { scheduleFields, scheduleInstant } from '../lib/queueRows';

export interface RescheduleDialogProps {
  open: boolean;
  /** Whichever of the two things this batch is actually doing. */
  verb: string;
  count: number;
  /** The time the first target already has, so the controls open on it. */
  from: string | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (at: string) => void;
}

export function RescheduleDialog({ open, verb, count, from, busy, onClose, onConfirm }: RescheduleDialogProps) {
  const [fields, setFields] = useState(() => scheduleFields(from, Date.now()));

  /* Reopened on a different post, so the controls have to start again from that
     post's time rather than from whatever was typed the last time. */
  useEffect(() => {
    if (open) setFields(scheduleFields(from, Date.now()));
  }, [open, from]);

  const at = scheduleInstant(fields.day, fields.time);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={count > 1 ? `${verb} ${count} posts` : verb}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={at === null} loading={busy} onClick={() => at && onConfirm(at)}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <DateField
          aria-label="Day"
          value={fields.day || null}
          onChange={(day) => setFields((prev) => ({ ...prev, day: day ?? '' }))}
        />
        <TimeInput
          aria-label="Time"
          value={fields.time || null}
          onChange={(time) => setFields((prev) => ({ ...prev, time: time ?? '' }))}
        />
      </div>
    </Dialog>
  );
}
