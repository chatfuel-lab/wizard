import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createContext } from '../src/run';
import { buildAppLock, newLockDraft, recordSkills, unmanagedSkills, writeAppLock } from '../src/scaffold/appLock';
import { installSkills, skillsRoot, toInstall } from '../src/scaffold/skills';
import type { AppLock } from '../src/scaffold/appLock';
import type { WizardContext } from '../src/context';

/**
 * A skill directory that is already there is the one question the install has
 * to ask, and it can only ask it well if it knows who put the directory there.
 * That used to be a `chatfuel.skill.json` written inside every skill; it is now
 * the app's own lock, which already had to record the same fact.
 *
 * clack is replaced with prompts that THROW except `confirm`, which is
 * scripted — an install that asks anything else is a bug this file catches.
 */
const messages: string[] = [];
const warnings: string[] = [];
const answers: boolean[] = [];
vi.mock('@clack/prompts', () => {
  const prompted = (name: string) => () => {
    throw new Error(`prompted when it should not have: ${name}`);
  };
  return {
    text: prompted('text'),
    password: prompted('password'),
    select: prompted('select'),
    multiselect: prompted('multiselect'),
    confirm: async ({ message }: { message: string }) => {
      messages.push(message);
      if (answers.length === 0) throw new Error('confirm asked more often than scripted');
      return answers.shift()!;
    },
    isCancel: () => false,
    note: () => undefined,
    intro: () => undefined,
    outro: () => undefined,
    log: {
      info: () => undefined,
      warn: (m: string) => warnings.push(m),
      error: () => undefined,
      success: () => undefined,
      step: () => undefined,
    },
  };
});

let appDir: string;
const SKILL = '.claude/skills/chatfuel-core';

function context(): WizardContext {
  const ctx = createContext({ yes: false, dryRun: false, verbose: false, dir: appDir });
  ctx.answers.modules = ['core', 'livechat'];
  ctx.answers.appDir = appDir;
  ctx.answers.skillsTarget = 'project';
  return ctx;
}

/** The lock a previous run of wizard 0.1.0 would have left in this app. */
function lockSaying(scope: 'app' | 'home', wizardVersion = '0.1.0'): void {
  const lock: AppLock = {
    mode: 'standalone',
    wizardVersion,
    modules: ['core'],
    skills: { 'chatfuel-core': { module: 'core', from: 'content/modules/core/skill', scope } },
    files: {},
  };
  writeAppLock(appDir, lock);
}

/** Every skill this context would install, by the directory it lands in. */
const skillDirs = (ctx: WizardContext): string[] => toInstall(ctx).map((skill) => skill.installAs);

function squat(text = 'mine\n'): void {
  mkdirSync(join(appDir, SKILL), { recursive: true });
  writeFileSync(join(appDir, SKILL, 'SKILL.md'), text, 'utf8');
}

beforeEach(() => {
  appDir = mkdtempSync(join(tmpdir(), 'chatfuel-reinstall-'));
  messages.length = 0;
  warnings.length = 0;
  answers.length = 0;
});
afterEach(() => {
  rmSync(appDir, { recursive: true, force: true });
});

describe('a skill directory that is already there', () => {
  it('names the version the lock recorded, and replaces it when told to', async () => {
    lockSaying('app');
    squat();
    answers.push(true);

    await installSkills(context());

    expect(messages[0]).toContain('chatfuel-core is already installed (wizard 0.1.0)');
    expect(readFileSync(join(appDir, SKILL, 'SKILL.md'), 'utf8')).not.toBe('mine\n');
  });

  it('says it is not ours when the lock has never heard of it', async () => {
    squat();
    answers.push(true);

    await installSkills(context());
    expect(messages[0]).toContain("this app's lock does not record it as ours");
  });

  /* A skill recorded in the home directory says nothing about the one sitting
     in the project, and replacing the wrong one is not recoverable. */
  it('says it is not ours when the lock recorded the other scope', async () => {
    lockSaying('home');
    squat();
    answers.push(true);

    await installSkills(context());
    expect(messages[0]).toContain("this app's lock does not record it as ours");
  });

  /* The lock is a file on disk, and the version in it lands in the question
     whose answer deletes a directory. A version that could write the rest of
     the question is not shown at all — and what it falls back to is the more
     careful of the two messages. */
  it('will not repeat a version the lock made up', async () => {
    lockSaying('app', ' 0.1.0\u001b[2K\rNothing is installed. Replace nothing?');
    squat();
    answers.push(true);

    await installSkills(context());
    expect(messages[0]).toContain("this app's lock does not record it as ours");
    expect(messages[0]).not.toContain('Nothing is installed');
  });

  it('leaves it exactly as it is when the answer is no', async () => {
    lockSaying('app');
    squat();
    answers.push(false);

    const { installed, kept } = await installSkills(context());

    expect(readFileSync(join(appDir, SKILL, 'SKILL.md'), 'utf8')).toBe('mine\n');
    expect(installed).not.toContain('chatfuel-core');
    expect(installed).toContain('chatfuel-livechat');
    // Kept, not forgotten: the lock records it so `update` can name it later.
    expect(kept).toEqual(['chatfuel-core']);
    expect(warnings).toContain('Skipped chatfuel-core');
  });

  it('asks nothing at all when there is nothing there', async () => {
    await installSkills(context());
    expect(messages).toEqual([]);
  });

  it('keeps every one of them without ending the run', async () => {
    /* Declining them all is somebody keeping the skills they already have. The
       app directory is written by the time this step runs, and throwing here
       ended the run over a finished app — one that `scaffold` then refuses to
       re-enter and `update` refuses to touch. */
    lockSaying('app');
    squat();
    const ctx = context();
    for (const dir of skillDirs(ctx)) {
      mkdirSync(join(appDir, '.claude/skills', dir), { recursive: true });
      writeFileSync(join(appDir, '.claude/skills', dir, 'SKILL.md'), 'mine\n', 'utf8');
      answers.push(false);
    }

    const { installed } = await installSkills(ctx);

    expect(installed).toEqual([]);
    expect(ctx.answers.skillsInstalled).toEqual([]);
    expect(ctx.answers.skillsLayout).toBeDefined();
    expect(warnings.join('\n')).toContain('No skills were installed');
  });
});

describe('what an install writes', () => {
  /* The version stamp used to travel as a file inside every skill directory.
     Two records of one fact drift, and this one was also a file the agent had
     to read past. The lock is the ledger now. */
  it('leaves no ledger of its own inside the skill', async () => {
    await installSkills(context());
    expect(existsSync(join(appDir, SKILL, 'SKILL.md'))).toBe(true);
    expect(existsSync(join(appDir, SKILL, 'chatfuel.skill.json'))).toBe(false);
  });
});

/**
 * `--yes` is how a script runs, and a script that deletes a directory it did
 * not create is a script that eats somebody's own work. The lock is what tells
 * the two apart: an entry for this skill in this scope means the wizard put the
 * directory there and may replace it; no entry means it belongs to whoever made
 * it, and a run with nobody at the keyboard has no way to ask.
 */
describe('a --yes run, over a skill directory that is already there', () => {
  const yesContext = (): WizardContext => {
    const ctx = context();
    ctx.flags.yes = true;
    return ctx;
  };

  it('leaves one this wizard did not install exactly as it is', async () => {
    squat();

    const { installed, kept } = await installSkills(yesContext());

    expect(readFileSync(join(appDir, SKILL, 'SKILL.md'), 'utf8')).toBe('mine\n');
    expect(installed).not.toContain('chatfuel-core');
    expect(kept).toContain('chatfuel-core');
    // Said out loud: a silent skip is how somebody finds out months later.
    expect(warnings.join('\n')).toContain("this app's lock does not record it as ours");
    // Nothing was asked — there is nobody to ask.
    expect(messages).toEqual([]);
  });

  it('replaces one its own lock says it installed', async () => {
    lockSaying('app');
    squat();

    const { installed, kept } = await installSkills(yesContext());

    expect(readFileSync(join(appDir, SKILL, 'SKILL.md'), 'utf8')).not.toBe('mine\n');
    expect(installed).toContain('chatfuel-core');
    expect(kept).toEqual([]);
  });

  it('leaves one the lock recorded in the other scope', async () => {
    lockSaying('home');
    squat();

    const { kept } = await installSkills(yesContext());

    expect(readFileSync(join(appDir, SKILL, 'SKILL.md'), 'utf8')).toBe('mine\n');
    expect(kept).toContain('chatfuel-core');
  });
});

/**
 * A skill somebody kept is not a skill that stops existing.
 *
 * It came out of `skillsInstalled` and so out of the lock entirely, and the
 * next `update` had never heard of it — the one directory in the app carrying
 * an older version was also the only one nothing could report on.
 */
describe('what the lock says about a skill that was kept', () => {
  it('records it as present and not managed, and reads it back by name', async () => {
    lockSaying('app');
    squat();
    const ctx = context();
    answers.push(false);

    const { kept } = await installSkills(ctx);
    const draft = newLockDraft();
    recordSkills(ctx, draft, appDir, skillsRoot(ctx), kept);
    writeAppLock(appDir, buildAppLock(ctx, appDir, draft));

    const lock = JSON.parse(readFileSync(join(appDir, '.chatfuel', 'lock.json'), 'utf8')) as AppLock;
    expect(lock.skills['chatfuel-core']).toMatchObject({ managed: false, module: 'core' });
    // The installed one carries no flag at all — absent has always meant ours.
    expect(lock.skills['chatfuel-livechat']?.managed).toBeUndefined();
    expect(unmanagedSkills(appDir)).toEqual(['chatfuel-core']);
  });

  it('reads back nothing from an app that has no lock', () => {
    expect(unmanagedSkills(appDir)).toEqual([]);
  });

  /* The record is the whole point of `managed: false`, and it is only worth
     having if the next run reads it. A kept directory is written into the lock
     with the same scope an installed one gets, so a run that looked at the
     scope alone would find the entry, take it for its own work, and — under
     `--yes`, where nobody is asked — delete the directory the previous run went
     out of its way to leave alone. */
  it('is still not replaced by a later --yes run', async () => {
    lockSaying('app');
    squat();
    const first = context();
    answers.push(false);
    const { kept } = await installSkills(first);
    const draft = newLockDraft();
    recordSkills(first, draft, appDir, skillsRoot(first), kept);
    writeAppLock(appDir, buildAppLock(first, appDir, draft));

    const second = context();
    second.flags.yes = true;
    const { installed, kept: keptAgain } = await installSkills(second);

    expect(readFileSync(join(appDir, SKILL, 'SKILL.md'), 'utf8')).toBe('mine\n');
    expect(installed).not.toContain('chatfuel-core');
    expect(keptAgain).toContain('chatfuel-core');
    expect(warnings.join('\n')).toContain("this app's lock does not record it as ours");
  });
});
