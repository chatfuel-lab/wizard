import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * A command line that cannot work must be answered by the command line. The
 * flags are checked before the first step that costs anything — otherwise a
 * contradictory `--supabase-project --supabase-create` pair is only noticed
 * after the Chatfuel token has been pasted, the workspace looked up and the
 * modules chosen, which is where it was noticed before.
 *
 * The steps below the check are replaced with ones that record being called,
 * so "it stopped early" is asserted rather than assumed.
 */
const seen = vi.hoisted(() => ({ steps: [] as string[], errors: [] as string[] }));

vi.mock('@clack/prompts', () => {
  const prompted = (name: string) => () => {
    throw new Error(`prompted before the flags were judged: ${name}`);
  };
  return {
    text: prompted('text'),
    password: prompted('password'),
    select: prompted('select'),
    multiselect: prompted('multiselect'),
    confirm: prompted('confirm'),
    isCancel: () => false,
    note: () => undefined,
    intro: () => undefined,
    outro: () => undefined,
    log: {
      error: (message: string) => seen.errors.push(message),
      info: () => undefined,
      warn: () => undefined,
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

vi.mock('../src/telemetry', () => ({ capture: () => undefined }));
vi.mock('../src/steps/welcome', () => ({
  welcome: async () => {
    seen.steps.push('welcome');
  },
}));
vi.mock('../src/steps/preflight', () => ({
  preflight: async () => {
    seen.steps.push('preflight');
  },
}));
vi.mock('../src/steps/token', () => ({
  token: async () => {
    seen.steps.push('token');
  },
}));
// The far end of the walk: reaching it is the proof that a workable command
// line was not stopped at the gate.
vi.mock('../src/steps/workspacePick', () => ({
  workspacePick: async () => {
    seen.steps.push('workspacePick');
    throw new Error('stop the test here');
  },
}));

const { run } = await import('../src/run');

const REF = 'abcdefghijklmnopqrst';
const flags = { yes: true, dryRun: false, verbose: false };

afterEach(() => {
  seen.steps.length = 0;
  seen.errors.length = 0;
  process.exitCode = 0;
});

describe('auth flags are judged before the run spends anything', () => {
  it('stops on --supabase-project + --supabase-create, before preflight', async () => {
    await run({ ...flags, supabaseProject: REF, supabaseCreate: 'Acme app' });
    expect(seen.errors[0]).toMatch(/name two different projects/);
    expect(seen.steps).toEqual(['welcome']);
    expect(process.exitCode).toBe(1);
  });

  it('stops on an unusable --supabase-create name', async () => {
    await run({ ...flags, supabaseCreate: '  ' });
    expect(seen.errors[0]).toMatch(/is not a project name/);
    expect(seen.steps).toEqual(['welcome']);
  });

  it('stops on a --supabase-url that is not a URL at all', async () => {
    await run({ ...flags, supabaseUrl: 'not-a-url', supabaseAnonKey: 'k' });
    expect(seen.errors[0]).toMatch(/is not an https:\/\/ URL/);
    expect(seen.steps).toEqual(['welcome']);
  });

  // The case the rule actually has an opinion about, and the one the test
  // above never reached: a real https address that Supabase does not serve.
  // Supabase projects live behind custom domains, so this is a warning later
  // in the run, not a refusal here.
  it('lets a --supabase-url on a custom domain through', async () => {
    await expect(
      run({ ...flags, supabaseUrl: 'https://auth.mycompany.com', supabaseAnonKey: 'k', modules: 'core' }),
    ).rejects.toThrow('stop the test here');
    expect(seen.errors).toEqual([]);
  });

  it('stops on a --app-url that is not https', async () => {
    await run({ ...flags, appUrl: 'http://insecure.example.com' });
    expect(seen.errors[0]).toMatch(/must be an https:\/\/ URL/);
    expect(seen.steps).toEqual(['welcome']);
  });

  it('lets a workable command line through to the steps', async () => {
    await expect(run({ ...flags, supabaseCreate: 'Acme app', modules: 'core' })).rejects.toThrow('stop the test here');
    expect(seen.errors).toEqual([]);
    expect(seen.steps).toEqual(['welcome', 'preflight', 'token', 'workspacePick']);
  });
});
