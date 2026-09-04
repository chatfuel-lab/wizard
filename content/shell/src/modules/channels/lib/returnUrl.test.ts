import { describe, expect, it } from 'vitest';
import { channelsUrl, clearHandOff, readHandOff, returnUrls } from './returnUrl';

describe('channelsUrl', () => {
  it('points back at this app’s own channels page, mount point included', () => {
    const url = channelsUrl('whatsapp', 'connected', { origin: 'https://app.example' }, '/');
    expect(url).toBe('https://app.example/channels?result=connected&channel=whatsapp');
    expect(channelsUrl('tiktok', 'failed', { origin: 'https://app.example' }, '/desk/')).toBe(
      'https://app.example/desk/channels?result=failed&channel=tiktok',
    );
  });

  it('gives no redirect at all where the API would refuse one', () => {
    // The server takes https with a host and nothing else, so a dev server on
    // http gets none rather than a refused create.
    expect(channelsUrl('whatsapp', 'connected', { origin: 'http://localhost:5173' }, '/')).toBeNull();
    expect(channelsUrl('whatsapp', 'connected', undefined, '/')).toBeNull();
  });

  it('builds both halves together', () => {
    const urls = returnUrls('instagram', { origin: 'https://app.example' }, '/');
    expect(urls.onSuccessRedirectURL).toContain('result=connected');
    expect(urls.onFailureRedirectURL).toContain('result=failed');
  });
});

describe('readHandOff', () => {
  it('reads a return leg, and nothing from an address somebody made up', () => {
    expect(readHandOff(new URLSearchParams('result=connected&channel=whatsapp'))).toEqual({
      platform: 'whatsapp',
      ok: true,
    });
    expect(readHandOff(new URLSearchParams('result=failed&channel=tiktok'))).toEqual({ platform: 'tiktok', ok: false });
    expect(readHandOff(new URLSearchParams('result=connected&channel=facebook'))).toBeNull();
    expect(readHandOff(new URLSearchParams('result=maybe&channel=whatsapp'))).toBeNull();
    expect(readHandOff(new URLSearchParams(''))).toBeNull();
  });

  it('takes its own keys out of the address and leaves the rest', () => {
    const cleaned = clearHandOff(new URLSearchParams('result=connected&channel=whatsapp&keep=1'));
    expect(cleaned.toString()).toBe('keep=1');
  });
});
