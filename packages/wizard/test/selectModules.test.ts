import { describe, expect, it, vi } from 'vitest';
import { createContext } from '../src/run';
import { selectModules } from '../src/steps/selectModules';
import type { WizardFlags } from '../src/context';

/**
 * The two branches a run can take without a person in front of it. Both decide
 * what gets copied into somebody's app from a string, and both were until now
 * the only part of the step nothing asserted — `--modules` names the modules
 * and `--yes` names none, which are opposite defaults reached by the same call.
 *
 * The prompts are mocked to throw: every case here must be answered by the
 * flags, and a test that quietly falls through to the checklist would prove
 * the opposite of what it claims.
 */
const notes = vi.hoisted(() => [] as string[]);

vi.mock('@clack/prompts', () => ({
  log: {
    info: (m: string) => notes.push(m),
    warn: (m: string) => notes.push(m),
    error: (m: string) => notes.push(m),
    success: () => undefined,
    message: () => undefined,
  },
  isCancel: () => false,
}));

vi.mock('../src/prompts/checklist', () => ({
  checklist: () => {
    throw new Error('prompted in a run that was supposed to be decided by flags');
  },
}));

const run = async (flags: Partial<WizardFlags>): Promise<string[]> => {
  const ctx = createContext({ yes: false, dryRun: false, verbose: false, ...flags });
  await selectModules(ctx);
  return ctx.answers.modules;
};

describe('--modules', () => {
  it('installs what it names, plus what those require', async () => {
    const modules = await run({ modules: 'publishing' });
    expect(modules).toContain('publishing');
    expect(modules).toContain('core');
  });

  it('refuses a module this build does not have', async () => {
    await expect(run({ modules: 'not-a-module' })).rejects.toThrow(/--modules names unknown module "not-a-module"/);
  });

  it('refuses a list that names nothing', async () => {
    await expect(run({ modules: ' , ' })).rejects.toThrow(/--modules was given but empty/);
  });
});

describe('--yes', () => {
  it('takes every ready module except the opt-in ones', async () => {
    const ctx = createContext({ yes: true, dryRun: false, verbose: false });
    const optIn = ctx.registry
      .ready()
      .filter((m) => m.selection === 'opt-in')
      .map((m) => m.id);
    await selectModules(ctx);

    expect(optIn.length).toBeGreaterThan(0);
    for (const id of optIn) expect(ctx.answers.modules).not.toContain(id);
    expect(ctx.answers.modules).toContain('core');
  });

  it('says so, rather than leaving the omission to be discovered later', async () => {
    notes.length = 0;
    await run({ yes: true });
    expect(notes.join('\n')).toMatch(/opt-in modules \(.*auth.*\) only with --modules/);
  });

  it('installs an opt-in module when it is asked for by name', async () => {
    expect(await run({ yes: true, modules: 'auth' })).toContain('auth');
  });
});
