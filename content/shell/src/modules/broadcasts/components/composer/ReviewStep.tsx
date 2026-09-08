import { useEffect, useMemo } from 'react';
import { Alert, Button, Tag } from '~ui';
import { BroadcastAudienceCountDocument } from '~api/generated/broadcasts/graphql';
import { useBroadcasts } from '../../BroadcastsContext';
import type { ComposerStep } from '../../lib/broadcastsParams';
import { KIND_LABELS, type CampaignRecord } from '../../lib/campaign';
import { STEP_LABELS, verdictsByStep } from '../../lib/composerSteps';
import { segmentToInput } from '../../lib/duplicate';
import { formatCount, formatInstant } from '../../lib/format';
import { describeRepeat } from '../../lib/schedule';
import { componentsOfConfig, templatePreview } from '../../lib/templatePreview';
import type { BotFacts } from '../../types';
import { CampaignStatusBadge } from '../CampaignStatusBadge';
import { AudienceSummary } from '../detail/AudienceSummary';
import { PhonePreview } from './PhonePreview';
import { StepFrame } from './StepFrame';

export interface ReviewStepProps {
  record: CampaignRecord;
  zone: string;
  now: number;
  facts: BotFacts | null;
  /** The recipient count the audience step last reported, or null while unknown. */
  count: number | null;
  onCount: (count: number | null) => void;
  onStep: (step: ComposerStep) => void;
  /** The bot has no WhatsApp number connected: nothing can go out. */
  whatsappMissing: boolean;
}

/**
 * The campaign in one column, as it will go: name and kind, the phone, the
 * audience with its count, the schedule, and every standing verdict under
 * the step that fixes it. The count is read here when the audience step has
 * not reported one — the review is reached straight from the list as often
 * as through the steps.
 */
export function ReviewStep({ record, zone, now, facts, count, onCount, onStep, whatsappMissing }: ReviewStepProps) {
  const { client, botId } = useBroadcasts();
  const template = record.payload?.template ?? null;
  const preview = useMemo(() => (template ? templatePreview(componentsOfConfig(template)) : null), [template]);
  const verdicts = useMemo(() => verdictsByStep(record), [record]);

  const segment = record.audience.segment;
  const segmentKey = JSON.stringify(segment);
  useEffect(() => {
    let cancelled = false;
    onCount(null);
    client
      .query(BroadcastAudienceCountDocument, {
        botID: botId,
        segment: segmentToInput(segment, `broadcasts/${record.flowId}/count`),
      })
      .then((data) => {
        if (!cancelled) onCount(data.bot.contactsTotalCount);
      })
      .catch(() => {
        if (!cancelled) onCount(null);
      });
    return () => {
      cancelled = true;
    };
    // The segment's content is the key; its object identity moves on every flow read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, botId, record.flowId, segmentKey]);

  const when =
    record.status === 'sent'
      ? 'Sent'
      : record.isOneTime
        ? 'On confirm'
        : record.schedule
          ? `${formatInstant(record.schedule.at, zone, now)}${record.kind === 'recurring' ? ` · ${describeRepeat(record.schedule, zone)}` : ''}`
          : '—';

  return (
    <StepFrame
      title="Review"
      aside={<PhonePreview preview={preview} number={facts?.whatsapp?.displayPhoneNumber ?? null} />}
    >
      <div className="space-y-5">
        {whatsappMissing ? <Alert tone="danger">No WhatsApp number is connected to this bot.</Alert> : null}

        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-body">
          <dt className="text-text-muted">Campaign</dt>
          <dd className="flex flex-wrap items-center gap-2 text-text">
            <span className="font-medium">{record.name}</span>
            <CampaignStatusBadge status={record.status} />
          </dd>
          <dt className="text-text-muted">When</dt>
          <dd className="text-text">
            <Tag tone="accent">{KIND_LABELS[record.kind]}</Tag>
            <span className="ml-2">{when}</span>
          </dd>
          <dt className="text-text-muted">Message</dt>
          <dd className="text-text">{template ? template.name : '—'}</dd>
          <dt className="text-text-muted">Audience</dt>
          <dd className="text-text">
            <AudienceSummary segment={segment} />
          </dd>
          <dt className="text-text-muted">Recipients</dt>
          <dd className="text-text tabular-nums">
            {record.status === 'sent' ? formatCount(record.sentToContactsCount) : formatCount(count)}
          </dd>
        </dl>

        {verdicts.length > 0 ? (
          <ul className="space-y-2 rounded-card border border-warning/40 bg-warning/10 px-3 py-2 text-body text-text">
            {verdicts.map((group) => (
              <li key={group.step ?? 'campaign'} className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  {group.sentences.map((sentence) => (
                    <p key={sentence}>{sentence}</p>
                  ))}
                </div>
                {group.step ? (
                  <Button size="xs" variant="outline" onClick={() => onStep(group.step as ComposerStep)}>
                    {STEP_LABELS[group.step]}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </StepFrame>
  );
}
