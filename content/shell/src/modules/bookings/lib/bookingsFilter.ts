/**
 * The filter every range view shares — specialists, services, statuses.
 *
 * It is CLIENT-SIDE by necessity: `bookingsV2(startTime, endTime)` takes no
 * other argument, so the range store always holds every booking in the window
 * and the views filter what they show. The header count says "12 of 40" for
 * that reason. Ids are kept in the order they arrive (the URL and the chips
 * agree that way); statuses in the module's canonical order.
 */
import type { BookingStatus } from '~api/generated/bookings/graphql';
import type { BookingRecord } from '../types';
import { parseStatusList } from './status';

export interface BookingsFilter {
  /** Specialist ids; the literal `'none'` means "unassigned". */
  specialists: string[];
  services: string[];
  statuses: BookingStatus[];
}

export const UNASSIGNED = 'none';

export const EMPTY_FILTER: BookingsFilter = { specialists: [], services: [], statuses: [] };

export function isFilterEmpty(filter: BookingsFilter): boolean {
  return filter.specialists.length === 0 && filter.services.length === 0 && filter.statuses.length === 0;
}

export function activeFilterCount(filter: BookingsFilter): number {
  return (
    (filter.specialists.length > 0 ? 1 : 0) +
    (filter.services.length > 0 ? 1 : 0) +
    (filter.statuses.length > 0 ? 1 : 0)
  );
}

/** The specialist id a booking is keyed under: a Specialist or DeletedSpecialist id, or 'none'. */
export function specialistKeyOf(booking: Pick<BookingRecord, 'specialist'>): string {
  const s = booking.specialist;
  return s && 'id' in s && s.id ? s.id : UNASSIGNED;
}

/** The service id a booking is keyed under, or null when it has none. */
export function serviceKeyOf(booking: Pick<BookingRecord, 'service'>): string | null {
  const s = booking.service;
  return s && 'id' in s && s.id ? s.id : null;
}

export function matchesFilter(
  booking: Pick<BookingRecord, 'specialist' | 'service' | 'status'>,
  filter: BookingsFilter,
): boolean {
  if (filter.specialists.length > 0 && !filter.specialists.includes(specialistKeyOf(booking))) return false;
  if (filter.services.length > 0) {
    const key = serviceKeyOf(booking);
    if (key === null || !filter.services.includes(key)) return false;
  }
  if (filter.statuses.length > 0 && !filter.statuses.includes(booking.status)) return false;
  return true;
}

/** Comma list of ids, trimmed, deduped, in the order written. Never throws. */
export function parseIdList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const out: string[] = [];
  for (const part of raw.split(',')) {
    const id = part.trim();
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

export function parseFilter(params: URLSearchParams): BookingsFilter {
  return {
    specialists: parseIdList(params.get('specialist')),
    services: parseIdList(params.get('service')),
    statuses: parseStatusList(params.get('status')),
  };
}
