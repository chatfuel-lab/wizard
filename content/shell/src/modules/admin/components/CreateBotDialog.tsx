import { useEffect, useState } from 'react';
import { Alert, Button, Dialog, FormField, Input, Select } from '~ui';
import { errorMessage } from '../lib/adminErrors';
import type { AdminTenant, AdminWorkspaceRef } from '../types';

export interface CreateBotDialogProps {
  open: boolean;
  onClose: () => void;
  workspaces: readonly AdminWorkspaceRef[];
  /** Where the rail is pointing — the workspace somebody most likely means. */
  defaultWorkspaceId: string | null;
  /** Null where this deployment has no database: there is nobody to give it to. */
  tenants: readonly AdminTenant[] | null;
  onCreate: (input: { workspaceId: string; name: string; tenantId: string | null }) => Promise<void>;
}

/**
 * A new bot, in a chosen Chatfuel workspace and — where the app has accounts of
 * its own — handed to one of them on the way in.
 *
 * The workspace is a choice rather than a fixed value because the account has
 * more than one and they bill separately. A workspace with no room left is
 * offered and refused by the server rather than hidden here: hiding it turns a
 * plan that is full into a workspace that has disappeared.
 */
export function CreateBotDialog({
  open,
  onClose,
  workspaces,
  defaultWorkspaceId,
  tenants,
  onCreate,
}: CreateBotDialogProps) {
  const [name, setName] = useState('');
  const [workspaceId, setWorkspaceId] = useState(defaultWorkspaceId ?? workspaces[0]?.id ?? '');
  const [tenantId, setTenantId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /* Reopening on another workspace must not keep the last one's choice. */
  useEffect(() => {
    if (open) setWorkspaceId(defaultWorkspaceId ?? workspaces[0]?.id ?? '');
  }, [open, defaultWorkspaceId, workspaces]);

  const submit = async () => {
    if (!name.trim() || !workspaceId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onCreate({ workspaceId, name: name.trim(), tenantId: tenantId || null });
      setName('');
      setTenantId('');
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
      title="New bot"
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={busy} disabled={!name.trim() || !workspaceId} onClick={submit}>
            Create
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <FormField label="Name">
          {(a11y) => (
            <Input
              {...a11y}
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void submit();
              }}
              autoFocus
            />
          )}
        </FormField>

        <FormField label="Workspace">
          {(a11y) => (
            <Select
              {...a11y}
              value={workspaceId}
              onChange={setWorkspaceId}
              options={workspaces.map((workspace) => ({
                value: workspace.id,
                label: `${workspace.title || workspace.id} · ${workspace.bots.length}/${workspace.botsLimit}`,
              }))}
            />
          )}
        </FormField>

        {tenants ? (
          <FormField label="Give it to">
            {(a11y) => (
              <Select
                {...a11y}
                value={tenantId}
                onChange={setTenantId}
                placeholder="Nobody yet"
                options={tenants.map((tenant) => ({ value: tenant.id, label: tenant.name }))}
              />
            )}
          </FormField>
        ) : null}

        {error ? <Alert tone="danger">{error}</Alert> : null}
      </div>
    </Dialog>
  );
}
