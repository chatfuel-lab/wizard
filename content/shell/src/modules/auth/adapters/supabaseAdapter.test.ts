import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The tenant id the adapter keeps for the team RPCs, across a change of user.
 *
 * It is a closure variable, and the only thing that used to write it was a
 * membership that came back non-null — so a workspace stayed remembered after
 * its owner signed out, and the next `p_tenant_id` carried it. The server
 * re-derives the role from `auth.uid()` and refuses either way; what the test
 * pins is the sentence, which is the part that was wrong.
 */

const rpc = vi.fn<(fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: null }>>();
const signOut = vi.fn(() => Promise.resolve({ error: null }));
const getSession = vi.fn(() => Promise.resolve({ data: { session: { access_token: 'jwt' } }, error: null }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    rpc,
    auth: {
      signOut,
      getSession,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    },
  }),
}));

const { createSupabaseAdapter } = await import('./supabaseAdapter');

const WORKSPACE = {
  tenant_id: 't-acme',
  name: 'Acme',
  role: 'owner',
  joined_at: '2026-01-01T00:00:00.000Z',
  bots: [],
};

const adapterOf = () => createSupabaseAdapter({ url: 'https://example.supabase.co', anonKey: 'anon' });

beforeEach(() => {
  rpc.mockReset();
  signOut.mockClear();
  getSession.mockClear();
});

/** A synthetic proxy envelope, the shape `sendSyntheticEnvelope` writes. */
const envelope = (status: number, message: string, code?: string) =>
  new Response(JSON.stringify({ errors: [{ message, ...(code ? { extensions: { code } } : {}) }] }), { status });

describe('the remembered workspace does not outlive the session that opened it', () => {
  it('carries the tenant of the membership it read', async () => {
    rpc.mockResolvedValueOnce({ data: WORKSPACE, error: null }).mockResolvedValueOnce({ data: [], error: null });
    const adapter = adapterOf();

    await adapter.myMembership();
    await adapter.listMembers();

    expect(rpc).toHaveBeenLastCalledWith('cf_list_members', { p_tenant_id: 't-acme' });
  });

  it('forgets it on sign-out', async () => {
    rpc.mockResolvedValueOnce({ data: WORKSPACE, error: null });
    const adapter = adapterOf();
    await adapter.myMembership();

    await adapter.signOut();

    await expect(adapter.listMembers()).rejects.toThrow('No workspace is open');
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('forgets it even when the sign-out call itself fails', async () => {
    /* The screens send the person to /sign-in whatever this answers, so a
       session that survives its own sign-out is a tab that walks back in. */
    rpc.mockResolvedValueOnce({ data: WORKSPACE, error: null });
    const adapter = adapterOf();
    await adapter.myMembership();
    signOut.mockRejectedValueOnce(new Error('the network went away'));

    await expect(adapter.signOut()).rejects.toThrow();

    await expect(adapter.listMembers()).rejects.toThrow('No workspace is open');
  });

  it('forgets it when a later read answers that there is no workspace', async () => {
    rpc.mockResolvedValueOnce({ data: WORKSPACE, error: null }).mockResolvedValueOnce({ data: null, error: null });
    const adapter = adapterOf();
    await adapter.myMembership();

    await adapter.myMembership();

    await expect(adapter.listMembers()).rejects.toThrow('No workspace is open');
  });
});

/**
 * The bot caps, which `cf_new_bot` raises as PT429 and the proxy forwards as
 * `BotLimitReached` with a 429. Neither the code nor the status was mapped, so
 * both fell through to `Unknown` — "Something went wrong. Try again." — for a
 * refusal that no retry ever clears.
 */
describe('a bot cap reaches the person as a cap', () => {
  it('reads the code the proxy sent', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      envelope(429, 'This workspace has reached its bot limit', 'BotLimitReached'),
    );

    await expect(adapterOf().createBot('Second')).rejects.toMatchObject({ code: 'BotLimitReached' });
  });

  it('reads the status alone when the envelope carried no code', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(envelope(429, 'This app has reached its bot limit'));

    await expect(adapterOf().createBot('Second')).rejects.toMatchObject({ code: 'BotLimitReached' });
  });
});
