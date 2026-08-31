import { Button, Dialog } from '~ui';
import { removalConfirmLabel, removalDetail, removalPlan, removalTitle } from '../lib/queueRows';
import type { QueuedPost } from '../types';

export interface RemovalDialogProps {
  open: boolean;
  posts: QueuedPost[];
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * The one place this app says out loud what removing a post does.
 *
 * There is no delete mutation on the publishing API, so a published post can
 * only leave this list — and a batch holding both a draft and a published post
 * is doing two different things at once. The title carries the verb that is
 * true of all of them and the line under it names the half that is not coming
 * back; there is no undo behind either.
 */
export function RemovalDialog({ open, posts, busy, onClose, onConfirm }: RemovalDialogProps) {
  const plan = removalPlan(posts);
  const detail = removalDetail(plan);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={removalTitle(plan)}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" loading={busy} onClick={onConfirm}>
            {removalConfirmLabel(plan)}
          </Button>
        </>
      }
    >
      {detail ? <p className="text-sm text-text-muted">{detail}</p> : null}
    </Dialog>
  );
}
