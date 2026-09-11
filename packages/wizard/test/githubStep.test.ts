import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
/** When set, answers the confirms in order — the last one repeats. */
let confirmAnswers: Array<boolean | symbol> | null = null;
const confirmCalls: string[] = [];
const textCalls: string[] = [];
const selectCalls: Array<{ message: string; initialValue?: unknown }> = [];
const infoLines: string[] = [];
/** Every prompt, in the order it was asked — the confirms and the text alike. */
const promptOrder: string[] = [];

vi.mock('@clack/prompts', () => ({
  confirm: (opts: { message: string }) => {
    confirmCalls.push(opts.message);
    promptOrder.push(opts.message);
    const scripted = confirmAnswers?.[Math.min(confirmCalls.length - 1, confirmAnswers.length - 1)];
    return Promise.resolve(scripted ?? confirmAnswer);
  },
  text: (opts: { message: string; defaultValue?: string }) => {
    textCalls.push(opts.message);
    promptOrder.push(opts.message);
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

/* Recorded as well as refused: "did it shell out, and at what?" is the only
   question some of these tests have, and the throw is what keeps every path
   that must not shell out honest. */
const execaCalls: string[] = [];
/**
 * What the next spawn throws. A plain error by default — no path here is meant
 * to reach one — and an error carrying an exit code for the tests that are
 * about which code the connect script came back with.
 */
let execaFailure: Error = new Error('shelled out when it should not have');
vi.mock('execa', () => ({
  execa: (bin: string, args: string[]) => {
    execaCalls.push([bin, ...args].join(' '));
    throw execaFailure;
  },
}));

/* The half that touches the repository, so a test can see WHICH half touched
   it. `prepareLocalRepo` is where the staging, the secret scan and the commit
   live, and the whole point of the split is that none of them happen until the
   handoff has finished writing the app. */
const repoCalls: string[] = [];
/** What the local repository is in — 'stop' unless a test needs to get past it. */
let prepared: 'stop' | 'ready' | 'unpushed' = 'stop';
let originAnswer: string | undefined;
vi.mock('../src/github/repo', () => ({
  prepareLocalRepo: (_ctx: unknown, dir: string) => {
    repoCalls.push(dir);
    return Promise.resolve(prepared);
  },
  originUrl: () => Promise.resolve(originAnswer),
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
/** What the two pushing paths do — both refuse, until a test needs one to work. */
let createdRepo: string | undefined;
let pushed = false;
vi.mock('../src/github/api', () => ({
  askForGithubToken: () => Promise.resolve(tokenAnswer),
  createRepo: () => Promise.resolve(createdRepo),
  pushToOrigin: () => Promise.resolve(pushed),
  pushWithToken: () => Promise.resolve(pushed),
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
  execaCalls.length = 0;
  promptOrder.length = 0;
  tokenAnswer = { login: 'jane', token: 'ghp_x' };
  confirmAnswer = false;
  confirmAnswers = null;
  prepared = 'stop';
  originAnswer = undefined;
  createdRepo = undefined;
  pushed = false;
  execaFailure = new Error('shelled out when it should not have');
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

/**
 * The GitHub connection Vercel needs before `git push` can redeploy anything.
 *
 * Found out during the deploy — the only step where the Vercel CLI is signed in
 * — and acted on here, in front of the repository name, because everything past
 * that prompt costs the person something: a commit, a repository under their
 * account, a push. Saying it afterwards is what the old behaviour did, and by
 * then there is nothing left to decide.
 */
describe('the Vercel GitHub connection', () => {
  function missingConnection(): WizardContext {
    const ctx = standaloneContext();
    ctx.answers.vercelGitLogin = 'missing';
    return ctx;
  }

  /** The plan part one would have handed over, so part two can be run alone. */
  const planFor = () => ({
    appDir,
    name: 'app',
    isPrivate: true,
    description: 'x',
    account: { login: 'jane', token: 'ghp_x' },
  });

  /** A linked Vercel project and a push that goes through — what it takes to reach connectVercel. */
  function linkedAndPushed(): void {
    mkdirSync(join(appDir, '.vercel'));
    writeFileSync(join(appDir, '.vercel', 'project.json'), '{"projectName":"app"}');
    prepared = 'ready';
    createdRepo = 'https://github.com/jane/app';
    pushed = true;
  }

  it('asks about it before anything has been named or created', async () => {
    confirmAnswer = true;
    const ctx = missingConnection();
    await prepareGithub(ctx);
    expect(confirmCalls).toContain('Added it?');
    const offered = promptOrder.indexOf('Added it?');
    expect(promptOrder[0]).toContain('GitHub');
    expect(offered).toBe(1);
    expect(promptOrder.slice(offered + 1).join(' ')).toMatch(/repository/i);
  });

  it('forgets it once the person says they added it', async () => {
    confirmAnswer = true;
    const ctx = missingConnection();
    await prepareGithub(ctx);
    expect(ctx.answers.vercelGitLogin).toBeUndefined();
  });

  it('keeps it, and carries on, on a no and on a cancel', async () => {
    for (const answer of [false, Symbol('cancel')] as Array<boolean | symbol>) {
      const ctx = missingConnection();
      confirmAnswers = [true, answer];
      const plan = await prepareGithub(ctx);
      expect(ctx.answers.vercelGitLogin).toBe('missing');
      /* A cancel here is a no, not the end of the run: the repository question
         was answered yes already, and this one is about a convenience. */
      expect(plan).toBeDefined();
      confirmCalls.length = 0;
      promptOrder.length = 0;
    }
  });

  it('asks nothing extra of a run whose account is connected', async () => {
    confirmAnswer = true;
    await prepareGithub(standaloneContext());
    expect(confirmCalls).toEqual(['Put this app on GitHub?']);
  });

  /* `connectVercel` is private and is reached from both of the paths that end
     in a push, which is exactly why the branch has to live inside it. Driven
     through both below: a fresh push, and a resumed one. */
  it('does not offer redeploy-on-push when there is nothing to connect to', async () => {
    const ctx = missingConnection();
    linkedAndPushed();
    await pushToGithub(ctx, planFor());
    expect(confirmCalls).not.toContain('Redeploy to Vercel on every push to GitHub?');
    expect(execaCalls.join('\n')).not.toContain('connect-git');
    const said = infoLines.join('\n');
    expect(said).toContain('will not redeploy');
    expect(said).toContain('https://vercel.com/account/settings/authentication');
    expect(said).toContain('run connect-git');
  });

  it('asks as it always did when the connection is there', async () => {
    const ctx = standaloneContext();
    linkedAndPushed();
    confirmAnswer = false;
    await pushToGithub(ctx, planFor());
    expect(confirmCalls).toEqual(['Redeploy to Vercel on every push to GitHub?']);
    expect(infoLines.join('\n')).not.toContain('will not redeploy');
  });

  it('reaches the same branch on the resumed push', async () => {
    const ctx = missingConnection();
    linkedAndPushed();
    prepared = 'unpushed';
    originAnswer = 'https://github.com/jane/app.git';
    confirmAnswer = true;
    await pushToGithub(ctx, planFor());
    expect(ctx.answers.githubUrl).toBe('https://github.com/jane/app');
    expect(confirmCalls).toEqual(['Finish pushing to https://github.com/jane/app.git?']);
    expect(infoLines.join('\n')).toContain('will not redeploy');
  });

  /* Through the package manager's run command, the script's careful "this is
     off, here is the one click that turns it on" was followed by an error block
     and a path to a debug log — which reads as breakage. The script is spawned
     directly instead; the advice still names the command a person types. */
  it('runs the app’s own script rather than the package manager', async () => {
    const ctx = standaloneContext();
    linkedAndPushed();
    confirmAnswer = true;
    await pushToGithub(ctx, planFor());
    expect(execaCalls).toEqual([`${process.execPath} ${join(appDir, 'scripts', 'connect-git.mjs')}`]);
    expect(infoLines.join('\n')).toContain('npm run connect-git');
  });

  /* Exit 2 is the script saying the account has no GitHub connection — not
     that anything broke. Until the script started exiting non-zero for it,
     nothing could reach this branch. */
  it('repeats the browser fix when the script exits 2', async () => {
    const ctx = standaloneContext();
    linkedAndPushed();
    confirmAnswer = true;
    execaFailure = Object.assign(new Error('Command failed with exit code 2'), { exitCode: 2 });
    await pushToGithub(ctx, planFor());
    const said = infoLines.join('\n');
    expect(said).toContain('will not redeploy');
    expect(said).toContain('https://vercel.com/account/settings/authentication');
    expect(said).not.toContain('Not connected');
  });

  it('says only that it did not connect for any other failure', async () => {
    linkedAndPushed();
    confirmAnswer = true;
    for (const failure of [
      Object.assign(new Error('Command failed with exit code 1'), { exitCode: 1 }),
      new Error('spawn ENOENT'),
    ]) {
      const ctx = standaloneContext();
      execaFailure = failure;
      await pushToGithub(ctx, planFor());
      const said = infoLines.join('\n');
      expect(said, failure.message).toContain('Not connected');
      expect(said, failure.message).toContain('npm run connect-git');
      expect(said, failure.message).not.toContain('will not redeploy');
      infoLines.length = 0;
    }
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
