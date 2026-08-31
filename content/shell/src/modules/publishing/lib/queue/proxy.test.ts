import { describe, expect, it } from 'vitest';
import { probeQueueRoutes, readConfig } from './proxy';

const answering =
  (body: string, init: ResponseInit = {}) =>
  async () =>
    new Response(body, init);

describe('readConfig', () => {
  it('accepts the config, and only the config', () => {
    expect(readConfig('{"scheduling":true}')).toEqual({ scheduling: true });
    expect(readConfig('{"scheduling":false}')).toEqual({ scheduling: false });
  });

  it('rejects an app’s own HTML, which is what a catch-all route serves', () => {
    expect(readConfig('<!doctype html><html><body>…</body></html>')).toBeNull();
  });

  it('rejects a body that parses but is not this', () => {
    expect(readConfig('')).toBeNull();
    expect(readConfig('null')).toBeNull();
    expect(readConfig('[]')).toBeNull();
    expect(readConfig('{"scheduling":"yes"}')).toBeNull();
    expect(readConfig('{"other":1}')).toBeNull();
  });
});

describe('probeQueueRoutes', () => {
  it('reads a mounted route', async () => {
    await expect(probeQueueRoutes(answering('{"scheduling":true}'))).resolves.toEqual({ scheduling: true });
  });

  it('reads a 404 as not mounted', async () => {
    await expect(probeQueueRoutes(answering('nope', { status: 404 }))).resolves.toBeNull();
  });

  it('reads the app’s own HTML as not mounted, whatever status it came with', async () => {
    // A single-page app is served by a catch-all, so an address the proxy never
    // claimed comes back as HTML with a 200 on it. A deployment that simply has
    // no database must work without one rather than show an error.
    const html = '<!doctype html><html><head><script type="module">…</script></head></html>';
    await expect(probeQueueRoutes(answering(html))).resolves.toBeNull();
  });

  it('reads a network failure as not mounted', async () => {
    await expect(
      probeQueueRoutes(async () => {
        throw new Error('fetch failed');
      }),
    ).resolves.toBeNull();
  });

  it('does NOT swallow a route that answered badly', async () => {
    // Falling back silently from a broken server would hide a schedule that
    // never fires behind a list of drafts that look fine.
    await expect(
      probeQueueRoutes(answering('{"errors":[{"message":"the database could not be reached"}]}', { status: 503 })),
    ).rejects.toThrow('the database could not be reached');
  });
});
