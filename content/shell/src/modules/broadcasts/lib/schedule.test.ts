import { describe, expect, it } from 'vitest';
import { BroadcastRepeatType, Weekday } from '~api/generated/broadcasts/graphql';
import {
  datesAtTime,
  dayShift,
  decodeSchedule,
  describeRepeat,
  nextRun,
  toCorrectedWeekdays,
  toDisplayWeekdays,
} from './schedule';
import { sampleScheduledElement } from './samples';

const MX = 'America/Mexico_City';
const BER = 'Europe/Berlin';
const AKL = 'Pacific/Auckland';
const HNL = 'Pacific/Honolulu';

describe('the day shift between the bot zone and UTC', () => {
  it('is nothing when both show the same calendar day', () => {
    expect(dayShift(Date.UTC(2026, 8, 7, 15, 0), MX)).toBe(0); // 09:00 Monday in Mexico City, Monday in UTC
    expect(dayShift(Date.UTC(2026, 8, 7, 15, 0), 'UTC')).toBe(0);
  });

  it('is +1 where the zone is already tomorrow', () => {
    expect(dayShift(Date.UTC(2026, 8, 7, 13, 0), AKL)).toBe(1); // 01:00 Tuesday in Auckland
    expect(dayShift(Date.UTC(2026, 8, 7, 22, 30), BER)).toBe(1); // 00:30 Tuesday in Berlin
  });

  it('is -1 where the zone is still yesterday', () => {
    expect(dayShift(Date.UTC(2026, 8, 8, 4, 0), HNL)).toBe(-1); // 18:00 Monday in Honolulu, Tuesday in UTC
    expect(dayShift(Date.UTC(2026, 8, 8, 5, 0), MX)).toBe(-1); // 23:00 Monday in Mexico City
  });
});

describe('corrected weekdays', () => {
  it('shift left when the bot zone is a day ahead — Monday 01:00 in Berlin is Sunday in UTC', () => {
    const firstSend = Date.UTC(2026, 8, 6, 23, 0); // Monday 01:00 CEST
    expect(toCorrectedWeekdays([Weekday.Mon], firstSend, BER)).toEqual([Weekday.Sun]);
    expect(toCorrectedWeekdays([Weekday.Sun, Weekday.Sat], firstSend, BER)).toEqual([Weekday.Sat, Weekday.Fri]);
  });

  it('shift right when the bot zone is a day behind', () => {
    const firstSend = Date.UTC(2026, 8, 8, 5, 0); // Monday 23:00 in Mexico City
    expect(toCorrectedWeekdays([Weekday.Mon], firstSend, MX)).toEqual([Weekday.Tue]);
  });

  it('round-trip through the display direction in every zone', () => {
    const firstSends = [Date.UTC(2026, 8, 6, 23, 0), Date.UTC(2026, 8, 8, 5, 0), Date.UTC(2026, 8, 7, 15, 0)];
    for (const zone of [MX, BER, AKL, HNL, 'UTC']) {
      for (const at of firstSends) {
        const picked = [Weekday.Mon, Weekday.Wed, Weekday.Sun];
        expect(toDisplayWeekdays(toCorrectedWeekdays(picked, at, zone), at, zone)).toEqual(picked);
      }
    }
  });
});

describe('dates at a time of day', () => {
  it('keep the minute of the day in the bot zone', () => {
    const [at] = datesAtTime(['2026-12-24'], 9 * 60 + 30, MX);
    expect(new Date(at!).toISOString()).toBe('2026-12-24T15:30:00.000Z');
  });

  it('drop what is not a date', () => {
    expect(datesAtTime(['nope'], 0, MX)).toEqual([]);
  });
});

describe('the next run', () => {
  const NOW = Date.parse('2026-09-07T12:00:00Z'); // a Monday

  it('is the first send while it is ahead, for every repeat', () => {
    const at = Date.parse('2026-09-10T09:00:00Z');
    expect(nextRun({ repeat: 'once', at }, NOW)).toBe(at);
    expect(nextRun({ repeat: 'everyNDays', at, everyNDays: 3 }, NOW)).toBe(at);
    expect(nextRun({ repeat: 'weekdays', at, weekdays: [Weekday.Thu] }, NOW)).toBe(at);
  });

  it('is nothing once a one-shot has passed', () => {
    expect(nextRun({ repeat: 'once', at: NOW - 1 }, NOW)).toBeNull();
  });

  it('steps every N days from the first send', () => {
    const at = Date.parse('2026-09-01T09:00:00Z');
    expect(nextRun({ repeat: 'everyNDays', at, everyNDays: 3 }, NOW)).toBe(Date.parse('2026-09-10T09:00:00Z'));
  });

  it('finds the next stored UTC weekday at the first send time of day', () => {
    const at = Date.parse('2026-09-01T09:00:00Z');
    expect(nextRun({ repeat: 'weekdays', at, weekdays: [Weekday.Wed, Weekday.Fri] }, NOW)).toBe(
      Date.parse('2026-09-09T09:00:00Z'),
    );
    // Today's slot still ahead counts as today.
    expect(nextRun({ repeat: 'weekdays', at, weekdays: [Weekday.Mon] }, Date.parse('2026-09-07T08:00:00Z'))).toBe(
      Date.parse('2026-09-07T09:00:00Z'),
    );
  });

  it('takes the first listed date still ahead', () => {
    const dates = [Date.parse('2026-09-01T09:00:00Z'), Date.parse('2026-09-20T09:00:00Z')];
    expect(nextRun({ repeat: 'dates', at: dates[0]!, dates }, NOW)).toBe(dates[1]);
    expect(nextRun({ repeat: 'dates', at: dates[0]!, dates: [dates[0]!] }, NOW)).toBeNull();
  });
});

describe('decoding the element', () => {
  it('reads each repeat type', () => {
    expect(decodeSchedule(sampleScheduledElement())).toEqual({
      repeat: 'once',
      at: Date.parse('2030-01-06T07:00:00Z'),
    });
    expect(
      decodeSchedule(sampleScheduledElement({ repeatType: BroadcastRepeatType.EveryNDays, repeatEveryNDays: 3 })),
    ).toMatchObject({ repeat: 'everyNDays', everyNDays: 3 });
    expect(
      decodeSchedule(
        sampleScheduledElement({
          repeatType: BroadcastRepeatType.OnCertainDates,
          repeatOnCertainDates: ['2030-02-01T07:00:00Z', '2030-01-20T07:00:00Z'],
        }),
      ),
    ).toMatchObject({
      repeat: 'dates',
      dates: [Date.parse('2030-01-20T07:00:00Z'), Date.parse('2030-02-01T07:00:00Z')],
    });
  });

  it('describes the repeat in the bot zone', () => {
    const at = Date.UTC(2026, 8, 6, 23, 0); // Monday 01:00 Berlin
    expect(describeRepeat({ repeat: 'weekdays', at, weekdays: [Weekday.Sun] }, BER)).toBe('Mon');
    expect(describeRepeat({ repeat: 'everyNDays', at, everyNDays: 1 }, BER)).toBe('Every day');
    expect(describeRepeat({ repeat: 'dates', at, dates: [at] }, BER)).toBe('1 date');
  });
});
