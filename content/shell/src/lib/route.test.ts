import { describe, expect, it } from 'vitest';
import { buildUrl, legacyHashTarget, migrateLegacyHash, normalizeBase, parseLocation, pathBelow } from './route';

const at = (pathname: string, search = '', hash = '') => ({ pathname, search, hash });

describe('parseLocation', () => {
  it('parses a module route with params', () => {
    const r = parseLocation(at('/livechat', '?c=1'));
    expect(r.moduleId).toBe('livechat');
    expect(r.path).toBe('livechat');
    expect(r.segments).toEqual(['livechat']);
    expect(r.params.get('c')).toBe('1');
  });
  it('parses a view segment', () => {
    const r = parseLocation(at('/contacts/fields', '?density=compact'));
    expect(r.moduleId).toBe('contacts');
    expect(r.segments).toEqual(['contacts', 'fields']);
    expect(r.params.get('density')).toBe('compact');
  });
  it('parses a nested host route', () => {
    const r = parseLocation(at('/invite/abc-DEF_1', '?x=1'));
    expect(r.moduleId).toBe('invite');
    expect(r.path).toBe('invite/abc-DEF_1');
  });
  it('trims trailing slashes and reads the root as no route', () => {
    expect(parseLocation(at('/team/')).path).toBe('team');
    expect(parseLocation(at('/')).moduleId).toBeNull();
    expect(parseLocation(at('/')).segments).toEqual([]);
  });
  it('maps a bare k=v fragment (Supabase error redirect) to the auth callback', () => {
    const r = parseLocation(at('/', '', '#error=access_denied&error_code=otp_expired'));
    expect(r.moduleId).toBe('auth');
    expect(r.path).toBe('auth/callback');
    expect(r.params.get('error_code')).toBe('otp_expired');
  });
  it('reads the fragment ahead of the path — the tokens arrive wherever the person was', () => {
    const r = parseLocation(at('/deals/board', '?x=1', '#access_token=abc&type=recovery'));
    expect(r.path).toBe('auth/callback');
    expect(r.params.get('access_token')).toBe('abc');
  });
  it('ignores a fragment that is not a route and not Supabase’s', () => {
    expect(parseLocation(at('/deals', '', '#section')).moduleId).toBe('deals');
  });
});

describe('the mount point', () => {
  it('normalizes whatever the build was given', () => {
    expect(normalizeBase(undefined)).toBe('/');
    expect(normalizeBase('./')).toBe('/');
    expect(normalizeBase('/app')).toBe('/app/');
    expect(normalizeBase('app/')).toBe('/app/');
  });
  it('reads a path below it, and refuses to mistake a sibling for one', () => {
    expect(pathBelow('/app/contacts/fields', '/app/')).toBe('contacts/fields');
    expect(pathBelow('/app/', '/app/')).toBe('');
    expect(parseLocation(at('/app/deals/table'), '/app/').segments).toEqual(['deals', 'table']);
  });
  it('builds every address below it', () => {
    expect(buildUrl('contacts/fields', undefined, '/app/')).toBe('/app/contacts/fields');
    expect(buildUrl('livechat', new URLSearchParams({ c: '1' }), '/app/')).toBe('/app/livechat?c=1');
  });
});

describe('buildUrl', () => {
  it('round-trips with parseLocation', () => {
    const url = buildUrl('invite/abc', new URLSearchParams({ x: '1' }));
    expect(url).toBe('/invite/abc?x=1');
    expect(parseLocation(at('/invite/abc', '?x=1')).path).toBe('invite/abc');
    expect(buildUrl('team')).toBe('/team');
  });
});

describe('links minted while this app routed in the fragment', () => {
  it('becomes the same address as a path', () => {
    expect(legacyHashTarget('#/livechat?c=1')).toBe('/livechat?c=1');
    expect(legacyHashTarget('#/invite/abc')).toBe('/invite/abc');
    expect(legacyHashTarget('#/team/')).toBe('/team');
    expect(legacyHashTarget('#/')).toBe('/');
  });
  it('carries the mount point', () => {
    expect(legacyHashTarget('#/livechat?c=1', '/app/')).toBe('/app/livechat?c=1');
  });
  it('leaves a fragment that is not ours exactly where it is', () => {
    expect(legacyHashTarget('#error=access_denied&error_code=otp_expired')).toBeNull();
    expect(legacyHashTarget('#access_token=abc')).toBeNull();
    expect(legacyHashTarget('')).toBeNull();
    expect(legacyHashTarget('#section')).toBeNull();
  });
});

describe('migrateLegacyHash', () => {
  /* These tests run without a DOM — the shell's suite is node-only — so `window` is
     stood up as the two things this function actually touches. */
  const withWindow = <T>(hash: string, replaceState: History['replaceState'], body: () => T): T => {
    const had = 'window' in globalThis;
    const before = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = { location: { hash }, history: { replaceState } };
    try {
      return body();
    } finally {
      if (had) (globalThis as { window?: unknown }).window = before;
      else delete (globalThis as { window?: unknown }).window;
    }
  };

  it('rewrites a legacy link as the path it now means', () => {
    const seen: string[] = [];
    withWindow('#/livechat?c=1', (_s, _t, url) => void seen.push(String(url)), migrateLegacyHash);
    expect(seen).toEqual(['/livechat?c=1']);
  });

  it('leaves a fragment that is not ours alone', () => {
    const seen: string[] = [];
    withWindow('#access_token=abc', (_s, _t, url) => void seen.push(String(url)), migrateLegacyHash);
    expect(seen).toEqual([]);
  });

  /* main.tsx calls this at module scope, before createRoot: whatever it does with a
     legacy link, it has to leave an app that boots. */
  it('leaves the app booting when the browser refuses to rewrite the address', () => {
    const refuse = () => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    };
    expect(() => withWindow('#/livechat?c=1', refuse, migrateLegacyHash)).not.toThrow();
  });
});
