import { useMemo } from 'react';
import { Button, IconEye, IconSend, IconStop } from '~ui';
import { KIND_LABELS, templateNameOf, type CampaignRecord } from '../../lib/campaign';
import { problemText } from '../../lib/errors';
import { formatCount, formatInstant } from '../../lib/format';
import { describeRepeat } from '../../lib/schedule';
import { componentsOfConfig, templatePreview } from '../../lib/templatePreview';
import { CampaignStatusBadge } from '../CampaignStatusBadge';
import { TemplatePreviewCard } from '../TemplatePreviewCard';
import { AudienceSummary } from './AudienceSummary';

export interface CampaignDetailProps {
  record: CampaignRecord;
  zone: string;
  now: number;
  canEdit: boolean;
  busy: boolean;
  onEdit: () => void;
  /** Send now, for a one-time draft. Confirmed by the caller. */
  onSend: () => void;
  /** Arm a scheduled draft. */
  onSchedule: () => void;
  onUnschedule: () => void;
}

/**
 * One campaign, beside the list: what it says, who gets it, when, and the
 * one or two things it can still be asked to do. Read-only; changing any of
 * it is the composer's job, reached by Edit. The host draws the title bar and
 * the close; this is the body, and it pads itself.
 */
export function CampaignDetail({
  record,
  zone,
  now,
  canEdit,
  busy,
  onEdit,
  onSend,
  onSchedule,
  onUnschedule,
}: CampaignDetailProps) {
  const template = record.payload?.template ?? null;
  const preview = useMemo(() => (template ? templatePreview(componentsOfConfig(template)) : null), [template]);
  const ready = record.problems.length === 0 && record.audience.errors.length === 0 && template !== null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-start gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-body font-semibold text-text">{record.name}</h2>
            <CampaignStatusBadge status={record.status} />
          </div>
          <p className="mt-0.5 text-meta text-text-muted">
            {record.kind === 'recurring' && record.schedule
              ? describeRepeat(record.schedule, zone)
              : KIND_LABELS[record.kind]}
            {templateNameOf(record) ? ` · ${templateNameOf(record)}` : ''}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-text-muted">
            {record.status === 'sent' ? 'Sent' : record.nextRunAt !== null ? 'Next send' : 'Send time'}
          </dt>
          <dd className="text-text">
            {record.nextRunAt !== null
              ? formatInstant(record.nextRunAt, zone, now)
              : record.schedule
                ? formatInstant(record.schedule.at, zone, now)
                : record.status === 'draft'
                  ? 'When sent'
                  : '—'}
          </dd>
          {record.kind === 'recurring' && record.schedule ? (
            <>
              <dt className="text-text-muted">Repeats</dt>
              <dd className="text-text">{describeRepeat(record.schedule, zone)}</dd>
            </>
          ) : null}
          <dt className="text-text-muted">Recipients</dt>
          <dd className="text-text tabular-nums">{formatCount(record.sentToContactsCount)}</dd>
        </dl>

        {record.problems.length > 0 ? (
          <ul className="space-y-1 rounded-card border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-text">
            {record.problems.map((problem, index) => (
              <li key={`${problem.code}:${index}`}>{problemText(problem.code, problem.paramName)}</li>
            ))}
          </ul>
        ) : null}

        <section>
          <h3 className="mb-2 text-micro font-semibold uppercase tracking-wide text-text-faint">Message</h3>
          {preview ? (
            <div className="flex justify-end">
              <div className="max-w-[92%]">
                <TemplatePreviewCard preview={preview} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-muted">No template picked</p>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-micro font-semibold uppercase tracking-wide text-text-faint">Audience</h3>
          <AudienceSummary segment={record.audience.segment} />
        </section>
      </div>

      {canEdit ? (
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-4 py-3">
          {record.status === 'draft' || record.status === 'scheduled' ? (
            <Button variant="secondary" size="sm" onClick={onEdit} disabled={busy}>
              <IconEye />
              {record.status === 'scheduled' ? 'Review' : 'Edit'}
            </Button>
          ) : null}
          {record.status === 'scheduled' ? (
            <Button variant="outline" size="sm" onClick={onUnschedule} loading={busy}>
              <IconStop />
              Take off the schedule
            </Button>
          ) : null}
          {record.status === 'draft' && record.isOneTime ? (
            <Button variant="primary" size="sm" onClick={onSend} disabled={!ready} loading={busy}>
              <IconSend />
              Send now
            </Button>
          ) : null}
          {record.status === 'draft' && !record.isOneTime ? (
            <Button variant="primary" size="sm" onClick={onSchedule} disabled={!ready} loading={busy}>
              <IconSend />
              Schedule
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
