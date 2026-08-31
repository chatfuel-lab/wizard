import { describe, expect, it } from 'vitest';
import { DEFAULT_VIEW, parseAddress, viewSegment, writeAddress } from './adminParams';

describe('the address', () => {
  it('reads the view from the path segment and the rest from the query', () => {
    const address = parseAddress('health', new URLSearchParams('w=ws-1&b=bot-1'));
    expect(address).toEqual({ view: 'health', workspace: 'ws-1', bot: 'bot-1' });
  });

  it('falls back silently rather than white-screening on a hand-edited address', () => {
    expect(parseAddress('nonsense', new URLSearchParams()).view).toBe(DEFAULT_VIEW);
    expect(parseAddress('', new URLSearchParams('w=&b=  ')).workspace).toBeNull();
    expect(parseAddress('', new URLSearchParams('w=&b=  ')).bot).toBeNull();
  });

  it('keeps the default view out of the path, so /admin IS the bots', () => {
    expect(viewSegment('bots')).toBe('');
    expect(viewSegment('access')).toBe('access');
  });

  it('writes only its own keys and drops what is empty', () => {
    const out = writeAddress(new URLSearchParams('theirs=1&w=old'), {
      view: 'bots',
      workspace: 'ws-2',
      bot: null,
    });
    expect(out.get('theirs')).toBe('1');
    expect(out.get('w')).toBe('ws-2');
    expect(out.has('b')).toBe(false);
  });

  it('round-trips what it parsed', () => {
    const params = new URLSearchParams('w=ws-1&b=bot-1');
    expect(writeAddress(new URLSearchParams(), parseAddress('access', params)).toString()).toBe(params.toString());
  });
});
