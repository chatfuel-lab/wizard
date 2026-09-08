import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, ConfirmDialog, EmptyState, IconMegaphone, InspectorHost, useToast } from '~ui';
import { useCampaigns } from '../BroadcastsCampaignsContext';
import { CampaignFilters } from '../components/campaigns/CampaignFilters';
import { CampaignsTable } from '../components/campaigns/CampaignsTable';
import type { CampaignActions } from '../components/campaigns/CampaignRowMenu';
import { CampaignDetail } from '../components/detail/CampaignDetail';
import { NoWhatsApp } from '../components/NoWhatsApp';
import { useDuplicate } from '../hooks/useDuplicate';
import type { CampaignRecord } from '../lib/campaign';
import { visibleCampaigns } from '../lib/campaignRows';
import { errorMessage } from '../lib/errors';
import { formatCount } from '../lib/format';
import type { BroadcastsViewProps } from './types';

type Confirm =
  | { kind: 'send'; record: CampaignRecord }
  | { kind: 'delete'; record: CampaignRecord }
  | { kind: 'unschedule'; record: CampaignRecord }
  | null;

/**
 * The list and, beside it, the campaign the address names. The panel is an
 * inline column at a wide band and a drawer below it; either way `?c=` is the
 * truth of what is open, so a link to a campaign opens on it.
 */
export function CampaignsView({
  address,
  patch,
  band,
  role,
  zone,
  now,
  onBusy,
  onCompose,
  onNewCampaign,
  bot,
  onConnectWhatsApp,
}: BroadcastsViewProps) {
  const store = useCampaigns();
  const toast = useToast();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const duplicating = useDuplicate(zone, now);

  useEffect(() => {
    onBusy(store.state.refreshing);
  }, [store.state.refreshing, onBusy]);

  const rows = useMemo(
    () => visibleCampaigns(store.campaigns, address.status, address.q),
    [store.campaigns, address.status, address.q],
  );

  const selected = useMemo(
    () => (address.campaign ? (store.campaigns.find((record) => record.flowId === address.campaign) ?? null) : null),
    [store.campaigns, address.campaign],
  );

  const open = useCallback((record: CampaignRecord | null) => patch({ campaign: record?.flowId ?? null }), [patch]);

  const run = useCallback(
    async (work: () => Promise<void>, done?: string) => {
      setFailure(null);
      try {
        await work();
        if (done) toast.show({ title: done, tone: 'success', duration: 4000 });
      } catch (err) {
        setFailure(errorMessage(err));
      }
    },
    [toast],
  );

  /* Duplicate makes the copy here and opens the composer on IT — never on
     the original's review, whose primary is the send. */
  const duplicate = useCallback(
    (record: CampaignRecord) =>
      run(async () => {
        const { flowId, failures } = await duplicating.duplicate(record);
        if (failures.length > 0) setFailure(failures.join(' '));
        onCompose(flowId, 'review');
      }),
    [run, duplicating, onCompose],
  );

  const actions = useMemo<CampaignActions | null>(
    () =>
      role.canEdit
        ? {
            onEdit: (record) => onCompose(record.flowId),
            onUnschedule: (record) => setConfirm({ kind: 'unschedule', record }),
            onDuplicate: (record) => void duplicate(record),
            onDelete: (record) => setConfirm({ kind: 'delete', record }),
          }
        : null,
    [role.canEdit, onCompose, duplicate],
  );

  const schedule = useCallback(
    (record: CampaignRecord) =>
      run(async () => {
        const armed = await store.enable(record);
        if (!armed) {
          await store.refetchFlow(record.flowId);
          throw new Error('Chatfuel did not schedule it — something in the campaign is not complete.');
        }
      }, 'Campaign scheduled'),
    [run, store],
  );

  const busyFor = (record: CampaignRecord | null): boolean =>
    record !== null &&
    (store.isPending(`send:${record.flowId}`) ||
      store.isPending(`enable:${record.flowId}`) ||
      store.isPending(`disable:${record.flowId}`) ||
      store.isPending(`delete:${record.flowId}`));

  const detail = selected ? (
    <CampaignDetail
      record={selected}
      zone={zone}
      now={now}
      canEdit={role.canEdit}
      busy={busyFor(selected)}
      onEdit={() => onCompose(selected.flowId)}
      onSend={() => setConfirm({ kind: 'send', record: selected })}
      onSchedule={() => void schedule(selected)}
      onUnschedule={() => setConfirm({ kind: 'unschedule', record: selected })}
    />
  ) : null;

  const list = (
    <div className="flex h-full min-h-0 flex-col">
      <CampaignFilters
        status={address.status}
        onStatus={(status) => patch({ status })}
        q={address.q}
        onQ={(q) => patch({ q })}
        searchRef={searchRef}
      />
      {failure ? (
        <div className="px-gutter pt-2">
          <Alert tone="danger" onDismiss={() => setFailure(null)}>
            {failure}
          </Alert>
        </div>
      ) : null}
      {store.state.list.state === 'error' ? (
        <div className="p-gutter">
          <Alert
            tone="danger"
            title="The campaigns could not be read"
            action={
              <Button size="sm" onClick={store.refresh}>
                Try again
              </Button>
            }
          >
            {store.state.list.message}
          </Alert>
        </div>
      ) : store.state.list.state === 'ready' && store.campaigns.length === 0 ? (
        <EmptyState
          icon={<IconMegaphone />}
          title="No campaigns yet"
          action={
            role.canEdit ? (
              <Button variant="primary" onClick={onNewCampaign}>
                New campaign
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <CampaignsTable
            rows={rows}
            selectedId={selected?.flowId ?? null}
            onOpen={(record) => open(record.flowId === selected?.flowId ? null : record)}
            zone={zone}
            now={now}
            loading={store.state.list.state === 'loading'}
            actions={actions}
            compact={band === 'compact'}
          />
        </div>
      )}
    </div>
  );

  if (
    bot.state === 'ready' &&
    bot.facts.whatsapp === null &&
    store.state.list.state === 'ready' &&
    store.campaigns.length === 0
  ) {
    return <NoWhatsApp onConnect={onConnectWhatsApp} />;
  }

  return (
    <>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">{list}</div>
        <InspectorHost open={selected !== null} onClose={() => open(null)} title="Campaign">
          {detail}
        </InspectorHost>
      </div>

      <ConfirmDialog
        open={confirm?.kind === 'send'}
        onClose={() => setConfirm(null)}
        title="Send this campaign now?"
        confirmLabel="Send"
        tone="default"
        onConfirm={async () => {
          if (confirm?.kind !== 'send') return;
          const { record } = confirm;
          setConfirm(null);
          await run(() => store.sendNow(record), 'Sending');
        }}
      >
        “{confirm?.record.name}” goes to every contact in its audience the moment you confirm.
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm?.kind === 'unschedule'}
        onClose={() => setConfirm(null)}
        title="Take it off the schedule?"
        confirmLabel="Take off the schedule"
        tone="default"
        onConfirm={async () => {
          if (confirm?.kind !== 'unschedule') return;
          const { record } = confirm;
          setConfirm(null);
          await run(() => store.disable(record), 'Back to draft');
        }}
      >
        “{confirm?.record.name}” becomes a draft again. Schedule it when it is ready.
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm?.kind === 'delete'}
        onClose={() => setConfirm(null)}
        title="Delete this campaign?"
        confirmLabel="Delete"
        onConfirm={async () => {
          if (confirm?.kind !== 'delete') return;
          const { record } = confirm;
          setConfirm(null);
          if (selected?.flowId === record.flowId) open(null);
          await run(() => store.remove(record.flowId), 'Campaign deleted');
        }}
      >
        “{confirm?.record.name}” is deleted for good
        {confirm?.record.status === 'sent' && confirm.record.sentToContactsCount !== null
          ? `, along with its ${formatCount(confirm.record.sentToContactsCount)} recipients count`
          : ''}
        .
      </ConfirmDialog>
    </>
  );
}
