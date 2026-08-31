import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  FULL_DAY,
  HOUR_PX,
  MIN_EVENT_PX,
  RESIZE_EDGE_PX,
  clampSpan,
  columnAt,
  eventBox,
  hourMarks,
  isResizeEdge,
  laneBox,
  minuteToPx,
  nextEventFocus,
  nowOffset,
  pxToMinute,
  rangeHeightPx,
  scrollTopFor,
  splitAtMidnight,
} from './timeGrid';

const WORK = { start: 480, end: 1200 }; // 08:00–20:00

describe('minuteToPx / pxToMinute', () => {
  it('maps minutes to pixels against the range start and back', () => {
    expect(minuteToPx(0, 64)).toBe(0);
    expect(minuteToPx(60, 64)).toBe(64);
    expect(minuteToPx(90, 48)).toBe(72);
    expect(minuteToPx(480, 64, WORK)).toBe(0);
    expect(minuteToPx(540, 64, WORK)).toBe(64);
    expect(pxToMinute(64, 64, WORK)).toBe(540);
    expect(pxToMinute(96, 64)).toBe(90);
    expect(pxToMinute(minuteToPx(1234, 80), 80)).toBeCloseTo(1234);
  });

  it('rangeHeightPx is the whole range', () => {
    expect(rangeHeightPx(FULL_DAY, 64)).toBe(24 * 64);
    expect(rangeHeightPx(WORK, 48)).toBe(12 * 48);
  });
});

describe('clampSpan', () => {
  it('keeps the length while pushing a span back inside the range', () => {
    expect(clampSpan({ start: 450, end: 510 }, { range: WORK, minDuration: 15 })).toEqual({ start: 480, end: 540 });
    expect(clampSpan({ start: 1170, end: 1230 }, { range: WORK, minDuration: 15 })).toEqual({ start: 1140, end: 1200 });
    expect(clampSpan({ start: 600, end: 660 }, { range: WORK, minDuration: 15 })).toEqual({ start: 600, end: 660 });
  });

  it('enforces the minimum length and collapses to the range when longer than it', () => {
    expect(clampSpan({ start: 600, end: 605 }, { range: WORK, minDuration: 15 })).toEqual({ start: 600, end: 615 });
    expect(clampSpan({ start: 0, end: 1440 }, { range: WORK, minDuration: 15 })).toEqual(WORK);
  });
});

describe('eventBox', () => {
  it('places and sizes an event, padding short ones up to the minimum', () => {
    expect(eventBox({ start: 540, end: 600 }, 64, WORK)).toEqual({
      top: 64,
      height: 64,
      clippedStart: false,
      clippedEnd: false,
    });
    // 15 minutes at compact is 12px; padded to MIN_EVENT_PX.
    expect(eventBox({ start: 540, end: 555 }, 48, WORK)?.height).toBe(MIN_EVENT_PX);
    expect(eventBox({ start: 540, end: 555 }, 48, WORK, 0)?.height).toBe(12);
  });

  it('clips to the range and flags which end was clipped', () => {
    expect(eventBox({ start: 420, end: 540 }, 64, WORK)).toEqual({
      top: 0,
      height: 64,
      clippedStart: true,
      clippedEnd: false,
    });
    expect(eventBox({ start: 1140, end: 1260 }, 64, WORK)).toMatchObject({ clippedEnd: true, height: 64 });
    expect(eventBox({ start: 0, end: 60 }, 64, WORK)).toBeNull();
    expect(eventBox({ start: 1200, end: 1260 }, 64, WORK)).toBeNull();
    expect(eventBox({ start: 600, end: 540 }, 64, WORK)).toBeNull();
  });
});

describe('laneBox', () => {
  it('splits the column evenly', () => {
    expect(laneBox(0, 1)).toEqual({ leftPct: 0, widthPct: 100 });
    expect(laneBox(1, 2)).toEqual({ leftPct: 50, widthPct: 50 });
    expect(laneBox(2, 4)).toEqual({ leftPct: 50, widthPct: 25 });
    expect(laneBox(5, 2)).toEqual({ leftPct: 50, widthPct: 50 }); // clamped
    expect(laneBox(0, 0)).toEqual({ leftPct: 0, widthPct: 100 });
  });
});

describe('hourMarks', () => {
  it('lists whole hours inside the range, excluding the end', () => {
    expect(hourMarks(WORK)).toEqual([480, 540, 600, 660, 720, 780, 840, 900, 960, 1020, 1080, 1140]);
    expect(hourMarks({ start: 450, end: 630 })).toEqual([480, 540, 600]);
    expect(hourMarks(FULL_DAY)).toHaveLength(24);
    expect(hourMarks(WORK, 30)).toHaveLength(24);
    expect(hourMarks(WORK, 0)).toEqual([]);
  });

  it('thins the labels out on a coarse step, still landing on whole hours', () => {
    /* What a grid whose blocks carry their own time asks the gutter for: rough
       bearings, not a ruler. Every mark is still a multiple of the step, so the
       labels sit on the CSS hour rules rather than between them. */
    expect(hourMarks(FULL_DAY, 180)).toEqual([0, 180, 360, 540, 720, 900, 1080, 1260]);
    expect(hourMarks(WORK, 180)).toEqual([540, 720, 900, 1080]);
  });
});

describe('columnAt', () => {
  it('finds the column and clamps past the edges', () => {
    expect(columnAt(0, 700, 7)).toBe(0);
    expect(columnAt(99, 700, 7)).toBe(0);
    expect(columnAt(100, 700, 7)).toBe(1);
    expect(columnAt(699, 700, 7)).toBe(6);
    expect(columnAt(-40, 700, 7)).toBe(0);
    expect(columnAt(900, 700, 7)).toBe(6);
    expect(columnAt(10, 700, 0)).toBe(-1);
    expect(columnAt(10, 0, 7)).toBe(-1);
  });
});

describe('nowOffset', () => {
  it('is null outside the range', () => {
    expect(nowOffset(540, 64, WORK)).toBe(64);
    expect(nowOffset(400, 64, WORK)).toBeNull();
    expect(nowOffset(1200, 64, WORK)).toBe(12 * 64);
    expect(nowOffset(1201, 64, WORK)).toBeNull();
  });
});

describe('scrollTopFor', () => {
  it('leaves half an hour above the target and clamps to the scrollable extent', () => {
    expect(scrollTopFor(540, 64, FULL_DAY, 400)).toBe(9 * 64 - 32);
    expect(scrollTopFor(0, 64, FULL_DAY, 400)).toBe(0);
    expect(scrollTopFor(1440, 64, FULL_DAY, 400)).toBe(24 * 64 - 400);
    expect(scrollTopFor(720, 64, FULL_DAY, 400, 'center')).toBe(12 * 64 - 200);
    // A viewport taller than the content never scrolls.
    expect(scrollTopFor(720, 64, WORK, 2000)).toBe(0);
  });
});

describe('splitAtMidnight', () => {
  const BERLIN = 'Europe/Berlin';
  const at = (h: number, m = 0, d = 17) => Date.UTC(2026, 7, d, h, m); // August: Berlin = UTC+2

  it('keeps a same-day range as one segment', () => {
    expect(splitAtMidnight(at(7, 30), at(8, 15), BERLIN)).toEqual([{ dayKey: '2026-08-17', start: 570, end: 615 }]);
  });

  it('ends exactly at midnight as one segment to 1440', () => {
    expect(splitAtMidnight(at(21), at(22), BERLIN)).toEqual([{ dayKey: '2026-08-17', start: 1380, end: 1440 }]);
  });

  it('splits a range crossing midnight into two segments', () => {
    expect(splitAtMidnight(at(21), at(23, 30), BERLIN)).toEqual([
      { dayKey: '2026-08-17', start: 1380, end: 1440 },
      { dayKey: '2026-08-18', start: 0, end: 90 },
    ]);
  });

  it('fills whole days in between', () => {
    expect(splitAtMidnight(at(21, 0, 17), at(4, 0, 19), BERLIN)).toEqual([
      { dayKey: '2026-08-17', start: 1380, end: 1440 },
      { dayKey: '2026-08-18', start: 0, end: 1440 },
      { dayKey: '2026-08-19', start: 0, end: 360 },
    ]);
  });

  it('is empty for an empty or inverted range', () => {
    expect(splitAtMidnight(at(9), at(9), BERLIN)).toEqual([]);
    expect(splitAtMidnight(at(10), at(9), BERLIN)).toEqual([]);
  });

  it('crosses a DST night by the zone’s day, not by 24 hours', () => {
    // Berlin 2026-03-28 23:00 → 2026-03-29 04:00 (the night clocks skip 02:00).
    const start = Date.UTC(2026, 2, 28, 22, 0); // 23:00 CET
    const end = Date.UTC(2026, 2, 29, 2, 0); // 04:00 CEST
    expect(splitAtMidnight(start, end, BERLIN)).toEqual([
      { dayKey: '2026-03-28', start: 1380, end: 1440 },
      { dayKey: '2026-03-29', start: 0, end: 240 },
    ]);
  });
});

describe('isResizeEdge', () => {
  it('names the edge strips and shrinks them for tiny events', () => {
    expect(isResizeEdge(2, 60)).toBe('start');
    expect(isResizeEdge(30, 60)).toBeNull();
    expect(isResizeEdge(58, 60)).toBe('end');
    expect(isResizeEdge(5, 60)).toBe('start');
    expect(isResizeEdge(6, 60)).toBeNull();
    // 20px event: edge shrinks to 6 (20/3 = 6.67 → 6).
    expect(isResizeEdge(5, 20)).toBe('start');
    expect(isResizeEdge(10, 20)).toBeNull();
    expect(isResizeEdge(15, 20)).toBe('end');
    // 3px event: no edge at all.
    expect(isResizeEdge(0, 2)).toBeNull();
    expect(RESIZE_EDGE_PX).toBe(6);
  });
});

describe('nextEventFocus', () => {
  const columns = ['mon', 'tue', 'wed', 'thu'];
  const events = [
    { id: 'm1', columnId: 'mon', start: 540, end: 600 },
    { id: 'm2', columnId: 'mon', start: 600, end: 660 },
    { id: 'm3', columnId: 'mon', start: 900, end: 960 },
    { id: 'w1', columnId: 'wed', start: 580, end: 640 },
    { id: 'w2', columnId: 'wed', start: 890, end: 950 },
    { id: 'h1', columnId: 'thu', start: 300, end: 360 },
  ];

  it('walks the column with Up/Down/Home/End and stops at the ends', () => {
    expect(nextEventFocus(events, columns, 'm1', 'ArrowDown')).toBe('m2');
    expect(nextEventFocus(events, columns, 'm2', 'ArrowDown')).toBe('m3');
    expect(nextEventFocus(events, columns, 'm3', 'ArrowDown')).toBeNull();
    expect(nextEventFocus(events, columns, 'm1', 'ArrowUp')).toBeNull();
    expect(nextEventFocus(events, columns, 'm3', 'Home')).toBe('m1');
    expect(nextEventFocus(events, columns, 'm1', 'End')).toBe('m3');
  });

  it('jumps to the nearest-in-time event of the next non-empty column', () => {
    expect(nextEventFocus(events, columns, 'm1', 'ArrowRight')).toBe('w1'); // skips empty tue
    expect(nextEventFocus(events, columns, 'm3', 'ArrowRight')).toBe('w2');
    expect(nextEventFocus(events, columns, 'w1', 'ArrowLeft')).toBe('m2'); // 09:40 is nearer 10:00 than 09:00
    expect(nextEventFocus(events, columns, 'w2', 'ArrowLeft')).toBe('m3');
    expect(nextEventFocus(events, columns, 'w2', 'ArrowRight')).toBe('h1');
    expect(nextEventFocus(events, columns, 'h1', 'ArrowRight')).toBeNull();
    expect(nextEventFocus(events, columns, 'm1', 'ArrowLeft')).toBeNull();
  });

  it('starts from the first event of the first non-empty column when nothing is focused', () => {
    expect(nextEventFocus(events, columns, null, 'ArrowDown')).toBe('m1');
    expect(nextEventFocus(events, ['tue', 'wed'], null, 'ArrowRight')).toBe('w1');
    expect(nextEventFocus([], columns, null, 'ArrowDown')).toBeNull();
    expect(nextEventFocus(events, columns, 'ghost', 'ArrowDown')).toBe('m1');
  });
});

/**
 * The tokens and these constants are one decision written twice — CSS draws
 * the hour rules and JS places the events on them. Parsed from the file, the
 * same way lib/interaction/layout.test.ts guards the bands, because no build step brings
 * a TypeScript constant and a CSS custom property together.
 */
describe('token parity with styles/tokens.css', () => {
  const css = readFileSync(new URL('../../styles/tokens.css', import.meta.url), 'utf8');
  const tokenPx = (name: string): number => {
    const match = css.match(new RegExp(`--height-${name}:\\s*(\\d+)px`));
    if (!match) throw new Error(`--height-${name} is missing from tokens.css, or is not in px`);
    return Number(match[1]);
  };

  it('declares the three hour heights HOUR_PX places events by', () => {
    expect(tokenPx('hour-compact')).toBe(HOUR_PX.compact);
    expect(tokenPx('hour-cozy')).toBe(HOUR_PX.cozy);
    expect(tokenPx('hour-comfortable')).toBe(HOUR_PX.comfortable);
  });

  it('declares the event floor MIN_EVENT_PX pads short blocks to', () => {
    expect(tokenPx('event-min')).toBe(MIN_EVENT_PX);
  });

  it('keeps them in px, because event geometry is arithmetic in px', () => {
    for (const name of ['hour-compact', 'hour-cozy', 'hour-comfortable', 'event-min']) {
      expect(css).toMatch(new RegExp(`--height-${name}:\\s*\\d+px`));
    }
  });

  it('tiles the rules at --time-grid-hour, the variable the component sets from HOUR_PX', () => {
    expect(css).toMatch(/@utility time-grid-rules[\s\S]*background-size:\s*100% var\(--time-grid-hour/);
  });
});
