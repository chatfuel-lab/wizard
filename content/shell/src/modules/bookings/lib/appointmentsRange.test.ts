import { describe, expect, it } from 'vitest';
import {
  canLoadMore,
  capCaveat,
  coverageLabel,
  emptyCopy,
  inTab,
  listWindow,
  loadMoreLabel,
  rangeLabel,
} from './appointmentsRange';
import { MAX_RANGE_DAYS, rangeLength } from './calendarRange';
import { sampleBooking } from './samples';

const en = { locale: 'en-US' };
const TODAY = '2026-08-17';

describe('appointmentsRange', () => {
  it('upcoming grows forward in 90-day chunks from today', () => {
    expect(listWindow('upcoming', TODAY, 1, null, null)).toEqual({
      range: { startKey: '2026-08-17', endKey: '2026-11-15' },
      capped: false,
    });
    expect(listWindow('upcoming', TODAY, 2, null, null).range.endKey).toBe('2027-02-13');
    expect(rangeLength(listWindow('upcoming', TODAY, 3, null, null).range)).toBe(270);
    // A zero or negative chunk count is read as one.
    expect(listWindow('upcoming', TODAY, 0, null, null).range).toEqual(
      listWindow('upcoming', TODAY, 1, null, null).range,
    );
  });

  it('past grows backward in 30-day chunks and includes today', () => {
    expect(listWindow('past', TODAY, 1, null, null)).toEqual({
      range: { startKey: '2026-07-18', endKey: '2026-08-18' },
      capped: false,
    });
    expect(listWindow('past', TODAY, 2, null, null).range.startKey).toBe('2026-06-18');
    expect(rangeLength(listWindow('past', TODAY, 2, null, null).range)).toBe(61);
  });

  it('custom takes the pair, inclusive, and says when it was capped', () => {
    expect(listWindow('custom', TODAY, 1, '2026-08-01', '2026-08-31')).toEqual({
      range: { startKey: '2026-08-01', endKey: '2026-09-01' },
      capped: false,
    });
    const capped = listWindow('custom', TODAY, 5, '2020-01-01', '2026-12-31');
    expect(capped.capped).toBe(true);
    expect(rangeLength(capped.range)).toBe(MAX_RANGE_DAYS);
    expect(capped.range.startKey).toBe('2020-01-01');
    // Chunks are ignored for custom.
    expect(listWindow('custom', TODAY, 9, '2026-08-01', '2026-08-31')).toEqual(
      listWindow('custom', TODAY, 1, '2026-08-01', '2026-08-31'),
    );
  });

  it('splits upcoming and past on now, not on the day', () => {
    const now = new Date('2026-08-17T12:00:00Z').getTime();
    const earlier = sampleBooking({ id: 'earlier', start: '2026-08-17T10:00:00Z', minutes: 30 }); // ended 10:30Z
    const running = sampleBooking({ id: 'running', start: '2026-08-17T11:45:00Z', minutes: 30 }); // ends 12:15Z
    const later = sampleBooking({ id: 'later', start: '2026-08-17T18:00:00Z', minutes: 30 });
    const all = [earlier, running, later];
    expect(inTab(all, 'upcoming', now).map((r) => r.id)).toEqual(['running', 'later']);
    expect(inTab(all, 'past', now).map((r) => r.id)).toEqual(['earlier']);
    expect(inTab(all, 'custom', now)).toHaveLength(3);
    // A booking ending exactly now is upcoming (still counts as not over).
    const exact = sampleBooking({ id: 'exact', start: '2026-08-17T11:30:00Z', minutes: 30 });
    expect(inTab([exact], 'upcoming', now)).toHaveLength(1);
    expect(inTab([exact], 'past', now)).toHaveLength(0);
  });

  it('prints coverage as people read it, inclusive of the last day', () => {
    const range = { startKey: '2026-08-17', endKey: '2026-11-15' };
    expect(rangeLabel(range, en)).toBe('Aug 17 – Nov 14');
    expect(rangeLabel({ startKey: '2026-08-17', endKey: '2026-08-18' }, en)).toBe('Aug 17');
    expect(rangeLabel({ startKey: '2026-08-01', endKey: '2026-09-01' }, en)).toBe('Aug 1 – 31');
    expect(rangeLabel({ startKey: '2026-12-20', endKey: '2027-01-10' }, { ...en, todayKey: TODAY })).toBe(
      'Dec 20 – Jan 9, 2027',
    );
    expect(coverageLabel(120, range, en)).toBe('120 loaded · Aug 17 – Nov 14');
    expect(coverageLabel(1200, range, en)).toBe('1,200 loaded · Aug 17 – Nov 14');
  });

  it('offers a widen button per tab, until the cap', () => {
    expect(loadMoreLabel('upcoming')).toBe('Load 90 more days');
    expect(loadMoreLabel('past')).toBe('Load 30 earlier days');
    expect(loadMoreLabel('custom')).toBeNull();
    expect(canLoadMore('upcoming', 1)).toBe(true);
    expect(canLoadMore('upcoming', 3)).toBe(true); // 360 ≤ 366
    expect(canLoadMore('upcoming', 4)).toBe(false); // 450 > 366
    expect(canLoadMore('past', 11)).toBe(true); // 360
    expect(canLoadMore('past', 12)).toBe(false); // 390
    expect(canLoadMore('custom', 1)).toBe(false);
  });

  it('says what a cap did and what an empty tab means', () => {
    const capped = listWindow('custom', TODAY, 1, '2020-01-01', '2026-12-31').range;
    expect(capCaveat(capped, en)).toBe(
      'A custom range is limited to 366 days — showing Jan 1 – Dec 31 (366 days). Narrow the dates to see a later stretch.',
    );
    expect(emptyCopy('upcoming', false).title).toBe('Nothing coming up');
    expect(emptyCopy('past', false).title).toBe('Nothing in the loaded days');
    expect(emptyCopy('custom', false).title).toBe('No appointments in this range');
    expect(emptyCopy('upcoming', true).title).toBe('No appointments match');
  });
});
