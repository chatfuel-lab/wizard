import { describe, expect, it } from 'vitest';
import { NEW_EVENT, eventParams, parseAddress } from './adsParams';

describe('parseAddress', () => {
  it('reads the set out of the path and the event out of the query', () => {
    expect(parseAddress('fa-ads-spring', new URLSearchParams('e=ev-1'))).toEqual({
      setId: 'fa-ads-spring',
      eventId: 'ev-1',
    });
  });

  it('has no set at the module root', () => {
    expect(parseAddress('', new URLSearchParams()).setId).toBeNull();
  });

  it('ignores anything below the first segment', () => {
    // The set is the whole address; a deeper path is a link from an older build.
    expect(parseAddress('fa-ads-spring/events/3', new URLSearchParams()).setId).toBe('fa-ads-spring');
  });

  it('treats a blank parameter as absent', () => {
    expect(parseAddress('set', new URLSearchParams('e=')).eventId).toBeNull();
  });

  it('recognises the id that means "a new one"', () => {
    expect(parseAddress('set', new URLSearchParams(`e=${NEW_EVENT}`)).eventId).toBe(NEW_EVENT);
  });
});

describe('eventParams', () => {
  it('keeps every other parameter untouched', () => {
    const next = eventParams(new URLSearchParams('q=sale&e=old'), 'ev-2');
    expect(next.get('q')).toBe('sale');
    expect(next.get('e')).toBe('ev-2');
  });

  it('drops the key rather than writing an empty one', () => {
    const next = eventParams(new URLSearchParams('e=ev-2&q=sale'), null);
    expect(next.has('e')).toBe(false);
    expect(next.get('q')).toBe('sale');
  });
});
