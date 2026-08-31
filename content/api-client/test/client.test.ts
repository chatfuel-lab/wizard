import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CurrentUserDocument, WorkspaceCreateBotDocument } from '../src/generated/core/graphql';
import { ChatfuelAuthError, ChatfuelHttpError, ChatfuelNetworkError } from '../src/errors';
import { createChatfuelClient } from '../src/client';

function fetchReturning(
  body: unknown,
  status = 200,
): typeof fetch & { calls: Array<{ url: string; init: RequestInit }> } {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const impl = (async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
  }) as typeof fetch & { calls: Array<{ url: string; init: RequestInit }> };
  impl.calls = calls;
  return impl;
}

describe('createChatfuelClient (HTTP)', () => {
  it('sends Authorization, operationName and ?op=, and returns data', async () => {
    const fetchImpl = fetchReturning({ data: { currentUser: { id: 'u1' } } });
    const client = createChatfuelClient({ token: 'a'.repeat(64), fetch: fetchImpl });

    const data = await client.query(CurrentUserDocument, {});
    expect(data).toEqual({ currentUser: { id: 'u1' } });

    const call = fetchImpl.calls[0]!;
    expect(call.url).toBe('https://panel.chatfuel.com/graphql?op=CurrentUser');
    expect((call.init.headers as Record<string, string>).authorization).toBe(`Bearer ${'a'.repeat(64)}`);
    const body = JSON.parse(String(call.init.body)) as { operationName: string; query: string };
    expect(body.operationName).toBe('CurrentUser');
    expect(body.query).toContain('query CurrentUser');
  });

  it('lets one request outlive the client-wide timeout', async () => {
    // The client's own budget and the caller's are `any`-ed together, so the
    // shorter one used to win however long a single mutation was given. A
    // publish that waits on Instagram needs minutes; nothing else does.
    const calls: number[] = [];
    const impl = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const signal = init?.signal as AbortSignal | undefined;
      await new Promise((resolve) => setTimeout(resolve, 60));
      calls.push(signal?.aborted ? 1 : 0);
      if (signal?.aborted) throw new Error('aborted');
      return new Response(JSON.stringify({ data: { currentUser: { id: 'u1' } } }), { status: 200 });
    }) as typeof fetch;
    const client = createChatfuelClient({ url: '/chatfuel/graphql', fetch: impl, timeoutMs: 20 });

    await expect(client.query(CurrentUserDocument, {})).rejects.toThrow();
    const data = await client.query(CurrentUserDocument, {}, { timeoutMs: 5_000 });
    expect(data).toEqual({ currentUser: { id: 'u1' } });
    expect(calls).toEqual([1, 0]);
  });

  it('omits Authorization when no token (browser-behind-proxy mode)', async () => {
    const fetchImpl = fetchReturning({ data: {} });
    const client = createChatfuelClient({ url: '/chatfuel/graphql', fetch: fetchImpl });
    await client.query(CurrentUserDocument, {});
    const headers = fetchImpl.calls[0]!.init.headers as Record<string, string>;
    expect(headers.authorization).toBeUndefined();
    expect(fetchImpl.calls[0]!.url).toBe('/chatfuel/graphql?op=CurrentUser');
  });

  it('leaves one authorization header when a caller supplied its own cased variant', async () => {
    // Header names are case-insensitive on the wire; object keys are not. Two
    // surviving keys would reach `Headers` and be joined into
    // "Bearer theirs, Bearer ours", which is neither token.
    const fetchImpl = fetchReturning({ data: {} });
    const client = createChatfuelClient({
      token: 'a'.repeat(64),
      fetch: fetchImpl,
      headers: { Authorization: 'Bearer someone-else', 'X-Trace': 'keep-me' },
    });
    await client.query(CurrentUserDocument, {});

    const headers = fetchImpl.calls[0]!.init.headers as Record<string, string>;
    const authKeys = Object.keys(headers).filter((key) => key.toLowerCase() === 'authorization');
    expect(authKeys).toEqual(['authorization']);
    expect(headers.authorization).toBe(`Bearer ${'a'.repeat(64)}`);
    expect(new Headers(headers).get('authorization')).toBe(`Bearer ${'a'.repeat(64)}`);
    expect(headers['x-trace']).toBe('keep-me');
  });

  it('refuses a timeout that is not a positive number of milliseconds', async () => {
    expect(() => createChatfuelClient({ timeoutMs: 0 })).toThrow(/timeoutMs/);
    expect(() => createChatfuelClient({ timeoutMs: -1 })).toThrow(/timeoutMs/);
    expect(() => createChatfuelClient({ timeoutMs: Number.NaN })).toThrow(/timeoutMs/);

    const client = createChatfuelClient({ url: '/chatfuel/graphql', fetch: fetchReturning({ data: {} }) });
    await expect(client.query(CurrentUserDocument, {}, { timeoutMs: 0 })).rejects.toThrow(/RequestOptions.timeoutMs/);
  });

  it('gives up on a response body that goes past the cap', async () => {
    const oversized = (async () =>
      new Response(JSON.stringify({ data: { blob: 'x'.repeat(4096) } }), { status: 200 })) as typeof fetch;
    const client = createChatfuelClient({
      url: '/chatfuel/graphql',
      fetch: oversized,
      maxResponseBytes: 512,
      throttle: false,
    });
    await expect(client.query(CurrentUserDocument, {})).rejects.toBeInstanceOf(ChatfuelNetworkError);
  });

  it('throws ChatfuelAuthError on HTTP-200 envelope with code Unauthorized', async () => {
    const fetchImpl = fetchReturning({
      data: null,
      errors: [{ message: 'nope', extensions: { code: 'Unauthorized', traceId: 't1' } }],
    });
    const client = createChatfuelClient({ token: 'b'.repeat(64), fetch: fetchImpl });
    await expect(client.query(CurrentUserDocument, {})).rejects.toBeInstanceOf(ChatfuelAuthError);
  });

  it('execute returns the envelope without throwing (partial data path)', async () => {
    const fetchImpl = fetchReturning({ data: { half: true }, errors: [{ message: 'partial' }] });
    const client = createChatfuelClient({ token: 'c'.repeat(64), fetch: fetchImpl });
    const envelope = await client.execute(CurrentUserDocument, {});
    expect(envelope.data).toEqual({ half: true });
    expect(envelope.errors).toHaveLength(1);
  });

  it('strips __typename from variables recursively', async () => {
    const fetchImpl = fetchReturning({ data: {} });
    const client = createChatfuelClient({ token: 'd'.repeat(64), fetch: fetchImpl });
    await client.mutate(CurrentUserDocument, {
      filter: { __typename: 'X', nested: [{ __typename: 'Y', keep: 1 }] },
    } as never);
    const body = JSON.parse(String(fetchImpl.calls[0]!.init.body)) as { variables: unknown };
    expect(body.variables).toEqual({ filter: { nested: [{ keep: 1 }] } });
  });

  it('surfaces non-envelope responses as ChatfuelHttpError with status', async () => {
    const fetchImpl = fetchReturning('<html>bad gateway</html>', 502);
    const client = createChatfuelClient({ token: 'e'.repeat(64), fetch: fetchImpl });
    const err = await client.query(CurrentUserDocument, {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ChatfuelHttpError);
    expect((err as ChatfuelHttpError).status).toBe(502);
  });

  it('always throws ChatfuelHttpError on 429 even with a JSON body (throttle retry contract)', async () => {
    const fetchImpl = fetchReturning({ errors: [{ message: 'rate limited' }] }, 429);
    const client = createChatfuelClient({ token: 'f'.repeat(64), fetch: fetchImpl });
    const err = await client.query(CurrentUserDocument, {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ChatfuelHttpError);
    expect((err as ChatfuelHttpError).status).toBe(429);
  });
});

describe('retry policy is decided by the operation, not the caller', () => {
  // A mutation that reached Chatfuel, ran, and lost its answer on the way back
  // is indistinguishable from one that never arrived. Replaying it bills the
  // deployment for a second workspace, so it is not replayed.
  const THROTTLE = { rps: 1000, concurrency: 2, maxRetries: 3 } as const;
  const CREATE_VARS = { workspaceID: 'w1', initialTitle: 'Bot' };

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const counting = (respond: (call: number) => Promise<Response>) => {
    let calls = 0;
    const impl = (async () => {
      calls += 1;
      return respond(calls);
    }) as typeof fetch;
    return { impl, count: () => calls };
  };

  it('does not replay a mutation whose request failed on the network', async () => {
    const fetchImpl = counting(() => Promise.reject(new Error('connection reset')));
    const client = createChatfuelClient({ token: 'a'.repeat(64), fetch: fetchImpl.impl, throttle: THROTTLE });

    const result = client.mutate(WorkspaceCreateBotDocument, CREATE_VARS);
    const assertion = expect(result).rejects.toBeInstanceOf(ChatfuelNetworkError);
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
    expect(fetchImpl.count()).toBe(1);
  });

  it('does not replay a mutation that came back 503', async () => {
    const fetchImpl = counting(() => Promise.resolve(new Response('upstream down', { status: 503 })));
    const client = createChatfuelClient({ token: 'a'.repeat(64), fetch: fetchImpl.impl, throttle: THROTTLE });

    const result = client.mutate(WorkspaceCreateBotDocument, CREATE_VARS);
    const assertion = expect(result).rejects.toBeInstanceOf(ChatfuelHttpError);
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
    expect(fetchImpl.count()).toBe(1);
  });

  it('still replays a mutation that came back 429', async () => {
    // 429 names itself: turned away before it ran, so a repeat cannot double it.
    const fetchImpl = counting((call) =>
      call === 1
        ? Promise.resolve(new Response('slow down', { status: 429 }))
        : Promise.resolve(
            new Response(JSON.stringify({ data: { workspaceCreateBot: { id: 'b1', title: 'Bot' } } }), {
              status: 200,
            }),
          ),
    );
    const client = createChatfuelClient({ token: 'a'.repeat(64), fetch: fetchImpl.impl, throttle: THROTTLE });

    const result = client.mutate(WorkspaceCreateBotDocument, CREATE_VARS);
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(result).resolves.toEqual({ workspaceCreateBot: { id: 'b1', title: 'Bot' } });
    expect(fetchImpl.count()).toBe(2);
  });

  it('still replays a query on 503 and on a network failure', async () => {
    const onFive = counting(() => Promise.resolve(new Response('upstream down', { status: 503 })));
    const fiveClient = createChatfuelClient({ token: 'a'.repeat(64), fetch: onFive.impl, throttle: THROTTLE });
    const five = expect(fiveClient.query(CurrentUserDocument, {})).rejects.toBeInstanceOf(ChatfuelHttpError);
    await vi.advanceTimersByTimeAsync(120_000);
    await five;
    expect(onFive.count()).toBe(4);

    const onNet = counting(() => Promise.reject(new Error('connection reset')));
    const netClient = createChatfuelClient({ token: 'a'.repeat(64), fetch: onNet.impl, throttle: THROTTLE });
    const net = expect(netClient.query(CurrentUserDocument, {})).rejects.toBeInstanceOf(ChatfuelNetworkError);
    await vi.advanceTimersByTimeAsync(120_000);
    await net;
    expect(onNet.count()).toBe(4);
  });
});
