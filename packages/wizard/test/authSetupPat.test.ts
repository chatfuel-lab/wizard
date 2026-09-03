import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The interactive Supabase path — the one a person who has never set an
 * environment variable actually walks.
 *
 * It used to be impossible: picking "Personal access token" read the token from
 * `--supabase-token` / SUPABASE_ACCESS_TOKEN and nowhere else, so with neither
 * set it reached the Management API with `Bearer undefined` and the run died on
 * "JWT could not be decoded" — after the modules, the Chatfuel token and the
 * workspace had all been answered. Hence two rules pinned here: the token is
 * ASKED for, and a rejected one is retyped rather than fatal.
 */
const passwordAnswers: string[] = [];
const passwordPrompts: string[] = [];
const selectAnswers: string[] = [];
/* The recovery-link question is the one confirm on this path; unscripted means
   "no", which is the answer that leaves the log alone. */
const confirmAnswers: boolean[] = [];
const warnings: string[] = [];

vi.mock('@clack/prompts', () => {
  const notAsked = (name: string) => () => {
    throw new Error(`prompted unexpectedly: ${name}`);
  };
  return {
    password: (opts: { message: string; validate?: (v: string) => string | undefined }) => {
      passwordPrompts.push(opts.message);
      const answer = passwordAnswers.shift();
      if (answer === undefined) throw new Error('asked for more passwords than the test scripted');
      return Promise.resolve(answer);
    },
    select: () => {
      const answer = selectAnswers.shift();
      if (answer === undefined) throw new Error('asked for more selects than the test scripted');
      return Promise.resolve(answer);
    },
    text: () => Promise.resolve(''),
    multiselect: notAsked('multiselect'),
    confirm: () => Promise.resolve(confirmAnswers.shift() ?? false),
    isCancel: () => false,
    note: () => undefined,
    intro: () => undefined,
    outro: () => undefined,
    log: {
      info: () => undefined,
      warn: (m: string) => warnings.push(m),
      error: () => undefined,
      success: () => undefined,
      message: () => undefined,
    },
    spinner: () => ({
      start: () => undefined,
      message: () => undefined,
      stop: () => undefined,
      error: () => undefined,
    }),
  };
});

const { createContext } = await import('../src/run');
const { authSetup, validatePat } = await import('../src/steps/authSetup');
type WizardContext = import('../src/context').WizardContext;

const REF = 'abcdefghijklmnopqrst';
const GOOD_PAT = 'sbp_goodtoken0000000000000000000000000000';
const BAD_PAT = 'sbp_badtoken00000000000000000000000000000';

function interactiveCtx(): WizardContext {
  const ctx = createContext({ yes: false, dryRun: false, verbose: false });
  ctx.answers.modules = ['core', 'auth'];
  ctx.answers.workspace = { id: 'ws-1', title: "Bob's Agency", botsLimit: 20, botCount: 3 };
  return ctx;
}

/**
 * A Management API that only accepts GOOD_PAT — a wrong token fails every call,
 * the way a wrong token really does. Records every Authorization header so
 * "which token did it actually send" is answerable.
 */
function managementApi() {
  const bearers: string[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const bearer = (new Headers(init?.headers).get('authorization') ?? '').replace(/^Bearer /, '');
    bearers.push(bearer);
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

    if (bearer !== GOOD_PAT) return json({ message: 'JWT could not be decoded' }, 401);
    if (url.endsWith('/v1/organizations')) return json([{ id: 'acme', name: 'Acme' }]);
    if (url.endsWith('/v1/projects')) {
      return json([{ id: REF, name: 'App', status: 'ACTIVE_HEALTHY', region: 'eu-west-1', organization_slug: 'acme' }]);
    }
    if (url.endsWith(`/v1/projects/${REF}`)) {
      return json({ id: REF, name: 'App', status: 'ACTIVE_HEALTHY', region: 'eu-west-1', organization_slug: 'acme' });
    }
    if (url.includes('/api-keys')) {
      return json([
        { type: 'publishable', api_key: 'sb_publishable_test' },
        { type: 'secret', api_key: 'sb_secret_test' },
      ]);
    }
    if (url.includes('/database/query')) return json([]);
    if (url.includes('/config/auth')) return json({ uri_allow_list: '', site_url: '' });
    if (url.includes('/health')) return json([{ name: 'auth', healthy: true }]);
    return json({}, 404);
  }) as unknown as typeof fetch;
  return { fetchImpl, bearers };
}

const savedEnv = process.env.SUPABASE_ACCESS_TOKEN;

beforeEach(() => {
  passwordAnswers.length = 0;
  passwordPrompts.length = 0;
  warnings.length = 0;
  selectAnswers.length = 0;
  confirmAnswers.length = 0;
  delete process.env.SUPABASE_ACCESS_TOKEN;
});

afterEach(() => {
  if (savedEnv === undefined) delete process.env.SUPABASE_ACCESS_TOKEN;
  else process.env.SUPABASE_ACCESS_TOKEN = savedEnv;
});

describe('validatePat', () => {
  it('names the mistake people actually make', () => {
    // The project API keys sit one page away from the access token.
    expect(validatePat('eyJhbGciOiJIUzI1NiJ9.x.y')).toContain('project API key');
    expect(validatePat('sb_publishable_abc')).toContain('project API key');
    expect(validatePat('sb_secret_abc')).toContain('project API key');
  });

  it('rejects an empty or whitespace-carrying paste', () => {
    expect(validatePat('')).toBeTruthy();
    expect(validatePat(undefined)).toBeTruthy();
    expect(validatePat('sbp_two words')).toBeTruthy();
  });

  it('accepts a real access token', () => {
    expect(validatePat(GOOD_PAT)).toBeUndefined();
  });
});

describe('authSetup — interactive PAT path', () => {
  it('asks for the token instead of reaching the API with nothing', async () => {
    const api = managementApi();
    // How to reach Supabase, then which project holds the users.
    selectAnswers.push('pat', REF);
    passwordAnswers.push(GOOD_PAT);
    const ctx = interactiveCtx();

    await authSetup(ctx, { fetch: api.fetchImpl, sleep: async () => undefined, pollMs: 1 });

    expect(passwordPrompts[0]).toMatch(/Supabase access token/);
    expect(api.bearers).not.toContain('undefined');
    expect(api.bearers[0]).toBe(GOOD_PAT);
    expect(ctx.answers.auth?.method).toBe('pat');
  });

  it('lets a rejected token be retyped instead of ending the run', async () => {
    const api = managementApi();
    selectAnswers.push('pat', REF);
    passwordAnswers.push(BAD_PAT, GOOD_PAT);
    const ctx = interactiveCtx();

    await authSetup(ctx, { fetch: api.fetchImpl, sleep: async () => undefined, pollMs: 1 });

    expect(api.bearers.slice(0, 2)).toEqual([BAD_PAT, GOOD_PAT]);
    expect(warnings.join(' ')).toContain('Supabase rejected that access token.');
    expect(ctx.answers.auth?.url).toBe(`https://${REF}.supabase.co`);
  });

  it('keeps the accepted token off the environment every child process inherits', async () => {
    const api = managementApi();
    selectAnswers.push('pat', REF);
    passwordAnswers.push(GOOD_PAT);
    const ctx = interactiveCtx();

    await authSetup(ctx, { fetch: api.fetchImpl, sleep: async () => undefined, pollMs: 1 });

    // The deploy step reads it back off the context; writing it into the
    // environment would hand it to npm, git and everything else the run spawns.
    expect(ctx.secrets.supabaseToken).toBe(GOOD_PAT);
    expect(process.env.SUPABASE_ACCESS_TOKEN).toBeUndefined();
  });

  it('prefers the environment on the first try and never reuses it after a refusal', async () => {
    process.env.SUPABASE_ACCESS_TOKEN = BAD_PAT;
    const api = managementApi();
    // The environment answers "how to reach Supabase", so only the project is picked.
    selectAnswers.push(REF);
    passwordAnswers.push(GOOD_PAT);
    const ctx = interactiveCtx();

    await authSetup(ctx, { fetch: api.fetchImpl, sleep: async () => undefined, pollMs: 1 });

    expect(api.bearers.slice(0, 2)).toEqual([BAD_PAT, GOOD_PAT]);
    expect(passwordPrompts).toHaveLength(1);
  });

  it('leaves recovery-link logging off unless it is asked for', async () => {
    const api = managementApi();
    selectAnswers.push('pat', REF);
    passwordAnswers.push(GOOD_PAT);
    const ctx = interactiveCtx();

    await authSetup(ctx, { fetch: api.fetchImpl, sleep: async () => undefined, pollMs: 1 });

    expect(ctx.answers.env.AUTH_RECOVERY_LINK_LOG).toBeUndefined();
  });

  it('turns recovery-link logging on only when the person says yes to the log', async () => {
    const api = managementApi();
    selectAnswers.push('pat', REF);
    passwordAnswers.push(GOOD_PAT);
    confirmAnswers.push(true);
    const ctx = interactiveCtx();

    await authSetup(ctx, { fetch: api.fetchImpl, sleep: async () => undefined, pollMs: 1 });

    expect(ctx.answers.env.AUTH_RECOVERY_LINK_LOG).toBe('true');
    expect(warnings.join(' ')).toContain('logs as credentials');
  });
});
