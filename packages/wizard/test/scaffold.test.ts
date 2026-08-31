import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { scaffold, undoPartialScaffold } from '../src/steps/scaffold';
import { createContext } from '../src/run';
import { WizardError } from '../src/errors';
import type { WizardContext } from '../src/context';

/**
 * The scaffold writes into a directory a person named, so the interesting case
 * is not the one that works — it is the one that stops halfway. What is left on
 * disk then decides whether the same command can be run again or whether it
 * refuses forever over its own debris.
 *
 * The template copy is real (content/shell), because a mocked `cpSync` would prove
 * nothing about what is actually left behind. The failure is injected the way
 * the code already fails: a module selection that matches no shell subtree,
 * which throws after the copy and before anything is renamed.
 */
vi.mock('@clack/prompts', () => ({
  isCancel: (value: unknown) => typeof value === 'symbol',
  text: () => Promise.resolve('./chatfuel-app'),
  log: {
    info: (m: string) => lines.push(m),
    warn: (m: string) => lines.push(m),
    error: (m: string) => lines.push(m),
    success: (m: string) => lines.push(m),
    message: () => undefined,
  },
  spinner: () => ({ start: () => undefined, message: () => undefined, stop: () => undefined }),
}));

const lines: string[] = [];
let parent: string;
let target: string;

function context(dir: string, modules: string[]): WizardContext {
  const ctx = createContext({ yes: true, dryRun: false, verbose: false, dir });
  ctx.answers.mode = 'standalone';
  ctx.answers.modules = modules;
  return ctx;
}

/** Fails after the template is copied: no present module is selected. */
const doomed = (dir: string): WizardContext => context(dir, ['not-a-module']);

beforeEach(() => {
  parent = mkdtempSync(join(tmpdir(), 'wizard-scaffold-'));
  target = join(parent, 'app');
  lines.length = 0;
});

afterEach(() => {
  rmSync(parent, { recursive: true, force: true });
});

describe('a scaffold that stops halfway', () => {
  it('takes the directory it created with it, and can be run again', async () => {
    await expect(scaffold(doomed(target))).rejects.toBeInstanceOf(WizardError);

    expect(existsSync(target)).toBe(false);
    expect(lines.join('\n')).toContain(target);

    // The point of removing it: the second run gets as far as the first one,
    // rather than being turned away by `${target} exists and is not empty`.
    await expect(scaffold(doomed(target))).rejects.toThrow('no selected module has a shell subtree');
  });

  it('leaves a directory somebody else made exactly as it found it', () => {
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, 'notes.md'), 'mine\n');

    undoPartialScaffold(target, false);

    expect(readFileSync(join(target, 'notes.md'), 'utf8')).toBe('mine\n');
    expect(lines.join('\n')).toContain('Nothing in it was deleted');
  });

  it('says nothing about a directory the failure never reached', () => {
    undoPartialScaffold(join(parent, 'never-made'), true);

    expect(lines).toEqual([]);
  });
});

/**
 * The window the rollback has to cover is not "the copy" — it is everything up
 * to and including the lock that makes the directory an app.
 *
 * `update` will not touch a directory with no lock and `scaffold` will not
 * write into a directory with anything in it, so a run that died between the
 * two left a full directory neither command would act on and nothing in it
 * saying why. The .gitignore append and the .env write sit in that window, and
 * an ENOSPC, a read-only mount or a permission on either of them is not a rare
 * shape of failure.
 *
 * The failure is injected the way the code already fails: a value carrying a
 * line break, which `envLine` refuses because a .env has no way to escape one.
 */
describe('a scaffold that stops after the copy and before the lock', () => {
  const doomedEnv = (dir: string): WizardContext => {
    const ctx = context(dir, ['core', 'livechat']);
    ctx.answers.brand = { name: 'Test app' };
    ctx.answers.token = 'a'.repeat(64);
    // Refused by `envLine`, which is the write that comes after the copy.
    ctx.answers.env.CHATFUEL_API_BASE = 'https://api.example\nADMIN_PASSWORD=hunter2';
    return ctx;
  };

  it('takes the directory with it, lock or no lock', async () => {
    await expect(scaffold(doomedEnv(target))).rejects.toThrow(/line break/);

    // Not "most of an app with no lock in it": nothing.
    expect(existsSync(target)).toBe(false);
    // And so the same command can be run again, rather than refusing forever.
    await expect(scaffold(doomedEnv(target))).rejects.toThrow(/line break/);
  });

  it('says what it left behind in a directory that was not its own', async () => {
    mkdirSync(target, { recursive: true });

    await expect(scaffold(doomedEnv(target))).rejects.toThrow(/line break/);

    // Somebody else's directory is never deleted — it is reported instead, and
    // a failure this late used to be reported not at all.
    expect(existsSync(target)).toBe(true);
    expect(lines.join('\n')).toContain('Nothing in it was deleted');
    // Still not an app: no lock, so `update` will not act on it either.
    expect(existsSync(join(target, '.chatfuel', 'lock.json'))).toBe(false);
  });
});

describe('the target directory', () => {
  it('refuses one that already holds somebody’s files, and touches nothing in it', async () => {
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, 'notes.md'), 'mine\n');

    await expect(scaffold(doomed(target))).rejects.toThrow('exists and is not empty');
    expect(readdirSync(target)).toEqual(['notes.md']);
  });

  it('accepts an empty one, and does not delete it when the scaffold fails', async () => {
    mkdirSync(target, { recursive: true });

    await expect(scaffold(doomed(target))).rejects.toBeInstanceOf(WizardError);

    // An empty directory somebody made and stood in is still theirs.
    expect(existsSync(target)).toBe(true);
    expect(lines.join('\n')).toContain('Nothing in it was deleted');
  });
});
