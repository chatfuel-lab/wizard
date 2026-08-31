import { afterEach, describe, expect, it } from 'vitest';
import { unreachableHint } from '../src/steps/token';

/**
 * What the token step says when the call never got an answer.
 *
 * The whole point: a proxy that blocks the API fails exactly like a rejected
 * token, and the run ends on "could not reach the Chatfuel API". Whatever is
 * printed next has to be the thing that tells the two apart.
 */
afterEach(() => {
  delete process.env.HTTPS_PROXY;
  delete process.env.https_proxy;
});

describe('unreachableHint', () => {
  it('names the proxy and the host it has to allow', () => {
    process.env.HTTPS_PROXY = 'http://proxy.example:8080';
    expect(unreachableHint(new Error('fetch failed'))).toBe(
      'Sent through HTTPS_PROXY=http://proxy.example:8080 — check that the proxy allows panel.chatfuel.com.',
    );
  });

  it('never prints the proxy password', () => {
    process.env.HTTPS_PROXY = 'http://sam:hunter2@proxy.example:8080';
    const hint = unreachableHint(new Error('fetch failed'));
    expect(hint).not.toContain('hunter2');
    expect(hint).toContain('proxy.example');
  });

  it('falls back to what the transport actually said', () => {
    expect(unreachableHint(new Error('getaddrinfo ENOTFOUND panel.chatfuel.com'))).toBe(
      'getaddrinfo ENOTFOUND panel.chatfuel.com',
    );
    expect(unreachableHint('not an error')).toBeUndefined();
  });
});
