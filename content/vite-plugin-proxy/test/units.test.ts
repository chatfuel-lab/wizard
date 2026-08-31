/**
 * Unit coverage for the pieces the dev-server suites only exercise indirectly:
 * config resolution, query analysis, the envelope helpers — and the pins for
 * the deliberate error-path changes (unreachable messages naming the host,
 * unmounted handlers answering instead of hanging, close() clearing the
 * fence, refusals carrying no-store).
 *
 * Symbols that are part of the core facade are imported FROM core, so these
 * tests double as the facade's re-export pin.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  configWarnings,
  createChatfuelProxy,
  describeAuthMode,
  fetchAuthSettings,
  parseAuthSettings,
  readBodyCapped,
  reportAuthSettingsWarnings,
  resolveProxyConfig,
  sendSyntheticEnvelope,
  serveRefusals,
  signupWarnings,
} from '../src/core';
import { originAllowed, requestRefusal } from '../src/origin';
import {
  UPSTREAM_SERVICE_ERROR_CODE,
  botIdsInGraphql,
  disallowedOperation,
  mayNameUpstreamService,
  scrubUpstreamErrors,
} from '../src/queryAnalysis';
import { ALLOWED_ROOT_FIELDS } from '../src/allowedOperations';
import { rpcRefusal } from '../src/supabaseRpc';
import { botAllowed } from '../src/admission';
import { send405 } from '../src/envelope';
import { createProxyContext } from '../src/context';
import { createResourceFence } from '../src/resourceFence';
import { createResourceStore, type ResourceStore } from '../src/resourceStore';
import { NO_BOTS_KEY, createTenantLimits } from '../src/tenantLimits';
import { closeReasonFor } from '../src/wsRelay';
import { setAdminCookie } from '../src/adminSession';
import { handleRecoveryLink } from '../src/recoveryLink';
import { handlePublishDue, handlePublishingRegister } from '../src/publishing';
import { handlePublishingMedia } from '../src/publishingMedia';

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        }),
    ),
  );
});

async function serve(handler: (req: IncomingMessage, res: ServerResponse) => void): Promise<string> {
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

/** A port nothing answers on: bind, note the number, close. */
async function deadPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
  return port;
}

describe('resolveProxyConfig', () => {
  it('resolves the defaults', () => {
    const config = resolveProxyConfig({}, {});
    expect(config.upstream).toBe('https://panel.chatfuel.com');
    expect(config.httpPath).toBe('/chatfuel/graphql');
    expect(config.wsPath).toBe('/chatfuel/graphql');
    expect(config.apiPath).toBe('/chatfuel/api');
    expect(config.authMode).toBe('off');
    expect(config.dynamicFence).toBe(true);
    expect(config.token).toBeUndefined();
    expect(config.problems).toContain('ProxyTokenMissing');
    expect(config.provisionRoute).toBe(false);
    expect(config.publishingQueueRoute).toBe(false);
    expect(config.instagram).toBeUndefined();
  });

  it('trims trailing slashes off the upstream and reads it from env', () => {
    expect(resolveProxyConfig({}, { CHATFUEL_API_BASE: 'https://example.com///' }).upstream).toBe(
      'https://example.com',
    );
  });

  it('rejects a token that cannot be one', () => {
    expect(resolveProxyConfig({ token: 'has whitespace' }, {}).token).toBeUndefined();
    expect(resolveProxyConfig({ token: '' }, {}).token).toBeUndefined();
    expect(resolveProxyConfig({ token: 'plausible' }, {}).problems).not.toContain('ProxyTokenMissing');
  });

  it('maps allowedBotIds: list → frozen set, "any" → no fence, absent → dynamic', () => {
    const frozen = resolveProxyConfig({ allowedBotIds: ['a', 'b'] }, {});
    expect([...(frozen.allowedBotIds ?? [])].sort()).toEqual(['a', 'b']);
    expect(frozen.dynamicFence).toBe(false);
    const any = resolveProxyConfig({ allowedBotIds: 'any' }, {});
    expect(any.allowedBotIds).toBeUndefined();
    expect(any.dynamicFence).toBe(false);
  });

  it('turns the gate on only with BOTH env vars, and fails closed on one', () => {
    const on = resolveProxyConfig({}, { VITE_SUPABASE_URL: 'https://p.supabase.co', VITE_SUPABASE_ANON_KEY: 'anon' });
    expect(on.authMode).toBe('on');
    expect(on.auth?.rpcName).toBe('cf_my_bot_ids');
    const half = resolveProxyConfig({}, { VITE_SUPABASE_URL: 'https://p.supabase.co' });
    expect(half.authMode).toBe('misconfigured');
    expect(half.problems).toContain('ProxyAuthMisconfigured');
    expect(resolveProxyConfig({ auth: false }, { VITE_SUPABASE_URL: 'x', VITE_SUPABASE_ANON_KEY: 'y' }).authMode).toBe(
      'off',
    );
  });

  it('mounts provision/recovery/queue routes only with the gate AND a service-role key', () => {
    const env = { VITE_SUPABASE_URL: 'https://p.supabase.co', VITE_SUPABASE_ANON_KEY: 'anon' };
    const bare = resolveProxyConfig({}, env);
    expect(bare.provisionRoute).toBe(false);
    expect(bare.publishingQueueRoute).toBe(false);
    const keyed = resolveProxyConfig({}, { ...env, SUPABASE_SERVICE_ROLE_KEY: 'service' });
    expect(keyed.provisionRoute).toBe(true);
    expect(keyed.recoveryLinkRoute).toBe(true);
    expect(keyed.publishingQueueRoute).toBe(true);
    expect(keyed.instagram).toBeDefined();
  });

  it('misses the workspace only when provisioning could actually run', () => {
    const env = { VITE_SUPABASE_URL: 'https://p.supabase.co', VITE_SUPABASE_ANON_KEY: 'anon' };
    expect(resolveProxyConfig({}, env).problems).not.toContain('ProxyWorkspaceMissing');
    expect(resolveProxyConfig({}, { ...env, SUPABASE_SERVICE_ROLE_KEY: 'service' }).problems).toContain(
      'ProxyWorkspaceMissing',
    );
    expect(
      resolveProxyConfig({ workspaceId: 'w1' }, { ...env, SUPABASE_SERVICE_ROLE_KEY: 'service' }).problems,
    ).not.toContain('ProxyWorkspaceMissing');
  });

  it('normalizes the public URL to an http(s) origin or drops it', () => {
    const env = {
      VITE_SUPABASE_URL: 'https://p.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon',
      SUPABASE_SERVICE_ROLE_KEY: 'service',
    };
    expect(resolveProxyConfig({ publicUrl: 'https://posts.example.com/some/path' }, env).publicUrl).toBe(
      'https://posts.example.com',
    );
    expect(resolveProxyConfig({ publicUrl: 'ftp://example.com' }, env).publicUrl).toBeUndefined();
    expect(resolveProxyConfig({ publicUrl: 'not a url' }, env).publicUrl).toBeUndefined();
  });
});

describe('query analysis', () => {
  const facts = (query: string, variables: Record<string, unknown> = {}) =>
    botIdsInGraphql(JSON.stringify({ query, variables }));
  const idsOf = (query: string, variables: Record<string, unknown> = {}) => facts(query, variables).ids;

  it('lets the allowed currentUser selection through and trips on anything else', () => {
    expect(facts('query { currentUser { id botRole(botID: "b1") __typename } }').accountScope).toBe(false);
    expect(facts('query { currentUser { id email } }').accountScope).toBe(true);
    expect(facts('query { currentUser { botsV2 { id } } }').accountScope).toBe(true);
    expect(facts('query { bots { id } }').accountScope).toBe(false);
  });

  it('reads a spread under currentUser instead of refusing it unseen', () => {
    expect(facts('query { currentUser { ...f } } fragment f on User { email }').accountScope).toBe(true);
    expect(facts('query { currentUser { ...f } } fragment f on User { id __typename }').accountScope).toBe(false);
    expect(facts('query { currentUser { ... on User { email } } }').accountScope).toBe(true);
  });

  it('lets a bot-scoped currentUser field through, and only when it names the bot', () => {
    const scoped = (args: string) =>
      `query { currentUser { id coworkerConversationsConnection${args} { edges { cursor } } } }`;
    expect(facts(scoped('(botID: "b1", first: 20)')).accountScope).toBe(false);
    // The bot fence gets the id, so the field is checked like any other.
    expect(facts(scoped('(botID: "b1", first: 20)')).ids).toEqual(['b1']);
    // `botID` is optional upstream, and omitted it lists every bot the account holds.
    expect(facts(scoped('(first: 20)')).accountScope).toBe(true);
  });

  it('does not take a null bot id for a named bot', () => {
    const query =
      'query Q($b: BotID) { currentUser { id coworkerConversationsConnection(botID: $b, first: 20) { edges { cursor } } } }';
    expect(facts(query, { b: 'b1' }).accountScope).toBe(false);
    expect(facts(query, { b: null }).accountScope).toBe(true);
    expect(facts(query, {}).accountScope).toBe(true);
  });

  it('lets a resource-scoped currentUser field through, and hands the id to the resource fence', () => {
    const id = 'c'.repeat(24);
    const query = `query { currentUser { id coworkerGetConversation(id: "${id}") { id } } }`;
    expect(facts(query).accountScope).toBe(false);
    expect(facts(query).resources).toEqual([{ argument: 'id', id }]);
    // No id, nothing for the resource fence to check, so it is not let through.
    expect(facts('query { currentUser { id coworkerGetConversation { id } } }').accountScope).toBe(true);
  });

  it('trips on an alias, which cannot rename the field it selects', () => {
    expect(facts('query { me: currentUser { email } }').accountScope).toBe(true);
  });

  it('treats currentUser with no selection set as not ours', () => {
    expect(facts('query { currentUser }').accountScope).toBe(true);
  });

  it('reads bot ids from the botID variable and from bot(id: $x)', () => {
    const ids = idsOf('query Q($mine: BotID!) { bot(id: $mine) { id } }', { botID: 'b1', mine: 'b2' });
    expect([...ids].sort()).toEqual(['b1', 'b2']);
  });

  // Each of these reached the upstream unfenced while the query was read as
  // text rather than parsed. They are the fence's regression suite.
  it('reads a bot id written as an inline literal', () => {
    expect(idsOf('query { bot(id: "victim") { id title } }')).toContain('victim');
  });

  it('reads botID on a field other than the root bot, under any variable name', () => {
    expect(idsOf('mutation M($z: BotID!) { botDisconnectContactScope(botID: $z) { id } }', { z: 'victim' })).toContain(
      'victim',
    );
  });

  it('reads a bot id supplied as a variable default', () => {
    expect(idsOf('query Q($b: BotID! = "victim") { bot(id: $b) { id } }')).toContain('victim');
  });

  it('reads a bot id nested in an input object, literal or runtime', () => {
    expect(idsOf('mutation M { botUpdate(input: { botID: "victim" }) { id } }')).toContain('victim');
    expect(
      idsOf('mutation M($input: I!) { botUpdate(input: $input) { id } }', { input: { botID: 'victim' } }),
    ).toContain('victim');
  });

  it('reads a bot id named inside a fragment', () => {
    expect(idsOf('query { ...f } fragment f on Query { bot(id: "victim") { id } }')).toContain('victim');
  });

  it('refuses a body it cannot read rather than answering that no bot is named', () => {
    expect(botIdsInGraphql('not json').ok).toBe(false);
    expect(facts('query { bot(id: ').ok).toBe(false);
    expect(botIdsInGraphql(JSON.stringify({ variables: {} })).ok).toBe(false);
    expect(facts('query { bots { id } }').ok).toBe(true);
  });

  it('reads a bot id written as a number, which the fence would otherwise never see', () => {
    expect(idsOf('query { bot(id: 999) { id } }')).toContain('999');
    expect(idsOf('mutation M($b: BotID! = 999) { bot(id: $b) { id } }')).toContain('999');
  });

  it('answers for a literal it cannot read as an id instead of dropping it', () => {
    expect(idsOf('query { bot(id: true) { id } }')).toEqual([null]);
    expect(idsOf('query { bot(id: null) { id } }')).toEqual([null]);
  });

  it('flags the four slow Instagram publish fields', () => {
    expect(
      facts(
        'mutation M($botID: BotID!, $input: I!) { instagramAccountPublishReel(botID: $botID, input: $input) { id } }',
      ).slow,
    ).toBe(true);
    expect(facts('query { bots { id } }').slow).toBe(false);
  });
});

describe('the bot fence weighs what it was given', () => {
  const fence = new Set(['a']);

  it('lets a bot the fence names through', () => {
    expect(botAllowed('a', fence)).toBe(true);
    expect(botAllowed('b', fence)).toBe(false);
  });

  it('refuses an id that is not a string, rather than reading it as no id at all', () => {
    expect(botAllowed(42, fence)).toBe(false);
    expect(botAllowed(null, fence)).toBe(false);
    expect(botAllowed(undefined, fence)).toBe(false);
    expect(botAllowed({ toString: () => 'a' }, fence)).toBe(false);
  });

  it('applies no fence when none was configured, rather than inventing one', () => {
    expect(botAllowed('anything', undefined)).toBe(true);
    expect(botAllowed(42, undefined)).toBe(true);
  });
});

describe('upstream error scrubbing', () => {
  const bare = () => ({
    data: null,
    errors: [{ message: "Failed to fetch from Subgraph 'svc-beta'.", extensions: {} }],
  });
  const nested = () => ({
    data: null,
    errors: [
      {
        message: "Failed to fetch from Subgraph 'svc-beta'.",
        extensions: { errors: [{ message: 'x', extensions: { code: 'BookingInlineContactDoesNotExist' } }] },
      },
    ],
  });

  it('rewrites a bare failure and tags it with a shippable code', () => {
    const scrubbed = scrubUpstreamErrors(bare()) as { errors: { message: string; extensions: { code?: string } }[] };
    expect(scrubbed.errors[0].message).not.toMatch(/Subgraph/);
    expect(scrubbed.errors[0].extensions.code).toBe(UPSTREAM_SERVICE_ERROR_CODE);
  });

  it('rewrites the outer message of a wrapped failure but keeps its real code untagged', () => {
    const scrubbed = scrubUpstreamErrors(nested()) as {
      errors: { message: string; extensions: { code?: string; errors: unknown[] } }[];
    };
    expect(scrubbed.errors[0].message).not.toMatch(/Subgraph/);
    // A real nested code already classifies it; no synthetic code is added.
    expect(scrubbed.errors[0].extensions.code).toBeUndefined();
    expect(JSON.stringify(scrubbed)).toContain('BookingInlineContactDoesNotExist');
  });

  it('never leaves a service name anywhere in the envelope', () => {
    expect(JSON.stringify(scrubUpstreamErrors(bare()))).not.toMatch(/Subgraph '/);
    expect(JSON.stringify(scrubUpstreamErrors(nested()))).not.toMatch(/Subgraph '/);
  });

  it('leaves a payload with no errors untouched', () => {
    const ok = { data: { bot: { id: 'b1' } } };
    expect(scrubUpstreamErrors(ok)).toEqual({ data: { bot: { id: 'b1' } } });
    expect(scrubUpstreamErrors(null)).toBeNull();
  });

  it('mayNameUpstreamService gates the parse on the raw bytes', () => {
    expect(mayNameUpstreamService(Buffer.from(JSON.stringify(bare())))).toBe(true);
    expect(mayNameUpstreamService(Buffer.from(JSON.stringify({ data: { ok: true } })))).toBe(false);
  });

  it('drops a whole message that names a service in wording the proxy does not know', () => {
    const reworded = {
      data: null,
      errors: [{ message: "Subgraph 'svc-gamma' returned 500", extensions: {} }],
    };
    const scrubbed = scrubUpstreamErrors(reworded) as { errors: { message: string; extensions: { code?: string } }[] };
    expect(scrubbed.errors[0].message).not.toMatch(/svc-gamma/);
    expect(JSON.stringify(scrubbed)).not.toMatch(/ubgraph/i);
    expect(scrubbed.errors[0].extensions.code).toBe(UPSTREAM_SERVICE_ERROR_CODE);
  });

  it('removes a service name carried in extensions rather than in the message', () => {
    const inExtensions = {
      data: null,
      errors: [{ message: 'Something went wrong.', extensions: { code: 'X', serviceName: "Subgraph 'svc-gamma'" } }],
    };
    const scrubbed = scrubUpstreamErrors(inExtensions) as {
      errors: { extensions: { code?: string; serviceName?: string } }[];
    };
    expect(scrubbed.errors[0].extensions.serviceName).not.toMatch(/svc-gamma/);
    expect(JSON.stringify(scrubbed)).not.toMatch(/ubgraph/i);
    // The code the browser classifies on is untouched by the extensions walk.
    expect(scrubbed.errors[0].extensions.code).toBe('X');
  });

  it('tags an entry whose name stood only in extensions and that carries no code', () => {
    // The message is clean, so the message rule never fires; the name is still
    // removed, and what is left has to be classifiable by something.
    const codeless = {
      data: null,
      errors: [{ message: 'Something went wrong.', extensions: { serviceName: "Subgraph 'svc-gamma'" } }],
    };
    const scrubbed = scrubUpstreamErrors(codeless) as { errors: { extensions: { code?: string } }[] };
    expect(JSON.stringify(scrubbed)).not.toMatch(/ubgraph|svc-gamma/i);
    expect(scrubbed.errors[0].extensions.code).toBe(UPSTREAM_SERVICE_ERROR_CODE);
  });

  it('removes a service name nested under extensions.errors', () => {
    const deep = {
      data: null,
      errors: [
        {
          message: 'Something went wrong.',
          extensions: {
            errors: [{ message: 'inner', extensions: { code: 'Y', detail: "subgraph 'svc-gamma' timed out" } }],
          },
        },
      ],
    };
    expect(JSON.stringify(scrubUpstreamErrors(deep))).not.toMatch(/ubgraph|svc-gamma/i);
  });

  it('mayNameUpstreamService still sees a lowercased wording', () => {
    expect(mayNameUpstreamService('{"errors":[{"message":"subgraph \'svc-gamma\' timed out"}]}')).toBe(true);
  });
});

describe('rpc refusals', () => {
  const refusal = (status: number, body: unknown) =>
    rpcRefusal(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

  it('passes a refusal this deployment wrote through verbatim', async () => {
    const answer = await refusal(422, { message: 'That name is too long', hint: 'name_too_long' });
    expect(answer).toEqual({ ok: false, status: 422, code: 'BadBotName', message: 'That name is too long' });
  });

  it('answers a PostgREST error naming a table, a column and a constraint with none of them', async () => {
    const answer = await refusal(400, {
      message: 'duplicate key value violates unique constraint "cf_bots_tenant_id_bot_id_key"',
      details: 'Key (tenant_id, bot_id)=(t1, b1) already exists.',
      code: '23505',
    });
    expect(answer?.message).toBe('That is not allowed');
    expect(JSON.stringify(answer)).not.toMatch(/cf_bots|tenant_id|constraint/);
    // The status and the fallback code are what they were before the message went.
    expect(answer?.status).toBe(400);
    expect(answer?.code).toBe('BotRequestRefused');
  });

  it('keeps the fallback code for an unknown hint and does not speak for it', async () => {
    const answer = await refusal(400, { message: 'relation "cf_secret" does not exist', hint: 'no_such_thing' });
    expect(answer).toEqual({ ok: false, status: 400, code: 'BotRequestRefused', message: 'That is not allowed' });
  });

  it('does not read an inherited member of the code map as a code', async () => {
    const answer = await refusal(400, { message: 'anything', hint: 'constructor' });
    expect(answer?.code).toBe('BotRequestRefused');
    expect(answer?.message).toBe('That is not allowed');
  });

  /* The caps are refusals the migrations author, so their own wording is what
     the person adding a bot should read — not the neutral fallback. */
  it('passes the two bot-cap refusals through with their own wording', async () => {
    expect(await refusal(429, { message: 'This app has reached its bot limit', hint: 'deployment_bot_cap' })).toEqual({
      ok: false,
      status: 429,
      code: 'BotLimitReached',
      message: 'This app has reached its bot limit',
    });
    expect(
      await refusal(429, { message: 'This workspace has reached its bot limit', hint: 'workspace_bot_cap' }),
    ).toEqual({
      ok: false,
      status: 429,
      code: 'BotLimitReached',
      message: 'This workspace has reached its bot limit',
    });
  });

  it('leaves a 5xx to the deployment', async () => {
    expect(await refusal(503, { message: 'upstream down' })).toBeNull();
  });
});

describe('envelope', () => {
  it('sendSyntheticEnvelope answers the GraphQL error shape with no-store', async () => {
    const base = await serve((req, res) => sendSyntheticEnvelope(res, 403, 'stop', 'TestCode'));
    const res = await fetch(base);
    expect(res.status).toBe(403);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({ errors: [{ message: 'stop', extensions: { code: 'TestCode' } }] });
  });

  it('send405 answers a bare body with the allow header', async () => {
    const base = await serve((req, res) => send405(res, 'POST, DELETE'));
    const res = await fetch(base);
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST, DELETE');
    expect(await res.text()).toBe('');
  });

  it('readBodyCapped drops bytes past the ceiling and answers null', async () => {
    const base = await serve((req, res) => {
      void readBodyCapped(req, 8).then((body) => {
        res.end(JSON.stringify({ body: body === null ? null : body.toString() }));
      });
    });
    const over = await fetch(base, { method: 'POST', body: 'well past eight bytes' });
    expect(await over.json()).toEqual({ body: null });
    const under = await fetch(base, { method: 'POST', body: 'tiny' });
    expect(await under.json()).toEqual({ body: 'tiny' });
  });
});

/*
 * Test 6, the third runtime. The Vercel function builds its proxy through
 * `createChatfuelProxy` and nothing else, so this is that host's whole path:
 * the registry either travels with the options or it does not exist there.
 */
describe('the documents this app ships, from the serverless entry', () => {
  const SHIPPED = 'query Mine { bots { id } }';

  async function ask(query: string) {
    // A dead upstream, so a document that gets PAST the fence says so by the
    // way it fails: 504 is forwarded, 403 is refused here.
    const port = await deadPort();
    const proxy = createChatfuelProxy({
      upstream: `http://127.0.0.1:${port}`,
      token: 'master-token',
      auth: false,
      allowedBotIds: 'any',
      timeoutMs: 3_000,
      operations: [{ MineDocument: SHIPPED }],
    });
    const base = await serve((req, res) => {
      if (!proxy.handleRequest(req, res)) res.end();
    });
    const res = await fetch(`${base}/chatfuel/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const payload = (await res.json()) as { errors?: Array<{ extensions?: { code?: string } }> };
    proxy.close();
    return { status: res.status, code: payload.errors?.[0]?.extensions?.code };
  }

  it('refuses a document it does not ship before it reaches upstream', async () => {
    expect(await ask('query Theirs { bots { id } }')).toMatchObject({ status: 403, code: 'OperationNotInRegistry' });
  });

  it('lets its own document through the same fence', async () => {
    expect((await ask(SHIPPED)).status).toBe(504);
  });
});

describe('unreachable upstream names the host', () => {
  it('says which host it could not reach', async () => {
    const port = await deadPort();
    const proxy = createChatfuelProxy({
      upstream: `http://127.0.0.1:${port}`,
      token: 'master-token',
      auth: false,
      allowedBotIds: 'any',
      timeoutMs: 3_000,
    });
    const base = await serve((req, res) => {
      if (!proxy.handleRequest(req, res)) res.end();
    });
    const res = await fetch(`${base}/chatfuel/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'query { bots { id } }' }),
    });
    proxy.close();
    expect(res.status).toBe(504);
    const payload = (await res.json()) as { errors: Array<{ message: string }> };
    expect(payload.errors[0]!.message).toContain(`chatfuel upstream unreachable (127.0.0.1:${port})`);
    // Loopback is exempt from any proxy, so no proxy hint belongs here.
    expect(payload.errors[0]!.message).not.toContain('Sent through');
  });

  /* The budget here is not the subject and has to be far larger than it looks
     like it needs to be. This is the only test that puts a proxy in the way, so
     it is the only one that loads the proxy agent and hands it an address it
     must give up on; measured on an idle machine that takes 2.4s, against the
     3s this used to allow. The margin was thin enough that a parallel `pnpm
     test` could spend it, and then the assertion below read `timed out` rather
     than `unreachable` — a real failure, of the wrong thing. Nothing waits for
     this budget when the test passes. */
  it('adds the proxy hint when a proxy stands between it and the host', async () => {
    const saved = {
      HTTPS_PROXY: process.env.HTTPS_PROXY,
      https_proxy: process.env.https_proxy,
      NO_PROXY: process.env.NO_PROXY,
      no_proxy: process.env.no_proxy,
    };
    const port = await deadPort();
    process.env.HTTPS_PROXY = `http://127.0.0.1:${port}`;
    delete process.env.https_proxy;
    delete process.env.NO_PROXY;
    delete process.env.no_proxy;
    try {
      const proxy = createChatfuelProxy({
        upstream: 'http://chatfuel-upstream.invalid',
        token: 'master-token',
        auth: false,
        allowedBotIds: 'any',
        timeoutMs: 20_000,
      });
      const base = await serve((req, res) => {
        if (!proxy.handleRequest(req, res)) res.end();
      });
      const res = await fetch(`${base}/chatfuel/graphql`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'query { bots { id } }' }),
      });
      proxy.close();
      expect(res.status).toBe(504);
      const payload = (await res.json()) as { errors: Array<{ message: string }> };
      expect(payload.errors[0]!.message).toContain('chatfuel upstream unreachable (chatfuel-upstream.invalid)');
      expect(payload.errors[0]!.message).toContain('Sent through HTTPS_PROXY=');
    } finally {
      for (const [name, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
  }, 30_000);
});

describe('handlers that are never mounted still answer', () => {
  /* The dispatcher only claims these paths when the gate and the service-role
     key exist, so these guards are unreachable through it — but a host that
     calls a handler directly must get an answer, not a socket that hangs. */
  const bareContext = () => createProxyContext(resolveProxyConfig({ auth: false, token: 'master-token' }, {}));

  const expectMisconfigured = async (
    handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>,
  ): Promise<void> => {
    const base = await serve((req, res) => {
      void handler(req, res);
    });
    const res = await fetch(base, { method: 'POST' });
    expect(res.status).toBe(500);
    const payload = (await res.json()) as { errors: Array<{ extensions: { code: string } }> };
    expect(payload.errors[0]!.extensions.code).toBe('ProxyAuthMisconfigured');
  };

  it('recovery-link answers 500', async () => {
    const ctx = bareContext();
    await expectMisconfigured((req, res) => handleRecoveryLink(ctx, req, res));
  });

  it('publishing register answers 500', async () => {
    const ctx = bareContext();
    await expectMisconfigured((req, res) => handlePublishingRegister(ctx, req, res));
  });

  it('publish-due answers 500', async () => {
    const ctx = bareContext();
    await expectMisconfigured((req, res) => handlePublishDue(ctx, req, res));
  });

  it('publishing media answers 500', async () => {
    const ctx = bareContext();
    await expectMisconfigured((req, res) => handlePublishingMedia(ctx, req, res));
  });
});

describe('close() clears the fence', () => {
  it('a request after close asks Chatfuel again instead of reusing the snapshot', async () => {
    let fenceAsks = 0;
    const fenceFetch: typeof globalThis.fetch = async () => {
      fenceAsks += 1;
      return new Response(
        JSON.stringify({ data: { currentUser: { id: 'u1', workspaces: [{ id: 'w1', bots: [{ id: 'b1' }] }] } } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    };
    const port = await deadPort();
    const proxy = createChatfuelProxy({
      upstream: `http://127.0.0.1:${port}`,
      token: 'master-token',
      auth: false,
      fence: { fetch: fenceFetch },
      timeoutMs: 3_000,
    });
    const base = await serve((req, res) => {
      if (!proxy.handleRequest(req, res)) res.end();
    });
    const ask = () =>
      fetch(`${base}/chatfuel/graphql`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          query: 'query Q($botID: BotID!) { bot(id: $botID) { id } }',
          variables: { botID: 'b1' },
        }),
      });
    await ask();
    expect(fenceAsks).toBe(1);
    await ask();
    expect(fenceAsks).toBe(1); // cached within the TTL
    proxy.close();
    await ask();
    expect(fenceAsks).toBe(2); // the snapshot died with the instance
  });
});

describe('the admin cookie’s signing key', () => {
  const PASSWORD = 'a-long-admin-password';
  const SALT = 'test-deployment-salt';

  it('is the password’s and the salt’s, and the same one every time', async () => {
    const { signAdminSession } = await import('../src/adminSession');
    expect(signAdminSession(PASSWORD, SALT, 1_000, 2_000)).toBe(signAdminSession(PASSWORD, SALT, 1_000, 2_000));
    expect(signAdminSession(PASSWORD, SALT, 1_000, 2_000)).not.toBe(
      signAdminSession('another-long-admin-password', SALT, 1_000, 2_000),
    );
    /* Same password, another deployment: a different cookie, which is the only
       reason the salt is there. */
    expect(signAdminSession(PASSWORD, SALT, 1_000, 2_000)).not.toBe(
      signAdminSession(PASSWORD, 'another-deployment', 1_000, 2_000),
    );
  });

  /**
   * The point of a KDF is that it is expensive, which makes running one per
   * request a denial of service we would be aiming at ourselves. It runs once
   * and the key is kept — so a change here that moves the derivation back into
   * the signing path is caught by the count, not by a stopwatch.
   */
  it('is derived once for the life of the process, not once per signature', async () => {
    vi.resetModules();
    const actual = await vi.importActual<typeof import('node:crypto')>('node:crypto');
    const scryptSync = vi.fn(actual.scryptSync);
    vi.doMock('node:crypto', () => ({ ...actual, default: actual, scryptSync }));
    try {
      const { signAdminSession, verifyAdminSession } = await import('../src/adminSession');
      for (let i = 0; i < 20; i += 1) {
        const cookie = signAdminSession(PASSWORD, SALT, 500, 2_000);
        expect(verifyAdminSession(PASSWORD, SALT, cookie, 1_000)).toBe(true);
      }
      expect(scryptSync).toHaveBeenCalledTimes(1);
    } finally {
      vi.doUnmock('node:crypto');
      vi.resetModules();
    }
  });
});

describe('the reason an upstream close carries', () => {
  const NEUTRAL = 'The upstream service rejected the request.';

  it('is scrubbed the way an error message is', () => {
    expect(closeReasonFor("Failed to fetch from Subgraph 'svc-delta'.")).toBe(NEUTRAL);
    expect(closeReasonFor('Unauthorized')).toBe('Unauthorized');
  });

  /**
   * The scrub can make a reason longer than the one it replaced, and `ws`
   * throws on a close reason past 123 bytes — on the one path whose whole job
   * is closing the socket cleanly, which would take the relay down with it.
   */
  it('is cut to what a close frame can carry, whole characters only', () => {
    const three = "Failed to fetch from Subgraph 'svc-a'. ".repeat(3);
    const scrubbed = closeReasonFor(three);
    expect(Buffer.byteLength(scrubbed, 'utf8')).toBeLessThanOrEqual(123);
    expect(scrubbed).not.toContain('Subgraph');

    const wide = closeReasonFor('€'.repeat(200));
    expect(Buffer.byteLength(wide, 'utf8')).toBeLessThanOrEqual(123);
    expect(wide).not.toContain('�');
  });
});

/**
 * Which requests the admin cookie is allowed to leave `Secure` off for.
 *
 * `x-forwarded-proto` is a header the caller writes, so it is read in one
 * direction only: it may turn `Secure` ON and can never turn it off. The
 * fallback is the host — the one thing in the request that says whether a
 * browser would drop the cookie — which is what covers an edge that terminates
 * TLS and never set the header. Deliberately NOT behind `trustForwardedFor`:
 * that knob decides the throttle key, where a forged header buys a bypass, and
 * one flag answering both questions meant a deployment that had to leave it off
 * shipped an admin session without `Secure`.
 */
describe('the Secure flag on the admin cookie', () => {
  const PASSWORD = 'a-long-admin-password';

  const cookie = (host: string, opts: { encrypted?: boolean; proto?: string } = {}): string => {
    const headers: Record<string, string> = { host };
    if (opts.proto) headers['x-forwarded-proto'] = opts.proto;
    let written = '';
    const req = { headers, socket: { encrypted: opts.encrypted ?? false } } as unknown as IncomingMessage;
    const res = {
      setHeader: (_name: string, value: string) => {
        written = value;
      },
    } as unknown as ServerResponse;
    setAdminCookie(req, res, PASSWORD, 'test-deployment-salt', 1_000);
    return written;
  };

  it('is off for plain http to a loopback host — the browser would drop it', () => {
    expect(cookie('localhost:5173')).not.toContain('Secure');
    expect(cookie('127.0.0.1:5173')).not.toContain('Secure');
    expect(cookie('[::1]:5173')).not.toContain('Secure');
  });

  it('is on behind an edge that never set the header', () => {
    expect(cookie('panel.example.com')).toContain('Secure');
  });

  it('lets x-forwarded-proto: https turn Secure on', () => {
    expect(cookie('panel.example.com', { proto: 'https' })).toContain('Secure');
  });

  it('never lets the header turn Secure off on a host that is not loopback', () => {
    // The header is written by whoever sent the request. Honouring an
    // `x-forwarded-proto: http` here would strip Secure from an admin session
    // on a public host at the caller's word.
    expect(cookie('panel.example.com', { proto: 'http' })).toContain('Secure');
  });

  it('is on for TLS that reached this process, whatever the headers say', () => {
    expect(cookie('localhost:5173', { encrypted: true })).toContain('Secure');
  });
});

describe('what a query reads through a bot', () => {
  const facts = (query: string, variables: Record<string, unknown> = {}) =>
    botIdsInGraphql(JSON.stringify({ query, variables }));

  it('trips on the fields under a bot that belong to the account, not the bot', () => {
    expect(facts('query { bot(id: "b1") { apiToken } }').botScope).toBe(true);
    expect(facts('query { bot(id: "b1") { invites { id } } }').botScope).toBe(true);
    expect(facts('query { bot(id: "b1") { workspace { bots { id } } } }').botScope).toBe(true);
    expect(facts('query { bot(id: "b1") { workspace { botsLimit } } }').botScope).toBe(true);
  });

  it('leaves the selections an app actually makes alone', () => {
    expect(facts('query { bot(id: "b1") { id title } }').botScope).toBe(false);
    expect(facts('query { bot(id: "b1") { members { id name } } }').botScope).toBe(false);
    expect(facts('query { bot(id: "b1") { workspace { id title } } }').botScope).toBe(false);
  });

  it('reads a spread the same way it reads a selection', () => {
    expect(facts('query { bot(id: "b1") { ...f } } fragment f on Bot { apiToken }').botScope).toBe(true);
    expect(facts('query { bot(id: "b1") { ...f } } fragment f on Bot { id title }').botScope).toBe(false);
  });

  /*
   * The walks that follow spreads used to start a fresh `seen` set at every
   * root field, so R root fields spreading one fragment that spreads F others
   * expanded all F of them R times — and the document that says so is R + F
   * long, not R × F. A fifth of the body limit bought seconds of blocked event
   * loop in a fence that runs before anything is forwarded.
   */
  it('reads a document that spreads one chain from many roots in linear time', () => {
    const roots = Array.from({ length: 8000 }, (_, i) => `r${i}: bot(id: "b1") { ...F }`).join(' ');
    const hub = `fragment F on Bot { ${Array.from({ length: 8000 }, (_, i) => `...L${i}`).join(' ')} }`;
    const leaves = Array.from({ length: 8000 }, (_, i) => `fragment L${i} on Bot { id }`).join(' ');
    const started = performance.now();
    const read = facts(`query { ${roots} } ${hub} ${leaves}`);
    // Two orders of magnitude under what the quadratic walk cost on this input,
    // and three under what the body limit allowed it to cost.
    expect(performance.now() - started).toBeLessThan(1000);
    expect(read.ok).toBe(true);
    expect(read.botScope).toBe(false);
    expect(read.roots).toHaveLength(8000);
  });

  it('still finds the violation when the chain is shared and only one root reaches it', () => {
    const shared = 'fragment F0 on Bot { ...F1 } fragment F1 on Bot { id }';
    const bad = 'fragment G on Bot { apiToken }';
    expect(facts(`query { a: bot(id: "b1") { ...F0 } b: bot(id: "b1") { ...G } } ${shared} ${bad}`).botScope).toBe(
      true,
    );
    expect(facts(`query { a: bot(id: "b1") { ...G } b: bot(id: "b1") { ...F0 } } ${shared} ${bad}`).botScope).toBe(
      true,
    );
  });

  /*
   * A chain of one-line fragment definitions is flat to `parse` and deep to
   * every walk that follows the spreads: 40 000 of them threw a RangeError out
   * of the fence rather than refusing the body.
   */
  it('refuses a document deeper than the walks will descend, instead of running out of stack', () => {
    const chain = Array.from({ length: 40_000 }, (_, i) =>
      i === 39_999 ? `fragment F${i} on Bot { id }` : `fragment F${i} on Bot { ...F${i + 1} }`,
    ).join(' ');
    expect(facts(`query { bot(id: "b1") { ...F0 } } ${chain}`).ok).toBe(false);
  });

  it('names the mutation that would rearrange the deployment’s own workspaces', () => {
    expect(facts('mutation { createWorkspaceAndBot(input: {}) { id } }').structureOperation).toBe(
      'createWorkspaceAndBot',
    );
    expect(facts('mutation M($b: BotID!) { deleteBot(botID: $b) { id } }').structureOperation).toBe('deleteBot');
    expect(facts('mutation M($b: BotID!) { botUpdate(botID: $b) { id } }').structureOperation).toBeUndefined();
  });

  it('reads the resource ids a request names, and skips the account-scoped ones', () => {
    const flow = 'a'.repeat(24);
    const read = facts('query Q($flowID: FlowID!) { flow(flowID: $flowID) { id } }', { flowID: flow });
    expect(read.resources).toEqual([{ argument: 'flowID', id: flow }]);

    const bot = 'b'.repeat(24);
    expect(facts('query Q($botID: BotID!) { bot(id: $botID) { id } }', { botID: bot }).resources).toEqual([]);
    expect(
      facts('mutation M($userID: UserAccountID!) { x(userID: $userID) { id } }', { userID: bot }).resources,
    ).toEqual([]);
  });

  it('reads a nested resource id even when a bot variable was given its name', () => {
    // `botVariables` holds variable names; an input-object field name that
    // happens to match one is a different thing entirely, and skipping it let
    // a caller carry another tenant's id past the fence under their own bot.
    const bot = 'b'.repeat(24);
    const victim = 'a'.repeat(24);
    const query =
      'mutation M($flowID: BotID!, $input: SomeInput!) { bot(id: $flowID) { id } goodsProductUpdate(input: $input) { id } }';

    expect(facts(query, { flowID: bot, input: { flowID: victim } }).resources).toEqual([
      { argument: 'flowID', id: victim },
    ]);
    expect(facts(query, { flowID: bot, input: { a: { b: { flowID: victim } } } }).resources).toEqual([
      { argument: 'flowID', id: victim },
    ]);
  });

  it('still skips the bot variable itself where its name is the variable’s', () => {
    const bot = 'a'.repeat(24);
    expect(facts('query Q($flowID: BotID!) { bot(id: $flowID) { id } }', { flowID: bot }).resources).toEqual([]);
  });

  it('reads a bot-scoped id whose argument is named for what it is, not for being an id', () => {
    // Bot scope is carried by the type, not the naming convention: `attachment`
    // is a FileID, `before` a MessageID. Missing one did not narrow the fence,
    // it switched the fence off for that request.
    const bot = 'b'.repeat(24);
    const file = 'a'.repeat(24);

    expect(
      facts(
        'mutation M($in: WhatsAppAttachmentMessageSendInput!) { whatsappAttachmentMessageSend(input: $in) { id } }',
        { in: { botID: bot, attachment: file } },
      ).resources,
    ).toEqual([{ argument: 'attachment', id: file }]);

    expect(
      facts(
        'mutation M($botID: BotID!, $before: MessageID!) { conversationReadMessages(botID: $botID, before: $before) { id } }',
        {
          botID: bot,
          before: file,
        },
      ).resources,
    ).toEqual([{ argument: 'before', id: file }]);
  });

  it('does not read a value that is not shaped like a resource id', () => {
    expect(
      facts('query Q($flowID: String!) { flow(flowID: $flowID) { id } }', { flowID: 'not-an-id' }).resources,
    ).toEqual([]);
  });

  it('reads a list of ids, whether the document wrote it or the variables carried it', () => {
    const bot = 'b'.repeat(24);
    const first = 'c'.repeat(24);
    const second = 'd'.repeat(24);
    const named = [
      { argument: 'contactIDs', id: first },
      { argument: 'contactIDs', id: second },
    ];

    expect(
      facts(
        'mutation M($botID: BotID!, $contactIDs: [ContactID!]!) { csvContactExportStartByIDsList(botID: $botID, contactIDs: $contactIDs, attributes: []) { id } }',
        { botID: bot, contactIDs: [first, second] },
      ).resources,
    ).toEqual(named);

    expect(
      facts(
        `mutation { csvContactExportStartByIDsList(botID: "${bot}", contactIDs: ["${first}", "${second}"], attributes: []) { id } }`,
      ).resources,
    ).toEqual(named);
  });

  it('refuses to read a request that names more ids than any operation asks for', () => {
    const many = Array.from({ length: 501 }, (_, index) => index.toString(16).padStart(24, '0'));
    const query =
      'mutation M($botID: BotID!, $contactIDs: [ContactID!]!) { csvContactExportStartByIDsList(botID: $botID, contactIDs: $contactIDs, attributes: []) { id } }';
    expect(facts(query, { botID: 'b'.repeat(24), contactIDs: many }).ok).toBe(false);
    expect(facts(query, { botID: 'b'.repeat(24), contactIDs: many.slice(0, 500) }).ok).toBe(true);
  });
});

describe('the resource fence remembers whose id it handed out', () => {
  const alpha = 'a'.repeat(24);
  const beta = 'b'.repeat(24);
  const answer = (id: string) => JSON.stringify({ data: { flows: [{ id }] } });
  const ref = (id: string) => [{ argument: 'flowID', id }];

  it('refuses an id learned under another bot and passes one it has never seen', () => {
    const fence = createResourceFence({ mode: 'bound' });
    fence.learn('bot-1', answer(alpha), '{}');
    expect(fence.refuse(ref(alpha), new Set(['bot-2']))?.known).toBe(true);
    expect(fence.refuse(ref(alpha), new Set(['bot-1']))).toBeUndefined();
    expect(fence.refuse(ref(beta), new Set(['bot-2']))).toBeUndefined();
  });

  it('refuses an unknown id only in strict mode', () => {
    const fence = createResourceFence({ mode: 'strict' });
    expect(fence.refuse(ref(beta), new Set(['bot-2']))?.known).toBe(false);
  });

  it('does not fence at all when there is no fence to be foreign to', () => {
    const fence = createResourceFence({ mode: 'strict' });
    fence.learn('bot-1', answer(alpha), '{}');
    expect(fence.refuse(ref(alpha), undefined)).toBeUndefined();
  });

  it('learns nothing from an id the request itself carried', () => {
    const fence = createResourceFence({ mode: 'bound' });
    fence.learn('bot-evil', answer(alpha), JSON.stringify({ variables: { flowID: alpha } }));
    expect(fence.owner(alpha)).toBeUndefined();
  });

  it('marks an id seen under a second bot shared, and never refuses it again', () => {
    const fence = createResourceFence({ mode: 'strict' });
    fence.learn('bot-1', answer(alpha), '{}');
    fence.learn('bot-2', answer(alpha), '{}');
    expect(fence.owner(alpha)).toBeNull();
    expect(fence.refuse(ref(alpha), new Set(['bot-3']))).toBeUndefined();
  });

  it('never binds the bot’s own id, which travels in its own answers', () => {
    const fence = createResourceFence({ mode: 'bound' });
    fence.learn(alpha, answer(alpha), '{}');
    expect(fence.owner(alpha)).toBeUndefined();
  });

  it('forgets a binding once its TTL is past', () => {
    let clock = 1_000;
    const fence = createResourceFence({ mode: 'bound', ttlMs: 100, now: () => clock });
    fence.learn('bot-1', answer(alpha), '{}');
    expect(fence.owner(alpha)).toBe('bot-1');
    clock += 101;
    expect(fence.owner(alpha)).toBeUndefined();
  });

  it('holds no more bindings than it was given room for', () => {
    const fence = createResourceFence({ mode: 'bound', maxBindings: 4 });
    for (let i = 0; i < 20; i += 1) {
      fence.learn('bot-1', answer(i.toString(16).padStart(24, '0')), '{}');
    }
    expect(fence.size).toBeLessThanOrEqual(4);
  });
});

describe('the fence a whole deployment shares', () => {
  const alpha = 'a'.repeat(24);
  const beta = 'b'.repeat(24);
  const answer = (id: string) => JSON.stringify({ data: { flows: [{ id }] } });
  const ref = (id: string) => [{ argument: 'flowID', id }];

  /** A shared store that answers from a literal, and records what it was told. */
  const fakeStore = (rows: Record<string, string | null>, ok = true) => {
    const written: Array<{ botId: string | null; id: string }> = [];
    let lookups = 0;
    const store: ResourceStore = {
      async lookup(ids) {
        lookups += 1;
        const found = new Map<string, string | null>();
        // A store that could not answer holds no rows, whatever it knows.
        if (ok) {
          for (const id of ids) {
            if (Object.hasOwn(rows, id)) found.set(id, rows[id] ?? null);
          }
        }
        return { ok, rows: found };
      },
      remember(botId, id) {
        written.push({ botId, id });
      },
      flush: async () => {},
      close() {},
    };
    return {
      store,
      written,
      get lookups() {
        return lookups;
      },
    };
  };

  it('takes the deployment’s word for an id this process never saw, and asks once', async () => {
    const shared = fakeStore({ [alpha]: 'bot-1' });
    const fence = createResourceFence({ mode: 'bound', store: shared.store });
    expect(fence.needsLookup(ref(alpha))).toBe(true);
    await fence.hydrate(ref(alpha));
    expect(fence.owner(alpha)).toBe('bot-1');
    expect(fence.needsLookup(ref(alpha))).toBe(false);
    expect(fence.refuse(ref(alpha), new Set(['bot-2']))?.known).toBe(true);
    expect(shared.lookups).toBe(1);
  });

  it('notes an id the deployment does not know either, rather than asking for every frame', async () => {
    const shared = fakeStore({});
    const fence = createResourceFence({ mode: 'strict', store: shared.store });
    await fence.hydrate(ref(beta));
    // The progress guarantee the WebSocket relay's frame queue stands on.
    expect(fence.needsLookup(ref(beta))).toBe(false);
    expect(fence.refuse(ref(beta), new Set(['bot-1']))?.known).toBe(false);
    await fence.hydrate(ref(beta));
    expect(shared.lookups).toBe(1);
  });

  it('concludes nothing from a store that did not answer, and tries again in a moment', async () => {
    let clock = 0;
    const shared = fakeStore({ [alpha]: 'bot-1' }, false);
    const fence = createResourceFence({ mode: 'bound', store: shared.store, now: () => clock });
    await fence.hydrate(ref(alpha));
    // Not "unknown to the deployment" — unanswered. The note is there only so
    // the caller waiting on this is not handed the same question forever.
    expect(fence.owner(alpha)).toBeUndefined();
    expect(fence.needsLookup(ref(alpha))).toBe(false);
    clock += 6_000;
    expect(fence.needsLookup(ref(alpha))).toBe(true);
  });

  it('writes down the bindings a caller names, and nothing it merely learned', () => {
    const shared = fakeStore({});
    const fence = createResourceFence({ mode: 'bound', store: shared.store });
    fence.learn('bot-1', answer(alpha), '{}');
    fence.learn('bot-1', answer(beta), '{}');
    // An answer carries thousands of ids; none of them is worth a row until
    // somebody asks for one.
    expect(shared.written).toEqual([]);
    fence.refuse(ref(alpha), new Set(['bot-1']));
    expect(shared.written).toEqual([{ botId: 'bot-1', id: alpha }]);
    // And a correction is worth one most of all: an id seen under a second bot
    // is shared, and the other instances have to be told to stop refusing it.
    fence.learn('bot-2', answer(alpha), '{}');
    fence.refuse(ref(alpha), new Set(['bot-3']));
    expect(shared.written.at(-1)).toEqual({ botId: null, id: alpha });
  });
});

describe('the table those bindings live in', () => {
  const alpha = 'a'.repeat(24);
  const beta = 'b'.repeat(24);

  const harness = () => {
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    let status = 200;
    let payload: unknown = null;
    const fetchStub = (async (url: unknown, init: { body?: unknown }) => {
      calls.push({ url: String(url), body: JSON.parse(String(init.body)) as Record<string, unknown> });
      return new Response(JSON.stringify(payload), {
        status,
        headers: { 'content-type': 'application/json' },
      });
    }) as unknown as typeof globalThis.fetch;
    return {
      calls,
      answerWith(next: unknown, code = 200) {
        payload = next;
        status = code;
      },
      fetch: fetchStub,
    };
  };

  it('holds a burst of bindings back into one call, and says each one once', async () => {
    const http = harness();
    const store = createResourceStore({
      supabaseUrl: 'https://db.test',
      serviceRoleKey: 'secret',
      fetch: http.fetch,
      flushMs: 1,
    });
    store.remember('bot-1', alpha);
    store.remember('bot-1', beta);
    store.remember('bot-1', alpha);
    await store.flush();
    expect(http.calls).toHaveLength(1);
    expect(http.calls[0]!.url).toBe('https://db.test/rest/v1/rpc/cf_resource_bind');
    expect(http.calls[0]!.body).toEqual({ p_bot_id: 'bot-1', p_ids: [alpha, beta] });
    store.close();
  });

  it('reads rows back, and sleeps after a refusal rather than paying the timeout again', async () => {
    let clock = 0;
    const http = harness();
    const store = createResourceStore({
      supabaseUrl: 'https://db.test',
      serviceRoleKey: 'secret',
      fetch: http.fetch,
      now: () => clock,
    });
    http.answerWith([{ resource_id: alpha, bot_id: 'bot-1' }]);
    const first = await store.lookup([alpha]);
    expect(first.ok).toBe(true);
    expect(first.rows.get(alpha)).toBe('bot-1');

    http.answerWith({ message: 'boom' }, 500);
    expect((await store.lookup([beta])).ok).toBe(false);
    const asked = http.calls.length;
    expect((await store.lookup([beta])).ok).toBe(false);
    expect(http.calls).toHaveLength(asked);
    clock += 6_000;
    await store.lookup([beta]);
    expect(http.calls.length).toBe(asked + 1);
    store.close();
  });
});

describe('what one tenant may take', () => {
  const limits = (over: Partial<Parameters<typeof createTenantLimits>[0]> = {}, now?: () => number) =>
    createTenantLimits({ requestsPerMinute: 3, maxSockets: 2, now, ...over });

  it('names a tenant by the bots they may touch, whatever order they arrive in', () => {
    const tenants = limits();
    expect(tenants.key(new Set(['b', 'a']))).toBe(tenants.key(new Set(['a', 'b'])));
    expect(tenants.key(new Set(['a']))).not.toBe(tenants.key(new Set(['b'])));
  });

  it('does not key — or limit — a caller with no fence at all', () => {
    const tenants = limits();
    expect(tenants.key(undefined)).toBeUndefined();
    for (let i = 0; i < 100; i += 1) expect(tenants.takeRequest(undefined)).toBe(true);
    expect(tenants.size).toBe(0);
  });

  it('puts every fenced caller with no bots in one bucket, at a fraction of a tenant', () => {
    const tenants = limits({ requestsPerMinute: 50, maxSockets: 20 });
    const none = tenants.key(new Set<string>());
    expect(none).toBe(NO_BOTS_KEY);
    // Every such account is the same caller here: there is nothing to tell them apart by.
    expect(tenants.key(new Set<string>())).toBe(none);
    expect(none).not.toBe(tenants.key(new Set(['a'])));

    for (let i = 0; i < 5; i += 1) expect(tenants.takeRequest(none)).toBe(true);
    expect(tenants.takeRequest(none)).toBe(false);
    // A tenant with a bot still gets the whole budget.
    const mine = tenants.key(new Set(['a']))!;
    for (let i = 0; i < 50; i += 1) expect(tenants.takeRequest(mine)).toBe(true);

    for (let i = 0; i < 2; i += 1) expect(tenants.openSocket(none)).toBe(true);
    expect(tenants.openSocket(none)).toBe(false);
  });

  it('keeps the shared bucket usable — never zero, however small the ceilings are', () => {
    const tenants = limits({ requestsPerMinute: 3, maxSockets: 2 });
    const none = tenants.key(new Set<string>());
    expect(tenants.takeRequest(none)).toBe(true);
    expect(tenants.takeRequest(none)).toBe(false);
    expect(tenants.openSocket(none)).toBe(true);
    expect(tenants.openSocket(none)).toBe(false);
  });

  it('spends a budget per tenant and refills it over the minute', () => {
    let clock = 0;
    const tenants = limits({}, () => clock);
    const mine = tenants.key(new Set(['a']))!;
    const theirs = tenants.key(new Set(['b']))!;
    expect([tenants.takeRequest(mine), tenants.takeRequest(mine), tenants.takeRequest(mine)]).toEqual([
      true,
      true,
      true,
    ]);
    expect(tenants.takeRequest(mine)).toBe(false);
    // One tenant's spending is not another's.
    expect(tenants.takeRequest(theirs)).toBe(true);
    clock += 20_000;
    expect(tenants.takeRequest(mine)).toBe(true);
    expect(tenants.takeRequest(mine)).toBe(false);
  });

  it('counts live sockets per tenant and gives the slot back on close', () => {
    const tenants = limits();
    const mine = tenants.key(new Set(['a']))!;
    expect([tenants.openSocket(mine), tenants.openSocket(mine)]).toEqual([true, true]);
    expect(tenants.openSocket(mine)).toBe(false);
    expect(tenants.sockets(mine)).toBe(2);
    tenants.closeSocket(mine);
    expect(tenants.openSocket(mine)).toBe(true);
    expect(tenants.openSocket(tenants.key(new Set(['b']))!)).toBe(true);
  });

  it('never lets a stray close drive a count below zero', () => {
    const tenants = limits();
    const mine = tenants.key(new Set(['a']))!;
    tenants.closeSocket(mine);
    tenants.closeSocket(mine);
    expect(tenants.sockets(mine)).toBe(0);
    expect(tenants.openSocket(mine)).toBe(true);
  });
});

describe('the operations this app sends, and no others', () => {
  const rootsOf = (query: string) => botIdsInGraphql(JSON.stringify({ query })).roots;

  it('reads an operation’s root fields through an alias and a fragment alike', () => {
    expect(rootsOf('query { bot(id: "b") { id } }')).toEqual(['bot']);
    expect(rootsOf('query { mine: bot(id: "b") { id } }')).toEqual(['bot']);
    expect(rootsOf('query { ...F } fragment F on Query { bot(id: "b") { id } }')).toEqual(['bot']);
    // A batch is one body, and the allowlist sees every entry in it.
    expect(
      botIdsInGraphql(JSON.stringify([{ query: '{ bot(id: "b") { id } }' }, { query: '{ nope }' }])),
    ).toMatchObject({ roots: ['bot', 'nope'] });
  });

  it('names the first field nobody wrote, and nothing when they all were', () => {
    const allowed = new Set(['bot', 'flows']);
    expect(disallowedOperation(['bot', 'flows'], allowed)).toBeUndefined();
    expect(disallowedOperation(['bot', 'apiToken'], allowed)).toBe('apiToken');
    expect(disallowedOperation([], allowed)).toBeUndefined();
  });

  it('carries the fields the shipped modules actually use', () => {
    // The generated list is checked against the modules by the repository's
    // validator; this only pins that the proxy imports a real one.
    expect(ALLOWED_ROOT_FIELDS.size).toBeGreaterThan(100);
    expect(ALLOWED_ROOT_FIELDS.has('bot')).toBe(true);
    expect(ALLOWED_ROOT_FIELDS.has('currentUser')).toBe(true);
    expect(ALLOWED_ROOT_FIELDS.has('__schema')).toBe(false);
  });

  it('follows the gate unless a deployment says otherwise, and takes what it adds', () => {
    const gated = { supabaseUrl: 'https://p.supabase.co', anonKey: 'anon' };
    expect(resolveProxyConfig({ token: 't' }).allowedOperations).toBeUndefined();
    expect(resolveProxyConfig({ token: 't', auth: gated }).allowedOperations).toBe(ALLOWED_ROOT_FIELDS);
    expect(resolveProxyConfig({ token: 't', operationAllowlist: 'on' }).allowedOperations).toBe(ALLOWED_ROOT_FIELDS);
    // A value that is not a mode is a typo, and a typo does not open a fence.
    expect(
      resolveProxyConfig({ token: 't', auth: gated }, { CHATFUEL_OPERATION_ALLOWLIST: 'no' }).allowedOperations,
    ).toBe(ALLOWED_ROOT_FIELDS);
    const extended = resolveProxyConfig(
      { token: 't', auth: gated },
      { CHATFUEL_OPERATION_ALLOWLIST_EXTRA: 'ourOwnQuery, ourOwnMutation' },
    ).allowedOperations!;
    expect(extended.has('ourOwnQuery')).toBe(true);
    expect(extended.has('ourOwnMutation')).toBe(true);
    expect(extended.has('bot')).toBe(true);
  });

  it('drops an `off` behind the gate that nobody acknowledged, and says so on the startup line', () => {
    const gated = { supabaseUrl: 'https://p.supabase.co', anonKey: 'anon' };
    const dropped = resolveProxyConfig({ token: 't', auth: gated, operationAllowlist: 'off' });
    expect(dropped.allowedOperations).toBe(ALLOWED_ROOT_FIELDS);
    expect(dropped.allowlistOffIgnored).toBe(true);
    expect(describeAuthMode(dropped)).toContain('CHATFUEL_OPERATION_ALLOWLIST_OFF=1');
    // The env spelling of the same ask is dropped the same way.
    expect(
      resolveProxyConfig({ token: 't', auth: gated }, { CHATFUEL_OPERATION_ALLOWLIST: 'off' }).allowedOperations,
    ).toBe(ALLOWED_ROOT_FIELDS);
    // Acknowledged, it is what it says.
    const meant = resolveProxyConfig(
      { token: 't', auth: gated, operationAllowlist: 'off' },
      { CHATFUEL_OPERATION_ALLOWLIST_OFF: '1' },
    );
    expect(meant.allowedOperations).toBeUndefined();
    expect(meant.allowlistOffIgnored).toBe(false);
    expect(describeAuthMode(meant)).toContain('operation allowlist: OFF');
    // '1' and nothing else, the same as CHATFUEL_OPEN_PROXY.
    expect(
      resolveProxyConfig(
        { token: 't', auth: gated, operationAllowlist: 'off' },
        { CHATFUEL_OPERATION_ALLOWLIST_OFF: 'true' },
      ).allowedOperations,
    ).toBe(ALLOWED_ROOT_FIELDS);
    // Without the gate the caller is the deployer, and `off` is already the default.
    const open = resolveProxyConfig({ token: 't', operationAllowlist: 'off' });
    expect(open.allowedOperations).toBeUndefined();
    expect(open.allowlistOffIgnored).toBe(false);
  });

  it('says on the startup line when the host handed it no operations at all', () => {
    const bare = resolveProxyConfig({ token: 't' });
    expect(bare.operationRegistry).toBeUndefined();
    expect(describeAuthMode(bare)).toContain('operations: NO REGISTRY');
  });

  it('keeps an app that ships no operations apart from a host that passes none', () => {
    const empty = resolveProxyConfig({ token: 't', operations: [] });
    expect(empty.operationRegistry?.size).toBe(0);
    expect(describeAuthMode(empty)).toContain('operations: 0 documents');
  });

  it('builds the registry from the namespaces the host passed', () => {
    const doc = 'query BotById($id: ID!) { bot(id: $id) { id } }';
    const built = resolveProxyConfig({ token: 't', operations: [{ BotByIdDocument: doc }] });
    expect(built.operationRegistry?.size).toBe(1);
    expect(built.operationRegistry?.byText.get(doc)?.operationName).toBe('BotById');
    expect(describeAuthMode(built)).toContain('operations: 1 documents');
  });
});

describe('startup refusals and warnings', () => {
  const gated = { supabaseUrl: 'https://p.supabase.co', anonKey: 'anon' };

  it('refuses to serve open mode only where somebody other than the operator can reach it', () => {
    const open = resolveProxyConfig({ token: 't' });
    expect(serveRefusals(open, '127.0.0.1')).toEqual([]);
    expect(serveRefusals(open, 'localhost')).toEqual([]);
    expect(serveRefusals(open, '::1')).toEqual([]);
    const exposed = serveRefusals(open, '0.0.0.0');
    expect(exposed).toHaveLength(1);
    expect(exposed[0]).toContain('REFUSING TO SERVE');
    expect(exposed[0]).toContain('0.0.0.0');
    // The gate is the point of the refusal, so the gate lifts it.
    expect(serveRefusals(resolveProxyConfig({ token: 't', auth: gated }), '0.0.0.0')).toEqual([]);
  });

  it('serves an acknowledged open proxy, and says so once', () => {
    const env = { CHATFUEL_OPEN_PROXY: '1' };
    const open = resolveProxyConfig({ token: 't' }, env);
    expect(open.openProxyAcknowledged).toBe(true);
    expect(serveRefusals(open, '0.0.0.0')).toEqual([]);
    const lines = configWarnings(open, '0.0.0.0');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('CHATFUEL_OPEN_PROXY=1');
    // Acknowledged or not, loopback and a gated deployment have nothing to say.
    expect(configWarnings(open, '127.0.0.1')).toEqual([]);
    expect(configWarnings(resolveProxyConfig({ token: 't' }), '0.0.0.0')).toEqual([]);
    // Only the exact value is an answer; anything else is a variable someone set by accident.
    expect(resolveProxyConfig({ token: 't' }, { CHATFUEL_OPEN_PROXY: 'true' }).openProxyAcknowledged).toBe(false);
  });

  /*
   * The host check, at the level the two non-Vite hosts run it: a serverless
   * function and the standalone server have no middleware in front of them, so
   * what `requestRefusal` says IS the answer the caller gets.
   */
  describe('the host policy', () => {
    const asRequest = (host: string | undefined): IncomingMessage =>
      ({ headers: host === undefined ? {} : { host }, method: 'POST' }) as unknown as IncomingMessage;
    const refusalFor = (config: ReturnType<typeof resolveProxyConfig>, host: string | undefined) =>
      requestRefusal(asRequest(host), { origin: config.originPolicy, host: config.hostPolicy })?.code;

    it('does not run when the deployment named nothing and is not on loopback', () => {
      // Nothing to check against, so nothing is refused — the startup refusals
      // are what cover an unconfigured public bind, not a guess at its name.
      const open = resolveProxyConfig({ token: 't' });
      expect(open.hostPolicy.loopbackOnly).toBe(false);
      expect(open.hostPolicy.expected.size).toBe(0);
      expect(refusalFor(open, 'anything.example')).toBeUndefined();
    });

    it('refuses an unknown name once the deployment has named one', () => {
      const named = resolveProxyConfig({ token: 't' }, { ALLOWED_HOSTS: 'app.example.com' });
      expect(refusalFor(named, 'app.example.com')).toBeUndefined();
      // A port is not part of the claim when the claim did not mention one.
      expect(refusalFor(named, 'app.example.com:8080')).toBeUndefined();
      expect(refusalFor(named, 'evil.example')).toBe('ProxyHostForbidden');
      // The suffix trick the origin list is also careful about.
      expect(refusalFor(named, 'app.example.com.evil.net')).toBe('ProxyHostForbidden');
    });

    it('refuses every name but a loopback one when the bind is loopback', () => {
      const dev = resolveProxyConfig({ token: 't', loopbackOnly: true });
      expect(refusalFor(dev, 'localhost:5173')).toBeUndefined();
      expect(refusalFor(dev, '127.0.0.1:5173')).toBeUndefined();
      expect(refusalFor(dev, '[::1]:5173')).toBeUndefined();
      expect(refusalFor(dev, 'evil.example')).toBe('ProxyHostForbidden');
      // HTTP/1.1 requires a Host and every real client sends one.
      expect(refusalFor(dev, undefined)).toBe('ProxyHostForbidden');
    });

    it("takes '*' as the off switch, for the tunnel whose name changes every run", () => {
      const tunnelled = resolveProxyConfig({ token: 't', loopbackOnly: true }, { ALLOWED_HOSTS: '*' });
      expect(tunnelled.hostPolicy.any).toBe(true);
      expect(refusalFor(tunnelled, 'anything.ngrok.io')).toBeUndefined();
    });

    it('is asked before the origin, so a rebound request is answered for what it is', () => {
      const dev = resolveProxyConfig({ token: 't', loopbackOnly: true });
      const rebound = {
        headers: { host: 'evil.example', origin: 'http://evil.example' },
        method: 'POST',
      } as unknown as IncomingMessage;
      // sameOrigin() would pass this pair — they agree, honestly. Only the name does not.
      expect(originAllowed(rebound, dev.originPolicy)).toBe(true);
      expect(requestRefusal(rebound, { origin: dev.originPolicy, host: dev.hostPolicy })?.code).toBe(
        'ProxyHostForbidden',
      );
    });
  });

  it('refuses a wildcard origin, and takes no acknowledgement for it', () => {
    const env = { ALLOWED_ORIGINS: '*' };
    const lines = serveRefusals(resolveProxyConfig({ token: 't' }, env), '0.0.0.0');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("ALLOWED_ORIGINS is '*'");
    // CHATFUEL_OPEN_PROXY answers the open-mode refusal and not this one.
    const acknowledged = serveRefusals(
      resolveProxyConfig({ token: 't' }, { ...env, CHATFUEL_OPEN_PROXY: '1' }),
      '0.0.0.0',
    );
    expect(acknowledged).toHaveLength(1);
    expect(acknowledged[0]).toContain("ALLOWED_ORIGINS is '*'");
  });

  it('keeps refusing a wildcard origin once the gate is on — turning the gate on is not an answer to it', () => {
    const lines = serveRefusals(resolveProxyConfig({ token: 't', auth: gated }, { ALLOWED_ORIGINS: '*' }), '0.0.0.0');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("ALLOWED_ORIGINS is '*'");
    // Loopback is still nobody else's business.
    expect(
      serveRefusals(resolveProxyConfig({ token: 't', auth: gated }, { ALLOWED_ORIGINS: '*' }), '127.0.0.1'),
    ).toEqual([]);
  });

  it('reads only a settings document that answered both questions', () => {
    expect(parseAuthSettings({ disable_signup: false, mailer_autoconfirm: true })).toEqual({
      disableSignup: false,
      mailerAutoconfirm: true,
    });
    expect(parseAuthSettings({ disable_signup: false })).toBeUndefined();
    expect(parseAuthSettings({ disable_signup: 'false', mailer_autoconfirm: true })).toBeUndefined();
    expect(parseAuthSettings(null)).toBeUndefined();
    expect(parseAuthSettings('{}')).toBeUndefined();
  });

  it('says nothing about a closed project, and says two things about an open unverified one', () => {
    expect(signupWarnings({ disableSignup: true, mailerAutoconfirm: true })).toEqual([]);
    const open = signupWarnings({ disableSignup: false, mailerAutoconfirm: false });
    expect(open).toHaveLength(1);
    expect(open[0]).toContain('sign-ups are open');
    const unverified = signupWarnings({ disableSignup: false, mailerAutoconfirm: true });
    expect(unverified).toHaveLength(2);
    expect(unverified[1]).toContain('mailer_autoconfirm');
    expect(unverified[1]).toContain('invite');
  });

  it('asks GoTrue with the anon key and nothing else, and drops an answer it cannot read', async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const answering = (status: number, body: unknown): typeof globalThis.fetch =>
      (async (url: unknown, init?: RequestInit) => {
        calls.push({ url: String(url), init });
        return new Response(JSON.stringify(body), {
          status,
          headers: { 'content-type': 'application/json' },
        });
      }) as unknown as typeof globalThis.fetch;

    const ok = await fetchAuthSettings(
      'https://p.supabase.co',
      'anon',
      answering(200, { disable_signup: false, mailer_autoconfirm: true }),
    );
    expect(ok).toEqual({ disableSignup: false, mailerAutoconfirm: true });
    expect(calls[0]!.url).toBe('https://p.supabase.co/auth/v1/settings');
    expect((calls[0]!.init!.headers as Record<string, string>).apikey).toBe('anon');
    expect((calls[0]!.init!.headers as Record<string, string>).authorization).toBeUndefined();

    expect(await fetchAuthSettings('https://p.supabase.co', 'anon', answering(503, {}))).toBeUndefined();
    const throwing = (async () => {
      throw new Error('unreachable');
    }) as unknown as typeof globalThis.fetch;
    expect(await fetchAuthSettings('https://p.supabase.co', 'anon', throwing)).toBeUndefined();
  });

  it('does not ask at all without a gate, and resolves rather than rejecting when the ask fails', async () => {
    const asked = vi.fn();
    await reportAuthSettingsWarnings(resolveProxyConfig({ token: 't' }), asked, {
      fetchImpl: (() => {
        throw new Error('should not be called');
      }) as unknown as typeof globalThis.fetch,
    });
    expect(asked).not.toHaveBeenCalled();

    const lines: string[] = [];
    await reportAuthSettingsWarnings(resolveProxyConfig({ token: 't', auth: gated }), (line) => lines.push(line), {
      fetchImpl: (async () =>
        new Response(JSON.stringify({ disable_signup: false, mailer_autoconfirm: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })) as unknown as typeof globalThis.fetch,
    });
    expect(lines).toHaveLength(2);

    const thrown: string[] = [];
    await expect(
      reportAuthSettingsWarnings(
        resolveProxyConfig({ token: 't', auth: gated }),
        () => {
          thrown.push('x');
          throw new Error('log is broken');
        },
        {
          fetchImpl: (async () =>
            new Response(JSON.stringify({ disable_signup: false, mailer_autoconfirm: false }), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            })) as unknown as typeof globalThis.fetch,
        },
      ),
    ).resolves.toBeUndefined();
    expect(thrown).toHaveLength(1);
  });
});
