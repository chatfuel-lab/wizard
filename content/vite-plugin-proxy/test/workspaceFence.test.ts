import { describe, expect, it } from 'vitest';
import { botIdsInFenceAnswer, createWorkspaceFence } from '../src/workspaceFence';

/**
 * The fence decides whether a request may name a bot, so its failure modes are
 * the interesting part: what it does when it has never had an answer, and what
 * it does when it had one and the refresh fails. Those two must differ — the
 * first has nothing to be honest with, the second does.
 */

const TOKEN = 'a1b2'.repeat(16);

function answer(workspaces: Array<{ id: string; bots: string[] }>): Response {
  return new Response(
    JSON.stringify({
      data: {
        currentUser: {
          id: 'account',
          workspaces: workspaces.map((w) => ({ id: w.id, bots: w.bots.map((id) => ({ id })) })),
        },
      },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

interface Harness {
  fetch: typeof globalThis.fetch;
  calls: () => number;
  respond: (next: () => Response | Promise<Response>) => void;
}

function harness(initial: () => Response | Promise<Response>): Harness {
  let calls = 0;
  let responder = initial;
  return {
    fetch: (async () => {
      calls += 1;
      return responder();
    }) as unknown as typeof globalThis.fetch,
    calls: () => calls,
    respond: (next) => {
      responder = next;
    },
  };
}

describe('botIdsInFenceAnswer', () => {
  it('unions the bots of every workspace', () => {
    const ids = botIdsInFenceAnswer({
      data: { currentUser: { id: 'a', workspaces: [{ bots: [{ id: 'x' }] }, { bots: [{ id: 'y' }] }] } },
    });
    expect([...ids!].sort()).toEqual(['x', 'y']);
  });

  it('reads an account whose workspaces hold nothing as an empty set, not as unknown', () => {
    const ids = botIdsInFenceAnswer({ data: { currentUser: { id: 'a', workspaces: [{ bots: [] }] } } });
    expect(ids).toEqual(new Set());
  });

  it('refuses an error envelope or a changed shape', () => {
    expect(botIdsInFenceAnswer({ data: null, errors: [{ message: 'no' }] })).toBeUndefined();
    expect(botIdsInFenceAnswer({ data: { currentUser: { id: 'a' } } })).toBeUndefined();
    expect(botIdsInFenceAnswer('not json at all')).toBeUndefined();
  });
});

describe('createWorkspaceFence', () => {
  it('asks once and serves the answer from cache until the TTL runs out', async () => {
    let now = 1_000;
    const api = harness(() => answer([{ id: 'ws-1', bots: ['b1'] }]));
    const fence = createWorkspaceFence({
      upstream: 'https://panel.example.com',
      token: TOKEN,
      ttlMs: 60_000,
      fetch: api.fetch,
      now: () => now,
    });

    expect(await fence.resolve()).toEqual({ ok: true, botIds: new Set(['b1']) });
    expect(await fence.resolve()).toEqual({ ok: true, botIds: new Set(['b1']) });
    expect(api.calls()).toBe(1);

    // A bot created in the dashboard is picked up on the next expiry — no
    // redeploy, no restart.
    api.respond(() => answer([{ id: 'ws-1', bots: ['b1', 'b2'] }]));
    now += 60_001;
    expect(await fence.resolve()).toEqual({ ok: true, botIds: new Set(['b1', 'b2']) });
    expect(api.calls()).toBe(2);
  });

  it('collapses a burst of misses into one upstream query', async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const api = harness(async () => {
      await gate;
      return answer([{ id: 'ws-1', bots: ['b1'] }]);
    });
    const fence = createWorkspaceFence({ upstream: 'https://panel.example.com', token: TOKEN, fetch: api.fetch });

    const all = Promise.all([fence.resolve(), fence.resolve(), fence.resolve()]);
    release!();
    expect(await all).toEqual([
      { ok: true, botIds: new Set(['b1']) },
      { ok: true, botIds: new Set(['b1']) },
      { ok: true, botIds: new Set(['b1']) },
    ]);
    expect(api.calls()).toBe(1);
  });

  it('fails closed while nothing is known, then serves the last answer through a blip', async () => {
    let now = 1_000;
    const api = harness(() => {
      throw new Error('unreachable');
    });
    const fence = createWorkspaceFence({
      upstream: 'https://panel.example.com',
      token: TOKEN,
      ttlMs: 60_000,
      retryMs: 5_000,
      fetch: api.fetch,
      now: () => now,
    });

    // Nothing to be honest with: refuse rather than guess.
    expect(await fence.resolve()).toEqual({ ok: false });

    api.respond(() => answer([{ id: 'ws-1', bots: ['b1'] }]));
    expect(await fence.resolve()).toEqual({ ok: true, botIds: new Set(['b1']) });

    // Now it goes down again. The bots did not change just because Chatfuel
    // stopped answering, so the app keeps working.
    api.respond(() => {
      throw new Error('unreachable');
    });
    now += 60_001;
    expect(await fence.resolve()).toEqual({ ok: true, botIds: new Set(['b1']) });
    const afterFailure = api.calls();
    // …and it does not hammer upstream once per request while it is down.
    expect(await fence.resolve()).toEqual({ ok: true, botIds: new Set(['b1']) });
    expect(api.calls()).toBe(afterFailure);
  });

  it('treats a non-200 as unknown rather than as an empty account', async () => {
    const api = harness(() => new Response('nope', { status: 500 }));
    const fence = createWorkspaceFence({ upstream: 'https://panel.example.com', token: TOKEN, fetch: api.fetch });
    expect(await fence.resolve()).toEqual({ ok: false });
  });

  it('sends the master token and names the operation', async () => {
    let seen: { url: string; init: RequestInit } | undefined;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return answer([{ id: 'ws-1', bots: ['b1'] }]);
    }) as unknown as typeof globalThis.fetch;
    const fence = createWorkspaceFence({ upstream: 'https://panel.example.com/', token: TOKEN, fetch: fetchImpl });
    await fence.resolve();
    expect(seen!.url).toBe('https://panel.example.com/graphql?op=CfWorkspaceBots');
    expect((seen!.init.headers as Record<string, string>).authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('forgets on clear()', async () => {
    const api = harness(() => answer([{ id: 'ws-1', bots: ['b1'] }]));
    const fence = createWorkspaceFence({ upstream: 'https://panel.example.com', token: TOKEN, fetch: api.fetch });
    await fence.resolve();
    fence.clear();
    await fence.resolve();
    expect(api.calls()).toBe(2);
  });
});
