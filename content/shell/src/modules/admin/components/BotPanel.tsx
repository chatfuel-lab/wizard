import { useState } from 'react';
import { Alert, Button, ConfirmDialog, Drawer, Field, IconExternal, IconTrash, Separator, Spinner, Tag } from '~ui';
import { errorCode, errorMessage } from '../lib/adminErrors';
import type { AdminBotDetail } from '../types';

export interface BotPanelProps {
  open: boolean;
  botId: string | null;
  detail: AdminBotDetail | null;
  busy: boolean;
  onClose: () => void;
  onRename: (botId: string, name: string) => Promise<void>;
  onDelete: (botId: string, force: boolean) => Promise<void>;
  /** Absent in an embed, where there is no app around this module to re-point. */
  onOpenBot?: (botId: string, workspaceId?: string) => void;
}

/**
 * `ContactScope` is an interface carrying nothing but an id, so the concrete
 * type name is the only thing that says which channel this is. The names are
 * the schema's — a guess at them shows a reader
 * `WhatsAppPhoneContactScope`.
 */
const CHANNEL_LABELS: Record<string, string> = {
  FacebookContactScope: 'Facebook',
  InstagramAccountContactScope: 'Instagram',
  WhatsAppPhoneContactScope: 'WhatsApp',
  WebWidgetContactScope: 'Web widget',
  TikTokAccountContactScope: 'TikTok',
};

/** An unmapped type name is shown as itself, minus the suffix every one of them carries. */
const channelLabel = (typename: string): string => CHANNEL_LABELS[typename] ?? typename.replace(/ContactScope$/, '');

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-4 py-1.5">
    <span className="shrink-0 text-label text-text-muted">{label}</span>
    <span className="min-w-0 truncate text-body text-text">{children}</span>
  </div>
);

/**
 * One bot, in full.
 *
 * The delete below asks twice on purpose, and the second ask is the server's
 * doing rather than this panel's: a last-bot delete is refused with
 * `WorkspaceGoesWithIt` the first time, that sentence is what the dialog then
 * shows, and only a second confirm sends `force`. The workspace this deployment
 * is built on is refused both times, and no button here can get past it.
 */
export function BotPanel({ open, botId, detail, busy, onClose, onRename, onDelete, onOpenBot }: BotPanelProps) {
  const [confirming, setConfirming] = useState(false);
  const [force, setForce] = useState(false);

  const close = () => {
    setConfirming(false);
    setForce(false);
    onClose();
  };

  const remove = async () => {
    if (!botId) return;
    try {
      await onDelete(botId, force);
      setConfirming(false);
      setForce(false);
      onClose();
    } catch (err) {
      /* One more click sends it — the sentence beside the button is the one the
         server just wrote, so the second ask states what the first one cost. */
      if (errorCode(err) === 'WorkspaceGoesWithIt') setForce(true);
      throw err;
    }
  };

  return (
    <Drawer
      open={open}
      onClose={close}
      title={detail?.title || botId || 'Bot'}
      size="md"
      meta={
        detail ? (
          <Tag tone={detail.isReady ? 'success' : 'warning'}>{detail.isReady ? 'Ready' : 'Setting up'}</Tag>
        ) : null
      }
      footer={
        botId ? (
          <div className="flex items-center justify-between gap-2">
            {onOpenBot ? (
              <Button variant="secondary" onClick={() => onOpenBot(botId, detail?.workspace?.id)}>
                <IconExternal />
                Open
              </Button>
            ) : (
              <span />
            )}
            <Button variant="dangerGhost" loading={busy} onClick={() => setConfirming(true)}>
              <IconTrash />
              Delete
            </Button>
          </div>
        ) : null
      }
    >
      {!detail ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Field
            label="Name"
            value={detail.title}
            onSave={(next) => onRename(detail.id, next)}
            validate={(value) => (value.trim() ? null : 'A name is required')}
          />

          <div>
            <Row label="Bot id">
              <code className="text-meta">{detail.id}</code>
            </Row>
            <Row label="Workspace">{detail.workspace?.title || detail.workspace?.id || '—'}</Row>
            <Row label="Created">{detail.createdAt ? new Date(detail.createdAt).toLocaleDateString() : '—'}</Row>
            <Row label="Time zone">{detail.timezone ?? '—'}</Row>
            <Row label="Country">{detail.countryCode ?? '—'}</Row>
            <Row label="Industry">
              {detail.industry
                ? [detail.industry.category, detail.industry.subCategory].filter(Boolean).join(' · ')
                : '—'}
            </Row>
          </div>

          <Separator />
          <section>
            <h3 className="pb-2 text-label text-text-muted">Channels</h3>
            {detail.contactScopes.length === 0 ? (
              <p className="text-body text-text-muted">None connected</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {detail.contactScopes.map((scope) => (
                  <Tag key={scope.id}>{channelLabel(scope.__typename)}</Tag>
                ))}
              </div>
            )}
          </section>

          <Separator />
          <section>
            <h3 className="pb-2 text-label text-text-muted">Chatfuel team</h3>
            {detail.members.length === 0 ? (
              <p className="text-body text-text-muted">Nobody</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {detail.members.map((member) => (
                  <li key={member.id} className="flex items-center justify-between gap-2">
                    <span className="truncate text-body text-text">
                      {member.user.isUnknown ? 'Deleted account' : member.user.name}
                    </span>
                    <Tag>{member.role.roleTypeV2}</Tag>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {detail.role ? (
            <>
              <Separator />
              <section>
                <h3 className="pb-2 text-label text-text-muted">This token’s permissions</h3>
                <div className="flex flex-wrap gap-1">
                  <Tag tone="accent">{detail.role.roleTypeV2}</Tag>
                  {detail.role.botPermissions.map((permission) => (
                    <Tag key={`${permission.object}:${permission.action}`}>
                      {permission.object} · {permission.action}
                    </Tag>
                  ))}
                </div>
              </section>
            </>
          ) : null}

          {!detail.isReady ? <Alert tone="info">Chatfuel is still creating this bot.</Alert> : null}
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Delete ${detail?.title || botId || 'this bot'}?`}
        confirmLabel={force ? 'Delete it and the workspace' : 'Delete'}
        tone="danger"
        onConfirm={remove}
        errorMessage={errorMessage}
      >
        Its flows, contacts and conversations go with it. This cannot be undone.
      </ConfirmDialog>
    </Drawer>
  );
}
