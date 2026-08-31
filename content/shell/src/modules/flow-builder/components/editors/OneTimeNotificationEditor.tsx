import { useMemo, useState } from 'react';
import { Button, Dialog, Tag } from '~ui';
import {
  BroadcastStatus,
  SendOneTimeNotificationDocument,
  SetOneTimeNotificationSegmentDocument,
} from '~api/generated/flow-builder/graphql';
import { pickBlock } from '../../lib/pickBlock';
import { segmentErrorFilterIds } from '../../lib/segmentInput';
import type { BlockT, ElementOf } from '../../types';
import { SegmentEditor } from './shared/SegmentEditor';
import { useBlockMutation } from './useBlockMutation';

export interface OneTimeNotificationEditorProps {
  element: ElementOf<'WhatsAppOneTimeNotificationBlockElement'>;
  onBlock: (block: BlockT) => void;
}

/**
 * One-off broadcast: audience segment + the LIVE-FIRE Send. Sending starts
 * the broadcast to every matched contact immediately, so it sits behind an
 * explicit confirm and is offered only in Draft
 * (WhatsAppOneTimeBroadcastAlreadyStarted afterwards).
 */
export function OneTimeNotificationEditor({ element, onBlock }: OneTimeNotificationEditorProps) {
  const { run, runAction, actionError } = useBlockMutation(onBlock);
  const [confirming, setConfirming] = useState(false);
  const errorFilterIds = useMemo(() => segmentErrorFilterIds(element.segmentErrors), [element.segmentErrors]);

  const statusTone =
    element.status === BroadcastStatus.Live
      ? 'success'
      : element.status === BroadcastStatus.Draft
        ? 'neutral'
        : 'accent';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <Tag tone={statusTone}>{element.status}</Tag>
        {(element.sentToContactsCount ?? 0) > 0 ? (
          <span className="text-xs text-text-muted">sent to {element.sentToContactsCount}</span>
        ) : null}
      </div>
      <SegmentEditor
        segment={element.segment}
        platform={element.platform}
        errorFilterIds={errorFilterIds}
        onSave={(request) => run(SetOneTimeNotificationSegmentDocument, { elementID: element.id, request }, pickBlock)}
      />
      {element.status === BroadcastStatus.Draft ? (
        <div className="border-t border-border pt-3">
          <Button size="sm" onClick={() => setConfirming(true)}>
            Send broadcast…
          </Button>
        </div>
      ) : null}
      {actionError ? <p className="text-xs text-danger">{actionError}</p> : null}
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Send this broadcast?"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setConfirming(false);
                void runAction(SendOneTimeNotificationDocument, { elementID: element.id }, pickBlock);
              }}
            >
              Send now
            </Button>
          </>
        }
      >
        <p className="text-sm text-text">
          This immediately sends the message to every contact the audience matches. It cannot be paused or undone once
          started.
        </p>
      </Dialog>
    </div>
  );
}
