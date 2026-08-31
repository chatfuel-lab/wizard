import { describe, expect, it } from 'vitest';
import type { DisplayZone } from '../types';
import { UNASSIGNED } from './bookingsFilter';
import { layoutGrid } from './calendarLayout';
import { rangeForMode } from './calendarRange';
import {
  createPrefill,
  duplicatePrefill,
  instantAt,
  monthDropEdit,
  moveEdit,
  nudgeEdit,
  resizeEdit,
  resizeNudge,
  slotPrefill,
  specialistRefFor,
  wireIso,
} from './gridSpan';
import { sampleBooking, sampleSpecialist } from './samples';
import { toZoneIso, zonedInstant } from './zone';

const BERLIN = 'Europe/Berlin';
const MEXICO = 'America/Mexico_City';
const NEW_YORK = 'America/New_York';
const botZone: DisplayZone = { botZone: BERLIN, zone: BERLIN, source: 'bot' };
const localZone: DisplayZone = { botZone: BERLIN, zone: MEXICO, source: 'local' };

const MON = '2026-08-17';
const TUE = '2026-08-18';
const week = rangeForMode('week', MON, 1);
const alex = sampleSpecialist({
  id: 'sp-alex',
  profile: { firstName: 'Alex', lastName: 'Kim', aboutInfo: null, logo: null },
});
const maria = sampleSpecialist({
  id: 'sp-maria',
  profile: { firstName: 'Maria', lastName: null, aboutInfo: null, logo: null },
});
const catalog = [alex, maria];
const ALEX_REF = {
  __typename: 'Specialist',
  id: 'sp-alex',
  profile: { firstName: 'Alex', lastName: 'Kim', logo: null },
} as never;

/** A booking on Alex at `hh:mm` Berlin on `dayKey`, `minutes` long. */
const bookingAt = (
  dayKey: string,
  hh: number,
  mm: number,
  minutes: number,
  over: Parameters<typeof sampleBooking>[0] = {},
) =>
  sampleBooking({
    start: toZoneIso(zonedInstant(dayKey, hh * 60 + mm, BERLIN), BERLIN),
    minutes,
    specialist: ALEX_REF,
    ...over,
  });

const eventOf = (
  records: ReturnType<typeof sampleBooking>[],
  by: 'time' | 'specialist' = 'time',
  zone = botZone,
  id?: string,
) => {
  const layout = layoutGrid({
    mode: by === 'time' ? 'week' : 'day',
    by,
    range: by === 'time' ? week : rangeForMode('day', MON, 1),
    records,
    catalog,
    filterSpecialists: [],
    zone,
  });
  const event = id ? layout.events.find((e) => e.id === id) : layout.events[0];
  if (!event) throw new Error('no event');
  return { event, ctx: { zone, columns: layout.columns, catalog, records, locale: 'en-US', hour12: false } };
};

describe('instants and wire format', () => {
  it('instantAt normalises 1440 to the next day', () => {
    expect(instantAt(MON, 1440, BERLIN)).toBe(zonedInstant(TUE, 0, BERLIN));
    expect(instantAt(MON, 1500, BERLIN)).toBe(zonedInstant(TUE, 60, BERLIN));
    expect(instantAt(TUE, -60, BERLIN)).toBe(zonedInstant(MON, 1380, BERLIN));
  });
  it('wireIso uses the bot offset, or UTC when the bot has none', () => {
    const at = zonedInstant(MON, 600, BERLIN);
    expect(wireIso(at, botZone)).toBe('2026-08-17T10:00:00+02:00');
    expect(wireIso(at, localZone)).toBe('2026-08-17T10:00:00+02:00'); // display zone does not matter on the wire
    expect(wireIso(at, { botZone: null, zone: MEXICO, source: 'local' })).toBe('2026-08-17T08:00:00+00:00');
  });
});

describe('moveEdit', () => {
  it('moves to another day and time, keeping the duration', () => {
    const { event, ctx } = eventOf([bookingAt(MON, 9, 0, 45)]);
    const edit = moveEdit(event, { columnId: TUE, start: 615, end: 660 }, ctx);
    expect(edit).toEqual({
      kind: 'move',
      detail: 'Tue 10:15',
      patch: { startTime: '2026-08-18T10:15:00+02:00', endTime: '2026-08-18T11:00:00+02:00' },
    });
  });
  it('is null when nothing changed', () => {
    const { event, ctx } = eventOf([bookingAt(MON, 9, 0, 45)]);
    expect(moveEdit(event, { columnId: MON, start: 540, end: 585 }, ctx)).toBeNull();
  });
  it('is null for an unknown column', () => {
    const { event, ctx } = eventOf([bookingAt(MON, 9, 0, 45)]);
    expect(moveEdit(event, { columnId: '2027-01-01', start: 540, end: 585 }, ctx)).toBeNull();
  });
  it('resolves the start from the DISPLAY zone and sends the bot offset', () => {
    const { event, ctx } = eventOf([bookingAt(MON, 9, 0, 30)], 'time', localZone);
    // 09:00 Berlin = 01:00 Mexico City; the block sits at minute 60. Drag it to 02:00 local = 10:00 Berlin.
    expect(event.start).toBe(60);
    const edit = moveEdit(event, { columnId: MON, start: 120, end: 150 }, ctx);
    expect(edit?.patch).toEqual({ startTime: '2026-08-17T10:00:00+02:00', endTime: '2026-08-17T10:30:00+02:00' });
    expect(edit?.detail).toBe('Mon 02:00');
  });
  it('dragging the tail of a midnight-crossing booking moves the whole booking', () => {
    const late = bookingAt(MON, 23, 30, 60, { id: 'late' });
    const { event, ctx } = eventOf([late], 'time', botZone, 'late~1');
    expect(event).toMatchObject({ segment: 1, start: 0, end: 30, columnId: TUE });
    // Drop the tail at 01:00 Tuesday: the booking now runs 00:30–01:30 Tuesday.
    const edit = moveEdit(event, { columnId: TUE, start: 60, end: 90 }, ctx);
    expect(edit?.patch).toEqual({ startTime: '2026-08-18T00:30:00+02:00', endTime: '2026-08-18T01:30:00+02:00' });
  });
  it('keeps the millisecond duration across a DST change', () => {
    const ny: DisplayZone = { botZone: NEW_YORK, zone: NEW_YORK, source: 'bot' };
    // Sat 2026-03-07 10:00–11:00 New York; drop it on Sunday 2026-03-08 (the spring-forward day) at 01:30 local.
    const start = zonedInstant('2026-03-07', 600, NEW_YORK);
    const record = sampleBooking({ start: toZoneIso(start, NEW_YORK), minutes: 60 });
    const layout = layoutGrid({
      mode: 'week',
      by: 'time',
      range: rangeForMode('week', '2026-03-07', 1),
      records: [record],
      catalog,
      filterSpecialists: [],
      zone: ny,
    });
    const edit = moveEdit(
      layout.events[0]!,
      { columnId: '2026-03-08', start: 90, end: 150 },
      { zone: ny, columns: layout.columns, catalog },
    );
    const s = new Date(edit!.patch.startTime!).getTime();
    const e = new Date(edit!.patch.endTime!).getTime();
    expect(e - s).toBe(3_600_000);
    expect(edit!.patch.startTime).toBe('2026-03-08T01:30:00-05:00');
    expect(edit!.patch.endTime).toBe('2026-03-08T03:30:00-04:00'); // 02:30 does not exist; the hour after 01:30 is 03:30 EDT
  });
});

describe('moveEdit by specialist', () => {
  it('a column change is a reassign with the catalog reference', () => {
    const { event, ctx } = eventOf([bookingAt(MON, 9, 0, 30)], 'specialist');
    const edit = moveEdit(event, { columnId: 'sp-maria', start: 540, end: 570 }, ctx);
    expect(edit?.kind).toBe('reassign');
    expect(edit?.detail).toBe('Maria');
    expect(edit?.patch.startTime).toBeUndefined();
    expect(edit?.patch.specialist).toMatchObject({
      __typename: 'Specialist',
      id: 'sp-maria',
      profile: { firstName: 'Maria' },
    });
  });
  it('a change of column and time is a move carrying the specialist', () => {
    const { event, ctx } = eventOf([bookingAt(MON, 9, 0, 30)], 'specialist');
    const edit = moveEdit(event, { columnId: 'sp-maria', start: 600, end: 630 }, ctx);
    expect(edit?.kind).toBe('move');
    expect(edit?.detail).toBe('Mon 10:00 · Maria');
    expect(edit?.patch).toMatchObject({ startTime: '2026-08-17T10:00:00+02:00', specialist: { id: 'sp-maria' } });
  });
  it('the Unassigned column patches specialist: null', () => {
    const records = [bookingAt(MON, 9, 0, 30), bookingAt(MON, 12, 0, 30, { specialist: null })];
    const { event, ctx } = eventOf(records, 'specialist', botZone, records[0]!.id);
    const edit = moveEdit(event, { columnId: UNASSIGNED, start: 540, end: 570 }, ctx);
    expect(edit).toEqual({ kind: 'reassign', detail: 'Unassigned', patch: { specialist: null } });
  });
  it('a deleted-specialist column reuses the reference a record still carries', () => {
    const gone = bookingAt(MON, 12, 0, 30, {
      id: 'gone',
      specialist: {
        __typename: 'DeletedSpecialist',
        id: 'sp-old',
        profile: { firstName: 'Jo', lastName: 'Former' },
      } as never,
    });
    const records = [bookingAt(MON, 9, 0, 30), gone];
    const { event, ctx } = eventOf(records, 'specialist', botZone, records[0]!.id);
    const edit = moveEdit(event, { columnId: 'sp-old', start: 540, end: 570 }, ctx);
    expect(edit?.patch.specialist).toMatchObject({ __typename: 'DeletedSpecialist', id: 'sp-old' });
    expect(edit?.detail).toBe('Jo Former');
  });
  it('specialistRefFor: catalog, unassigned, deleted, unknown', () => {
    expect(specialistRefFor('sp-alex', catalog)).toMatchObject({
      id: 'sp-alex',
      profile: { firstName: 'Alex', lastName: 'Kim' },
    });
    expect(specialistRefFor(UNASSIGNED, catalog)).toBeNull();
    expect(specialistRefFor('nope', catalog)).toBeUndefined();
  });
});

describe('resizeEdit', () => {
  it('moves the end edge only', () => {
    const { event, ctx } = eventOf([bookingAt(MON, 9, 0, 30)]);
    const edit = resizeEdit(event, { columnId: MON, start: 540, end: 600 }, ctx);
    expect(edit).toEqual({
      kind: 'resize',
      detail: '09:00 – 10:00',
      patch: { startTime: '2026-08-17T09:00:00+02:00', endTime: '2026-08-17T10:00:00+02:00' },
    });
  });
  it('moves the start edge only', () => {
    const { event, ctx } = eventOf([bookingAt(MON, 9, 0, 30)]);
    const edit = resizeEdit(event, { columnId: MON, start: 525, end: 570 }, ctx);
    expect(edit?.patch).toEqual({ startTime: '2026-08-17T08:45:00+02:00', endTime: '2026-08-17T09:30:00+02:00' });
  });
  it('refuses to invert and ignores no-ops', () => {
    const { event, ctx } = eventOf([bookingAt(MON, 9, 0, 30)]);
    expect(resizeEdit(event, { columnId: MON, start: 600, end: 570 }, ctx)).toBeNull();
    expect(resizeEdit(event, { columnId: MON, start: 540, end: 570 }, ctx)).toBeNull();
  });
  it('an end at 1440 is midnight of the next day', () => {
    const { event, ctx } = eventOf([bookingAt(MON, 23, 0, 30)]);
    const edit = resizeEdit(event, { columnId: MON, start: 1380, end: 1440 }, ctx);
    expect(edit?.patch.endTime).toBe('2026-08-18T00:00:00+02:00');
  });
});

describe('create, slot and duplicate prefills', () => {
  it('createPrefill: instants in the bot zone; a specialist column names the specialist', () => {
    const { ctx } = eventOf([bookingAt(MON, 9, 0, 30)]);
    expect(createPrefill({ columnId: TUE, start: 600, end: 660 }, ctx)).toEqual({
      start: '2026-08-18T10:00:00+02:00',
      end: '2026-08-18T11:00:00+02:00',
    });
    const bySp = eventOf([bookingAt(MON, 9, 0, 30), bookingAt(MON, 12, 0, 30, { specialist: null })], 'specialist');
    expect(createPrefill({ columnId: 'sp-maria', start: 600, end: 630 }, bySp.ctx)).toEqual({
      start: '2026-08-17T10:00:00+02:00',
      end: '2026-08-17T10:30:00+02:00',
      specialist: 'sp-maria',
    });
    expect(createPrefill({ columnId: UNASSIGNED, start: 600, end: 630 }, bySp.ctx)?.specialist).toBeNull();
    expect(createPrefill({ columnId: 'nope', start: 600, end: 630 }, ctx)).toBeNull();
    expect(createPrefill({ columnId: TUE, start: 600, end: 600 }, ctx)).toBeNull();
  });
  it('createPrefill from another display zone still sends bot offsets', () => {
    const { ctx } = eventOf([bookingAt(MON, 9, 0, 30)], 'time', localZone);
    expect(createPrefill({ columnId: MON, start: 60, end: 90 }, ctx)).toEqual({
      start: '2026-08-17T09:00:00+02:00',
      end: '2026-08-17T09:30:00+02:00',
    });
  });
  it('slotPrefill is one snap step', () => {
    const { ctx } = eventOf([bookingAt(MON, 9, 0, 30)]);
    expect(slotPrefill(MON, 615, 15, ctx)).toEqual({
      start: '2026-08-17T10:15:00+02:00',
      end: '2026-08-17T10:30:00+02:00',
    });
  });
  it('duplicatePrefill copies time, service and specialist', () => {
    expect(duplicatePrefill(sampleBooking({ start: '2026-08-18T10:00:00-06:00', minutes: 30 }))).toEqual({
      start: '2026-08-18T10:00:00-06:00',
      end: '2026-08-18T16:30:00+00:00',
      specialist: 'sp-1',
      service: 'svc-1',
    });
    expect(duplicatePrefill(sampleBooking({ specialist: null, service: null }))).toMatchObject({
      specialist: null,
      service: null,
    });
  });
});

describe('monthDropEdit', () => {
  it('keeps the wall-clock time of day in the display zone', () => {
    const record = bookingAt(MON, 9, 30, 45);
    const edit = monthDropEdit(record, '2026-08-20', { zone: botZone, locale: 'en-US', hour12: false });
    expect(edit).toEqual({
      kind: 'move',
      detail: 'Thu 09:30',
      patch: { startTime: '2026-08-20T09:30:00+02:00', endTime: '2026-08-20T10:15:00+02:00' },
    });
    expect(monthDropEdit(record, MON, { zone: botZone })).toBeNull();
  });
  it('in another display zone the local time of day is what stays', () => {
    const record = bookingAt(MON, 9, 0, 30); // 01:00 in Mexico City
    const edit = monthDropEdit(record, TUE, { zone: localZone });
    expect(edit?.patch.startTime).toBe('2026-08-18T09:00:00+02:00');
  });
});

describe('keyboard nudges', () => {
  it('±15 minutes and ±1 column, clamped at the edges', () => {
    const { event, ctx } = eventOf([bookingAt(MON, 9, 0, 30)]);
    expect(nudgeEdit(event, { minutes: 15 }, ctx)?.patch.startTime).toBe('2026-08-17T09:15:00+02:00');
    expect(nudgeEdit(event, { minutes: -15 }, ctx)?.patch.startTime).toBe('2026-08-17T08:45:00+02:00');
    expect(nudgeEdit(event, { columns: 1 }, ctx)?.patch.startTime).toBe('2026-08-18T09:00:00+02:00');
    expect(nudgeEdit(event, { columns: -1 }, ctx)).toBeNull(); // Monday is the first column
  });
  it('a nudge past midnight is refused', () => {
    const { event, ctx } = eventOf([bookingAt(MON, 23, 45, 15)]);
    expect(nudgeEdit(event, { minutes: 15 }, ctx)).toBeNull();
    const early = eventOf([bookingAt(MON, 0, 0, 15)]);
    expect(nudgeEdit(early.event, { minutes: -15 }, early.ctx)).toBeNull();
  });
  it('column nudge by specialist is a reassign', () => {
    const { event, ctx } = eventOf([bookingAt(MON, 9, 0, 30)], 'specialist');
    expect(nudgeEdit(event, { columns: 1 }, ctx)).toMatchObject({ kind: 'reassign', detail: 'Maria' });
  });
  it('resizeNudge respects the minimum and midnight', () => {
    const { event, ctx } = eventOf([bookingAt(MON, 9, 0, 30)]);
    expect(resizeNudge(event, 15, 15, ctx)?.patch.endTime).toBe('2026-08-17T09:45:00+02:00');
    expect(resizeNudge(event, -15, 15, ctx)?.patch.endTime).toBe('2026-08-17T09:15:00+02:00');
    expect(resizeNudge(event, -30, 15, ctx)).toBeNull();
    const late = eventOf([bookingAt(MON, 23, 30, 30)]);
    expect(resizeNudge(late.event, 15, 15, late.ctx)).toBeNull();
  });
});
