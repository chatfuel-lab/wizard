import { describe, expect, it } from 'vitest';
import { probeQueueRoutes, readConfig, uploadDurableMedia } from './proxy';

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

describe('uploadDurableMedia', () => {
  const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'photo.jpg', { type: 'image/jpeg' });

  it('sends the file as the part the route reads, under the bot it belongs to', async () => {
    const seen: Array<{ path: string; init?: RequestInit }> = [];
    const proxyFetch = async (path: string, init?: RequestInit): Promise<Response> => {
      seen.push({ path, init });
      return new Response(
        '{"url":"https://x.supabase.co/storage/v1/object/public/cf-pub-media/bot%201/a.jpg","key":"bot 1/a.jpg"}',
      );
    };
    const kept = await uploadDurableMedia(proxyFetch, 'bot 1', file);

    expect(kept.key).toBe('bot 1/a.jpg');
    expect(seen).toHaveLength(1);
    expect(seen[0]!.path).toBe('/publishing/media?botID=bot%201');
    expect(seen[0]!.init?.method).toBe('POST');
    const body = seen[0]!.init?.body as FormData;
    expect((body.get('file') as File).name).toBe('photo.jpg');
    // The browser writes the boundary; a content-type set here would name one
    // the body does not use, and the route would find no file in it.
    expect(seen[0]!.init?.headers).toBeUndefined();
  });

  it('passes on what the route said when it refuses', async () => {
    const refusing = answering('{"errors":[{"message":"That file is too large"}]}', { status: 413 });
    await expect(uploadDurableMedia(refusing, 'bot-1', file)).rejects.toThrow('That file is too large');
  });
});
