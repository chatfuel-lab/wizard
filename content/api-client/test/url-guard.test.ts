import { describe, expect, it } from 'vitest';
import { assertCredentialSafeUrl, carriesCredential, credentialOrigin, isLoopbackHost } from '../src/urlGuard';
import { createChatfuelClient } from '../src/client';
import { executeHttp } from '../src/transport/http';
import { CurrentUserDocument } from '../src/generated/core/graphql';

describe('isLoopbackHost', () => {
  it('knows the hosts that never leave the machine', () => {
    for (const host of ['localhost', 'LOCALHOST', 'app.localhost', '127.0.0.1', '127.1.2.3', '::1']) {
      expect(isLoopbackHost(host)).toBe(true);
    }
  });

  it('does not take a lookalike for one', () => {
    for (const host of ['localhost.example.com', 'notlocalhost', '127.0.0.1.example.com', '10.0.0.1', '::2']) {
      expect(isLoopbackHost(host)).toBe(false);
    }
  });
});

describe('assertCredentialSafeUrl', () => {
  it('accepts encrypted schemes and loopback', () => {
    expect(() => assertCredentialSafeUrl('https://panel.chatfuel.com/graphql', 'url')).not.toThrow();
    expect(() => assertCredentialSafeUrl('wss://panel.chatfuel.com/graphql', 'wsUrl')).not.toThrow();
    expect(() => assertCredentialSafeUrl('http://127.0.0.1:5173/chatfuel/graphql', 'url')).not.toThrow();
    expect(() => assertCredentialSafeUrl('ws://localhost:5173/chatfuel/graphql', 'wsUrl')).not.toThrow();
  });

  it('lets a relative url through — it inherits the page origin, which is the host’s decision', () => {
    expect(() => assertCredentialSafeUrl('/chatfuel/graphql', 'url')).not.toThrow();
  });

  it('refuses a scheme-relative url, which inherits the scheme but not the origin', () => {
    for (const raw of ['//evil.example/graphql', '//localhost/g', '///evil.example']) {
      expect(() => assertCredentialSafeUrl(raw, 'url')).toThrow(/scheme-relative/);
    }
  });

  it('refuses the backslash spellings the URL parser folds into the same host', () => {
    for (const raw of ['\\\\evil.example/graphql', '/\\evil.example/graphql', '\\/evil.example/graphql']) {
      expect(new URL(raw, 'https://page.example/app/').hostname).toBe('evil.example');
      expect(() => assertCredentialSafeUrl(raw, 'url')).toThrow(/scheme-relative/);
    }
  });

  it('refuses the whitespace spellings the URL parser removes before it resolves the host', () => {
    const cases = [
      ' http://evil.example/graphql',
      '\thttp://evil.example/graphql',
      ' //evil.example/graphql',
      '/\n/evil.example/graphql',
      'ht\rtp://evil.example/graphql',
      'http:/\t/evil.example/graphql',
    ];
    for (const raw of cases) {
      expect(new URL(raw, 'https://page.example/app/').hostname).toBe('evil.example');
      expect(() => assertCredentialSafeUrl(raw, 'url')).toThrow(/whitespace the URL parser removes/);
    }
  });

  it('refuses a url that only needed trimming, rather than trimming it quietly', () => {
    expect(() => assertCredentialSafeUrl('https://panel.chatfuel.com/graphql ', 'url')).toThrow(
      /whitespace the URL parser removes/,
    );
  });

  it('refuses plaintext to a host that is not loopback', () => {
    expect(() => assertCredentialSafeUrl('http://api.example.com/graphql', 'url')).toThrow(/plaintext http/);
    expect(() => assertCredentialSafeUrl('ws://api.example.com/graphql', 'wsUrl')).toThrow(/plaintext ws/);
  });

  it('names the option so the message points at the config line', () => {
    expect(() => assertCredentialSafeUrl('http://api.example.com/graphql', 'wsUrl')).toThrow(/^wsUrl /);
  });
});

describe('createChatfuelClient refuses an upstream it must not talk to', () => {
  const token = 'a'.repeat(64);

  it('throws on an http upstream when a token was supplied', () => {
    expect(() => createChatfuelClient({ url: 'http://api.example.com/graphql', token })).toThrow(/plaintext http/);
  });

  it('throws on a plaintext wsUrl even when the http url is fine', () => {
    expect(() =>
      createChatfuelClient({ url: 'https://api.example.com/graphql', wsUrl: 'ws://api.example.com/graphql', token }),
    ).toThrow(/^wsUrl /);
  });

  it('counts a token getter as intent to send credentials', () => {
    expect(() => createChatfuelClient({ url: 'http://api.example.com/graphql', token: () => token })).toThrow();
  });

  it('refuses a scheme-relative upstream that would look relative in a config file', () => {
    expect(() => createChatfuelClient({ url: '//evil.example/graphql', token })).toThrow(/scheme-relative/);
    expect(() => createChatfuelClient({ url: '/chatfuel/graphql', wsUrl: '//evil.example/graphql', token })).toThrow(
      /^wsUrl /,
    );
  });

  it('counts an authorization header as intent to send credentials, with no token set', () => {
    expect(() =>
      createChatfuelClient({ url: 'http://api.example.com/graphql', headers: { Authorization: `Bearer ${token}` } }),
    ).toThrow(/plaintext http/);
    expect(() =>
      createChatfuelClient({ url: 'http://api.example.com/graphql', headers: { cookie: 'sb-access-token=x' } }),
    ).toThrow(/plaintext http/);
  });

  /*
   * This used to pass: with no token and no credential header the url was
   * treated as the host's business and went unchecked. That made the guard a
   * property of the request rather than of the address — and the token a
   * deployment adds tomorrow, or a caller's own authorization header, would
   * have arrived at an address nobody rechecked.
   */
  it('checks the address even when the request in hand carries nothing', () => {
    expect(() => createChatfuelClient({ url: 'http://api.example.com/graphql' })).toThrow(/plaintext http/);
    expect(() =>
      createChatfuelClient({ url: 'http://api.example.com/graphql', headers: { 'x-trace': 'abc' } }),
    ).toThrow(/plaintext http/);
    expect(() => createChatfuelClient({ url: '//evil.example/graphql' })).toThrow(/scheme-relative/);
    expect(() =>
      createChatfuelClient({ url: 'https://api.example.com/graphql', wsUrl: 'wss://other.example/graphql' }),
    ).toThrow(/^wsUrl /);
  });

  it('leaves the dev proxy alone — loopback and relative, token or no token', () => {
    expect(() => createChatfuelClient({ url: 'http://127.0.0.1:5173/chatfuel/graphql', token })).not.toThrow();
    expect(() => createChatfuelClient({ url: 'http://127.0.0.1:5173/chatfuel/graphql' })).not.toThrow();
    expect(() => createChatfuelClient({ url: '/chatfuel/graphql', wsUrl: '/chatfuel/graphql', token })).not.toThrow();
    expect(() => createChatfuelClient({ url: '/chatfuel/graphql' })).not.toThrow();
    expect(() => createChatfuelClient({ url: 'http://localhost:5173/chatfuel/graphql' })).not.toThrow();
  });
});

describe('carriesCredential', () => {
  it('knows the headers that carry one, whatever their case', () => {
    expect(carriesCredential(undefined)).toBe(false);
    expect(carriesCredential({})).toBe(false);
    expect(carriesCredential({ 'x-trace': 'abc' })).toBe(false);
    expect(carriesCredential({ authorization: '' })).toBe(false);
    expect(carriesCredential({ Authorization: 'Bearer x' })).toBe(true);
    expect(carriesCredential({ COOKIE: 'sb=1' })).toBe(true);
    expect(carriesCredential({ 'X-Api-Key': 'k' })).toBe(true);
    expect(carriesCredential({ 'proxy-authorization': 'Basic x' })).toBe(true);
  });
});

describe('executeHttp refuses to put a credential on the wire', () => {
  const never = (() => {
    throw new Error('the request was sent');
  }) as unknown as typeof fetch;

  it('checks the url against the header it resolved, not against how the client was configured', async () => {
    await expect(
      executeHttp(
        {
          url: 'http://api.example.com/graphql',
          getAuthHeader: async () => 'Bearer secret',
          fetchImpl: never,
          timeoutMs: 1000,
        },
        CurrentUserDocument,
        {},
      ),
    ).rejects.toThrow(/plaintext http/);
  });

  it('sends nothing when the url is scheme-relative', async () => {
    await expect(
      executeHttp(
        {
          url: '//evil.example/graphql',
          getAuthHeader: async () => 'Bearer secret',
          fetchImpl: never,
          timeoutMs: 1000,
        },
        CurrentUserDocument,
        {},
      ),
    ).rejects.toThrow(/scheme-relative/);
  });

  it('leaves an unauthenticated request to a plaintext host alone', async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: RequestInfo | URL) => {
      calls.push(String(url));
      return new Response(JSON.stringify({ data: { currentUser: null } }), { status: 200 });
    }) as typeof fetch;

    await executeHttp(
      { url: 'http://api.example.com/graphql', getAuthHeader: async () => undefined, fetchImpl, timeoutMs: 1000 },
      CurrentUserDocument,
      {},
    );
    expect(calls).toHaveLength(1);
  });
});

describe('the origin a client is pinned to', () => {
  it('reads an absolute base, and reads ws and https as the same address', () => {
    expect(credentialOrigin('https://panel.chatfuel.com/graphql')).toBe('https://panel.chatfuel.com');
    expect(credentialOrigin('wss://panel.chatfuel.com/graphql')).toBe('https://panel.chatfuel.com');
    expect(credentialOrigin('https://panel.chatfuel.com:443/graphql')).toBe('https://panel.chatfuel.com');
    expect(credentialOrigin('http://localhost:5173/chatfuel/graphql')).toBe('http://localhost:5173');
  });

  it('has nothing to derive from a relative base outside a browser', () => {
    expect(credentialOrigin('/chatfuel/graphql')).toBeUndefined();
    expect(credentialOrigin('not a url')).toBeUndefined();
  });

  it('refuses a second url that names another host', () => {
    const pin = credentialOrigin('https://panel.chatfuel.com/graphql');
    expect(() => assertCredentialSafeUrl('wss://panel.chatfuel.com/graphql', 'wsUrl', pin)).not.toThrow();
    expect(() => assertCredentialSafeUrl('/chatfuel/graphql', 'wsUrl', pin)).not.toThrow();
    for (const url of [
      'https://panel.chatfuel.com.evil.example/graphql',
      'https://panel@evil.example/graphql',
      'HTTPS://EVIL.EXAMPLE/graphql',
      'wss://panel.chatfuel.com:8443/graphql',
      'https://panel.chatfuel.com.',
    ]) {
      expect(() => assertCredentialSafeUrl(url, 'wsUrl', pin)).toThrow(/this client talks to/);
    }
  });

  it('does not let a matching origin excuse plaintext', () => {
    const pin = credentialOrigin('http://api.example.com/graphql');
    expect(() => assertCredentialSafeUrl('http://api.example.com/graphql', 'wsUrl', pin)).toThrow(/plaintext http/);
  });
});
