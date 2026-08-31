import { useEffect, useState } from 'react';
import { Alert, Button, Card, ConfirmDialog, IconCheck, IconLink, IconRefresh, Progress, Tag } from '~ui';
import { TaskStatusType } from '~api/generated/bookings/graphql';
import { useGoogleCalendarSync } from '../../hooks/useGoogleCalendarSync';
import type { LinkInfo, StaffMutations } from '../../hooks/useStaffMutations';
import { specialistName } from '../../lib/catalogStore';
import { errorMessage } from '../../lib/errors';
import type { SpecialistRecord } from '../../types';
import { CopyButton } from './CopyButton';

export interface GoogleCalendarSectionProps {
  record: SpecialistRecord;
  readOnly: boolean;
  mutations: StaffMutations;
  /** The display zone for "last synced" times. */
  zone: string;
}

const HOSTED_NOTE =
  'Google sign-in happens on Chatfuel’s own page, not here: this workspace creates the connection link, the specialist opens it in the Chatfuel dashboard and grants calendar access there. Once connected, syncs and disconnects are managed from this section.';

function formatInstant(iso: string | null, zone: string): string | null {
  if (!iso) return null;
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return null;
  try {
    return new Intl.DateTimeFormat(undefined, { timeZone: zone, dateStyle: 'medium', timeStyle: 'short' }).format(at);
  } catch {
    return new Date(at).toLocaleString();
  }
}

/**
 * Three states, one card: connected (summary · last sync · Sync now ·
 * Disconnect), link out (id · Copy · Verify · Delete link), or nothing
 * (Create connection link). The sync task streams through
 * `useGoogleCalendarSync`; the in-progress / not-connected / rate-limited
 * refusals land under the button, mapped.
 */
export function GoogleCalendarSection({ record, readOnly, mutations, zone }: GoogleCalendarSectionProps) {
  const sync = useGoogleCalendarSync(record);
  const [busy, setBusy] = useState<'link' | 'verify' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [info, setInfo] = useState<LinkInfo | null>(null);
  const [confirm, setConfirm] = useState<'disconnect' | 'deleteLink' | null>(null);

  const calendar = record.connectedGoogleCalendar ?? null;
  const link = record.googleCalendarConnectionLink ?? null;

  // A verified link's info belongs to that link; a new or deleted link drops it.
  useEffect(() => {
    setInfo(null);
    setActionError(null);
  }, [link?.id, record.id]);

  const createLink = async () => {
    setBusy('link');
    setActionError(null);
    try {
      await mutations.createLink(record);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const verify = async () => {
    if (!link) return;
    setBusy('verify');
    setActionError(null);
    try {
      setInfo(await mutations.linkInfo(link.id));
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const view = sync.view;
  const lastSynced = view?.terminal ? formatInstant(view.finishedAt, zone) : null;

  return (
    <Card
      title="Google Calendar"
      description="Two-way: the specialist's Google events block their availability, and bookings appear on their calendar."
      actions={
        calendar ? (
          <Tag tone="success">Connected</Tag>
        ) : link ? (
          <Tag tone="warning">Link sent</Tag>
        ) : (
          <Tag>Not connected</Tag>
        )
      }
    >
      <div className="flex flex-col gap-3">
        {calendar ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm text-text">
              <IconCheck size={16} className="text-success" />
              <span className="font-medium">{calendar.summary}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-muted">
                <span>{view ? view.label : 'Never synced'}</span>
                {lastSynced ? <span className="text-text-faint">· {lastSynced}</span> : null}
                {view?.synced !== null && view?.synced !== undefined && view.running ? (
                  <span className="text-text-faint">· {view.synced} so far</span>
                ) : null}
              </div>
              {view?.running ? (
                view.status === TaskStatusType.Created ? (
                  <Progress label="Sync progress" size="sm" />
                ) : (
                  <Progress label="Sync progress" value={view.percent} size="sm" />
                )
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={readOnly || !sync.canStart}
                loading={sync.starting}
                onClick={() => void sync.start()}
              >
                <IconRefresh size={14} /> Sync now
              </Button>
              <Button variant="dangerGhost" size="sm" disabled={readOnly} onClick={() => setConfirm('disconnect')}>
                Disconnect
              </Button>
            </div>
            {sync.error ? <Alert tone="danger">{sync.error}</Alert> : null}
          </>
        ) : link ? (
          <>
            <p className="text-sm text-text">
              A connection link is out — created by <span className="font-medium">{link.createdBy.name}</span>. The
              calendar shows here once {specialistName(record.profile)} has finished connecting it.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-chip bg-surface-sunken px-2 py-1 font-mono text-xs text-text">{link.id}</code>
              <CopyButton value={link.id} label="Copy link id" />
            </div>
            {info ? (
              <Alert tone="info" title="Link verified">
                For {info.specialistName} at {info.botTitle}, created by {info.createdBy.name}.
              </Alert>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                loading={busy === 'verify'}
                disabled={busy !== null}
                onClick={() => void verify()}
              >
                Verify
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={readOnly || !sync.canStart}
                loading={sync.starting}
                onClick={() => void sync.start()}
              >
                <IconRefresh size={14} /> Sync now
              </Button>
              <Button
                variant="dangerGhost"
                size="sm"
                disabled={readOnly || busy !== null}
                onClick={() => setConfirm('deleteLink')}
              >
                Delete link
              </Button>
            </div>
            {sync.error ? <Alert tone="danger">{sync.error}</Alert> : null}
            <p className="text-xs text-text-muted">
              {HOSTED_NOTE} “Sync now” works once the specialist has connected — until then it answers that no calendar
              is connected, which is also how to check.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-text-muted">
              No calendar connected. Create a connection link and hand it to {specialistName(record.profile)}.
            </p>
            <div>
              <Button
                variant="secondary"
                size="sm"
                disabled={readOnly || busy !== null}
                loading={busy === 'link'}
                onClick={() => void createLink()}
              >
                <IconLink size={14} /> Create connection link
              </Button>
            </div>
            <p className="text-xs text-text-muted">{HOSTED_NOTE}</p>
          </>
        )}
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}
      </div>

      <ConfirmDialog
        open={confirm === 'disconnect'}
        onClose={() => setConfirm(null)}
        title="Disconnect Google Calendar?"
        confirmLabel="Disconnect"
        onConfirm={async () => {
          try {
            await mutations.disconnectCalendar(record);
          } catch (err) {
            throw new Error(errorMessage(err), { cause: err });
          }
        }}
      >
        <p>
          {calendar?.summary} will stop syncing with {specialistName(record.profile)}'s bookings. Google events already
          imported stay on the calendar until they are deleted.
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === 'deleteLink'}
        onClose={() => setConfirm(null)}
        title="Delete the connection link?"
        confirmLabel="Delete link"
        onConfirm={async () => {
          try {
            await mutations.deleteLink(record);
          } catch (err) {
            throw new Error(errorMessage(err), { cause: err });
          }
        }}
      >
        <p>The link stops working. You can create a new one at any time.</p>
      </ConfirmDialog>
    </Card>
  );
}
