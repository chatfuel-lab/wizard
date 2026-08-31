import { describe, expect, it } from 'vitest';
import { BookingStatus, GoodsItemPriceCurrency } from '~api/generated/bookings/graphql';
import type { BookingRecord } from '../types';
import {
  availabilityKey,
  availabilityReducer,
  initialAvailabilityState,
  needsFetch,
  nextEpoch,
} from './availabilityStore';
import { applyPatch, bookingInputOf, durationMinutes, sameInput } from './bookingInput';
import {
  bookableServices,
  catalogReducer,
  hasSchedule,
  initialCatalogState,
  serviceById,
  specialistName,
  specialistsForService,
  toneIndexOf,
} from './catalogStore';
import { detailReducer, initialDetailState } from './detailStore';
import { sampleBooking, sampleService, sampleSpecialist } from './samples';
import { initialSettingsState, settingsReducer } from './settingsStore';
import { isUndoExpired, isUndoable, statusUndoEntry, statusUndoMoves, undoLabel, updateUndoEntry } from './undo';

describe('catalogStore', () => {
  it('loads with epoch, replaces and writes single records, attaches tasks', () => {
    const svc = sampleService();
    const sp = sampleSpecialist();
    let s = catalogReducer(initialCatalogState(), { type: 'reset' });
    s = catalogReducer(s, { type: 'loaded', epoch: 0, services: [], specialists: [], at: 1 });
    expect(s.loading).toBe(true); // stale epoch dropped
    s = catalogReducer(s, { type: 'loaded', epoch: 1, services: [svc], specialists: [sp], at: 1 });
    expect(s.loading).toBe(false);
    s = catalogReducer(s, { type: 'serviceWritten', service: { ...svc, title: 'New' } });
    expect(s.services[0]!.title).toBe('New');
    s = catalogReducer(s, { type: 'serviceWritten', service: sampleService({ id: 'svc-2' }) });
    expect(s.services).toHaveLength(2);
    s = catalogReducer(s, { type: 'specialistsReplaced', specialists: [sp, sampleSpecialist({ id: 'sp-2' })] });
    expect(s.specialists).toHaveLength(2);
    s = catalogReducer(s, { type: 'specialistTask', specialistId: 'sp-2', task: { id: 't1' } as never });
    expect(s.specialists[1]!.latestGoogleCalendarSyncTask).toEqual({ id: 't1' });
    expect(toneIndexOf(s, 'sp-2')).toBe(1);
    expect(toneIndexOf(s, 'ghost')).toBe(-1);
    expect(serviceById(s, 'svc-2')?.id).toBe('svc-2');
    expect(specialistsForService(s, 'svc-1').map((x) => x.id)).toEqual(['sp-1', 'sp-2']);
    expect(bookableServices({ services: [svc, sampleService({ id: 'x', isAvailable: false })] })).toHaveLength(1);
    expect(hasSchedule(sp)).toBe(true);
    expect(hasSchedule({ schedule: null })).toBe(false);
    expect(hasSchedule({ schedule: { ...sp.schedule!, enabled: false } })).toBe(false);
    expect(specialistName({ firstName: 'A', lastName: null })).toBe('A');
    expect(specialistName({ firstName: '', lastName: null })).toBe('Specialist');
  });
});

describe('availabilityStore', () => {
  it('fetches once, invalidates by day, keeps old entries while reloading', () => {
    const key = availabilityKey('svc-1', '2026-08-18');
    let s = initialAvailabilityState();
    expect(needsFetch(s, key)).toBe(true);
    s = availabilityReducer(s, { type: 'requested', key, epoch: nextEpoch(s, key) });
    expect(needsFetch(s, key)).toBe(false);
    s = availabilityReducer(s, { type: 'loaded', key, epoch: 1, entries: [], at: 5 });
    expect(needsFetch(s, key)).toBe(false);
    s = availabilityReducer(s, { type: 'daysTouched', days: ['2026-08-19'] });
    expect(needsFetch(s, key)).toBe(false);
    s = availabilityReducer(s, { type: 'daysTouched', days: ['2026-08-18'] });
    expect(needsFetch(s, key)).toBe(true);
    s = availabilityReducer(s, { type: 'requested', key, epoch: nextEpoch(s, key) });
    expect(s.byKey[key]!.entries).toEqual([]); // kept while reloading
    // A stale answer is dropped.
    s = availabilityReducer(s, { type: 'loaded', key, epoch: 1, entries: [{ specialistID: 'x' } as never], at: 6 });
    expect(s.byKey[key]!.loading).toBe(true);
    s = availabilityReducer(s, { type: 'failed', key, epoch: 2, message: 'boom' });
    expect(s.byKey[key]!.error).toBe('boom');
    expect(needsFetch(s, key)).toBe(false); // errored: no hot loop, the UI offers retry
    s = availabilityReducer(s, { type: 'invalidateAll' });
    expect(needsFetch(s, key)).toBe(true);
  });

  it('splits the key on the LAST separator, so a service id may contain one', () => {
    const key = availabilityKey('svc|1', '2026-08-18');
    let s = availabilityReducer(initialAvailabilityState(), { type: 'requested', key, epoch: 1 });
    s = availabilityReducer(s, { type: 'loaded', key, epoch: 1, entries: [], at: 5 });
    // A touch on another day leaves it alone; a touch on its own day makes it stale.
    expect(needsFetch(availabilityReducer(s, { type: 'daysTouched', days: ['2026-08-19'] }), key)).toBe(false);
    expect(needsFetch(availabilityReducer(s, { type: 'daysTouched', days: ['2026-08-18'] }), key)).toBe(true);
  });
});

describe('settingsStore', () => {
  it('reconciles from responses and tracks saving per field', () => {
    let s = settingsReducer(initialSettingsState(), { type: 'reset' });
    const config = { locale: 'En' } as never;
    s = settingsReducer(s, { type: 'loaded', epoch: 1, config, timezone: 'Europe/Berlin', countryCode: 'DE' });
    s = settingsReducer(s, { type: 'saveStarted', field: 'locale' });
    s = settingsReducer(s, { type: 'saveStarted', field: 'locale' });
    expect(s.saving).toEqual(['locale']);
    s = settingsReducer(s, { type: 'configWritten', field: 'locale', config: { locale: 'Es' } as never });
    expect(s.saving).toEqual([]);
    expect(s.config).toEqual({ locale: 'Es' });
    s = settingsReducer(s, { type: 'saveStarted', field: 'timezone' });
    s = settingsReducer(s, { type: 'timezoneWritten', timezone: 'America/Mexico_City' });
    expect(s.timezone).toBe('America/Mexico_City');
    expect(s.saving).toEqual([]);
  });
});

describe('detailStore', () => {
  it('opens with a seed, loads, follows live, marks gone', () => {
    const a = sampleBooking();
    let s = detailReducer(initialDetailState(), { type: 'opened', id: a.id, seed: a });
    expect(s.booking).toEqual(a);
    expect(s.loading).toBe(true);
    const fresh = { ...a, status: BookingStatus.Attended } as BookingRecord;
    s = detailReducer(s, { type: 'loaded', epoch: 1, booking: fresh });
    expect(s.booking!.status).toBe(BookingStatus.Attended);
    s = detailReducer(s, {
      type: 'live',
      event: { kind: 'upsert', booking: { ...fresh, status: BookingStatus.NoShow } as BookingRecord, origin: 'live' },
    });
    expect(s.booking!.status).toBe(BookingStatus.NoShow);
    // While saving, a live echo does not clobber the pending write.
    s = detailReducer(s, { type: 'saveStarted' });
    s = detailReducer(s, { type: 'live', event: { kind: 'upsert', booking: fresh, origin: 'live' } });
    expect(s.booking!.status).toBe(BookingStatus.NoShow);
    s = detailReducer(s, { type: 'written', booking: fresh });
    expect(s.saving).toBe(false);
    s = detailReducer(s, { type: 'live', event: { kind: 'remove', id: a.id, origin: 'live' } });
    expect(s.gone).toBe(true);
    // Another booking's events are ignored; a not-found load marks gone.
    s = detailReducer(s, { type: 'opened', id: 'other', seed: null });
    s = detailReducer(s, { type: 'live', event: { kind: 'remove', id: a.id, origin: 'live' } });
    expect(s.gone).toBe(false);
    s = detailReducer(s, { type: 'failed', epoch: s.epoch, message: 'x', notFound: true });
    expect(s.gone).toBe(true);
    expect(s.error).toBeNull();
    expect(detailReducer(s, { type: 'closed' }).bookingId).toBeNull();
  });
});

describe('bookingInput', () => {
  it('is the full replace, from either customer identity', () => {
    const inline = sampleBooking();
    expect(bookingInputOf(inline)).toEqual({
      contactID: null,
      inlineContact: { name: 'Dana Ray', phoneNumber: '+12025550100', note: null },
      serviceID: 'svc-1',
      specialistID: 'sp-1',
      startTime: inline.startTime,
      endTime: inline.endTime,
    });
    const real = sampleBooking({
      contact: {
        __typename: 'WhatsappContact',
        id: 'wa_1',
        name: 'Real',
        profilePictureUrl: null,
        note: null,
        conversation: null,
        phone: '1',
      },
      inlineContact: null,
      specialist: null,
      service: {
        __typename: 'DeletedGoodsService',
        id: 'old',
        title: 'Old',
        durationSeconds: 60,
        price: { amount: '1', currency: GoodsItemPriceCurrency.Usd },
      },
    });
    expect(bookingInputOf(real)).toMatchObject({
      contactID: 'wa_1',
      inlineContact: null,
      serviceID: 'old',
      specialistID: null,
    });
  });

  it('patches and compares', () => {
    const a = sampleBooking();
    const moved = applyPatch(a, {
      startTime: '2026-08-18T11:00:00-06:00',
      endTime: '2026-08-18T11:30:00-06:00',
      specialist: null,
    });
    expect(moved.specialist).toBeNull();
    expect(durationMinutes(moved)).toBe(30);
    expect(sameInput(bookingInputOf(a), bookingInputOf(a))).toBe(true);
    expect(sameInput(bookingInputOf(a), bookingInputOf(moved))).toBe(false);
  });
});

describe('undo', () => {
  it('status entries skip Pending origins and unchanged ids', () => {
    const entry = statusUndoEntry(
      [
        { id: 'a', from: BookingStatus.Confirmed },
        { id: 'b', from: BookingStatus.Pending },
        { id: 'c', from: BookingStatus.Attended },
        { id: 'a', from: BookingStatus.NoShow },
      ],
      BookingStatus.Attended,
      100,
    )!;
    expect(entry.kind).toBe('status');
    expect(statusUndoMoves(entry as never)).toEqual([{ id: 'a', to: BookingStatus.Confirmed }]);
    expect(undoLabel(entry)).toBe('Undo Attended');
    expect(statusUndoEntry([{ id: 'b', from: BookingStatus.Pending }], BookingStatus.Confirmed, 1)).toBeNull();
    expect(isUndoExpired(entry, 100 + 60_001)).toBe(true);
    expect(isUndoExpired(entry, 100 + 60_000)).toBe(false);
  });
  it('update entries label by what happened', () => {
    const e = updateUndoEntry('a', bookingInputOf(sampleBooking()), 'move', 5);
    expect(isUndoable(e)).toBe(true);
    expect(undoLabel(e)).toBe('Undo move');
    expect(undoLabel(updateUndoEntry('a', e.before, 'resize', 5))).toBe('Undo duration change');
    const many = statusUndoEntry(
      [
        { id: 'a', from: BookingStatus.Confirmed },
        { id: 'b', from: BookingStatus.Reschedule },
      ],
      BookingStatus.Canceled,
      1,
    )!;
    expect(undoLabel(many)).toBe('Undo 2 status changes');
  });
});
