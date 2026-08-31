import { describe, expect, it } from 'vitest';
import { BookingStatus } from '~api/generated/bookings/graphql';
import type { DisplayZone, SpecialistRecord } from '../types';
import { UNASSIGNED } from './bookingsFilter';
import {
  blockLook,
  bookingIdOf,
  calendarEmptyCopy,
  countsByColumn,
  dayColumnHeading,
  dayHoursLabel,
  displayRanges,
  eventSubtitle,
  eventTitle,
  layoutGrid,
  layoutSignature,
  monthBuckets,
  moveDetail,
  nowLine,
  rangeLabel,
  scopedSpecialists,
  segmentsOf,
  shiftRanges,
  signatureOf,
  startDayKey,
  zoneShiftMinutes,
} from './calendarLayout';
import { rangeForMode } from './calendarRange';
import { sampleBooking, sampleDay, sampleSpecialist } from './samples';
import { zonedInstant, toZoneIso } from './zone';

const BERLIN = 'Europe/Berlin';
const MEXICO = 'America/Mexico_City';
const botZone: DisplayZone = { botZone: BERLIN, zone: BERLIN, source: 'bot' };
const localZone: DisplayZone = { botZone: BERLIN, zone: MEXICO, source: 'local' };

const alex = sampleSpecialist({
  id: 'sp-alex',
  profile: { firstName: 'Alex', lastName: 'Kim', aboutInfo: null, logo: null },
});
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
) => {
  const start = zonedInstant(dayKey, hh * 60 + mm, BERLIN);
  return sampleBooking({ start: toZoneIso(start, BERLIN), minutes, specialist: ALEX_REF, ...over });
};
const maria = sampleSpecialist({
  id: 'sp-maria',
  profile: { firstName: 'Maria', lastName: null, aboutInfo: null, logo: null },
  schedule: {
    enabled: true,
    sun: { enabled: false, start: '09:00', end: '18:00', break: null },
    mon: { enabled: false, start: '09:00', end: '18:00', break: null },
    tue: sampleDay('10:00', '19:00'),
    wed: sampleDay('10:00', '19:00'),
    thu: sampleDay('10:00', '19:00'),
    fri: sampleDay('10:00', '19:00'),
    sat: sampleDay('10:00', '19:00'),
  },
});
const sam: SpecialistRecord = sampleSpecialist({
  id: 'sp-sam',
  profile: { firstName: 'Sam', lastName: null, aboutInfo: null, logo: null },
  schedule: null,
});
const catalog = [alex, maria, sam];

// 2026-08-17 is a Monday.
const MON = '2026-08-17';
const TUE = '2026-08-18';
const week = rangeForMode('week', MON, 1);

describe('segments and keys', () => {
  it('splits a booking that crosses midnight, in the display zone', () => {
    const late = bookingAt(MON, 23, 30, 60);
    expect(segmentsOf(late, BERLIN)).toEqual([
      { dayKey: MON, start: 1410, end: 1440 },
      { dayKey: TUE, start: 0, end: 30 },
    ]);
    // Seen from Mexico City (−8h in August) it is one afternoon block.
    expect(segmentsOf(late, MEXICO)).toEqual([{ dayKey: MON, start: 930, end: 990 }]);
  });
  it('drops empty and inverted ranges', () => {
    const bad = sampleBooking({ start: '2026-08-17T10:00:00+02:00', endTime: '2026-08-17T09:00:00+02:00' });
    expect(segmentsOf(bad, BERLIN)).toEqual([]);
  });
  it('bookingIdOf strips the tail marker', () => {
    expect(bookingIdOf('bk-1')).toBe('bk-1');
    expect(bookingIdOf('bk-1~1')).toBe('bk-1');
  });
  it('startDayKey follows the display zone', () => {
    const early = bookingAt(MON, 1, 0, 30);
    expect(startDayKey(early, BERLIN)).toBe(MON);
    expect(startDayKey(early, MEXICO)).toBe('2026-08-16');
  });
});

describe('zone shift of schedules', () => {
  it('is zero in the bot zone and the offset difference elsewhere', () => {
    expect(zoneShiftMinutes(MON, botZone)).toBe(0);
    expect(zoneShiftMinutes(MON, localZone)).toBe(-480); // Berlin +2, Mexico City −6
    expect(zoneShiftMinutes(MON, { botZone: null, zone: MEXICO, source: 'local' })).toBe(0);
  });
  it('shiftRanges clips to the day', () => {
    expect(shiftRanges([{ start: 540, end: 1080 }], -480)).toEqual([{ start: 60, end: 600 }]);
    expect(shiftRanges([{ start: 540, end: 1080 }], 480)).toEqual([{ start: 1020, end: 1440 }]);
    expect(shiftRanges([{ start: 540, end: 1080 }], 1000)).toEqual([]);
  });
  it('displayRanges picks up the neighbouring day when the shift crosses midnight', () => {
    const pick = (day: string) => (day === 'mon' ? [{ start: 540, end: 1080 }] : []);
    // Tokyo-ish (+7h from Berlin): Monday 09–18 Berlin is Monday 16–24 and Tuesday 00–01 locally.
    expect(displayRanges(pick, MON, 420)).toEqual([{ start: 960, end: 1440 }]);
    expect(displayRanges(pick, TUE, 420)).toEqual([{ start: 0, end: 60 }]);
    // No shift: exactly the day's own ranges.
    expect(displayRanges(pick, MON, 0)).toEqual([{ start: 540, end: 1080 }]);
  });
});

describe('layoutGrid by time', () => {
  it('makes one column per day of the range with day-key ids', () => {
    const layout = layoutGrid({
      mode: 'week',
      by: 'time',
      range: week,
      records: [],
      catalog,
      filterSpecialists: [],
      zone: botZone,
    });
    expect(layout.columns.map((c) => c.id)).toEqual([
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
      '2026-08-21',
      '2026-08-22',
      '2026-08-23',
    ]);
    expect(layout.columns.every((c) => c.kind === 'day')).toBe(true);
  });
  it('places events by display-zone minutes and splits at midnight', () => {
    const a = bookingAt(MON, 9, 15, 45, { id: 'a' });
    const late = bookingAt(MON, 23, 30, 60, { id: 'late' });
    const layout = layoutGrid({
      mode: 'week',
      by: 'time',
      range: week,
      records: [late, a],
      catalog,
      filterSpecialists: [],
      zone: botZone,
    });
    expect(layout.events.map((e) => [e.id, e.columnId, e.start, e.end])).toEqual([
      ['late~1', TUE, 0, 30],
      ['a', MON, 555, 600],
      ['late', MON, 1410, 1440],
    ]);
    expect(layout.events.find((e) => e.id === 'late~1')?.bookingId).toBe('late');
    expect(layout.events.find((e) => e.id === 'late')?.segments).toBe(2);
  });
  it('drops segments outside the range (a booking on the day after)', () => {
    const next = bookingAt('2026-08-24', 9, 0, 30);
    const layout = layoutGrid({
      mode: 'day',
      by: 'time',
      range: rangeForMode('day', '2026-08-23', 1),
      records: [next],
      catalog,
      filterSpecialists: [],
      zone: botZone,
    });
    expect(layout.events).toEqual([]);
  });
  it('shifts events when the display zone differs', () => {
    const a = bookingAt(MON, 9, 0, 30, { id: 'a' });
    const layout = layoutGrid({
      mode: 'day',
      by: 'time',
      range: rangeForMode('day', MON, 1),
      records: [a],
      catalog,
      filterSpecialists: [],
      zone: localZone,
    });
    expect(layout.events[0]).toMatchObject({ start: 60, end: 90 });
  });
  it('business hours are the union of in-scope specialists, breaks the intersection', () => {
    const layout = layoutGrid({
      mode: 'week',
      by: 'time',
      range: week,
      records: [],
      catalog,
      filterSpecialists: [],
      zone: botZone,
    });
    // Monday: only Alex works (09–18, break 13–14 removed from his ranges) → union = his ranges; he is the only one working → his break is blocked.
    expect(layout.businessHours?.[MON]).toEqual([
      { start: 540, end: 780 },
      { start: 840, end: 1080 },
    ]);
    expect(layout.blocked.filter((b) => b.columnId === MON)).toEqual([{ columnId: MON, start: 780, end: 840 }]);
    // Tuesday: Alex 09–18 (no break in the sample) and Maria 10–19 → 09–19, no shared break.
    expect(layout.businessHours?.[TUE]).toEqual([{ start: 540, end: 1140 }]);
    expect(layout.blocked.filter((b) => b.columnId === TUE)).toEqual([]);
    // Sunday: nobody → closed.
    expect(layout.businessHours?.['2026-08-23']).toBeNull();
    // Opens at the earliest working minute (the grid adds its own half hour above).
    expect(layout.initialScrollMinute).toBe(540);
  });
  it('one specialist in scope → their hours and their break', () => {
    const layout = layoutGrid({
      mode: 'day',
      by: 'time',
      range: rangeForMode('day', MON, 1),
      records: [],
      catalog,
      filterSpecialists: ['sp-alex'],
      zone: botZone,
    });
    expect(layout.blocked).toEqual([{ columnId: MON, start: 780, end: 840 }]);
  });
  it('no schedules at all → no shading', () => {
    const layout = layoutGrid({
      mode: 'day',
      by: 'time',
      range: rangeForMode('day', MON, 1),
      records: [],
      catalog: [sam],
      filterSpecialists: [],
      zone: botZone,
    });
    expect(layout.businessHours).toBeNull();
    expect(layout.initialScrollMinute).toBe(480);
  });
  it('shifted business hours in another display zone', () => {
    const layout = layoutGrid({
      mode: 'day',
      by: 'time',
      range: rangeForMode('day', MON, 1),
      records: [],
      catalog: [alex],
      filterSpecialists: [],
      zone: localZone,
    });
    expect(layout.businessHours?.[MON]).toEqual([
      { start: 60, end: 300 },
      { start: 360, end: 600 },
    ]);
  });
  it('sorts events by start', () => {
    const b = bookingAt(MON, 11, 0, 30, { id: 'b' });
    const a = bookingAt(MON, 10, 0, 30, { id: 'a' });
    const layout = layoutGrid({
      mode: 'day',
      by: 'time',
      range: rangeForMode('day', MON, 1),
      records: [b, a],
      catalog,
      filterSpecialists: [],
      zone: botZone,
    });
    expect(layout.events.map((e) => e.id)).toEqual(['a', 'b']);
  });
});

describe('layoutGrid by specialist', () => {
  const day = rangeForMode('day', MON, 1);
  it('one column per in-scope specialist in catalog order, unassigned only when needed', () => {
    const layout = layoutGrid({
      mode: 'day',
      by: 'specialist',
      range: day,
      records: [],
      catalog,
      filterSpecialists: [],
      zone: botZone,
    });
    expect(layout.columns.map((c) => c.id)).toEqual(['sp-alex', 'sp-maria', 'sp-sam']);
    const withUnassigned = layoutGrid({
      mode: 'day',
      by: 'specialist',
      range: day,
      records: [bookingAt(MON, 12, 0, 30, { specialist: null })],
      catalog,
      filterSpecialists: [],
      zone: botZone,
    });
    expect(withUnassigned.columns.map((c) => c.id)).toEqual(['sp-alex', 'sp-maria', 'sp-sam', UNASSIGNED]);
    expect(withUnassigned.events[0]?.columnId).toBe(UNASSIGNED);
  });
  it('the filter narrows the columns; asking for unassigned shows the column even when empty', () => {
    const layout = layoutGrid({
      mode: 'day',
      by: 'specialist',
      range: day,
      records: [],
      catalog,
      filterSpecialists: ['sp-maria', UNASSIGNED],
      zone: botZone,
    });
    expect(layout.columns.map((c) => c.id)).toEqual(['sp-maria', UNASSIGNED]);
  });
  it('a deleted specialist reference gets its own column, before Unassigned', () => {
    const gone = bookingAt(MON, 12, 0, 30, {
      id: 'gone',
      specialist: {
        __typename: 'DeletedSpecialist',
        id: 'sp-old',
        profile: { firstName: 'Jo', lastName: 'Former' },
      } as never,
    });
    const layout = layoutGrid({
      mode: 'day',
      by: 'specialist',
      range: day,
      records: [gone, bookingAt(MON, 13, 0, 30, { specialist: null })],
      catalog,
      filterSpecialists: [],
      zone: botZone,
    });
    expect(layout.columns.map((c) => c.id)).toEqual(['sp-alex', 'sp-maria', 'sp-sam', 'sp-old', UNASSIGNED]);
    const deleted = layout.columns.find((c) => c.id === 'sp-old');
    expect(deleted?.kind === 'specialist' && deleted.deleted).toBe(true);
    expect(deleted?.label).toBe('Jo Former (deleted)');
    expect(layout.businessHours?.['sp-old']).toBeNull();
  });
  it('per-column hours and breaks; a day off and no schedule are closed', () => {
    const layout = layoutGrid({
      mode: 'day',
      by: 'specialist',
      range: day,
      records: [],
      catalog,
      filterSpecialists: [],
      zone: botZone,
    });
    expect(layout.businessHours?.['sp-alex']).toEqual([
      { start: 540, end: 780 },
      { start: 840, end: 1080 },
    ]);
    expect(layout.businessHours?.['sp-maria']).toBeNull(); // Monday off
    expect(layout.businessHours?.['sp-sam']).toBeNull(); // no schedule
    expect(layout.blocked).toEqual([{ columnId: 'sp-alex', start: 780, end: 840 }]);
  });
  it('a booking on another day does not appear; only the anchor day counts', () => {
    const layout = layoutGrid({
      mode: 'day',
      by: 'specialist',
      range: day,
      records: [bookingAt(TUE, 9, 0, 30)],
      catalog,
      filterSpecialists: [],
      zone: botZone,
    });
    expect(layout.events).toEqual([]);
  });
  it('a booking for a filtered-out specialist has no column and is not drawn', () => {
    const layout = layoutGrid({
      mode: 'day',
      by: 'specialist',
      range: day,
      records: [bookingAt(MON, 9, 0, 30)],
      catalog,
      filterSpecialists: ['sp-maria'],
      zone: botZone,
    });
    expect(layout.columns.map((c) => c.id)).toEqual(['sp-maria']);
    expect(layout.events).toEqual([]);
  });
});

describe('scopedSpecialists', () => {
  it('keeps catalog order and ignores unknown ids', () => {
    expect(scopedSpecialists(catalog, []).map((s) => s.id)).toEqual(['sp-alex', 'sp-maria', 'sp-sam']);
    expect(scopedSpecialists(catalog, ['sp-sam', 'sp-alex', UNASSIGNED]).map((s) => s.id)).toEqual([
      'sp-alex',
      'sp-sam',
    ]);
  });
});

describe('nowLine', () => {
  const layout = layoutGrid({
    mode: 'week',
    by: 'time',
    range: week,
    records: [],
    catalog,
    filterSpecialists: [],
    zone: botZone,
  });
  it('by time: only when today is a visible column', () => {
    const now = zonedInstant(TUE, 10 * 60 + 5, BERLIN);
    expect(nowLine(layout, false, now, BERLIN)).toEqual({ minute: 605, columnId: TUE });
    expect(nowLine(layout, false, zonedInstant('2026-09-01', 600, BERLIN), BERLIN)).toBeNull();
  });
  it('by specialist: every column on the anchor day, nothing on another day', () => {
    const today = layoutGrid({
      mode: 'day',
      by: 'specialist',
      range: rangeForMode('day', TUE, 1),
      records: [],
      catalog,
      filterSpecialists: [],
      zone: botZone,
    });
    expect(nowLine(today, true, zonedInstant(TUE, 600, BERLIN), BERLIN)).toEqual({ minute: 600 });
    expect(nowLine(today, true, zonedInstant(MON, 600, BERLIN), BERLIN)).toBeNull();
  });
});

describe('month buckets', () => {
  it('buckets by the display-zone start day', () => {
    const early = bookingAt(MON, 1, 0, 30, { id: 'early' });
    const noon = bookingAt(MON, 12, 0, 30, { id: 'noon' });
    expect(Array.from(monthBuckets([early, noon], BERLIN).keys())).toEqual([MON]);
    const inMexico = monthBuckets([early, noon], MEXICO);
    expect(inMexico.get('2026-08-16')?.map((r) => r.id)).toEqual(['early']);
    expect(inMexico.get(MON)?.map((r) => r.id)).toEqual(['noon']);
  });
});

describe('block look', () => {
  it('by specialist: catalog position → tone, status → look', () => {
    const order = ['sp-alex', 'sp-1'];
    expect(blockLook(sampleBooking(), 'specialist', order)).toEqual({ tone: 2, status: 'default' });
    expect(blockLook(sampleBooking(), 'specialist', ['sp-alex'])).toEqual({ tone: 'neutral', status: 'default' });
    expect(blockLook(sampleBooking({ specialist: null, status: BookingStatus.Pending }), 'specialist', order)).toEqual({
      tone: 'neutral',
      status: 'tentative',
    });
    expect(blockLook(sampleBooking({ status: BookingStatus.Canceled }), 'specialist', order).status).toBe('muted');
  });
  it('by status: fixed tones per status', () => {
    expect(blockLook(sampleBooking(), 'status', []).tone).toBe(1);
    expect(blockLook(sampleBooking({ status: BookingStatus.Attended }), 'status', []).tone).toBe(6);
    expect(blockLook(sampleBooking({ status: BookingStatus.NoShow }), 'status', []).tone).toBe(4);
    expect(blockLook(sampleBooking({ status: BookingStatus.Reschedule }), 'status', [])).toEqual({
      tone: 5,
      status: 'tentative',
    });
    expect(blockLook(sampleBooking({ status: BookingStatus.Canceled }), 'status', [])).toEqual({
      tone: 'neutral',
      status: 'muted',
    });
  });
});

describe('labels', () => {
  it('range labels per mode', () => {
    expect(rangeLabel('day', rangeForMode('day', MON, 1), MON, 'en-US')).toBe('Mon, Aug 17, 2026');
    expect(rangeLabel('week', week, MON, 'en-US')).toBe('Aug 17 – 23, 2026');
    expect(rangeLabel('week', rangeForMode('week', '2026-08-31', 1), '2026-08-31', 'en-US')).toBe(
      'Aug 31 – Sep 6, 2026',
    );
    expect(rangeLabel('month', rangeForMode('month', MON, 1), MON, 'en-US')).toBe('August 2026');
  });
  it('move detail', () => {
    expect(moveDetail(TUE, 615, 'en-US', false)).toBe('Tue 10:15');
    expect(moveDetail(TUE, 615, 'en-US', true)).toBe('Tue 10:15 AM');
  });
  it('day hours label', () => {
    expect(dayHoursLabel(alex, MON)).toBe('09:00–18:00 · break 13:00–14:00');
    expect(dayHoursLabel(alex, TUE)).toBe('09:00–18:00');
    expect(dayHoursLabel(maria, MON)).toBe('Day off');
    expect(dayHoursLabel(sam, MON)).toBe('No schedule');
    // Seen from Mexico City (−8h): the same hours in that zone.
    expect(dayHoursLabel(alex, MON, -480)).toBe('01:00–10:00 · break 05:00–06:00');
    // A shift past midnight wraps.
    expect(dayHoursLabel(alex, TUE, 420)).toBe('16:00–01:00');
  });
  it('title and subtitle, deleted refs called out', () => {
    expect(eventTitle(sampleBooking())).toBe('Dana Ray');
    expect(eventTitle(sampleBooking({ inlineContact: null }))).toBe('Walk-in');
    expect(eventSubtitle(sampleBooking())).toEqual({ text: 'Consultation', deleted: false });
    expect(eventSubtitle(sampleBooking({ service: null }))).toBeNull();
    expect(
      eventSubtitle(
        sampleBooking({
          service: {
            __typename: 'DeletedGoodsService',
            id: 'x',
            title: 'Old Facial',
            durationSeconds: 3600,
            price: null,
          } as never,
        }),
      ),
    ).toEqual({ text: 'Old Facial (deleted)', deleted: true });
  });
  it('signature changes exactly when a block moves', () => {
    const a = { id: 'a', columnId: MON, start: 540, end: 570 };
    expect(layoutSignature([a])).toBe(layoutSignature([{ ...a }]));
    expect(layoutSignature([a])).not.toBe(layoutSignature([{ ...a, start: 555 }]));
    expect(layoutSignature([a])).not.toBe(layoutSignature([{ ...a, columnId: TUE }]));
  });
});

describe('surface helpers', () => {
  it('countsByColumn counts first segments only', () => {
    const counts = countsByColumn([
      { columnId: MON, segment: 0 },
      { columnId: MON, segment: 0 },
      // The tail of a midnight-crossing booking must not count its booking twice.
      { columnId: TUE, segment: 1 },
      { columnId: TUE, segment: 0 },
    ]);
    expect(counts.get(MON)).toBe(2);
    expect(counts.get(TUE)).toBe(1);
    expect(counts.get('elsewhere')).toBeUndefined();
  });

  it('signatureOf uses the layout when there is one, else the records start days', () => {
    // 10:00 −06:00 = 16:00Z = 18:00 in Berlin, same calendar day.
    const a = sampleBooking({ start: '2026-08-18T10:00:00-06:00' });
    const ev = { id: a.id, columnId: MON, start: 540, end: 600 };
    expect(signatureOf({ events: [ev] }, [a], BERLIN)).toBe(layoutSignature([ev]));
    expect(signatureOf(null, [a], BERLIN)).toBe(
      layoutSignature([{ id: a.id, columnId: '2026-08-18', start: 0, end: 0 }]),
    );
  });

  it('day column heading', () => {
    expect(dayColumnHeading('2026-08-17', 'en-US')).toBe('Monday, Aug 17');
    expect(dayColumnHeading('2026-12-31', 'en-US')).toBe('Thursday, Dec 31');
  });

  it('empty copy: whose absence it is, per mode', () => {
    expect(calendarEmptyCopy('day', false, true)).toEqual({ title: 'No bookings today', periodNoun: 'today' });
    expect(calendarEmptyCopy('week', true, false)).toEqual({
      title: 'No bookings match the filter this week',
      periodNoun: 'this week',
    });
    expect(calendarEmptyCopy('month', true, true)).toEqual({
      title: 'No bookings this month',
      periodNoun: 'this month',
    });
  });
});
