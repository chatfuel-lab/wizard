import { describe, expect, it } from 'vitest';
import {
  DURATION_PRESETS,
  MINUTES_PER_DAY,
  formatDuration,
  formatHHmm,
  formatMinuteOfDay,
  parseDuration,
  parseHHmm,
  parseTimeInput,
  snapMinute,
  timeRangeLabel,
  timeSteps,
  usesHour12,
} from './timeOfDay';

describe('parseHHmm / formatHHmm', () => {
  it('round-trips the canonical form and allows 24:00 as an end', () => {
    expect(parseHHmm('09:30')).toBe(570);
    expect(parseHHmm('9:30')).toBe(570);
    expect(parseHHmm('00:00')).toBe(0);
    expect(parseHHmm('24:00')).toBe(MINUTES_PER_DAY);
    expect(parseHHmm('24:01')).toBeNull();
    expect(parseHHmm('25:00')).toBeNull();
    expect(parseHHmm('09:60')).toBeNull();
    expect(parseHHmm('930')).toBeNull();
    expect(parseHHmm('')).toBeNull();
    expect(formatHHmm(570)).toBe('09:30');
    expect(formatHHmm(0)).toBe('00:00');
    expect(formatHHmm(MINUTES_PER_DAY)).toBe('24:00');
    expect(formatHHmm(-5)).toBe('00:00');
    expect(formatHHmm(570.4)).toBe('09:30');
  });
});

describe('usesHour12', () => {
  it('knows the US from Germany and never throws', () => {
    expect(usesHour12('en-US')).toBe(true);
    expect(usesHour12('de-DE')).toBe(false);
    expect(typeof usesHour12('zz-ZZ')).toBe('boolean');
  });
});

describe('formatMinuteOfDay', () => {
  it('formats 24-hour with h23 — midnight is 00:00, never 24:00', () => {
    expect(formatMinuteOfDay(0, { hour12: false, locale: 'en-US' })).toBe('00:00');
    expect(formatMinuteOfDay(MINUTES_PER_DAY, { hour12: false, locale: 'en-US' })).toBe('00:00');
    expect(formatMinuteOfDay(570, { hour12: false, locale: 'en-US' })).toBe('09:30');
    expect(formatMinuteOfDay(1439, { hour12: false, locale: 'en-US' })).toBe('23:59');
  });

  it('formats 12-hour with a plain space before the meridiem', () => {
    expect(formatMinuteOfDay(570, { hour12: true, locale: 'en-US' })).toBe('9:30 AM');
    expect(formatMinuteOfDay(0, { hour12: true, locale: 'en-US' })).toBe('12:00 AM');
    expect(formatMinuteOfDay(720, { hour12: true, locale: 'en-US' })).toBe('12:00 PM');
    expect(formatMinuteOfDay(1305, { hour12: true, locale: 'en-US' })).toBe('9:45 PM');
  });

  it('drops :00 on whole hours when short', () => {
    expect(formatMinuteOfDay(540, { hour12: true, locale: 'en-US', short: true })).toBe('9 AM');
    expect(formatMinuteOfDay(555, { hour12: true, locale: 'en-US', short: true })).toBe('9:15 AM');
    expect(formatMinuteOfDay(540, { hour12: false, locale: 'en-US', short: true })).toBe('09:00');
  });
});

describe('parseTimeInput', () => {
  it('reads every shape a person types', () => {
    expect(parseTimeInput('9')).toBe(540);
    expect(parseTimeInput('09')).toBe(540);
    expect(parseTimeInput('930')).toBe(570);
    expect(parseTimeInput('9:30')).toBe(570);
    expect(parseTimeInput('09.30')).toBe(570);
    expect(parseTimeInput('9h30')).toBe(570);
    expect(parseTimeInput('2130')).toBe(1290);
    expect(parseTimeInput('21:30')).toBe(1290);
    expect(parseTimeInput('9p')).toBe(1260);
    expect(parseTimeInput('9pm')).toBe(1260);
    expect(parseTimeInput('9:30 pm')).toBe(1290);
    expect(parseTimeInput('9:30PM')).toBe(1290);
    expect(parseTimeInput('12am')).toBe(0);
    expect(parseTimeInput('12pm')).toBe(720);
    expect(parseTimeInput('12:30 am')).toBe(30);
    expect(parseTimeInput('noon')).toBe(720);
    expect(parseTimeInput('Midnight')).toBe(0);
    expect(parseTimeInput('  7:05  ')).toBe(425);
    expect(parseTimeInput('24:00')).toBe(MINUTES_PER_DAY);
    expect(parseTimeInput('0')).toBe(0);
  });

  it('does not guess PM for a bare hour', () => {
    expect(parseTimeInput('2')).toBe(120);
  });

  it('rejects what is not a time', () => {
    expect(parseTimeInput('')).toBeNull();
    expect(parseTimeInput('abc')).toBeNull();
    expect(parseTimeInput('25:00')).toBeNull();
    expect(parseTimeInput('9:75')).toBeNull();
    expect(parseTimeInput('13pm')).toBeNull();
    expect(parseTimeInput('0pm')).toBeNull();
    expect(parseTimeInput('99999')).toBeNull();
    expect(parseTimeInput('123:45')).toBeNull();
    expect(parseTimeInput('24:30')).toBeNull();
  });
});

describe('timeSteps / snapMinute', () => {
  it('lists the grid inside inclusive bounds', () => {
    expect(timeSteps(30, { min: 540, max: 660 })).toEqual([540, 570, 600, 630, 660]);
    expect(timeSteps(30, { min: 545, max: 660 })).toEqual([570, 600, 630, 660]);
    expect(timeSteps(60)).toHaveLength(25); // 00:00 … 24:00
    expect(timeSteps(0)).toEqual([]);
  });

  it('snaps nearest, floor and ceil', () => {
    expect(snapMinute(547, 15)).toBe(540);
    expect(snapMinute(548, 15)).toBe(555);
    expect(snapMinute(554, 15, 'floor')).toBe(540);
    expect(snapMinute(541, 15, 'ceil')).toBe(555);
    expect(snapMinute(540, 15, 'ceil')).toBe(540);
    expect(snapMinute(-7, 15)).toBe(0);
    expect(snapMinute(-8, 15)).toBe(-15);
    expect(snapMinute(547, 0)).toBe(547);
  });
});

describe('timeRangeLabel', () => {
  it('says the meridiem once when both ends share it', () => {
    expect(timeRangeLabel(570, 615, { hour12: true, locale: 'en-US' })).toBe('9:30 – 10:15 AM');
    expect(timeRangeLabel(690, 750, { hour12: true, locale: 'en-US' })).toBe('11:30 AM – 12:30 PM');
    expect(timeRangeLabel(570, 615, { hour12: false, locale: 'en-US' })).toBe('09:30 – 10:15');
  });
});

describe('durations', () => {
  it('has the presets a service form offers', () => {
    expect(DURATION_PRESETS).toEqual([15, 30, 45, 60, 90, 120]);
  });

  it('formats', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(90)).toBe('1 h 30 min');
    expect(formatDuration(150)).toBe('2 h 30 min');
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(-5)).toBe('0 min');
  });

  it('parses', () => {
    expect(parseDuration('90')).toBe(90);
    expect(parseDuration('1h30')).toBe(90);
    expect(parseDuration('1h 30m')).toBe(90);
    expect(parseDuration('1 h 30 min')).toBe(90);
    expect(parseDuration('1:30')).toBe(90);
    expect(parseDuration('1.5h')).toBe(90);
    expect(parseDuration('45m')).toBe(45);
    expect(parseDuration('45 minutes')).toBe(45);
    expect(parseDuration('2 hours')).toBe(120);
    expect(parseDuration('2hrs')).toBe(120);
    expect(parseDuration('0')).toBeNull();
    expect(parseDuration('')).toBeNull();
    expect(parseDuration('soon')).toBeNull();
    expect(parseDuration('h')).toBeNull();
  });
});
