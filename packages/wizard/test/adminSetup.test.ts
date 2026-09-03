import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The admin step writes the one secret a run can invent that a person then has
 * to keep. Three promises are tested here:
 *
 *   1. a command line that carries the answer never asks a question — the
 *      prompts are replaced with ones that THROW;
 *   2. a `--admin-password` that the deployment would refuse is refused BEFORE
 *      the run starts, not after a scaffold that cannot open its own panel;
 *   3. a generated one clears the floor the proxy enforces, and lands in .env
 *      and nowhere else.
 */
vi.mock('@clack/prompts', () => {
  const prompted = (name: string) => () => {
    throw new Error(`prompted in a non-interactive run: ${name}`);
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
      info: () => undefined,
      warn: () => undefined,
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
const {
  adminSetup,
  adminPasswordNote,
  assertAdminFlags,
  newAdminPassword,
  ADMIN_PASSWORD_ENV,
  ADMIN_PASSWORD_MIN_LENGTH,
} = await import('../src/steps/adminSetup');
const { collectEnv } = await import('../src/scaffold/env');
const { WizardError } = await import('../src/errors');
type WizardContext = import('../src/context').WizardContext;
type WizardFlags = import('../src/context').WizardFlags;

const ctxWith = (modules: string[], flags: Partial<WizardFlags> = {}): WizardContext => {
  const ctx = createContext({ yes: true, dryRun: true, verbose: false, ...flags } as WizardFlags);
  ctx.answers.modules = modules;
  ctx.answers.token = 'a'.repeat(64);
  return ctx;
};

const previous = process.env[ADMIN_PASSWORD_ENV];
beforeEach(() => {
  delete process.env[ADMIN_PASSWORD_ENV];
});
afterEach(() => {
  if (previous === undefined) delete process.env[ADMIN_PASSWORD_ENV];
  else process.env[ADMIN_PASSWORD_ENV] = previous;
});

describe('the admin password', () => {
  it('is not asked for at all when the module was not selected', async () => {
    const ctx = ctxWith(['core', 'livechat']);
    await adminSetup(ctx);
    expect(ctx.answers.env[ADMIN_PASSWORD_ENV]).toBeUndefined();
    expect(adminPasswordNote(ctx)).toBeUndefined();
  });

  it('is generated for a run that never prompts, above the floor the proxy enforces', async () => {
    const ctx = ctxWith(['core', 'admin']);
    await adminSetup(ctx);
    const value = ctx.answers.env[ADMIN_PASSWORD_ENV]!;
    expect(value.length).toBeGreaterThanOrEqual(ADMIN_PASSWORD_MIN_LENGTH);
    /* base64url and never hex: the log scrubber masks any 64-hex string, which
       would hide this in exactly the output somebody has to read it out of. */
    expect(value).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(value).not.toMatch(/^[0-9a-f]{64}$/);
  });

  it('takes the flag, then the environment, over inventing one', async () => {
    const flagged = ctxWith(['admin'], { adminPassword: 'a-flag-given-admin-password' });
    await adminSetup(flagged);
    expect(flagged.answers.env[ADMIN_PASSWORD_ENV]).toBe('a-flag-given-admin-password');

    process.env[ADMIN_PASSWORD_ENV] = 'an-environment-admin-password';
    const inherited = ctxWith(['admin']);
    await adminSetup(inherited);
    expect(inherited.answers.env[ADMIN_PASSWORD_ENV]).toBe('an-environment-admin-password');
  });

  /* The environment used to be taken as written, so ADMIN_PASSWORD=admin walked
     past a minimum the proxy then enforces at boot: the panel refuses to start,
     on a deployment, long after the run that could have said so. */
  it('holds an ADMIN_PASSWORD from the environment to the same rule as the flag', async () => {
    for (const value of ['admin', 'has a space in it and is long enough']) {
      process.env[ADMIN_PASSWORD_ENV] = value;
      const err = (await adminSetup(ctxWith(['admin'])).catch((e: unknown) => e)) as InstanceType<typeof WizardError>;
      expect(err).toBeInstanceOf(WizardError);
      // The message names the variable, because that is what the person set —
      // telling them to fix a flag they never typed is telling them nothing.
      expect(err.message).toContain(ADMIN_PASSWORD_ENV);
      expect(err.message).not.toContain('--admin-password');
    }
  });

  it('leaves a run that never asked for the admin panel alone', async () => {
    process.env[ADMIN_PASSWORD_ENV] = 'admin';
    const ctx = ctxWith(['core', 'livechat']);
    await expect(adminSetup(ctx)).resolves.toBeUndefined();
    expect(ctx.answers.env[ADMIN_PASSWORD_ENV]).toBeUndefined();
  });

  it('refuses a flag the deployment would refuse, before anything is written', () => {
    for (const value of ['short', 'has a space in it and is long enough']) {
      expect(() => assertAdminFlags(ctxWith(['admin'], { adminPassword: value }))).toThrow(WizardError);
    }
    expect(() => assertAdminFlags(ctxWith(['admin'], { adminPassword: 'a-long-enough-password' }))).not.toThrow();
  });

  it('lands in .env as a secret, and in no other file', async () => {
    const ctx = ctxWith(['core', 'admin']);
    ctx.answers.env.VITE_CHATFUEL_WORKSPACE_ID = 'ws-1';
    await adminSetup(ctx);
    const entry = collectEnv(ctx).find((one) => one.name === ADMIN_PASSWORD_ENV);
    expect(entry?.value).toBe(ctx.answers.env[ADMIN_PASSWORD_ENV]);
    expect(entry?.commented).toBeUndefined();
  });

  it('is printed once when this run invented it, and never when it was given', async () => {
    const generated = ctxWith(['admin']);
    await adminSetup(generated);
    expect(adminPasswordNote(generated)).toContain(generated.answers.env[ADMIN_PASSWORD_ENV]!);

    const given = ctxWith(['admin'], { adminPassword: 'a-flag-given-admin-password' });
    await adminSetup(given);
    expect(adminPasswordNote(given)).toBeUndefined();
  });

  it('makes a different password every time', () => {
    const seen = new Set(Array.from({ length: 20 }, () => newAdminPassword()));
    expect(seen.size).toBe(20);
  });
});
