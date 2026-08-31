import { describe, expect, it } from 'vitest';
import { ChatfuelApiError, ChatfuelHttpError, ChatfuelNetworkError } from '../src/errors';
import { uploadFile, uploadTimeoutMs } from '../src/upload';

const okResponse = (body: unknown): Response => new Response(JSON.stringify(body), { status: 200 });

describe('uploadFile', () => {
  it('POSTs multipart to the proxy path with fileType and botID', async () => {
    let seenUrl = '';
    let seenInit: RequestInit | undefined;
    const result = await uploadFile({
      botId: 'bot 1',
      file: new Blob(['x']),
      fileType: 'Image',
      fetchImpl: async (url, init) => {
        seenUrl = String(url);
        seenInit = init;
        return okResponse({ id: 'file-1', url: 'https://cdn/x' });
      },
    });
    expect(seenUrl).toBe('/chatfuel/api/filestorage/upload/bot?fileType=Image&botID=bot%201');
    expect(seenInit?.method).toBe('POST');
    expect(seenInit?.body).toBeInstanceOf(FormData);
    expect((seenInit?.body as FormData).get('file')).toBeInstanceOf(Blob);
    expect(result).toEqual({ id: 'file-1', url: 'https://cdn/x' });
  });

  it('switches to the plugin endpoint when pluginId is given', async () => {
    let seenUrl = '';
    await uploadFile({
      botId: 'b1',
      file: new Blob(['x']),
      fileType: 'Video',
      pluginId: 'el 9',
      fetchImpl: async (url) => {
        seenUrl = String(url);
        return okResponse({ id: 'file-2' });
      },
    });
    expect(seenUrl).toBe('/chatfuel/api/filestorage/upload/plugin?fileType=Video&botID=b1&pluginID=el%209');
  });

  it.each([[{ fileID: 'f1' }], [{ fileId: 'f1' }], [{ file: { id: 'f1' } }], [{ result: { fileID: 'f1' } }]])(
    'tolerates response key variant %j',
    async (body) => {
      const result = await uploadFile({
        botId: 'b',
        file: new Blob(['x']),
        fileType: 'Document',
        fetchImpl: async () => okResponse(body),
      });
      expect(result.id).toBe('f1');
    },
  );

  it('maps non-2xx to ChatfuelHttpError carrying the body snippet', async () => {
    await expect(
      uploadFile({
        botId: 'b',
        file: new Blob(['x']),
        fileType: 'Image',
        fetchImpl: async () =>
          new Response(JSON.stringify({ errors: [{ extensions: { code: 'FileTooBig' } }] }), {
            status: 413,
          }),
      }),
    ).rejects.toSatisfy((err: unknown) => err instanceof ChatfuelHttpError && err.bodySnippet.includes('FileTooBig'));
  });

  it('maps fetch rejection to ChatfuelNetworkError', async () => {
    await expect(
      uploadFile({
        botId: 'b',
        file: new Blob(['x']),
        fileType: 'Image',
        fetchImpl: async () => {
          throw new Error('offline');
        },
      }),
    ).rejects.toBeInstanceOf(ChatfuelNetworkError);
  });

  it('throws ChatfuelApiError when a 2xx response has no file id', async () => {
    await expect(
      uploadFile({
        botId: 'b',
        file: new Blob(['x']),
        fileType: 'Image',
        fetchImpl: async () => okResponse({ ok: true }),
      }),
    ).rejects.toBeInstanceOf(ChatfuelApiError);
  });
  /**
   * Every other call in this package has a budget; this one had none, so a
   * stalled connection left the upload spinning in the UI with no way out.
   */
  it('gives up on an upload the server never answers', async () => {
    const never: typeof fetch = (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal!.reason));
      });
    const failed = uploadFile({
      botId: 'b1',
      file: new Blob(['x']),
      fileType: 'Image',
      timeoutMs: 20,
      fetchImpl: never,
    });
    await expect(failed).rejects.toBeInstanceOf(ChatfuelNetworkError);
    await expect(failed).rejects.toThrow('gave up after');
  });

  it('hands the budget to fetch rather than counting it on the side', async () => {
    let seenInit: RequestInit | undefined;
    await uploadFile({
      botId: 'b1',
      file: new Blob(['x']),
      fileType: 'Image',
      fetchImpl: async (_url, init) => {
        seenInit = init;
        return okResponse({ id: 'file-3' });
      },
    });
    expect(seenInit?.signal).toBeInstanceOf(AbortSignal);
    expect(seenInit?.signal?.aborted).toBe(false);
  });

  /* A flat number would be either mean to a 25 MiB video or generous to a
     stalled one-kilobyte image. */
  it('scales the budget with the file, with a floor and a ceiling', () => {
    expect(uploadTimeoutMs(0)).toBe(30_000);
    expect(uploadTimeoutMs(1024 * 1024)).toBe(50_000);
    expect(uploadTimeoutMs(25 * 1024 * 1024)).toBe(530_000);
    expect(uploadTimeoutMs(10 * 1024 * 1024 * 1024)).toBe(600_000);
    expect(uploadTimeoutMs(Number.NaN)).toBe(30_000);
  });
});

describe('what an upload failure is allowed to say and carry', () => {
  it('keeps the upstream body out of the rendered message and on the field', () => {
    // The message reaches UIs and logs; the body is somebody else's payload.
    const err = new ChatfuelHttpError(413, JSON.stringify({ errors: [{ extensions: { code: 'FileTooBig' } }] }));
    expect(err.message).toBe('Chatfuel API HTTP 413');
    expect(err.message).not.toContain('FileTooBig');
    expect(err.bodySnippet).toContain('FileTooBig');
  });

  it('names no body when the answer carried no file id either', async () => {
    const err = await uploadFile({
      botId: 'b',
      file: new Blob(['x']),
      fileType: 'Image',
      fetchImpl: async () => new Response(JSON.stringify({ secretish: 'do-not-render-me' }), { status: 200 }),
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ChatfuelApiError);
    expect((err as Error).message).not.toContain('do-not-render-me');
    expect((err as Error).message).toMatch(/bytes of body/);
  });

  it('gives up on a response body past the cap instead of holding all of it', async () => {
    const err = await uploadFile({
      botId: 'b',
      file: new Blob(['x']),
      fileType: 'Image',
      fetchImpl: async () => new Response('y'.repeat(2 * 1024 * 1024), { status: 200 }),
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ChatfuelNetworkError);
    expect((err as Error).message).toMatch(/cap/);
  });

  it('refuses a timeout that is not a positive number of milliseconds', async () => {
    await expect(
      uploadFile({
        botId: 'b',
        file: new Blob(['x']),
        fileType: 'Image',
        timeoutMs: 0,
        fetchImpl: async () => new Response('{}', { status: 200 }),
      }),
    ).rejects.toThrow(/UploadFileOptions.timeoutMs/);
  });

  it('refuses to send a session bearer over plaintext to a host that is not loopback', async () => {
    const call = (basePath: string, withAuth: boolean) =>
      uploadFile({
        botId: 'b',
        file: new Blob(['x']),
        fileType: 'Image',
        basePath,
        getAuthHeader: withAuth ? () => 'Bearer session-jwt' : undefined,
        fetchImpl: async () => new Response(JSON.stringify({ id: 'f1' }), { status: 200 }),
      });

    await expect(call('http://uploads.example.com/api', true)).rejects.toThrow(/plaintext http/);
    // No bearer to protect, and loopback or relative, are all still fine.
    await expect(call('http://uploads.example.com/api', false)).resolves.toEqual({ id: 'f1' });
    await expect(call('http://127.0.0.1:5173/chatfuel/api', true)).resolves.toEqual({ id: 'f1' });
    await expect(call('/chatfuel/api', true)).resolves.toEqual({ id: 'f1' });
  });
});
