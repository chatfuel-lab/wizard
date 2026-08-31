import { useState } from 'react';
import { Button, Dialog, FormField, Input, Select } from '~ui';
import { errorMessageFor } from '~api';
import { Platform } from '~api/generated/flow-builder/graphql';
import { NEW_FLOW_PLATFORMS } from '../lib/flowList';
import { PLATFORM_LABELS } from './PlatformGlyph';

export interface NewFlowDialogProps {
  open: boolean;
  onClose: () => void;
  /** Answers the new flow's id, or null when the server made nothing. */
  onCreate: (platform: Platform, name: string) => Promise<string | null>;
  /** Called with the new flow's id once it exists. */
  onCreated: (flowId: string) => void;
}

/**
 * Name it and choose its channel, then create.
 *
 * The channel is asked for because `createFlow` requires it and nothing can
 * change it afterwards — a flow belongs to one channel for its whole life. The
 * name is asked for because the server names a new flow itself, and a bot with
 * four flows called the same thing is what happens otherwise.
 */
export function NewFlowDialog({ open, onClose, onCreate, onCreated }: NewFlowDialogProps) {
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<Platform>(NEW_FLOW_PLATFORMS[0] ?? Platform.Whatsapp);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setName('');
    setError(null);
    onClose();
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const flowId = await onCreate(platform, name);
      if (!flowId) {
        setError('The flow was not created.');
        return;
      }
      setName('');
      onClose();
      onCreated(flowId);
    } catch (err) {
      setError(errorMessageFor(err, {}));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="New flow"
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" loading={busy} onClick={() => void submit()}>
            Create
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <FormField label="Name" error={error}>
          {(a11y) => (
            <Input
              {...a11y}
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || busy) return;
                event.preventDefault();
                void submit();
              }}
              placeholder="Welcome"
              disabled={busy}
              autoFocus
            />
          )}
        </FormField>

        <FormField label="Channel">
          {(a11y) => (
            <Select
              {...a11y}
              value={platform}
              onChange={(value) => setPlatform(value as Platform)}
              options={NEW_FLOW_PLATFORMS.map((value) => ({ value, label: PLATFORM_LABELS[value] ?? value }))}
              disabled={busy}
            />
          )}
        </FormField>
      </div>
    </Dialog>
  );
}
