import { describe, expect, it } from 'vitest';
import { BookingStatus } from '~api/generated/bookings/graphql';
import { DEFAULT_PARAMS, parseBookingsParams, parseSort, viewSegment, writeBookingsParams } from './bookingsParams';

const parse = (query: string, view = '') => parseBookingsParams(new URLSearchParams(query), view);
const write = (patch: Partial<ReturnType<typeof parse>>, base = '') =>
  writeBookingsParams(new URLSearchParams(base), { ...DEFAULT_PARAMS, ...patch }).toString();

describe('parseBookingsParams', () => {
  it('returns the defaults for an empty query and never throws on junk', () => {
    expect(parse('')).toEqual(DEFAULT_PARAMS);
    expect(parse('view=nope&mode=year&date=2026-02-30&by=x&color=y&range=z&period=q&density=huge&sort=foo')).toEqual(
      DEFAULT_PARAMS,
    );
  });

  it('reads every key', () => {
    const p = parse(
      'view=appointments&mode=day&date=2026-08-18&by=specialist&color=status&specialist=a,b&service=s1&status=Confirmed,Canceled&q=ann&range=custom&from=2026-08-01&to=2026-08-31&sort=customer:desc&period=90d&density=compact&s=sp1&b=bk1',
    );
    expect(p).toMatchObject({
      view: 'appointments',
      mode: 'day',
      date: '2026-08-18',
      by: 'specialist',
      color: 'status',
      filter: {
        specialists: ['a', 'b'],
        services: ['s1'],
        statuses: [BookingStatus.Confirmed, BookingStatus.Canceled],
      },
      q: 'ann',
      range: 'custom',
      from: '2026-08-01',
      to: '2026-08-31',
      sort: { key: 'customer', direction: 'desc' },
      period: '90d',
      density: 'compact',
      s: 'sp1',
      b: 'bk1',
      new: null,
    });
  });

  it('reads the legacy ?week= as week mode on that date, and lets ?mode= win when present', () => {
    expect(parse('week=2026-08-10')).toMatchObject({ mode: 'week', date: '2026-08-10' });
    expect(parse('week=2026-08-10&mode=day')).toMatchObject({ mode: 'day', date: '2026-08-10' });
    expect(parse('week=2026-08-10&date=2026-08-12')).toMatchObject({ date: '2026-08-12' });
    expect(parse('week=garbage')).toMatchObject({ mode: 'week', date: null });
  });

  it('reads the wizard prefill only with new=1', () => {
    const p = parse(
      'new=1&start=2026-08-18T10:00:00-06:00&end=2026-08-18T10:30:00-06:00&contact=c1&specialist=sp1&service=s1',
    );
    expect(p.new).toEqual({
      start: '2026-08-18T10:00:00-06:00',
      end: '2026-08-18T10:30:00-06:00',
      contact: 'c1',
      specialist: 'sp1',
      service: 's1',
    });
    // The wizard's own picks win over the shared filter.
    expect(parse('new=1&specialist=sp1&ns=sp2&nsvc=s9').new).toMatchObject({ specialist: 'sp2', service: 's9' });
    expect(parse('start=2026-08-18T10:00:00Z').new).toBeNull();
    expect(parse('new=1&start=not-a-time').new).toMatchObject({ start: null });
  });

  it('dedupes id lists and keeps written order', () => {
    expect(parse('specialist=b, a ,b,,').filter.specialists).toEqual(['b', 'a']);
  });
});

describe('writeBookingsParams', () => {
  it('writes nothing for the defaults and drops the legacy key', () => {
    expect(write({})).toBe('');
    expect(write({}, 'week=2026-08-10&foreign=1')).toBe('foreign=1');
  });

  it('leaves foreign keys alone', () => {
    expect(write({ q: 'ann' }, 'x=1')).toBe('x=1&q=ann');
  });

  it('takes the view from the path, and reads a stale one out of the query once', () => {
    expect(parse('', 'staff').view).toBe('staff');
    expect(parse('view=staff').view).toBe('staff');
    /* The path wins, and the stale key never survives a write. */
    expect(parse('view=services', 'staff').view).toBe('staff');
    expect(write({ view: 'staff' }, 'view=services')).toBe('');
    expect(viewSegment('staff')).toBe('staff');
    expect(viewSegment('calendar')).toBe('');
  });

  it('round-trips a full state', () => {
    const p = parse(
      'mode=month&date=2026-08-18&by=specialist&color=status&specialist=a&service=s1&status=NoShow&q=x&range=past&sort=start:asc&period=custom&from=2026-08-01&to=2026-08-31&density=compact&s=new&b=bk',
      'insights',
    );
    expect(parse(write(p), viewSegment(p.view))).toEqual(p);
  });

  it('only writes from/to in the custom range', () => {
    expect(write({ range: 'upcoming', from: '2026-08-01', to: '2026-08-31' })).toBe('');
    expect(write({ range: 'custom', from: '2026-08-01', to: null })).toBe('range=custom&from=2026-08-01');
  });

  it('writes and clears the wizard prefill', () => {
    const on = write({
      new: { start: '2026-08-18T10:00:00-06:00', end: null, contact: 'c1', specialist: 'sp2', service: null },
    });
    expect(new URLSearchParams(on).get('new')).toBe('1');
    expect(new URLSearchParams(on).get('contact')).toBe('c1');
    expect(new URLSearchParams(on).get('ns')).toBe('sp2');
    expect(parse(on).new).toMatchObject({ specialist: 'sp2', service: null });
    expect(write({ new: null }, on)).toBe('');
    // A pick equal to the filter's first is not repeated.
    const same = write({
      filter: { specialists: ['sp2'], services: [], statuses: [] },
      new: { start: null, end: null, contact: null, specialist: 'sp2', service: null },
    });
    expect(new URLSearchParams(same).has('ns')).toBe(false);
    expect(parse(same).new).toMatchObject({ specialist: 'sp2' });
  });
});

describe('parseSort', () => {
  it('accepts key:dir and rejects the rest', () => {
    expect(parseSort('price:asc')).toEqual({ key: 'price', direction: 'asc' });
    expect(parseSort('price:up')).toBeNull();
    expect(parseSort('nope:asc')).toBeNull();
    expect(parseSort(':asc')).toBeNull();
    expect(parseSort(null)).toBeNull();
  });
});
