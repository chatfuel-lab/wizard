/**
 * From a booking record to the input the API wants back — and the patches
 * every optimistic edit is made of.
 *
 * `bookingUpdateV2` takes a `BookingUpdateInput` with the SAME shape as the
 * create input and treats it as a FULL REPLACE (sending `inlineContact: null`
 * clears the customer, `specialistID: null` unassigns). There is no patch mutation. So a move that changes only the
 * start time must re-send the customer, the service and the specialist as
 * they are — and the only honest source for "as they are" is the record the
 * API last returned. Every write in this module goes through `bookingInputOf`.
 *
 * Deleted references keep their id (`DeletedGoodsService.id`,
 * `DeletedSpecialist.id`) and the API accepted an update carrying such an id
 * back, so a past appointment on a deleted service can still be moved.
 * `countryCode` is write-only on inline contacts and is not sent back.
 *
 * On a WhatsApp-connected bot the API turns inline input into a real
 * `WhatsappContact` — the record then carries `contact` and no
 * `inlineContact`, and `contactID` is what goes back. Both are handled.
 */
import type { BookingUpdateInput } from '~api/generated/bookings/graphql';
import type { BookingRecord } from '../types';

export function bookingInputOf(record: BookingRecord): BookingUpdateInput {
  const service = record.service && 'id' in record.service ? record.service.id : null;
  const specialist = record.specialist && 'id' in record.specialist ? record.specialist.id : null;
  return {
    contactID: record.contact?.id ?? null,
    inlineContact:
      record.contact || !record.inlineContact
        ? null
        : {
            name: record.inlineContact.name,
            phoneNumber: record.inlineContact.phoneNumber,
            note: record.inlineContact.note ?? null,
          },
    serviceID: service,
    specialistID: specialist,
    startTime: record.startTime,
    endTime: record.endTime,
  };
}

/** The parts of a booking an optimistic grid edit may change. */
export interface BookingPatch {
  startTime?: string;
  endTime?: string;
  /** A specialist from the catalog, `null` to unassign; omit to leave. */
  specialist?: BookingRecord['specialist'];
  service?: BookingRecord['service'];
}

/** The optimistic record: the patch over the current one. */
export function applyPatch(record: BookingRecord, patch: BookingPatch): BookingRecord {
  const next = { ...record } as BookingRecord;
  if (patch.startTime !== undefined) next.startTime = patch.startTime;
  if (patch.endTime !== undefined) next.endTime = patch.endTime;
  if (patch.specialist !== undefined) next.specialist = patch.specialist;
  if (patch.service !== undefined) next.service = patch.service;
  return next;
}

export function durationMinutes(record: Pick<BookingRecord, 'startTime' | 'endTime'>): number {
  return Math.round((new Date(record.endTime).getTime() - new Date(record.startTime).getTime()) / 60_000);
}

/** True when the record's timing or references differ (what a "Save" button enables on). */
export function sameInput(a: BookingUpdateInput, b: BookingUpdateInput): boolean {
  return (
    a.contactID === b.contactID &&
    a.serviceID === b.serviceID &&
    a.specialistID === b.specialistID &&
    a.startTime === b.startTime &&
    a.endTime === b.endTime &&
    (a.inlineContact?.name ?? null) === (b.inlineContact?.name ?? null) &&
    (a.inlineContact?.phoneNumber ?? null) === (b.inlineContact?.phoneNumber ?? null) &&
    (a.inlineContact?.note ?? null) === (b.inlineContact?.note ?? null)
  );
}
