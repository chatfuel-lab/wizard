import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createContext } from '../src/run';
import { prepareGithub, pushToGithub, repoName, webUrl } from '../src/steps/github';
import type { WizardContext } from '../src/context';

/**
 * A repository is somebody's GitHub account, their name on a commit, and — if
 * the gate below it ever failed — their Chatfuel token in public. So the rules
 * worth pinning are the ones about NOT creating one: a --yes run, a --dry-run,
 * a pipe with no terminal and an embed must never reach the question. And
 * declining must leave the run exactly as it was.
 *
 * clack is scripted per test; execa throws, so "did it shell out?" is
 * answerable without a GitHub account. Because git itself goes through execa,
 * every accepted run stops at the local-repository step, which is precisely
 * where these tests want it to stop.
 */
let confirmAnswer: boolean | symbol = false;
const confirmCalls: string[] = [];
const textCalls: string[] = [];
const selectCalls: Array<{ message: string; initialValue?: unknown }> = [];
const infoLines: string[] = [];

vi.mock('@clack/prompts', () => ({
  confirm: (opts: { message: string }) => {
    confirmCalls.push(opts.message);
    return Promise.resolve(confirmAnswer);
  },
  text: (opts: { message: string; defaultValue?: string }) => {
    textCalls.push(opts.message);
    return Promise.resolve(opts.defaultValue ?? '');
  },
  select: (opts: { message: string; initialValue?: unknown }) => {
    selectCalls.push({ message: opts.message, initialValue: opts.initialValue });
    return Promise.resolve(opts.initialValue);
  },
  isCancel: (value: unknown) => typeof value === 'symbol',
  note: () => undefined,
  password: () => Promise.resolve(''),
  intro: () => undefined,
  outro: () => undefined,
  log: {
    info: (m: string) => infoLines.push(m),
    warn: (m: string) => infoLines.push(m),
    error: (m: string) => infoLines.push(m),
    success: () => undefined,
    message: () => undefined,
  },
  spinner: () => ({ start: () => undefined, message: () => undefined, stop: () => undefined, error: () => undefined }),
}));

vi.mock('execa', () => ({
  execa: () => {
    throw new Error('shelled out when it should not have');
  },
}));

/* The half that touches the repository, so a test can see WHICH half touched
   it. `prepareLocalRepo` is where the staging, the secret scan and the commit
   live, and the whole point of the split is that none of them happen until the
   handoff has finished writing the app. */
const repoCalls: string[] = [];
vi.mock('../src/github/repo', () => ({
  prepareLocalRepo: (_ctx: unknown, dir: string) => {
    repoCalls.push(dir);
    return Promise.resolve('stop');
  },
  originUrl: () => Promise.resolve(undefined),
}));

// No gh anywhere, so part one takes the token route and asks for one.
vi.mock('../src/github/cli', () => ({
  ensureGh: () => Promise.resolve(undefined),
  ghIsAuthenticated: () => Promise.resolve(false),
  ghLogin: () => Promise.resolve(false),
  ghSetupGit: () => Promise.resolve(undefined),
  ghCreateAndPush: () => Promise.resolve(undefined),
}));

let tokenAnswer: { login: string; token: string } | null = { login: 'jane', token: 'ghp_x' };
vi.mock('../src/github/api', () => ({
  askForGithubToken: () => Promise.resolve(tokenAnswer),
  createRepo: () => Promise.resolve(undefined),
  pushToOrigin: () => Promise.resolve(false),
  pushWithToken: () => Promise.resolve(false),
}));

let appDir: string;
const realTty = process.stdin.isTTY;

function standaloneContext(): WizardContext {
  const ctx = createContext({ yes: false, dryRun: false, verbose: false });
  ctx.answers.mode = 'standalone';
  ctx.answers.appDir = appDir;
  ctx.answers.packageManager = 'npm';
  return ctx;
}

beforeEach(() => {
  appDir = mkdtempSync(join(tmpdir(), 'wizard-github-'));
  confirmCalls.length = 0;
  textCalls.length = 0;
  selectCalls.length = 0;
  infoLines.length = 0;
  repoCalls.length = 0;
  tokenAnswer = { login: 'jane', token: 'ghp_x' };
  confirmAnswer = false;
  Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
});

afterEach(() => {
  rmSync(appDir, { recursive: true, force: true });
  Object.defineProperty(process.stdin, 'isTTY', { value: realTty, configurable: true });
});

describe('github step', () => {
  it('asks once in a standalone interactive run', async () => {
    await prepareGithub(standaloneContext());
    expect(confirmCalls).toHaveLength(1);
    expect(confirmCalls[0]).toContain('GitHub');
  });

  it('says how to do it later when the answer is no, and changes nothing', async () => {
    const ctx = standaloneContext();
    const plan = await prepareGithub(ctx);
    expect(plan).toBeUndefined();
    expect(ctx.answers.githubUrl).toBeUndefined();
    expect(infoLines.join(' ')).toContain('gh repo create');
  });

  it('treats a cancelled prompt as a no', async () => {
    confirmAnswer = Symbol('cancel');
    const ctx = standaloneContext();
    await prepareGithub(ctx);
    expect(ctx.answers.githubUrl).toBeUndefined();
    expect(textCalls).toEqual([]);
  });

  it('asks for a repository name and preselects private', async () => {
    confirmAnswer = true;
    await prepareGithub(standaloneContext());
    expect(textCalls).toHaveLength(1);
    expect(textCalls[0]).toMatch(/repository/i);
    expect(selectCalls).toHaveLength(1);
    expect(selectCalls[0].initialValue).toBe('private');
  });

  it('never asks in a --yes run', async () => {
    const ctx = standaloneContext();
    ctx.flags.yes = true;
    confirmAnswer = true;
    await prepareGithub(ctx);
    expect(confirmCalls).toEqual([]);
  });

  it('never asks in a --dry-run', async () => {
    const ctx = standaloneContext();
    ctx.flags.dryRun = true;
    confirmAnswer = true;
    await prepareGithub(ctx);
    expect(confirmCalls).toEqual([]);
  });

  it('never asks without a terminal', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    confirmAnswer = true;
    await prepareGithub(standaloneContext());
    expect(confirmCalls).toEqual([]);
  });

  it('never asks in embed mode — the repository is the host project\u2019s', async () => {
    const ctx = standaloneContext();
    ctx.answers.mode = 'embed';
    confirmAnswer = true;
    await prepareGithub(ctx);
    expect(confirmCalls).toEqual([]);
  });

  it('never asks when there is no scaffolded directory', async () => {
    const ctx = standaloneContext();
    ctx.answers.appDir = undefined;
    confirmAnswer = true;
    await prepareGithub(ctx);
    expect(confirmCalls).toEqual([]);
  });
});

/**
 * The half that writes has to be the half that runs last.
 *
 * The handoff writes the instructions file, the finish-setup checklist and the
 * final lock, and it can hand the terminal to an agent session. So the asking
 * and the sign-in go in front of it and the commit and the push behind it, and
 * neither half may do the other one's work.
 */
describe('github step, split around the handoff', () => {
  it('reaches nothing in the repository while it is only asking', async () => {
    confirmAnswer = true;
    const plan = await prepareGithub(standaloneContext());
    expect(plan).toBeDefined();
    expect(plan!.name).toBeTruthy();
    // No staging, no secret scan, no commit — that is part two's work.
    expect(repoCalls).toEqual([]);
  });

  it('commits and pushes only once it is handed a plan', async () => {
    const ctx = standaloneContext();
    confirmAnswer = true;
    const plan = await prepareGithub(ctx);
    repoCalls.length = 0;
    await pushToGithub(ctx, plan);
    expect(repoCalls).toEqual([appDir]);
  });

  it('is a no-op when the person declined, so nothing is committed behind them', async () => {
    const ctx = standaloneContext();
    const plan = await prepareGithub(ctx);
    expect(plan).toBeUndefined();
    await pushToGithub(ctx, plan);
    expect(repoCalls).toEqual([]);
    expect(ctx.answers.githubUrl).toBeUndefined();
  });

  it('carries the sign-in from part one instead of asking for it twice', async () => {
    const ctx = standaloneContext();
    confirmAnswer = true;
    const plan = await prepareGithub(ctx);
    expect(plan!.account).toEqual({ login: 'jane', token: 'ghp_x' });
    tokenAnswer = null;
    // Nothing left to ask for: part two pushes with what part one already got.
    await pushToGithub(ctx, plan);
    expect(repoCalls).toEqual([appDir]);
  });

  it('gives up before the handoff when there is no way to sign in at all', async () => {
    tokenAnswer = null;
    confirmAnswer = true;
    const plan = await prepareGithub(standaloneContext());
    expect(plan).toBeUndefined();
    expect(infoLines.join(' ')).toContain('Nothing was pushed');
  });

  it('is ordered around the handoff in run.ts', () => {
    const run = readFileSync(new URL('../src/run.ts', import.meta.url), 'utf8');
    const prepare = run.indexOf('prepareGithub(ctx)');
    const hand = run.indexOf('handoff(ctx)');
    const push = run.indexOf('pushToGithub(ctx');
    expect(prepare).toBeGreaterThan(-1);
    expect(hand).toBeGreaterThan(prepare);
    expect(push).toBeGreaterThan(hand);
  });
});

describe('webUrl', () => {
  it('drops the login git keeps in the remote and the .git git keeps on the end', () => {
    expect(webUrl('https://jane@github.com/jane/app.git')).toBe('https://github.com/jane/app');
  });

  it('turns an ssh remote into a page', () => {
    expect(webUrl('git@github.com:jane/app.git')).toBe('https://github.com/jane/app');
  });

  it('leaves a plain https remote as it is', () => {
    expect(webUrl('https://github.com/jane/app')).toBe('https://github.com/jane/app');
  });
});

describe('repoName', () => {
  it('keeps what GitHub keeps', () => {
    expect(repoName('my-app_2.0')).toBe('my-app_2.0');
  });

  it('rewrites what GitHub would rewrite behind your back', () => {
    expect(repoName('My App (final)')).toBe('My-App-final');
    expect(repoName('café bot')).toBe('caf-bot');
  });

  it('trims leading and trailing punctuation', () => {
    expect(repoName('--app--')).toBe('app');
    expect(repoName('.hidden.')).toBe('hidden');
  });

  it('never returns an empty name', () => {
    expect(repoName('!!!')).toBe('chatfuel-app');
  });
});
