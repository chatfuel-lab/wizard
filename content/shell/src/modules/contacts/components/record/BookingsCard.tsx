import { Button, Card, IconCalendar, Tag } from '~ui';
import { bookingSummary, bookingWhen, splitBookings, type ContactBooking } from '../../lib/contactBookings';
import type { ContactBookingsApi } from '../../hooks/useContactBookings';

export interface BookingsCardProps {
  api: ContactBookingsApi;
}

/**
 * The contact's appointments — or nothing at all.
 *
 * Nothing at all is the important case. There is no query that asks whether a
 * bot sells appointments, so a bot without the bookings product would otherwise
 * get a permanent empty card explaining a feature it does not have. The card
 * renders only once `bookingsV2` has answered with at least one booking for
 * SOMEBODY on this bot; until then it is not on the page.
 *
 * What it always says, when it is on the page, is that it is a WINDOW.
 * `bookingsV2(startTime, endTime)` is the only way to reach a contact's
 * appointments, so an appointment from two years ago is not
 * absent — it is out of range, and the card offers the wider range rather than
 * implying there is nothing there.
 */
export function BookingsCard({ api }: BookingsCardProps) {
  if (!api.botHasAny) return null;

  const { upcoming, past } = splitBookings(api.bookings);
  const summary = bookingSummary(api.bookings);

  return (
    <Card
      title="Appointments"
      description={summary ?? 'None for this contact in this window.'}
      actions={
        api.wider ? (
          <Button variant="ghost" size="sm" onClick={api.widen} disabled={api.loading}>
            Look further
          </Button>
        ) : null
      }
    >
      {api.bookings.length === 0 ? (
        <p className="flex items-center gap-2 text-body text-text-muted">
          <IconCalendar size={16} />
          No appointment for this contact in this window.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {upcoming.length > 0 ? <Group label="Upcoming" rows={upcoming} /> : null}
          {past.length > 0 ? <Group label="Past" rows={past} /> : null}
        </div>
      )}
    </Card>
  );
}

function Group({ label, rows }: { label: string; rows: readonly ContactBooking[] }) {
  return (
    <section className="flex flex-col gap-1">
      <h4 className="text-micro font-medium uppercase tracking-wide text-text-faint">{label}</h4>
      <ul className="flex flex-col divide-y divide-border-subtle">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 py-1.5">
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-body text-text">{row.service}</span>
              <span className="text-micro text-text-muted">{bookingWhen(row)}</span>
            </span>
            <Tag tone={row.tone}>{row.statusLabel}</Tag>
          </li>
        ))}
      </ul>
    </section>
  );
}
