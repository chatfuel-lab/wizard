import { describe, expect, it } from 'vitest';
import { BookingStatus } from '~api/generated/bookings/graphql';
import type { BookingRecord } from '../types';
import {
  initialRangeState,
  isInitialLoad,
  rangeReducer,
  selectByIds,
  selectSelected,
  selectVisible,
  type RangeAction,
  type RangeState,
} from './rangeStore';
import { sampleBooking } from './samples';

const WEEK = { startTime: '2026-08-17T00:00:00-06:00', endTime: '2026-08-24T00:00:00-06:00' };
const NEXT_WEEK = { startTime: '2026-08-24T00:00:00-06:00', endTime: '2026-08-31T00:00:00-06:00' };

const run = (actions: RangeAction[], from: RangeState = initialRangeState()) => actions.reduce(rangeReducer, from);

const loaded = (bookings: BookingRecord[], vars = WEEK) =>
  run([
    { type: 'reset', vars },
    { type: 'rangeLoaded', epoch: 1, vars, bookings },
  ]);

describe('reset / rangeLoaded', () => {
  it('reset bumps the epoch and IS the request', () => {
    const s = run([{ type: 'reset', vars: WEEK }]);
    expect(s.epoch).toBe(1);
    expect(s.loading).toBe(true);
    expect(isInitialLoad(s)).toBe(true);
  });

  it('a stale load is dropped', () => {
    const a = sampleBooking({ start: '2026-08-18T10:00:00-06:00' });
    const s = run([
      { type: 'reset', vars: WEEK },
      { type: 'reset', vars: NEXT_WEEK },
      { type: 'rangeLoaded', epoch: 1, vars: WEEK, bookings: [a] },
    ]);
    expect(s.loading).toBe(true);
    expect(Object.keys(s.byId)).toEqual([]);
  });

  it('replaces what was cached inside the loaded window and keeps what lies outside', () => {
    const inside = sampleBooking({ start: '2026-08-18T10:00:00-06:00' });
    const gone = sampleBooking({ start: '2026-08-19T10:00:00-06:00' });
    const outside = sampleBooking({ start: '2026-08-26T10:00:00-06:00' });
    let s = loaded([inside, gone]);
    s = run(
      [
        { type: 'reset', vars: NEXT_WEEK },
        { type: 'rangeLoaded', epoch: 2, vars: NEXT_WEEK, bookings: [outside] },
      ],
      s,
    );
    expect(Object.keys(s.byId).sort()).toEqual([inside.id, gone.id, outside.id].sort());
    // Back to the first week: `gone` was deleted meanwhile and does not come back.
    s = run(
      [
        { type: 'reset', vars: WEEK },
        { type: 'rangeLoaded', epoch: 3, vars: WEEK, bookings: [inside] },
      ],
      s,
    );
    expect(Object.keys(s.byId).sort()).toEqual([inside.id, outside.id].sort());
    expect(selectVisible(s).map((b) => b.id)).toEqual([inside.id]);
    expect(s.loaded).toEqual(WEEK);
  });

  it('a booking straddling the window edge is inside', () => {
    const late = sampleBooking({ start: '2026-08-23T23:30:00-06:00', minutes: 60 });
    const s = loaded([late]);
    expect(selectVisible(s)).toHaveLength(1);
    const next = run(
      [
        { type: 'reset', vars: NEXT_WEEK },
        { type: 'rangeLoaded', epoch: 2, vars: NEXT_WEEK, bookings: [] },
      ],
      s,
    );
    // It overlaps next week too and did not come back → dropped.
    expect(next.byId[late.id]).toBeUndefined();
  });

  it('failed keeps the cache and records the message once', () => {
    const s = run([
      { type: 'reset', vars: WEEK },
      { type: 'failed', epoch: 1, message: 'boom' },
      { type: 'failed', epoch: 0, message: 'stale' },
    ]);
    expect(s.error).toBe('boom');
    expect(s.loading).toBe(false);
    expect(rangeReducer(s, { type: 'errorCleared' }).error).toBeNull();
  });
});

describe('live', () => {
  it('is ignored while a load is in flight', () => {
    const a = sampleBooking();
    const s = run([
      { type: 'reset', vars: WEEK },
      { type: 'live', event: { kind: 'upsert', booking: a, origin: 'live' } },
    ]);
    expect(s.byId[a.id]).toBeUndefined();
  });

  it('upserts and removes, pruning selection and pending', () => {
    const a = sampleBooking();
    const b = sampleBooking({ start: '2026-08-19T10:00:00-06:00' });
    let s = loaded([a, b]);
    s = run([{ type: 'selectionSet', ids: [a.id, b.id] }], s);
    const moved = { ...a, startTime: '2026-08-18T11:00:00-06:00' } as BookingRecord;
    s = run([{ type: 'live', event: { kind: 'upsert', booking: moved, origin: 'live' } }], s);
    expect(s.byId[a.id]!.startTime).toBe('2026-08-18T11:00:00-06:00');
    s = run([{ type: 'live', event: { kind: 'remove', id: a.id, origin: 'live' } }], s);
    expect(s.byId[a.id]).toBeUndefined();
    expect(s.selection).toEqual([b.id]);
    // Removing an unknown id is a no-op that returns the same state.
    expect(rangeReducer(s, { type: 'live', event: { kind: 'remove', id: 'nope', origin: 'live' } })).toBe(s);
  });

  it('a live echo cannot undo an optimistic edit still in flight', () => {
    const a = sampleBooking({ start: '2026-08-18T10:00:00-06:00' });
    const next = {
      ...a,
      startTime: '2026-08-18T12:00:00-06:00',
      endTime: '2026-08-18T12:30:00-06:00',
    } as BookingRecord;
    let s = loaded([a]);
    s = run([{ type: 'editStarted', id: a.id, next }], s);
    // The pre-move echo arrives (server has not applied the update yet).
    s = run(
      [
        {
          type: 'live',
          event: { kind: 'upsert', booking: { ...a, status: BookingStatus.Attended } as BookingRecord, origin: 'live' },
        },
      ],
      s,
    );
    expect(s.byId[a.id]!.startTime).toBe('2026-08-18T12:00:00-06:00');
    // Status is one of the fields the edit owns too — kept optimistic.
    expect(s.byId[a.id]!.status).toBe(a.status);
  });
});

describe('optimistic edits', () => {
  it('rolls back exactly the failed booking and flashes it', () => {
    const a = sampleBooking({ start: '2026-08-18T10:00:00-06:00' });
    const b = sampleBooking({ start: '2026-08-19T10:00:00-06:00' });
    const aNext = { ...a, startTime: '2026-08-18T11:00:00-06:00' } as BookingRecord;
    const bNext = { ...b, status: BookingStatus.Attended } as BookingRecord;
    let s = loaded([a, b]);
    s = run(
      [
        { type: 'editStarted', id: a.id, next: aNext },
        { type: 'editStarted', id: b.id, next: bNext },
        { type: 'editFailed', id: a.id, now: 1000 },
        { type: 'editSucceeded', id: b.id, booking: bNext },
      ],
      s,
    );
    expect(s.byId[a.id]).toEqual(a);
    expect(s.byId[b.id]!.status).toBe(BookingStatus.Attended);
    expect(s.flash).toEqual({ [a.id]: 1000 });
    expect(s.pending).toEqual({});
    expect(rangeReducer(s, { type: 'flashCleared', id: a.id }).flash).toEqual({});
  });

  it('a second edit on a booking in flight keeps the first prev', () => {
    const a = sampleBooking();
    const n1 = { ...a, startTime: '2026-08-18T11:00:00-06:00' } as BookingRecord;
    const n2 = { ...a, startTime: '2026-08-18T12:00:00-06:00' } as BookingRecord;
    let s = loaded([a]);
    s = run(
      [
        { type: 'editStarted', id: a.id, next: n1 },
        { type: 'editStarted', id: a.id, next: n2 },
      ],
      s,
    );
    expect(s.pending[a.id]!.prev).toEqual(a);
    expect(s.pending[a.id]!.next).toEqual(n2);
    s = run([{ type: 'editFailed', id: a.id, now: 5 }], s);
    expect(s.byId[a.id]).toEqual(a);
  });

  it('a load landing mid-flight keeps the optimistic record', () => {
    const a = sampleBooking({ start: '2026-08-18T10:00:00-06:00' });
    const next = { ...a, startTime: '2026-08-18T14:00:00-06:00' } as BookingRecord;
    let s = loaded([a]);
    s = run(
      [
        { type: 'editStarted', id: a.id, next },
        { type: 'reset', vars: WEEK },
        { type: 'rangeLoaded', epoch: 2, vars: WEEK, bookings: [a] },
      ],
      s,
    );
    expect(s.byId[a.id]!.startTime).toBe('2026-08-18T14:00:00-06:00');
    expect(s.pending[a.id]).toBeDefined();
  });

  it('editStarted on an unknown id is a no-op', () => {
    const s = loaded([]);
    expect(rangeReducer(s, { type: 'editStarted', id: 'x', next: sampleBooking() })).toBe(s);
    expect(rangeReducer(s, { type: 'editFailed', id: 'x', now: 1 })).toBe(s);
    expect(rangeReducer(s, { type: 'editSucceeded', id: 'x', booking: sampleBooking() })).toBe(s);
  });

  it('a booking deleted mid-flight is not resurrected by its own success', () => {
    const a = sampleBooking({ start: '2026-08-18T10:00:00-06:00' });
    const next = { ...a, startTime: '2026-08-18T11:00:00-06:00' } as BookingRecord;
    let s = loaded([a]);
    s = run(
      [
        { type: 'editStarted', id: a.id, next },
        // Somebody else deletes it while my update is on the wire.
        { type: 'live', event: { kind: 'remove', id: a.id, origin: 'live' } },
        { type: 'editSucceeded', id: a.id, booking: next },
      ],
      s,
    );
    expect(s.byId[a.id]).toBeUndefined();
    expect(s.pending).toEqual({});
  });
});

describe('selection and selectors', () => {
  it('toggles, sets (dropping unknown ids) and clears', () => {
    const a = sampleBooking();
    const b = sampleBooking({ start: '2026-08-19T10:00:00-06:00' });
    let s = loaded([a, b]);
    s = run([{ type: 'selectionToggled', id: a.id }], s);
    expect(s.selection).toEqual([a.id]);
    s = run([{ type: 'selectionToggled', id: a.id }], s);
    expect(s.selection).toEqual([]);
    s = run([{ type: 'selectionSet', ids: [b.id, 'ghost', b.id] }], s);
    expect(selectSelected(s).map((x) => x.id)).toEqual([b.id]);
    expect(rangeReducer(s, { type: 'selectionCleared' }).selection).toEqual([]);
    // reset clears the selection too
    expect(rangeReducer(s, { type: 'reset', vars: WEEK }).selection).toEqual([]);
  });

  it('selectionPruned keeps only visible ids, and bails to the same state when nothing is pruned', () => {
    const a = sampleBooking();
    const b = sampleBooking({ start: '2026-08-19T10:00:00-06:00' });
    let s = loaded([a, b]);
    s = run([{ type: 'selectionSet', ids: [a.id, b.id] }], s);
    // Nothing hidden: the SAME object comes back (React bails on the dispatch).
    expect(rangeReducer(s, { type: 'selectionPruned', visible: [a.id, b.id, 'extra'] })).toBe(s);
    // b left the visible set: only a survives.
    expect(rangeReducer(s, { type: 'selectionPruned', visible: [a.id] }).selection).toEqual([a.id]);
    expect(rangeReducer(s, { type: 'selectionPruned', visible: [] }).selection).toEqual([]);
  });

  it('selectByIds resolves ids in order and skips unknown ones', () => {
    const a = sampleBooking();
    const b = sampleBooking({ start: '2026-08-19T10:00:00-06:00' });
    const s = loaded([a, b]);
    expect(selectByIds(s, [b.id, 'ghost', a.id]).map((r) => r.id)).toEqual([b.id, a.id]);
    expect(selectByIds(s, [])).toEqual([]);
  });

  it('selectVisible sorts by start, then longer first, then id', () => {
    const later = sampleBooking({ start: '2026-08-19T10:00:00-06:00' });
    const shortOne = sampleBooking({ start: '2026-08-18T10:00:00-06:00', minutes: 15 });
    const longOne = sampleBooking({ start: '2026-08-18T10:00:00-06:00', minutes: 60 });
    const s = loaded([later, shortOne, longOne]);
    expect(selectVisible(s).map((b) => b.id)).toEqual([longOne.id, shortOne.id, later.id]);
  });
});
