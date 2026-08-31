import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { bearerOf, createAuthGate, decodeJwtExp } from '../src/gate';
import { fakeJwt, startMockSupabase, type MockSupabase } from './mock-supabase';

const NOW = 1_800_000_000_000; // a fixed "now" (ms)
const inOneHour = Math.floor(NOW / 1000) + 3600;

let supabase: MockSupabase;

beforeAll(async () => {
  supabase = await startMockSupabase();
});
afterAll(async () => {
  await supabase.close();
});
beforeEach(() => {
  supabase.answers.clear();
  supabase.calls.length = 0;
});

function gateWith(
  overrides: {
    now?: () => number;
    cacheTtlMs?: number;
    timeoutMs?: number;
    maxMissesPerMinute?: number;
  } = {},
) {
  return createAuthGate({
    supabaseUrl: `${supabase.url}/`, // trailing slash tolerated
    anonKey: supabase.anonKey,
    now: overrides.now ?? (() => NOW),
    cacheTtlMs: overrides.cacheTtlMs,
    timeoutMs: overrides.timeoutMs,
    maxMissesPerMinute: overrides.maxMissesPerMinute,
  });
}

describe('bearerOf / decodeJwtExp', () => {
  it('extracts the token behind a case-insensitive Bearer scheme, nothing else', () => {
    expect(bearerOf('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(bearerOf('bearer abc')).toBe('abc');
    expect(bearerOf('BEARER   abc  ')).toBe('abc');
    expect(bearerOf(['Bearer first', 'Bearer second'])).toBe('first');
    expect(bearerOf('Basic abc')).toBeUndefined();
    expect(bearerOf('abc')).toBeUndefined();
    expect(bearerOf('Bearer ')).toBeUndefined();
    expect(bearerOf(undefined)).toBeUndefined();
    expect(bearerOf(null)).toBeUndefined();
  });

  it('reads the unverified exp claim and tolerates garbage', () => {
    expect(decodeJwtExp(fakeJwt({ sub: 'u', exp: 123 }))).toBe(123);
    expect(decodeJwtExp(fakeJwt({ sub: 'u' }))).toBeUndefined();
    expect(decodeJwtExp('not.a.jwt')).toBeUndefined();
    expect(decodeJwtExp('nope')).toBeUndefined();
    expect(decodeJwtExp('')).toBeUndefined();
  });
});

describe('createAuthGate', () => {
  it('answers 401 AuthSessionRequired without a bearer — zero network', async () => {
    const gate = gateWith();
    const verdict = await gate.verify(undefined);
    expect(verdict).toMatchObject({ ok: false, status: 401, code: 'AuthSessionRequired' });
    expect(supabase.gateCalls).toBe(0);
  });

  it('answers 401 for an expired or exp-less token without calling the RPC', async () => {
    const gate = gateWith();
    const expired = fakeJwt({ sub: 'u1', exp: Math.floor(NOW / 1000) - 1 });
    supabase.answers.set(expired, { botId: 'bot-a' }); // even though the RPC would say yes
    expect(await gate.verify(expired)).toMatchObject({ ok: false, status: 401, code: 'AuthSessionRequired' });
    expect(await gate.verify(fakeJwt({ sub: 'u1' }))).toMatchObject({ ok: false, status: 401 });
    expect(await gate.verify('garbage')).toMatchObject({ ok: false, status: 401 });
    expect(supabase.gateCalls).toBe(0);
  });

  it('resolves the caller’s bots via the RPC, sends the apikey, and caches it (one RPC for two verifies)', async () => {
    const gate = gateWith();
    const jwt = fakeJwt({ sub: 'u1', exp: inOneHour });
    supabase.answers.set(jwt, { botId: 'bot-a', alsoBotIds: ['bot-invited'] });
    expect(await gate.verify(jwt)).toEqual({ ok: true, botIds: new Set(['bot-a', 'bot-invited']) });
    expect(await gate.verify(jwt)).toEqual({ ok: true, botIds: new Set(['bot-a', 'bot-invited']) });
    expect(supabase.gateCalls).toBe(1);
    expect(gate.size).toBe(1);
    const call = supabase.calls[0]!;
    expect(call.path).toBe('/rest/v1/rpc/cf_my_bot_ids');
    expect(call.apikey).toBe(supabase.anonKey);
    expect(call.authorization).toBe(`Bearer ${jwt}`);
  });

  // Signed in with nowhere to be yet — the state provisioning exists to end.
  it('admits a session with no workspace, with an empty fence', async () => {
    const gate = gateWith();
    const jwt = fakeJwt({ sub: 'fresh', exp: inOneHour });
    supabase.answers.set(jwt, {});
    expect(await gate.verify(jwt)).toEqual({ ok: true, botIds: new Set() });
  });

  it('expires cache entries after the TTL', async () => {
    let now = NOW;
    const gate = gateWith({ now: () => now, cacheTtlMs: 1000 });
    const jwt = fakeJwt({ sub: 'u1', exp: inOneHour });
    supabase.answers.set(jwt, { botId: 'bot-a' });
    await gate.verify(jwt);
    now += 999;
    await gate.verify(jwt);
    expect(supabase.gateCalls).toBe(1);
    now += 2;
    await gate.verify(jwt);
    expect(supabase.gateCalls).toBe(2);
  });

  it('bounds the cache by the token exp even inside the TTL', async () => {
    let now = NOW;
    const gate = gateWith({ now: () => now, cacheTtlMs: 60_000 });
    const jwt = fakeJwt({ sub: 'u1', exp: Math.floor(NOW / 1000) + 2 }); // expires in 2 s
    supabase.answers.set(jwt, { botId: 'bot-a' });
    expect(await gate.verify(jwt)).toEqual({ ok: true, botIds: new Set(['bot-a']) });
    now += 1000;
    expect(await gate.verify(jwt)).toEqual({ ok: true, botIds: new Set(['bot-a']) });
    expect(supabase.gateCalls).toBe(1);
    now += 1500; // past exp: refused locally, no RPC, no cache
    expect(await gate.verify(jwt)).toMatchObject({ ok: false, status: 401 });
    expect(supabase.gateCalls).toBe(1);
  });

  // Sign-up caches an EMPTY set (the account owns nothing yet) and the bot is
  // created a second later: without forgetting that entry, the newcomer spends
  // the rest of the TTL being told their own bot is not theirs.
  it('forgets one session on demand, so a just-created bot is visible at once', async () => {
    const gate = gateWith({ cacheTtlMs: 60_000 });
    const jwt = fakeJwt({ sub: 'newcomer', exp: inOneHour });
    const session: { botId?: string } = {};
    supabase.answers.set(jwt, session);
    expect(await gate.verify(jwt)).toEqual({ ok: true, botIds: new Set() });

    session.botId = 'bot-new';
    expect(await gate.verify(jwt)).toEqual({ ok: true, botIds: new Set() }); // still cached
    gate.forget(jwt);
    expect(await gate.verify(jwt)).toEqual({ ok: true, botIds: new Set(['bot-new']) });
    expect(supabase.gateCalls).toBe(2);

    gate.forget(undefined); // no token, nothing to forget
    expect(gate.size).toBe(1);
  });

  // A fresh invite must be felt within the cache window, not at the next sign-in.
  it('re-reads the fence once the TTL passes, so a new invite lands', async () => {
    let now = NOW;
    const gate = gateWith({ now: () => now, cacheTtlMs: 1000 });
    const jwt = fakeJwt({ sub: 'colleague', exp: inOneHour });
    const session = { botId: 'bot-a' };
    supabase.answers.set(jwt, session);
    expect(await gate.verify(jwt)).toEqual({ ok: true, botIds: new Set(['bot-a']) });
    session.botId = 'bot-a';
    (session as { alsoBotIds?: string[] }).alsoBotIds = ['bot-b'];
    now += 1001;
    expect(await gate.verify(jwt)).toEqual({ ok: true, botIds: new Set(['bot-a', 'bot-b']) });
    expect(supabase.gateCalls).toBe(2);
  });

  it('maps a PostgREST 401 to 401 AuthSessionRequired, and remembers it', async () => {
    let now = NOW;
    const gate = gateWith({ now: () => now, cacheTtlMs: 1000 });
    const jwt = fakeJwt({ sub: 'u1', exp: inOneHour });
    supabase.answers.set(jwt, 401);
    expect(await gate.verify(jwt)).toMatchObject({ ok: false, status: 401, code: 'AuthSessionRequired' });
    // A refusal that is not remembered is a free RPC per request: the cheapest
    // way to make the gate hammer Supabase was to keep sending a bad token.
    expect(await gate.verify(jwt)).toMatchObject({ ok: false, status: 401 });
    expect(supabase.gateCalls).toBe(1);
    expect(gate.size).toBe(1);
    now += 1001; // the refusal stands for the TTL and no longer
    supabase.answers.set(jwt, { botId: 'bot-a' });
    expect(await gate.verify(jwt)).toEqual({ ok: true, botIds: new Set(['bot-a']) });
    expect(supabase.gateCalls).toBe(2);
  });

  it('maps a 500 and a timeout to 503 ProxyAuthUnavailable, remembered for a second', async () => {
    let now = NOW;
    const gate = gateWith({ now: () => now, timeoutMs: 200 });
    const broken = fakeJwt({ sub: 'u1', exp: inOneHour });
    supabase.answers.set(broken, 500);
    expect(await gate.verify(broken)).toMatchObject({ ok: false, status: 503, code: 'ProxyAuthUnavailable' });
    const slow = fakeJwt({ sub: 'u2', exp: inOneHour });
    supabase.answers.set(slow, 'timeout');
    expect(await gate.verify(slow)).toMatchObject({ ok: false, status: 503, code: 'ProxyAuthUnavailable' });
    const unreachable = createAuthGate({
      supabaseUrl: 'http://127.0.0.1:1',
      anonKey: 'k',
      // The tokens here were minted for the mock, so say so: what this gate is
      // being asked is what a dead upstream answers, not what a foreign issuer does.
      issuer: `${supabase.url}/auth/v1`,
      now: () => NOW,
    });
    expect(await unreachable.verify(broken)).toMatchObject({ ok: false, status: 503 });

    expect(gate.size).toBe(2);
    expect(supabase.gateCalls).toBe(2);
    // Held briefly, not for the session TTL: the auth service is expected back,
    // and a caller must not be locked out of a recovered one for 30 seconds.
    expect(await gate.verify(broken)).toMatchObject({ ok: false, status: 503 });
    expect(supabase.gateCalls).toBe(2);
    now += 1001;
    supabase.answers.set(broken, { botId: 'bot-a' });
    expect(await gate.verify(broken)).toEqual({ ok: true, botIds: new Set(['bot-a']) });
    expect(supabase.gateCalls).toBe(3);
  });

  it('answers concurrent askers about one session from a single RPC', async () => {
    const gate = gateWith();
    const jwt = fakeJwt({ sub: 'u1', exp: inOneHour });
    supabase.answers.set(jwt, { botId: 'bot-a' });
    const answers = await Promise.all([gate.verify(jwt), gate.verify(jwt), gate.verify(jwt)]);
    for (const answer of answers) expect(answer).toEqual({ ok: true, botIds: new Set(['bot-a']) });
    // The cache only helps after the first answer is in. Without a shared
    // flight, a burst of N requests behind one cold token is N RPCs.
    expect(supabase.gateCalls).toBe(1);
  });

  it('refuses a token minted for another project without asking Supabase', async () => {
    const gate = gateWith();
    const foreign = fakeJwt({ sub: 'u1', exp: inOneHour, iss: 'https://elsewhere.supabase.co/auth/v1' });
    supabase.answers.set(foreign, { botId: 'bot-a' });
    expect(await gate.verify(foreign)).toMatchObject({ ok: false, status: 401, code: 'AuthSessionRequired' });
    // A token with no issuer at all is the same answer, for the same reason.
    expect(await gate.verify(fakeJwt({ sub: 'u1', exp: inOneHour, iss: undefined }))).toMatchObject({
      status: 401,
    });
    expect(supabase.gateCalls).toBe(0);
  });

  it('stops asking Supabase once the miss budget for the minute is gone', async () => {
    let now = NOW;
    // Budget 10, so 2 are reserved for known sessions and 8 are anyone's.
    const gate = gateWith({ now: () => now, maxMissesPerMinute: 10 });
    for (let i = 0; i < 8; i += 1) {
      const jwt = fakeJwt({ sub: `u${i}`, exp: inOneHour });
      supabase.answers.set(jwt, { botId: `bot-${i}` });
      expect(await gate.verify(jwt)).toEqual({ ok: true, botIds: new Set([`bot-${i}`]) });
    }
    const ninth = fakeJwt({ sub: 'u8', exp: inOneHour });
    supabase.answers.set(ninth, { botId: 'bot-8' });
    expect(await gate.verify(ninth)).toMatchObject({ ok: false, status: 503, code: 'ProxyAuthUnavailable' });
    expect(supabase.gateCalls).toBe(8);
    now += 60_000; // the bucket has refilled
    expect(await gate.verify(ninth)).toEqual({ ok: true, botIds: new Set(['bot-8']) });
    expect(supabase.gateCalls).toBe(9);
  });

  it('keeps the reserved share of the budget for sessions it has already admitted', async () => {
    let now = NOW;
    const gate = gateWith({ now: () => now, cacheTtlMs: 1000, maxMissesPerMinute: 10 });
    const mine = fakeJwt({ sub: 'mine', exp: inOneHour });
    supabase.answers.set(mine, { botId: 'bot-mine' });
    expect(await gate.verify(mine)).toEqual({ ok: true, botIds: new Set(['bot-mine']) });

    // Strangers take the unreserved room and no more.
    for (let i = 0; i < 7; i += 1) {
      const jwt = fakeJwt({ sub: `s${i}`, exp: inOneHour });
      supabase.answers.set(jwt, { botId: `bot-s${i}` });
      expect(await gate.verify(jwt)).toMatchObject({ ok: true });
    }
    const overflow = fakeJwt({ sub: 's7', exp: inOneHour });
    supabase.answers.set(overflow, { botId: 'bot-s7' });
    expect(await gate.verify(overflow)).toMatchObject({ status: 503 });

    // The admitted session's cache entry lapses; it is still re-asked about.
    now += 1500;
    expect(await gate.verify(mine)).toEqual({ ok: true, botIds: new Set(['bot-mine']) });
    // What refilled in that time is still reserved, so a stranger stays refused.
    expect(await gate.verify(overflow)).toMatchObject({ status: 503 });
  });

  it('keeps the cache bounded: expired entries first, then the oldest', async () => {
    let now = NOW;
    const gate = gateWith({ now: () => now, cacheTtlMs: 1000, maxMissesPerMinute: 10_000 });
    for (let i = 0; i < 1001; i += 1) {
      const jwt = fakeJwt({ sub: `u${i}`, exp: inOneHour });
      supabase.answers.set(jwt, { botId: `bot-${i}` });
      await gate.verify(jwt);
    }
    // Nothing has expired, so the ceiling holds by evicting the oldest instead.
    expect(gate.size).toBe(1000);
    now += 2000; // everything above is stale now
    const fresh = fakeJwt({ sub: 'fresh', exp: inOneHour });
    supabase.answers.set(fresh, { botId: 'bot-fresh' });
    await gate.verify(fresh);
    expect(gate.size).toBe(1);
    gate.clear();
    expect(gate.size).toBe(0);
  });
});
