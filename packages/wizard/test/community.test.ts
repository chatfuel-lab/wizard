import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The community link has to survive being useful, which means being on screen
 * at the three moments a person actually wants it: before they start, after it
 * worked, and after it did not. Each of those is a different code path, and
 * none of them was pinned by anything before this file — so what is asserted
 * here is placement, not the URL, which comes from the constant either way.
 */
const notes: Array<{ title: string | undefined; message: string }> = [];
const infos: string[] = [];
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
    note: (message: string, title?: string) => notes.push({ title, message }),
    intro: () => undefined,
    outro: () => undefined,
    log: {
      info: (m: string) => infos.push(m),
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

const { DISCORD_URL } = await import('../src/constants');
const { WizardError } = await import('../src/errors');
const { createContext, reportWizardError } = await import('../src/run');
const { welcome } = await import('../src/steps/welcome');
const { outro } = await import('../src/steps/outro');
type WizardContext = import('../src/context').WizardContext;

/** The terminal art is not what is under test, and it is loud. */
beforeEach(() => {
  notes.length = 0;
  infos.length = 0;
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

const context = (): WizardContext => {
  const ctx = createContext({ yes: true, dryRun: true, verbose: false });
  ctx.answers.appDir = '/tmp/app';
  return ctx;
};

const noted = (title: string): string => notes.find((n) => n.title === title)?.message ?? '';

describe('the community link', () => {
  it('is in the opening note, before anything is asked', async () => {
    await welcome(context());
    expect(noted('Welcome')).toContain(DISCORD_URL);
  });

  it('is in the closing note of a scaffold', () => {
    outro(context());
    expect(noted('All set')).toContain(DISCORD_URL);
  });

  it('is in the closing note of an embed too — the shorter of the two branches', () => {
    const ctx = context();
    ctx.answers.mode = 'embed';
    outro(ctx);
    expect(noted('All set')).toContain(DISCORD_URL);
  });

  it('is on the failure screen, which is where it is worth the most', () => {
    expect(reportWizardError(new WizardError('Cancelled.'))).toBe(true);
    expect(infos.join('\n')).toContain(DISCORD_URL);
  });

  it('is not printed for a failure the wizard does not own', () => {
    expect(reportWizardError(new Error('some other crash'))).toBe(false);
    expect(infos).toEqual([]);
  });
});
