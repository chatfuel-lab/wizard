import type { ReactNode } from 'react';
import { Alert, Avatar, IconWarning, Tag, formatDuration } from '~ui';
import { specialistName } from '../../lib/catalogStore';
import { botTimeLabel, priceLabel, timeSpanLabel, dayLabel, type LabelOptions } from '../../lib/panelForm';
import { resolvedCustomer, wizardDuration, type WizardState } from '../../lib/wizardStore';
import { toZoneIso, wallClock } from '../../lib/zone';
import type { DisplayZone, ServiceRecord, SpecialistRecord } from '../../types';

export interface ConfirmStepProps {
  state: WizardState;
  service: ServiceRecord | null;
  specialist: SpecialistRecord | null;
  zone: DisplayZone;
  todayKey: string;
  labels: LabelOptions;
}

/**
 * Step 6: the summary a person reads before pressing Create — service,
 * specialist (who "anyone" resolved to), the day and time in the display
 * zone and, when it differs, in bot time (that is what the customer is told),
 * duration, price, customer — and the last create error, inline, when there
 * was one. The Create button lives in the wizard footer.
 */
export function ConfirmStep({ state, service, specialist, zone, todayKey, labels }: ConfirmStepProps) {
  const time = state.time;
  const record = time ? { startTime: toZoneIso(time.start, zone.zone), endTime: toZoneIso(time.end, zone.zone) } : null;
  const day = time ? wallClock(time.start, zone.zone).dayKey : null;
  const duration = wizardDuration(state);
  const customer = resolvedCustomer(state);
  const outsideAvailability = time?.source === 'custom';

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-sm">
        <Row label="When">
          {record && day ? (
            <>
              <div className="font-medium text-text">
                {dayLabel(day, { ...labels, todayKey })} · {timeSpanLabel(record, zone.zone, labels)}
              </div>
              {(() => {
                const bot = botTimeLabel(record, zone, labels);
                return bot ? <div className="text-xs text-text-muted">{bot}</div> : null;
              })()}
              {outsideAvailability ? (
                <div className="mt-1 flex items-center gap-1 text-xs text-warning">
                  <IconWarning size={12} /> Custom time — not taken from availability.
                </div>
              ) : null}
            </>
          ) : (
            <span className="text-text-muted">Not chosen</span>
          )}
        </Row>
        <Row label="Duration">
          {duration !== null ? formatDuration(duration) : <span className="text-text-muted">—</span>}
        </Row>
        <Row label="Service">
          {state.service.kind === 'service' ? (
            <>
              <span className="text-text">{service?.title ?? 'Service'}</span>
              {service?.price ? <span className="ml-2 text-text-muted">{priceLabel(service.price)}</span> : null}
            </>
          ) : (
            <span className="text-text-muted">No service</span>
          )}
        </Row>
        <Row label="Specialist">
          {time?.specialistId ? (
            <span className="inline-flex items-center gap-2">
              <Avatar
                src={specialist?.profile.logo?.url ?? undefined}
                name={specialist ? specialistName(specialist.profile) : '?'}
                size={20}
              />
              <span className="text-text">{specialist ? specialistName(specialist.profile) : time.specialistId}</span>
              {state.specialist.kind === 'anyone' ? <Tag>first free</Tag> : null}
            </span>
          ) : (
            <span className="text-text-muted">Unassigned</span>
          )}
        </Row>
        <Row label="Customer">
          {customer.kind === 'existing' ? (
            <span className="inline-flex items-center gap-2">
              <Avatar name={customer.contact.name ?? '?'} size={20} />
              <span className="text-text">{customer.contact.name ?? 'Selected contact'}</span>
              {customer.contact.phone ? (
                <span className="text-text-muted">+{customer.contact.phone.replace(/^\+/, '')}</span>
              ) : null}
            </span>
          ) : customer.kind === 'new' ? (
            <>
              <div className="text-text">
                {customer.draft.name} <span className="text-text-muted">{customer.draft.phone}</span>
              </div>
              <div className="text-xs text-text-muted">
                {customer.draft.createContact
                  ? 'A WhatsApp contact will be created.'
                  : 'Booked as an inline contact (no chat contact).'}
                {customer.draft.note.trim() ? ` Note: “${customer.draft.note.trim()}”` : ''}
              </div>
            </>
          ) : (
            <span className="text-text-muted">None — shows as “Walk-in”</span>
          )}
        </Row>
      </dl>
      {state.error ? (
        <Alert tone="danger" title="Could not create the booking">
          {state.error}
        </Alert>
      ) : null}
      <p className="text-xs text-text-faint">
        The booking is created as Pending. Confirm it from the panel or the calendar once the customer agrees.
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="pt-0.5 text-xs font-medium text-text-muted">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  );
}
