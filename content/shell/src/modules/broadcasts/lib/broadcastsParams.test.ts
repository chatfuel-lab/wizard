import { describe, expect, it } from 'vitest';
import { parseAddress, viewSegment, writeAddress } from './broadcastsParams';

describe('reading the address', () => {
  it('falls back silently on anything unknown', () => {
    const address = parseAddress('nonsense', new URLSearchParams('status=purple&step=fly&c=f1'));
    expect(address.view).toBe('campaigns');
    expect(address.status).toBeNull();
    expect(address.step).toBeNull();
    expect(address.campaign).toBe('f1');
  });

  it('reads each view', () => {
    expect(parseAddress('', new URLSearchParams()).view).toBe('campaigns');
    expect(parseAddress('templates', new URLSearchParams('t=123&q=sale')).template).toBe('123');
    expect(parseAddress('compose', new URLSearchParams('c=f1&step=audience')).step).toBe('audience');
  });
});

describe('writing the address', () => {
  it('omits what is not said and leaves a host key alone', () => {
    const out = writeAddress(new URLSearchParams('host=1'), {
      view: 'campaigns',
      campaign: null,
      step: null,
      status: 'sent',
      q: '',
      template: null,
    });
    expect(out.toString()).toBe('host=1&status=sent');
    expect(viewSegment('campaigns')).toBe('');
    expect(viewSegment('templates')).toBe('templates');
  });

  it('keeps only the keys the view reads, and the search for the way back', () => {
    const out = writeAddress(new URLSearchParams('status=sent&q=x&t=9'), {
      view: 'compose',
      campaign: 'f1',
      step: 'review',
      status: 'sent',
      q: 'x',
      template: '9',
    });
    expect(out.toString()).toBe('q=x&c=f1&step=review');
  });
});
