/** Record factories for tests: the smallest valid record, plus what a case overrides. */
import { BookingStatus, FileStatus, FileType, GoodsItemPriceCurrency } from '~api/generated/bookings/graphql';
import type { BookingRecord, ServiceRecord, SpecialistRecord } from '../types';

export function sampleService(over: Partial<ServiceRecord> = {}): ServiceRecord {
  return {
    __typename: 'GoodsService',
    id: 'svc-1',
    title: 'Consultation',
    description: '',
    durationSeconds: 1800,
    isAvailable: true,
    price: { amount: '30.00', currency: GoodsItemPriceCurrency.Usd },
    images: [],
    ...over,
  };
}

export function sampleDay(start = '09:00', end = '18:00', brk: { start: string; end: string } | null = null) {
  return { enabled: true, start, end, break: brk };
}

export function sampleSpecialist(over: Partial<SpecialistRecord> = {}): SpecialistRecord {
  return {
    id: 'sp-1',
    profile: { firstName: 'Alex', lastName: 'Kim', aboutInfo: null, logo: null },
    schedule: {
      enabled: true,
      sun: { enabled: false, start: '09:00', end: '18:00', break: null },
      mon: sampleDay('09:00', '18:00', { start: '13:00', end: '14:00' }),
      tue: sampleDay(),
      wed: sampleDay(),
      thu: sampleDay(),
      fri: sampleDay(),
      sat: { enabled: false, start: '09:00', end: '18:00', break: null },
    },
    services: [{ id: 'svc-1' }],
    connectedGoogleCalendar: null,
    googleCalendarConnectionLink: null,
    latestGoogleCalendarSyncTask: null,
    ...over,
  };
}

export function sampleFile(id = 'file-1') {
  return {
    id,
    url: `https://files.example/${id}.png`,
    type: FileType.Image,
    status: FileStatus.Downloaded,
    size: 1024,
  };
}

let seq = 0;

/** A `Booking` with an inline contact, 30 min from `start` (RFC3339). */
export function sampleBooking(over: Partial<BookingRecord> & { start?: string; minutes?: number } = {}): BookingRecord {
  const { start = '2026-08-18T10:00:00-06:00', minutes = 30, ...rest } = over;
  seq += 1;
  const startMs = new Date(start).getTime();
  const endMs = startMs + minutes * 60_000;
  const end = new Date(endMs).toISOString().replace('.000Z', '+00:00');
  return {
    __typename: 'Booking',
    id: `bk-${seq}`,
    startTime: start,
    endTime: end,
    status: BookingStatus.Confirmed,
    service: {
      __typename: 'GoodsService',
      id: 'svc-1',
      title: 'Consultation',
      durationSeconds: 1800,
      isAvailable: true,
      price: null,
    },
    specialist: { __typename: 'Specialist', id: 'sp-1', profile: { firstName: 'Alex', lastName: 'Kim', logo: null } },
    contact: null,
    inlineContact: { id: 'bot_+12025550100', name: 'Dana Ray', phoneNumber: '+12025550100', note: null },
    ...rest,
  } as BookingRecord;
}
