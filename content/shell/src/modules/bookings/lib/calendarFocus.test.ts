import { describe, expect, it } from 'vitest';
import {
  fallbackFocusables,
  firstFocusable,
  nextFocus,
  orderedColumns,
  orderedIds,
  resolveFocus,
  type FocusableEvent,
} from './calendarFocus';
import { sampleBooking } from './samples';

const ev = (id: string, columnId: string, start: number, end = start + 30): FocusableEvent => ({
  id,
  columnId,
  start,
  end,
});

const COLS = ['mon', 'tue', 'wed', 'thu'];
const EVENTS = [
  ev('m2', 'mon', 600),
  ev('m1', 'mon', 540),
  ev('m3', 'mon', 900),
  ev('t1', 'tue', 570),
  // wed is empty
  ev('h1', 'thu', 900),
  ev('h2', 'thu', 930),
];

const next = (current: string | null, key: Parameters<typeof nextFocus>[0]['key'], flow: 'grid' | 'list' = 'grid') =>
  nextFocus({ events: EVENTS, columnOrder: COLS, current, key, flow });

describe('ordering', () => {
  it('groups by column in order and sorts by start; empty columns vanish', () => {
    expect(orderedColumns(EVENTS, COLS).map((c) => [c.columnId, c.events.map((e) => e.id)])).toEqual([
      ['mon', ['m1', 'm2', 'm3']],
      ['tue', ['t1']],
      ['thu', ['h1', 'h2']],
    ]);
    expect(orderedIds(EVENTS, COLS)).toEqual(['m1', 'm2', 'm3', 't1', 'h1', 'h2']);
  });
  it('a column the order did not name goes last', () => {
    expect(orderedIds([ev('x', 'zzz', 0), ...EVENTS], COLS).at(-1)).toBe('x');
  });
  it('ties break by end then id', () => {
    expect(orderedIds([ev('b', 'mon', 540, 600), ev('a', 'mon', 540, 570), ev('c', 'mon', 540, 570)], ['mon'])).toEqual(
      ['a', 'c', 'b'],
    );
  });
});

describe('first and resolve', () => {
  it('first is the earliest of the first non-empty column', () => {
    expect(firstFocusable(EVENTS, COLS)).toBe('m1');
    expect(firstFocusable([], COLS)).toBeNull();
  });
  it('resolveFocus keeps a live id and falls back to the first', () => {
    expect(resolveFocus(EVENTS, COLS, 't1')).toBe('t1');
    expect(resolveFocus(EVENTS, COLS, 'gone')).toBe('m1');
    expect(resolveFocus([], COLS, 'gone')).toBeNull();
  });
});

describe('grid flow', () => {
  it('nothing focused: any key lands on the first', () => {
    expect(next(null, 'ArrowDown')).toBe('m1');
    expect(next(null, 'ArrowLeft')).toBe('m1');
    expect(next('gone', 'End')).toBe('m1');
  });
  it('up/down walk the column and clamp', () => {
    expect(next('m1', 'ArrowDown')).toBe('m2');
    expect(next('m2', 'ArrowDown')).toBe('m3');
    expect(next('m3', 'ArrowDown')).toBeNull();
    expect(next('m2', 'ArrowUp')).toBe('m1');
    expect(next('m1', 'ArrowUp')).toBeNull();
  });
  it('home/end are the column ends', () => {
    expect(next('m2', 'Home')).toBe('m1');
    expect(next('m2', 'End')).toBe('m3');
    expect(next('t1', 'End')).toBe('t1');
  });
  it('left/right pick the nearest start in the adjacent non-empty column', () => {
    expect(next('m3', 'ArrowRight')).toBe('t1');
    expect(next('t1', 'ArrowRight')).toBe('h1'); // wed skipped
    expect(next('t1', 'ArrowLeft')).toBe('m1'); // 570 is nearest to 540
    expect(next('h2', 'ArrowLeft')).toBe('t1');
    expect(next('m1', 'ArrowLeft')).toBeNull();
    expect(next('h2', 'ArrowRight')).toBeNull();
  });
  it('the nearest-start rule prefers the closer of two candidates', () => {
    const events = [ev('a', 'mon', 900), ev('b', 'tue', 600), ev('c', 'tue', 890)];
    expect(nextFocus({ events, columnOrder: ['mon', 'tue'], current: 'a', key: 'ArrowRight' })).toBe('c');
  });
  it('empty list → null', () => {
    expect(nextFocus({ events: [], columnOrder: COLS, current: null, key: 'ArrowDown' })).toBeNull();
  });
});

describe('list flow', () => {
  it('up/down run across days; left/right mean the same', () => {
    expect(next('m3', 'ArrowDown', 'list')).toBe('t1');
    expect(next('t1', 'ArrowUp', 'list')).toBe('m3');
    expect(next('t1', 'ArrowRight', 'list')).toBe('h1');
    expect(next('h1', 'ArrowLeft', 'list')).toBe('t1');
  });
  it('clamps at the list ends; home/end are the whole list', () => {
    expect(next('m1', 'ArrowUp', 'list')).toBeNull();
    expect(next('h2', 'ArrowDown', 'list')).toBeNull();
    expect(next('t1', 'Home', 'list')).toBe('m1');
    expect(next('t1', 'End', 'list')).toBe('h2');
  });
});

describe('fallback focusables', () => {
  const BERLIN = 'Europe/Berlin';

  it('collapses records to a minute at their start day in the zone', () => {
    // 10:00 −06:00 = 16:00Z = 18:00 in Berlin → minute 1080 on the same day.
    const a = sampleBooking({ start: '2026-08-18T10:00:00-06:00', minutes: 30 });
    const out = fallbackFocusables([a], BERLIN, 'day', '2026-08', 1, '2026-08-18');
    expect(out.events).toEqual([{ id: a.id, columnId: '2026-08-18', start: 1080, end: 1081 }]);
    expect(out.columnOrder).toEqual(['2026-08-18']);
  });

  it('month mode walks the month matrix; day and agenda walk the single anchor day', () => {
    const month = fallbackFocusables([], BERLIN, 'month', '2026-08', 1, '2026-08-18');
    // August 2026 starts on a Saturday; a Monday-start grid opens on Jul 27 and covers whole weeks.
    expect(month.columnOrder[0]).toBe('2026-07-27');
    expect(month.columnOrder).toContain('2026-08-31');
    expect(month.columnOrder.length % 7).toBe(0);
    expect(fallbackFocusables([], BERLIN, 'day', '2026-08', 1, '2026-08-18').columnOrder).toEqual(['2026-08-18']);
  });
});
