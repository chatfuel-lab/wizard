import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Command, Dialog, IconFlow, Kbd, Spinner, type CommandGroup } from '~ui';
import type { Platform } from '~api/generated/livechat/graphql';
import { useInboxFlows } from '../hooks/useInboxFlows';
import { messageOf } from '../lib/errors';
import { flowOptions, type FlowOption } from '../lib/flowPicker';
import { PLATFORM_LABEL } from '../lib/platform';

export interface FlowPickerProps {
  open: boolean;
  onClose: () => void;
  platform: Platform;
  /** Who is being handed to the bot — the confirmation names them. */
  contactName: string;
  /** Rejects on failure; the confirmation shows why and stays open. */
  onPick: (flow: FlowOption) => Promise<void>;
}

/**
 * Close-to-flow: pick a flow, confirm, and the conversation is closed.
 *
 * Two steps because they answer two different questions. The picker is a
 * `Command` — searchable, keyboard-first, opened by `e` or from ⌘K with no
 * anchor to hang a popover on — and choosing a flow in it is cheap and
 * reversible. The confirmation is a `Dialog`, because what it does is not:
 * there is no plain "close" in this API, handing the contact to a flow IS the
 * close, and the bot starts talking to them the moment the button is pressed.
 * A picker whose Enter did that with no second look would be a picker people
 * learn to fear.
 *
 * The flows are filtered by the conversation's platform before they reach the
 * palette (`lib/flowPicker.ts`), so an Instagram flow is never offered for a
 * WhatsApp chat — the fragment comment on `InboxFlowListItem` is the reason.
 */
export function FlowPicker({ open, onClose, platform, contactName, onPick }: FlowPickerProps) {
  const flows = useInboxFlows(open);
  const [pending, setPending] = useState<FlowOption | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* `Command` closes itself BEFORE it runs the chosen item — `onClose()` then
     `onSelect()`, in that order, in one event. So its close cannot be taken as
     "the operator is done" on the spot: at that instant nothing has been
     chosen yet. It is recorded here and read on the next render, by which
     time both updates have landed together and `pending` says which of the
     two things happened — a choice, or an Escape. */
  const [listDismissed, setListDismissed] = useState(false);

  const options = useMemo(() => flowOptions(flows.data, platform), [flows.data, platform]);

  useEffect(() => {
    if (!listDismissed) return;
    setListDismissed(false);
    if (pending === null) onClose();
  }, [listDismissed, pending, onClose]);

  /* Closed from outside — a conversation switch, the parent's own Escape —
     forgets the half-made choice; the next open starts at the list. */
  useEffect(() => {
    if (open) return;
    setPending(null);
    setError(null);
  }, [open]);

  /* Ungrouped flows first under a plain heading, then one group per flow
     group — the same buckets the API keeps them in, so the picker reads the
     way the flow builder does. */
  const groups = useMemo<CommandGroup[]>(() => {
    const byGroup = new Map<string | null, FlowOption[]>();
    for (const option of options) {
      const bucket = byGroup.get(option.group) ?? [];
      bucket.push(option);
      byGroup.set(option.group, bucket);
    }
    return [...byGroup.entries()].map(([group, entries]) => ({
      id: group ?? '__ungrouped',
      label: group ?? 'Flows',
      items: entries.map((flow) => ({
        id: flow.id,
        label: flow.name,
        description: flow.group ?? undefined,
        keywords: flow.group ? [flow.group] : [],
        icon: <IconFlow size={14} />,
        onSelect: () => {
          setError(null);
          setPending(flow);
        },
      })),
    }));
  }, [options]);

  const empty = flows.loading ? (
    <span className="inline-flex items-center gap-2">
      <Spinner size={14} /> Loading flows…
    </span>
  ) : flows.error ? (
    `Could not load the flows: ${flows.error}`
  ) : options.length === 0 ? (
    `No ${PLATFORM_LABEL[platform]} flows yet — create one in the flow builder first.`
  ) : (
    'No matching flow'
  );

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      await onPick(pending);
      setPending(null);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  /* The dialog animates out after `pending` is cleared, and for those frames
     it still has to name a flow rather than fade with a hole in its sentence. */
  const shownRef = useRef<FlowOption | null>(null);
  if (pending) shownRef.current = pending;
  const shown = pending ?? shownRef.current;

  return (
    <>
      <Command
        open={open && pending === null}
        onClose={() => setListDismissed(true)}
        groups={groups}
        placeholder="Hand the conversation to a flow…"
        empty={empty}
        footer={
          <>
            <span className="flex items-center gap-1">
              <Kbd keys={['up']} />
              <Kbd keys={['down']} /> choose
            </span>
            <span className="flex items-center gap-1">
              <Kbd keys={['enter']} /> next
            </span>
            <span className="flex items-center gap-1">
              <Kbd keys={['esc']} /> cancel
            </span>
          </>
        }
      />

      <Dialog
        open={pending !== null}
        onClose={() => {
          if (busy) return;
          setPending(null);
          onClose();
        }}
        title="Close the conversation"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)} disabled={busy}>
              Back
            </Button>
            <Button onClick={() => void confirm()} disabled={busy}>
              {busy ? <Spinner size={14} /> : null}
              {busy ? 'Closing…' : 'Close and hand over'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-text">
            The conversation with <span className="font-medium">{contactName}</span> closes and the bot runs{' '}
            <span className="font-medium">{shown?.name}</span>
            {shown?.group ? <span className="text-text-muted"> ({shown.group})</span> : null} for them.
          </p>
          <p className="text-xs text-text-muted">
            There is no separate close: handing the contact to a flow is what closes a live chat.
          </p>
          {error ? (
            <Alert tone="danger" title="Could not close the conversation">
              {error}
            </Alert>
          ) : null}
        </div>
      </Dialog>
    </>
  );
}
