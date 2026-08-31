/**
 * CSV export of the appointments list — client-side, over the loaded rows.
 *
 * There is no bookings export in the API (the CSV export that exists is the
 * contact export, and it knows nothing about bookings), so the list writes its
 * own file from what it holds: the rows currently loaded AND currently shown
 * (filter, tab and search applied). The button says "loaded rows only" and
 * the file name carries the range, so nobody mistakes it for a full extract.
 *
 * Escaping and the file shape (RFC 4180, formula guard, CRLF) are the shared
 * CSV fragments; what stays here is the columns. Times are printed in the
 * display zone with a zone column beside them, so a file made in Berlin says
 * so when it is opened in New York.
 */
import { csvText } from '~ui';
import type { BookingRecord } from '../types';
import {
  customerCell,
  isGoogleCalendarRef,
  priceCell,
  serviceCell,
  specialistCell,
  statusCell,
} from './appointmentsColumns';
import { durationMinutes } from './bookingInput';
import type { AppointmentsRange } from './bookingsParams';
import type { DayRange } from './calendarRange';
import { shiftDayKey, wallClock } from './zone';

export const CSV_HEADER: readonly string[] = [
  'Date',
  'Start',
  'End',
  'Time zone',
  'Customer',
  'Customer type',
  'Phone',
  'Service',
  'Service state',
  'Specialist',
  'Status',
  'Duration (min)',
  'Price',
  'Currency',
  'Booking ID',
];

const pad = (n: number) => String(n).padStart(2, '0');

const CUSTOMER_TYPE = {
  contact: 'Contact',
  inline: 'Inline contact',
  gcal: 'Google Calendar',
  walkin: 'Walk-in',
} as const;

/** The cells of one row, unescaped, in `CSV_HEADER` order. */
export function csvRow(record: BookingRecord, zone: string): (string | number | null)[] {
  const start = wallClock(new Date(record.startTime).getTime(), zone);
  const end = wallClock(new Date(record.endTime).getTime(), zone);
  const customer = customerCell(record);
  const service = serviceCell(record);
  const specialist = specialistCell(record);
  const price = priceCell(record);
  const endLabel =
    end.dayKey === start.dayKey
      ? `${pad(end.hour)}:${pad(end.minute)}`
      : `${end.dayKey} ${pad(end.hour)}:${pad(end.minute)}`;
  return [
    start.dayKey,
    `${pad(start.hour)}:${pad(start.minute)}`,
    endLabel,
    zone,
    customer.kind === 'gcal' ? (customer.detail ?? customer.name) : customer.kind === 'walkin' ? '' : customer.name,
    CUSTOMER_TYPE[customer.kind],
    customer.phone ?? '',
    service?.title ?? '',
    service ? (service.deleted ? 'Deleted' : 'Active') : '',
    specialist ? (specialist.deleted ? `${specialist.name} (deleted)` : specialist.name) : '',
    statusCell(record).label,
    durationMinutes(record),
    price ? price.amount.toFixed(2) : '',
    price ? price.currency : '',
    isGoogleCalendarRef(record) ? `${record.id} (gcal:${record.googleCalendarRefData.eventID})` : record.id,
  ];
}

/** The whole file: header + rows, CRLF-terminated, no BOM (the caller adds one for Excel). */
export function toCsv(records: readonly BookingRecord[], zone: string): string {
  return csvText([CSV_HEADER, ...records.map((record) => csvRow(record, zone))]);
}

/** `appointments-upcoming-2026-08-17--2026-11-14.csv` — the tab and the loaded window, inclusive. */
export function csvFileName(range: AppointmentsRange, loaded: DayRange): string {
  return `appointments-${range}-${loaded.startKey}--${shiftDayKey(loaded.endKey, -1)}.csv`;
}
