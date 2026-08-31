import { describe, expect, it } from 'vitest';
import type { BookingRecord } from '../types';
import { indexOf, matchesSearch, parseSearch, searchAppointments } from './appointmentsSearch';
import { sampleBooking } from './samples';

const priya = (): BookingRecord =>
  sampleBooking({
    id: 'priya',
    inlineContact: null,
    contact: {
      __typename: 'WhatsappContact',
      id: 'wa_3',
      name: 'Priya Nair',
      phone: '12025550122',
      profilePictureUrl: null,
      note: null,
      conversation: null,
    },
    service: {
      __typename: 'GoodsService',
      id: 'svc-massage',
      title: 'Deep tissue massage',
      durationSeconds: 5400,
      isAvailable: true,
      price: null,
    },
    specialist: {
      __typename: 'Specialist',
      id: 'sp-maria',
      profile: { firstName: 'Maria', lastName: 'Barber', logo: null },
    },
  });

const lena = (): BookingRecord =>
  sampleBooking({
    id: 'lena',
    inlineContact: { id: 'i', name: 'Lena Sørensen', phoneNumber: '+4915112345678', note: null },
    service: { __typename: 'DeletedGoodsService', id: 'old', title: 'Old Facial', durationSeconds: 3600, price: null },
    specialist: null,
  });

const gcal = (): BookingRecord =>
  ({
    __typename: 'BookingWithGoogleCalendarRef',
    id: 'g',
    startTime: '2026-08-18T16:00:00+02:00',
    endTime: '2026-08-18T17:00:00+02:00',
    status: 'Confirmed',
    service: null,
    specialist: null,
    contact: null,
    inlineContact: null,
    googleCalendarRefData: {
      calendar: { id: 'gcal', summary: 'alex@example.com' },
      eventID: 'evt-1',
      summary: 'Dentist',
    },
  }) as BookingRecord;

const walkin = (): BookingRecord => sampleBooking({ id: 'walk', inlineContact: null, service: null, specialist: null });

const all = () => [priya(), lena(), gcal(), walkin(), sampleBooking({ id: 'dana' })];
const ids = (list: BookingRecord[]) => list.map((r) => r.id);

describe('appointmentsSearch', () => {
  it('tokenises, folds case and accents, and spots phone fragments', () => {
    expect(parseSearch('')).toEqual([]);
    expect(parseSearch('  PRIYA  ')).toEqual([{ text: 'priya', digits: null }]);
    expect(parseSearch('Sørensen')).toEqual([{ text: 'sorensen', digits: null }]);
    expect(parseSearch('202 555')).toEqual([
      { text: '202', digits: '202' },
      { text: '555', digits: '555' },
    ]);
    expect(parseSearch('+1(202)')).toEqual([{ text: '+1(202)', digits: '1202' }]);
    expect(parseSearch('7')).toEqual([{ text: '7', digits: null }]);
  });

  it('indexes name, phone digits, service, specialist and the GCal summary', () => {
    expect(indexOf(priya())).toEqual({
      fields: ['priya nair', 'deep tissue massage', 'maria barber'],
      phoneDigits: '12025550122',
    });
    expect(indexOf(gcal())).toEqual({ fields: ['dentist', 'google calendar event'], phoneDigits: null });
    expect(indexOf(walkin())).toEqual({ fields: [], phoneDigits: null });
    expect(indexOf(lena()).fields).toContain('old facial');
    expect(indexOf(lena()).phoneDigits).toBe('4915112345678');
  });

  it('matches by name, phone, service, specialist and event summary', () => {
    expect(ids(searchAppointments(all(), 'priya'))).toEqual(['priya']);
    expect(ids(searchAppointments(all(), 'NAIR'))).toEqual(['priya']);
    expect(ids(searchAppointments(all(), 'sorensen'))).toEqual(['lena']);
    expect(ids(searchAppointments(all(), 'massage'))).toEqual(['priya']);
    expect(ids(searchAppointments(all(), 'maria'))).toEqual(['priya']);
    expect(ids(searchAppointments(all(), 'facial'))).toEqual(['lena']);
    expect(ids(searchAppointments(all(), 'dentist'))).toEqual(['g']);
    expect(ids(searchAppointments(all(), 'google'))).toEqual(['g']);
  });

  it('phone tokens compare digits only', () => {
    expect(ids(searchAppointments(all(), '202 555 0122'))).toEqual(['priya']);
    expect(ids(searchAppointments(all(), '(202)'))).toEqual(['priya', 'dana']);
    expect(ids(searchAppointments(all(), '+49 151'))).toEqual(['lena']);
    expect(ids(searchAppointments(all(), '0100'))).toEqual(['dana']);
  });

  it('ANDs tokens and returns nothing for a miss', () => {
    expect(ids(searchAppointments(all(), 'priya massage'))).toEqual(['priya']);
    expect(ids(searchAppointments(all(), 'priya facial'))).toEqual([]);
    expect(ids(searchAppointments(all(), 'zzz'))).toEqual([]);
  });

  it('a blank query returns everything, as a copy', () => {
    const input = all();
    const out = searchAppointments(input, '   ');
    expect(out).toEqual(input);
    expect(out).not.toBe(input);
    expect(matchesSearch(indexOf(walkin()), [])).toBe(true);
  });
});
