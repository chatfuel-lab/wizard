import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A SUPABASE_SERVICE_ROLE_KEY that was already in the shell.
 *
 * It opens the whole database, and it arrives from the environment rather than
 * from anybody's decision — nothing in the run can check that it belongs to the
 * project being set up. The case this is written for is ordinary: a developer
 * with a PRODUCTION key exported scaffolds a staging app, and the production
 * key is written into the new repository's .env without a word.
 *
 * So it is said out loud, once, next to the project it would be written for —
 * and where there is somebody to ask, it can be declined.
 */
const warnings: string[] = [];
const confirmPrompts: string[] = [];
let confirmAnswer = true;

vi.mock('@clack/prompts', () => ({
  confirm: (opts: { message: string }) => {
    confirmPrompts.push(opts.message);
    return Promise.resolve(confirmAnswer);
  },
  password: () => Promise.resolve(''),
  text: () => Promise.resolve(''),
  select: () => {
    throw new Error('prompted unexpectedly: select');
  },
  multiselect: () => {
    throw new Error('prompted unexpectedly: multiselect');
  },
  isCancel: (value: unknown) => typeof value === 'symbol',
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
  spinner: () => ({ start: () => undefined, message: () => undefined, stop: () => undefined, error: () => undefined }),
}));

const { createContext } = await import('../src/run');
const { authSetup } = await import('../src/steps/authSetup');
type WizardContext = import('../src/context').WizardContext;
type WizardFlags = import('../src/context').WizardFlags;

const REF = 'abcdefghijklmnopqrst';
const URL_FOR_REF = `https://${REF}.supabase.co`;
const KEY = 'sb_secret_from_env';

const saved = {
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  token: process.env.SUPABASE_ACCESS_TOKEN,
};

/** The manual path, chosen by the flags, so nothing here reaches the network. */
function ctxWith(flags: Partial<WizardFlags>): WizardContext {
  const ctx = createContext({
    yes: false,
    dryRun: false,
    verbose: false,
    supabaseUrl: URL_FOR_REF,
    supabaseAnonKey: 'sb_publishable_manual',
    ...flags,
  } as WizardFlags);
  ctx.answers.modules = ['core', 'auth'];
  ctx.answers.workspace = { id: 'ws-1', title: "Bob's Agency", botsLimit: 20, botCount: 3 };
  return ctx;
}

const noNetwork = (async () => {
  throw new Error('the manual path must not make a request');
}) as unknown as typeof fetch;

beforeEach(() => {
  warnings.length = 0;
  confirmPrompts.length = 0;
  confirmAnswer = true;
  process.env.SUPABASE_SERVICE_ROLE_KEY = KEY;
  delete process.env.SUPABASE_ACCESS_TOKEN;
});

afterEach(() => {
  if (saved.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = saved.key;
  if (saved.token === undefined) delete process.env.SUPABASE_ACCESS_TOKEN;
  else process.env.SUPABASE_ACCESS_TOKEN = saved.token;
});

describe('a service_role key inherited from the environment', () => {
  it('says where it came from and which project it would be written for', async () => {
    const ctx = ctxWith({});
    await authSetup(ctx, { fetch: noNetwork });

    const said = warnings.join('\n');
    expect(said).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(said).toContain(URL_FOR_REF);
    expect(ctx.answers.env.SUPABASE_SERVICE_ROLE_KEY).toBe(KEY);
  });

  it('can be declined, and then nothing of it is written', async () => {
    confirmAnswer = false;
    const ctx = ctxWith({});
    await authSetup(ctx, { fetch: noNetwork });

    expect(confirmPrompts.join('\n')).toContain(URL_FOR_REF);
    expect(ctx.answers.env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    expect(ctx.answers.auth?.secretKey).toBeUndefined();
  });

  /* Under --yes there is nobody to ask, and refusing would break every script
     that sets it on purpose. It is still taken — but it is no longer taken
     silently, which is the whole complaint. */
  it('is still taken in a --yes run, and still named', async () => {
    const ctx = ctxWith({ yes: true });
    await authSetup(ctx, { fetch: noNetwork });

    expect(confirmPrompts).toEqual([]);
    expect(warnings.join('\n')).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(warnings.join('\n')).toContain(URL_FOR_REF);
    expect(ctx.answers.env.SUPABASE_SERVICE_ROLE_KEY).toBe(KEY);
  });

  it('asks nothing when the environment holds no key', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const ctx = ctxWith({});
    await authSetup(ctx, { fetch: noNetwork });

    expect(confirmPrompts).toEqual([]);
    expect(ctx.answers.env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });
});
