import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  DURATION,
  Dialog,
  EASING,
  IconCalendar,
  IconTrash,
  Select,
  Separator,
  Skeleton,
  Tag,
  prefersReducedMotion,
  usesHour12,
} from '~ui';
import type { BookingStatus } from '~api/generated/bookings/graphql';
import { useCatalog } from '../../BookingsCatalogContext';
import { useDetailStore } from '../../hooks/useDetailStore';
import { useBookingWrite } from '../../hooks/useBookingWrite';
import { customerName } from '../../lib/announce';
import { applyPatch } from '../../lib/bookingInput';
import type { WeekStartsOn } from '../../lib/calendarRange';
import { specialistName, specialistsForService } from '../../lib/catalogStore';
import { botTimeLabel, isPastBooking, priceLabel, whenLabel, type LabelOptions } from '../../lib/panelForm';
import { statusMeta } from '../../lib/status';
import type { BookingRecord, DisplayZone } from '../../types';
import { CustomerSection } from './CustomerSection';
import { StatusActions } from './StatusActions';
import { WhenForm } from './WhenForm';

export interface BookingPanelProps {
  /** The open booking (`?b=`). The panel fetches it itself (`lib/detailStore.ts`). */
  bookingId: string;
  onClose: () => void;
  /** Duplicate / attach-customer flows open the workspace wizard. */
  onNewBooking: (prefill: {
    start?: string | null;
    end?: string | null;
    contact?: string | null;
    specialist?: string | null;
    service?: string | null;
  }) => void;
  canEdit: boolean;
  /** The workspace's display zone — the panel renders in it and follows the toggle live. */
  zone: DisplayZone;
  todayKey: string;
  weekStartsOn: WeekStartsOn;
  /** Milliseconds, refreshed by the workspace every minute (past/future decisions). */
  now: number;
}

const UNASSIGNED = '__unassigned';
const NO_SERVICE = '__none';

/**
 * The booking detail panel body (host-agnostic: `InspectorHost` decides drawer
 * vs inline). It fetches its own record (`useDetailStore`), writes through
 * `useBookingWrite` (non-optimistic; every response also goes on the live bus
 * so the calendar and the lists follow), and renders in the display zone the
 * workspace hands it (so the zone toggle updates live). Sections: header (status + when, in the display
 * zone and in bot time when they differ) · status actions · When form ·
 * service / specialist · customer · Google Calendar · delete.
 *
 * The entrance is keyed on the booking, not the mount (deals' lesson): the
 * Drawer animates itself, the inline column does not, and one short rise on
 * a new id reads right in both.
 */
export function BookingPanel(props: BookingPanelProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    rootRef.current?.animate(
      [
        { opacity: 0, transform: 'translateY(4px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: DURATION.base, easing: EASING.entrance },
    );
  }, [props.bookingId]);
  return (
    <div ref={rootRef} className="flex min-h-0 flex-1 flex-col">
      <BookingPanelBody {...props} />
    </div>
  );
}

function BookingPanelBody({
  bookingId,
  onClose,
  onNewBooking,
  canEdit,
  zone,
  todayKey,
  weekStartsOn,
  now,
}: BookingPanelProps) {
  const detail = useDetailStore(bookingId);
  const write = useBookingWrite(detail.state, detail.dispatch);
  const catalog = useCatalog();
  const labels = useMemo<LabelOptions>(() => ({ hour12: usesHour12(), todayKey }), [todayKey]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { booking, loading, error, gone, saving } = detail.state;

  if (gone) {
    return (
      <div className="space-y-3 p-4">
        <Alert tone="info" title="This booking was deleted">
          It no longer exists on the server — a teammate removed it, or it was just deleted here.
        </Alert>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  if (loading && !booking) {
    return (
      <div className="space-y-3 p-4" aria-busy="true">
        <Skeleton variant="text" className="w-1/3" />
        <Skeleton variant="text" className="w-2/3" />
        <Skeleton variant="block" className="h-9" />
        <Skeleton variant="block" className="h-24" />
        <Skeleton variant="block" className="h-32" />
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="p-4">
        <Alert
          tone="danger"
          title="Could not load this booking"
          action={
            <Button size="sm" variant="secondary" onClick={detail.refetch}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </div>
    );
  }

  if (!booking) return null;

  const meta = statusMeta(booking.status);
  const past = isPastBooking(booking, now);
  const editable = canEdit && !saving;
  const serviceId = booking.service && 'id' in booking.service ? booking.service.id : null;
  const serviceDeleted = booking.service?.__typename === 'DeletedGoodsService';
  const specialistId = booking.specialist && 'id' in booking.specialist ? booking.specialist.id : null;
  const specialistDeleted = booking.specialist?.__typename === 'DeletedSpecialist';
  const botLine = botTimeLabel(booking, zone, labels);

  // Service options: the live catalog, plus the record's own Deleted ref shown disabled.
  const serviceOptions = [
    { value: NO_SERVICE, label: 'No service' },
    ...catalog.state.services.map((s) => ({
      value: s.id,
      label: s.isAvailable ? s.title : `${s.title} (unavailable)`,
    })),
  ];
  if (serviceDeleted && booking.service)
    serviceOptions.push({ value: booking.service.id, label: `Deleted service — ${booking.service.title}` });

  // Specialists: those offering the service (everyone when there is none), plus a Deleted ref shown disabled.
  const offering =
    serviceId && !serviceDeleted ? specialistsForService(catalog.state, serviceId) : catalog.state.specialists;
  const specialistOptions = [
    { value: UNASSIGNED, label: 'Anyone / unassigned' },
    ...offering.map((sp) => ({ value: sp.id, label: specialistName(sp.profile) })),
  ];
  // The current specialist stays selectable even when they do not offer the current service.
  if (specialistId && !specialistDeleted && !offering.some((sp) => sp.id === specialistId)) {
    const current = catalog.state.specialists.find((sp) => sp.id === specialistId);
    specialistOptions.push({
      value: specialistId,
      label: `${current ? specialistName(current.profile) : 'Specialist'} (does not offer this service)`,
    });
  }
  if (specialistDeleted && booking.specialist)
    specialistOptions.push({
      value: booking.specialist.id,
      label: `Deleted specialist — ${specialistName(booking.specialist.profile)}`,
    });

  const changeService = (value: string) => {
    if (value === (serviceId ?? NO_SERVICE)) return;
    const service = value === NO_SERVICE ? null : catalog.state.services.find((s) => s.id === value);
    if (service === undefined) return;
    const ref: BookingRecord['service'] = service
      ? {
          __typename: 'GoodsService',
          id: service.id,
          title: service.title,
          durationSeconds: service.durationSeconds,
          isAvailable: service.isAvailable,
          price: service.price ?? null,
        }
      : null;
    void write.writeRecord(applyPatch(booking, { service: ref }), 'edit', service ? service.title : 'no service');
  };

  const changeSpecialist = (value: string) => {
    if (value === (specialistId ?? UNASSIGNED)) return;
    const sp = value === UNASSIGNED ? null : catalog.state.specialists.find((s) => s.id === value);
    if (sp === undefined) return;
    const ref: BookingRecord['specialist'] = sp
      ? {
          __typename: 'Specialist',
          id: sp.id,
          profile: {
            firstName: sp.profile.firstName,
            lastName: sp.profile.lastName ?? null,
            logo: sp.profile.logo ?? null,
          },
        }
      : null;
    void write.writeRecord(
      applyPatch(booking, { specialist: ref }),
      'reassign',
      sp ? specialistName(sp.profile) : 'unassigned',
    );
  };

  const duplicate = () =>
    onNewBooking({
      start: booking.startTime,
      end: booking.endTime,
      contact: booking.contact?.id ?? null,
      specialist: specialistDeleted ? null : specialistId,
      service: serviceDeleted ? null : serviceId,
    });

  const gcal = booking.__typename === 'BookingWithGoogleCalendarRef' ? booking.googleCalendarRefData : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <header className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone={meta.tone}>{meta.label}</Tag>
            {past ? <span className="text-xs text-text-faint">past</span> : null}
            {saving ? <span className="text-xs text-text-faint">saving…</span> : null}
          </div>
          <div className="text-sm font-semibold text-text">{whenLabel(booking, zone.zone, labels)}</div>
          {botLine ? <div className="text-xs text-text-muted">{botLine}</div> : null}
          <div className="text-xs text-text-muted">
            {customerName(booking)}
            {booking.service ? ` · ${booking.service.title}` : ''}
            {booking.specialist ? ` · ${specialistName(booking.specialist.profile)}` : ' · unassigned'}
          </div>
        </header>

        {canEdit ? (
          <StatusActions
            current={booking.status}
            isPast={past}
            disabled={saving}
            onSet={(status: BookingStatus) => void write.setStatus(status)}
          />
        ) : null}

        <Separator />

        <section aria-labelledby="bk-when">
          <h3 id="bk-when" className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            When
          </h3>
          <WhenForm
            booking={booking}
            zone={zone}
            todayKey={todayKey}
            weekStartsOn={weekStartsOn}
            labels={labels}
            disabled={!editable}
            onSave={(next, detail) => write.writeRecord(applyPatch(booking, next), 'move', detail)}
          />
        </section>

        <section className="grid gap-3" aria-label="Service and specialist">
          <div>
            <span className="mb-1 block text-xs font-medium text-text-muted">Service</span>
            <Select
              aria-label="Service"
              value={serviceId ?? NO_SERVICE}
              onChange={changeService}
              options={serviceOptions}
              disabled={!editable}
              className="w-full"
            />
            {booking.service ? (
              <p className="mt-1 text-xs text-text-faint">
                {Math.round(booking.service.durationSeconds / 60)} min
                {booking.service.price ? ` · ${priceLabel(booking.service.price)}` : ''}
                {serviceDeleted ? ' · deleted from the catalog; the booking keeps its name and price' : ''}
              </p>
            ) : null}
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium text-text-muted">Specialist</span>
            <Select
              aria-label="Specialist"
              value={specialistId ?? UNASSIGNED}
              onChange={changeSpecialist}
              options={specialistOptions}
              disabled={!editable}
              className="w-full"
            />
            {specialistDeleted ? (
              <p className="mt-1 text-xs text-text-faint">This specialist was deleted; pick another to reassign.</p>
            ) : null}
          </div>
        </section>

        <Separator />

        <section aria-labelledby="bk-customer">
          <h3 id="bk-customer" className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Customer
          </h3>
          <CustomerSection
            booking={booking}
            canEdit={canEdit}
            saving={saving}
            onSetNote={write.setNote}
            onAttach={(input) => write.writeInput(input, 'edit', 'a customer')}
          />
        </section>

        {gcal ? (
          <>
            <Separator />
            <section aria-label="Google Calendar" className="flex items-start gap-2 text-xs text-text-muted">
              <IconCalendar size={14} className="mt-0.5 shrink-0" />
              <span>
                From Google Calendar <span className="font-medium text-text">{gcal.calendar.summary}</span>
                {gcal.summary ? (
                  <>
                    {' '}
                    — event “<span className="text-text">{gcal.summary}</span>”
                  </>
                ) : null}
                . Edits here do not write back to Google.
              </span>
            </section>
          </>
        ) : null}
      </div>

      {canEdit ? (
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border p-3">
          <Button size="sm" variant="ghost" onClick={duplicate} disabled={saving}>
            Duplicate…
          </Button>
          <Button size="sm" variant="dangerGhost" onClick={() => setConfirmDelete(true)} disabled={saving}>
            <IconTrash size={14} />
            Delete
          </Button>
        </footer>
      ) : null}

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this booking?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              loading={saving}
              onClick={() => {
                void write.deleteBooking().then((ok) => {
                  setConfirmDelete(false);
                  if (ok) onClose();
                });
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-text">
          {customerName(booking)} · {whenLabel(booking, zone.zone, labels)}
        </p>
        <p className="mt-2 text-sm text-text-muted">
          This cannot be undone — there is no restore, and a new booking would have a new id that no link or chat
          message points at.
        </p>
      </Dialog>
    </div>
  );
}
