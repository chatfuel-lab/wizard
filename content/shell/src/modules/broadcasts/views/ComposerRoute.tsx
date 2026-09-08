import { useEffect, useRef, useState } from 'react';
import { Button, EmptyState, IconChevronLeft, IconMegaphone, Spinner } from '~ui';
import { useCampaigns } from '../BroadcastsCampaignsContext';
import { ComposerView } from '../components/composer/ComposerView';
import type { ComposerRouteProps } from './types';

/**
 * The composer over one draft, named by the address. The list usually holds
 * the flow already; when it does not — a link opened cold, a copy just made —
 * the flow is read once. A flow that is gone, or is somebody's chatbot flow
 * rather than a campaign, shows the way back.
 *
 * A duplicate made from here moves the composer onto the copy by rewriting
 * the address, so a reload lands on the copy too.
 */
export function ComposerRoute({
  flowId,
  step,
  onStep,
  onClose,
  onCompose,
  band,
  role,
  bot,
  zone,
  now,
  onConnectWhatsApp,
}: ComposerRouteProps) {
  const store = useCampaigns();
  const activeFlowId = flowId;

  const record = store.campaigns.find((candidate) => candidate.flowId === activeFlowId) ?? null;
  const listReady = store.state.list.state !== 'loading';

  /* One read for a flow the list does not hold, per flow id. The store
     drops a flow that is not a campaign at the door, so a read that answers
     a flow and still no record means "not a campaign". */
  const [probe, setProbe] = useState<'reading' | 'gone' | 'notCampaign'>('reading');
  const askedFor = useRef<string | null>(null);
  useEffect(() => {
    if (record || !listReady || askedFor.current === activeFlowId) return;
    askedFor.current = activeFlowId;
    let cancelled = false;
    setProbe('reading');
    void store.refetchFlow(activeFlowId).then((flow) => {
      if (!cancelled) setProbe(flow ? 'notCampaign' : 'gone');
    });
    return () => {
      cancelled = true;
    };
    // The store is stable for a mount; the flow id is the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFlowId, record, listReady]);

  if (!record) {
    const settled = listReady && askedFor.current === activeFlowId && probe !== 'reading';
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-gutter py-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <IconChevronLeft />
            Campaigns
          </Button>
        </div>
        {settled ? (
          <EmptyState
            icon={<IconMegaphone />}
            title={probe === 'gone' ? 'This campaign is not on the bot' : 'This flow is not a campaign'}
            action={
              <Button variant="secondary" onClick={onClose}>
                <IconChevronLeft />
                Campaigns
              </Button>
            }
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <Spinner />
          </div>
        )}
      </div>
    );
  }

  return (
    <ComposerView
      record={record}
      step={step}
      onStep={onStep}
      onClose={onClose}
      onDuplicated={(copyId) => onCompose(copyId, 'review')}
      onConnectWhatsApp={onConnectWhatsApp}
      band={band}
      role={role}
      bot={bot}
      zone={zone}
      now={now}
    />
  );
}
