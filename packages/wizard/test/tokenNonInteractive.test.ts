import { describe, expect, it, vi } from 'vitest';

/**
 * A run that answers no questions must not stop on one.
 *
 * clack ends the process on end-of-input, before anything of ours can throw, so
 * a scripted install whose token has expired used to print a prompt nobody
 * could answer, exit 0, and leave no app behind — the failure looked like a
 * success everywhere downstream. The token step therefore refuses to reach for
 * the prompt at all when there is nobody to answer it.
 *
 * clack is replaced with prompts that THROW: the assertion is that none is
 * reached, not what they would have returned.
 */
vi.mock('@clack/prompts', () => {
  const prompted = (name: string) => () => {
    throw new Error(`prompted when it should not have: ${name}`);
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

vi.mock('@chatfuel/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@chatfuel/api-client')>();
  return {
    ...actual,
    // Every token this suite offers is one the API turns down.
    createChatfuelClient: () => ({
      query: async () => {
        throw new actual.ChatfuelAuthError([{ message: 'auth error', extensions: { code: 'Unauthorized' } }]);
      },
      dispose: async () => undefined,
    }),
  };
});

const { createContext } = await import('../src/run');
const { token } = await import('../src/steps/token');
type WizardFlags = import('../src/context').WizardFlags;

const ctxWith = (flags: Partial<WizardFlags>) => createContext({ yes: false, dryRun: false, verbose: false, ...flags });

describe('token, with nobody at the keyboard', () => {
  it('says the token is missing rather than asking for it', async () => {
    delete process.env.CHATFUEL_TOKEN;
    await expect(token(ctxWith({ yes: true }))).rejects.toThrow(/CHATFUEL_TOKEN is not set/);
  });

  it('says the token was refused rather than asking for another', async () => {
    process.env.CHATFUEL_TOKEN = 'expired-but-well-formed';
    try {
      await expect(token(ctxWith({ yes: true }))).rejects.toThrow(/did not accept CHATFUEL_TOKEN/);
    } finally {
      delete process.env.CHATFUEL_TOKEN;
    }
  });

  /* `rejects`, not a `.catch()` whose callback nothing insists on running: an
     assertion reached only when the promise rejects is no assertion at all the
     day the step stops rejecting. */
  it('names the page a token comes from', async () => {
    delete process.env.CHATFUEL_TOKEN;
    await expect(token(ctxWith({ yes: true }))).rejects.toMatchObject({
      hint: expect.stringContaining('panel.chatfuel.com/integration/auth/token'),
    });
  });
});
