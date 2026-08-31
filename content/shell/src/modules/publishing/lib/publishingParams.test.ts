import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CALENDAR_MODE,
  DEFAULT_VIEW,
  parseAddress,
  viewSegment,
  writeAddress,
  type PublishingAddress,
} from './publishingParams';

const p = (qs = ''): URLSearchParams => new URLSearchParams(qs);

describe('parseAddress', () => {
  it('reads the module root as the calendar', () => {
    expect(parseAddress('', p()).view).toBe(DEFAULT_VIEW);
    expect(parseAddress('', p()).mode).toBe(DEFAULT_CALENDAR_MODE);
    expect(parseAddress('', p()).compose).toBeNull();
  });

  it('reads each view from the path segment, ignoring anything after it', () => {
    expect(parseAddress('queue', p()).view).toBe('queue');
    expect(parseAddress('library', p()).view).toBe('library');
    expect(parseAddress('queue/whatever', p()).view).toBe('queue');
  });

  it('falls back silently on every unknown value', () => {
    // A hand-edited address must never white-screen.
    expect(parseAddress('nonsense', p()).view).toBe(DEFAULT_VIEW);
    expect(parseAddress('', p('mode=spiral')).mode).toBe(DEFAULT_CALENDAR_MODE);
    expect(parseAddress('', p('status=exploded')).status).toBeNull();
    expect(parseAddress('', p('kind=purple')).kind).toBeNull();
    expect(parseAddress('', p('month=2026-13')).month).toBeNull();
    expect(parseAddress('', p('month=nope')).month).toBeNull();
  });

  it('keeps the values it does recognise', () => {
    const a = parseAddress('queue', p('status=failed&kind=reel&mode=week&month=2026-08&compose=abc'));
    expect(a).toEqual({
      view: 'queue',
      compose: 'abc',
      from: null,
      at: null,
      mode: 'week',
      month: '2026-08',
      status: 'failed',
      kind: 'reel',
    });
  });

  it('reads the library kinds, ads included', () => {
    // `?kind=` is the library's key, and the library holds media this app
    // cannot publish — an ad has to be nameable or its tiles belong to nothing.
    for (const kind of ['post', 'reel', 'story', 'carousel', 'ad'] as const) {
      expect(parseAddress('library', p(`kind=${kind}`)).kind).toBe(kind);
    }
  });

  it('reads the media a new post is being started from', () => {
    const a = parseAddress('library', p('compose=new&from=ig-post-3'));
    expect(a.compose).toBe('new');
    expect(a.from).toBe('ig-post-3');
    expect(parseAddress('library', p('from=   ')).from).toBeNull();
  });

  it('reads the slot a new post was started at', () => {
    const a = parseAddress('', p('compose=new&at=2026-08-19T09:00:00.000Z'));
    expect(a.at).toBe('2026-08-19T09:00:00.000Z');
    expect(parseAddress('', p('at=   ')).at).toBeNull();
  });

  it('treats an empty parameter as absent', () => {
    expect(parseAddress('', p('compose=&status=&month=')).compose).toBeNull();
    expect(parseAddress('', p('compose=   ')).compose).toBeNull();
  });
});

describe('viewSegment', () => {
  it('gives the default view no segment at all', () => {
    expect(viewSegment('calendar')).toBe('');
    expect(viewSegment('queue')).toBe('queue');
    expect(viewSegment('library')).toBe('library');
  });
});

describe('writeAddress', () => {
  const base: PublishingAddress = {
    view: 'calendar',
    compose: null,
    from: null,
    at: null,
    mode: DEFAULT_CALENDAR_MODE,
    month: null,
    status: null,
    kind: null,
  };

  it('omits every default, so a link that says nothing is empty', () => {
    expect(writeAddress(p(), base).toString()).toBe('');
  });

  it('writes only what is not a default', () => {
    const out = writeAddress(p(), { ...base, mode: 'month', compose: 'abc' });
    expect(out.get('mode')).toBe('month');
    expect(out.get('compose')).toBe('abc');
    expect(out.get('status')).toBeNull();
  });

  it('leaves parameters that are not this module’s alone', () => {
    const out = writeAddress(p('theirs=1&mode=week'), base);
    expect(out.get('theirs')).toBe('1');
    expect(out.get('mode')).toBeNull();
  });

  it('writes the composer and its seed in one go', () => {
    // Both keys in a single write is the whole point: opening the composer on a
    // library tile is one navigation, not two that race each other.
    const out = writeAddress(p(), { ...base, compose: 'new', from: 'ig-post-3' });
    expect(out.get('compose')).toBe('new');
    expect(out.get('from')).toBe('ig-post-3');
  });

  it('round-trips whatever parseAddress read', () => {
    const address = parseAddress('queue', p('status=failed&kind=reel&mode=week&month=2026-08&compose=abc'));
    expect(parseAddress('queue', writeAddress(p(), address))).toEqual(address);
  });
});
