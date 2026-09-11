import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PassThrough } from 'node:stream';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createContext } from '../src/run';
import { deploy, deploymentUrl, missingGithubConnection } from '../src/steps/deploy';
import type { WizardContext } from '../src/context';

/**
 * A deployment is a public URL with somebody's Chatfuel token behind it. The
 * rules worth pinning are therefore the ones about NOT deploying: a --yes run,
 * a --dry-run, a pipe with no terminal and an embed (where the app is the
 * host's, not ours) must never reach the question, let alone the CLI. And
 * declining the question must leave the run exactly as it was.
 *
 * clack's prompts are scripted per test; execa is a fake child, so "did it
 * shell out, and what did it say?" is answerable without a Vercel account.
 */
let confirmAnswer: boolean | symbol = false;
const confirmCalls: string[] = [];
const textCalls: string[] = [];
const selectCalls: string[] = [];
const infoLines: string[] = [];
/** What the scripted `select` answers, in order — the last one repeats. */
let selectAnswers: Array<string | symbol> = ['skip'];

vi.mock('@clack/prompts', () => ({
  confirm: (opts: { message: string }) => {
    confirmCalls.push(opts.message);
    return Promise.resolve(confirmAnswer);
  },
  text: (opts: { message: string; defaultValue?: string }) => {
    textCalls.push(opts.message);
    return Promise.resolve(opts.defaultValue ?? '');
  },
  select: (opts: { message: string }) => {
    selectCalls.push(opts.message);
    return Promise.resolve(selectAnswers[Math.min(selectCalls.length - 1, selectAnswers.length - 1)]);
  },
  isCancel: (value: unknown) => typeof value === 'symbol',
  note: () => undefined,
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

/**
 * One run of the app's deploy script. The step attaches its stream handlers
 * synchronously and awaits the child, so the fake writes on the next tick and
 * settles after — the order a real child would.
 *
 * `undrained` is the other order a real child has: execa rejects carrying its
 * own copy of both streams, and it can do so before the last chunk has reached
 * a handler. Then nothing was teed and everything is on the error.
 */
function fakeRun(script: { stdout?: string; stderr?: string; fails?: boolean; undrained?: boolean }) {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const child = new Promise((resolve, reject) => {
    setTimeout(() => {
      if (script.stdout && !script.undrained) stdout.emit('data', Buffer.from(script.stdout));
      if (script.stderr && !script.undrained) stderr.emit('data', Buffer.from(script.stderr));
      if (script.fails)
        reject(
          Object.assign(new Error('Command failed with exit code 1'), {
            stdout: script.undrained ? (script.stdout ?? '') : '',
            stderr: script.undrained ? (script.stderr ?? '') : '',
          }),
        );
      else resolve(undefined);
    }, 0);
  });
  return Object.assign(child, { stdout, stderr });
}

/** What the next `npm run deploy` does, in order — the last one repeats. */
let runs: Array<Parameters<typeof fakeRun>[0]> = [];
const runCalls: string[] = [];

vi.mock('execa', () => ({
  execa: (bin: string, args: string[]) => {
    runCalls.push([bin, ...args].join(' '));
    const script = runs[Math.min(runCalls.length - 1, runs.length - 1)];
    if (!script) throw new Error('shelled out when it should not have');
    return fakeRun(script);
  },
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
  appDir = mkdtempSync(join(tmpdir(), 'wizard-deploy-'));
  writeFileSync(join(appDir, 'vercel.json'), '{}');
  confirmCalls.length = 0;
  textCalls.length = 0;
  selectCalls.length = 0;
  runCalls.length = 0;
  infoLines.length = 0;
  confirmAnswer = false;
  selectAnswers = ['skip'];
  // Nothing is scripted by default, so a step that shells out when it should
  // not have still says so.
  runs = [];
  // The step refuses without a terminal; every case below is about the OTHER
  // guards, so give it one.
  Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
});

afterEach(() => {
  rmSync(appDir, { recursive: true, force: true });
  Object.defineProperty(process.stdin, 'isTTY', { value: realTty, configurable: true });
});

describe('deploy step', () => {
  it('asks once in a standalone interactive run', async () => {
    await deploy(standaloneContext());
    expect(confirmCalls).toHaveLength(1);
    expect(confirmCalls[0]).toContain('Vercel');
  });

  it('says how to do it later when the answer is no, and changes nothing', async () => {
    const ctx = standaloneContext();
    await deploy(ctx);
    expect(ctx.answers.deployUrl).toBeUndefined();
    expect(infoLines.join(' ')).toContain('npm run deploy');
  });

  it('asks what to call the Vercel project — the directory name is the same for everybody', async () => {
    confirmAnswer = true;
    const ctx = standaloneContext();
    await deploy(ctx);
    expect(textCalls).toHaveLength(1);
    expect(textCalls[0]).toMatch(/Vercel project/);
  });

  it('treats a cancelled prompt as a no', async () => {
    confirmAnswer = Symbol('cancel');
    const ctx = standaloneContext();
    await deploy(ctx);
    expect(ctx.answers.deployUrl).toBeUndefined();
  });

  it('never asks in a --yes run', async () => {
    const ctx = standaloneContext();
    ctx.flags.yes = true;
    confirmAnswer = true;
    await deploy(ctx);
    expect(confirmCalls).toEqual([]);
  });

  it('never asks in a --dry-run', async () => {
    const ctx = standaloneContext();
    ctx.flags.dryRun = true;
    confirmAnswer = true;
    await deploy(ctx);
    expect(confirmCalls).toEqual([]);
  });

  it('never asks without a terminal', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    confirmAnswer = true;
    await deploy(standaloneContext());
    expect(confirmCalls).toEqual([]);
  });

  it('never asks in embed mode — the app being deployed is the host’s', async () => {
    const ctx = standaloneContext();
    ctx.answers.mode = 'embed';
    confirmAnswer = true;
    await deploy(ctx);
    expect(confirmCalls).toEqual([]);
  });

  it('keeps the URL the script printed last', async () => {
    confirmAnswer = true;
    runs = [{ stdout: 'ok Deployed: https://x-hash.vercel.app\n\n  https://provision-test.vercel.app\n' }];
    const ctx = standaloneContext();
    await deploy(ctx);
    expect(ctx.answers.deployUrl).toBe('https://provision-test.vercel.app');
    expect(ctx.answers.deployFailed).toBeUndefined();
  });

  /* What the script actually prints when the auth module is on: the address,
     and then the redirect-allowlist hint built out of it. Read as "the last
     line that looks like a URL", the hint won — so the run remembered
     `https://app.vercel.app/**` as the address of the app. */
  it('is not fooled by the allowlist hint the script prints after the address', async () => {
    confirmAnswer = true;
    runs = [{ stdout: '\n  https://provision-test.vercel.app\n\n    https://provision-test.vercel.app/**\n' }];
    const ctx = standaloneContext();
    await deploy(ctx);
    expect(ctx.answers.deployUrl).toBe('https://provision-test.vercel.app');
  });

  it('says it cannot name the address rather than naming a vercel.link', async () => {
    confirmAnswer = true;
    runs = [{ stdout: 'Deployment failed to build\nhttps://vercel.link/missing-framework\n' }];
    const ctx = standaloneContext();
    await deploy(ctx);
    expect(ctx.answers.deployUrl).toBeUndefined();
    expect(ctx.answers.deployFailed).toBeUndefined();
    expect(infoLines.join('\n')).toContain('printed no address');
  });

  it('offers the deploy again when it stopped, and repeats the reason', async () => {
    confirmAnswer = true;
    // The failure this was written for: the reason is on stderr, hundreds of
    // lines above the question about what to do next.
    runs = [{ stderr: '\n  STOPPED: The Vercel CLI could not be started (npx vercel@latest).\n' }];
    runs[0].fails = true;
    const ctx = standaloneContext();
    await deploy(ctx);
    expect(selectCalls).toHaveLength(1);
    expect(infoLines.join('\n')).toContain('The Vercel CLI could not be started');
  });

  it('re-runs on “try again”, without asking for the project name a second time', async () => {
    confirmAnswer = true;
    selectAnswers = ['retry'];
    runs = [
      { stderr: 'STOPPED: Vercel login did not complete.\n', fails: true },
      { stdout: '\n  https://provision-test.vercel.app\n' },
    ];
    const ctx = standaloneContext();
    await deploy(ctx);
    expect(runCalls).toHaveLength(2);
    expect(textCalls).toHaveLength(1);
    expect(ctx.answers.deployUrl).toBe('https://provision-test.vercel.app');
    expect(ctx.answers.deployFailed).toBeUndefined();
  });

  it('remembers a skipped failure — the closing summary would otherwise suggest it fresh', async () => {
    confirmAnswer = true;
    runs = [{ stderr: 'STOPPED: Vercel login did not complete.\n', fails: true }];
    const ctx = standaloneContext();
    await deploy(ctx);
    expect(ctx.answers.deployFailed).toBe(true);
    expect(ctx.answers.deployUrl).toBeUndefined();
    expect(infoLines.join('\n')).toContain('npm run deploy');
  });

  /* The wizard holds no Vercel credential and is not going to gain one, so the
     only place this can be found out is inside the deploy — and the only way
     back out is the stdout this step already tees. */
  it('remembers an account with no GitHub connection, so the repository step can offer the fix', async () => {
    confirmAnswer = true;
    runs = [
      {
        stdout: [
          '  warn Vercel has no GitHub connection — a push to GitHub will not redeploy this app.',
          '',
          '  https://provision-test.vercel.app',
          '',
        ].join('\n'),
      },
    ];
    const ctx = standaloneContext();
    await deploy(ctx);
    expect(ctx.answers.vercelGitLogin).toBe('missing');
  });

  /* The sentence has no URL in it for exactly this reason, and the guard is
     here because the two readers share one stream: the address of the app must
     survive anything else the script says. */
  it('still reads the address off a deploy that also said the connection is missing', async () => {
    confirmAnswer = true;
    runs = [
      {
        stdout: [
          '  warn Vercel has no GitHub connection — a push to GitHub will not redeploy this app.',
          '',
          '  https://provision-test.vercel.app',
          '',
        ].join('\n'),
      },
    ];
    const ctx = standaloneContext();
    await deploy(ctx);
    expect(ctx.answers.deployUrl).toBe('https://provision-test.vercel.app');
  });

  /* The warning is fixed by doing exactly this: read it, add the connection in
     a browser, pick "Try again". A second run says nothing about the connection
     because there is nothing left to say, and a flag that could only ever be
     set had the repository step going on about it anyway. */
  it('forgets it when the retry that fixed it says nothing', async () => {
    confirmAnswer = true;
    selectAnswers = ['retry'];
    runs = [
      {
        stdout: '  warn Vercel has no GitHub connection — a push to GitHub will not redeploy this app.\n',
        stderr: 'STOPPED: Vercel login did not complete.\n',
        fails: true,
      },
      { stdout: '\n  https://provision-test.vercel.app\n' },
    ];
    const ctx = standaloneContext();
    await deploy(ctx);
    expect(ctx.answers.deployUrl).toBe('https://provision-test.vercel.app');
    expect(ctx.answers.vercelGitLogin).toBeUndefined();
  });

  /* Both sentences read off a failed run live on streams execa can stop
     delivering the moment it rejects — and then its own copy is all there is. */
  it('reads a failed deploy off the error when the streams did not drain', async () => {
    confirmAnswer = true;
    runs = [
      {
        stdout: '  warn Vercel has no GitHub connection — a push to GitHub will not redeploy this app.\n',
        stderr: '\n  STOPPED: Vercel login did not complete.\n',
        fails: true,
        undrained: true,
      },
    ];
    const ctx = standaloneContext();
    await deploy(ctx);
    expect(ctx.answers.vercelGitLogin).toBe('missing');
    expect(infoLines.join('\n')).toContain('Vercel login did not complete');
  });

  it('leaves the field alone when the deploy said nothing about it', async () => {
    confirmAnswer = true;
    runs = [{ stdout: '\n  https://provision-test.vercel.app\n' }];
    const ctx = standaloneContext();
    await deploy(ctx);
    expect(ctx.answers.vercelGitLogin).toBeUndefined();
  });

  /* Each of these returns before the script is ever run, so there is nothing to
     read — and a flag set here would have the repository step asking a question
     about a deploy that never happened. */
  it('never sets it on a path that never deploys', async () => {
    const said = { stdout: '  warn Vercel has no GitHub connection — a push will not redeploy this app.\n' };
    confirmAnswer = true;

    const embed = standaloneContext();
    embed.answers.mode = 'embed';
    runs = [said];
    await deploy(embed);
    expect(embed.answers.vercelGitLogin).toBeUndefined();

    const yes = standaloneContext();
    yes.flags.yes = true;
    runs = [said];
    await deploy(yes);
    expect(yes.answers.vercelGitLogin).toBeUndefined();

    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    const piped = standaloneContext();
    runs = [said];
    await deploy(piped);
    expect(piped.answers.vercelGitLogin).toBeUndefined();
  });

  it('never asks when the scaffold carries no vercel.json', async () => {
    rmSync(join(appDir, 'vercel.json'));
    confirmAnswer = true;
    await deploy(standaloneContext());
    expect(confirmCalls).toEqual([]);
  });
});

/**
 * Which line out of a deploy's output is the app.
 *
 * Everything here is a line the Vercel CLI or the app's own deploy script
 * really prints. The value this picks is remembered as the address of the app,
 * printed in the closing summary, and written into the Supabase redirect
 * allowlist — three places where the wrong one is not merely cosmetic.
 */
describe('deploymentUrl', () => {
  it('takes the last bare deployment address', () => {
    expect(deploymentUrl('https://old-hash.vercel.app\nhttps://new-hash.vercel.app\n')).toBe(
      'https://new-hash.vercel.app',
    );
  });

  it('takes a custom domain too — a project on one is still a deployment', () => {
    expect(deploymentUrl('  https://app.example.com\n')).toBe('https://app.example.com');
  });

  it('rejects the hosts Vercel prints that are not the app', () => {
    expect(deploymentUrl('https://vercel.link/missing-framework')).toBeUndefined();
    expect(deploymentUrl('https://vercel.com/acme/app/settings')).toBeUndefined();
    expect(deploymentUrl('https://vercel.com')).toBeUndefined();
  });

  it('rejects anything with a path, a query or a fragment on it', () => {
    expect(deploymentUrl('https://app.vercel.app/**')).toBeUndefined();
    expect(deploymentUrl('https://app.vercel.app/docs')).toBeUndefined();
    expect(deploymentUrl('https://app.vercel.app?ref=cli')).toBeUndefined();
    expect(deploymentUrl('https://app.vercel.app/')).toBe('https://app.vercel.app');
  });

  it('answers undefined when the output carries no address at all', () => {
    expect(deploymentUrl('Building…\nDone in 12s\n')).toBeUndefined();
    expect(deploymentUrl('')).toBeUndefined();
  });

  it('skips the service hosts and keeps looking for the real one', () => {
    const output = ['  https://provision-test.vercel.app', '', 'https://vercel.link/deployment-protection'].join('\n');
    expect(deploymentUrl(output)).toBe('https://provision-test.vercel.app');
  });
});

const repoRoot = resolve(import.meta.dirname, '..', '..', '..');
/** Where the sentence is defined, where it is printed, and where it is read. */
const CONNECTION_SENTENCE_FILE = 'content/shell/scripts/deploy/gitConnection.mjs';
const CONNECTION_PRINTER_FILE = 'content/shell/scripts/deploy/steps.mjs';
const MATCHER_FILE = 'packages/wizard/src/steps/deploy.ts';

/**
 * The sentence the app's deploy script prints when the Vercel account has no
 * GitHub connection. Pinned outside the harness because it is a contract
 * between two files that are shipped separately: the script can reword the rest
 * of the line, and this must keep matching the part it promised.
 */
describe('missingGithubConnection', () => {
  it('reads the line the deploy script prints', () => {
    expect(
      missingGithubConnection('  warn Vercel has no GitHub connection — a push to GitHub will not redeploy this app.'),
    ).toBe(true);
  });

  it('does not fire on an ordinary deploy', () => {
    expect(missingGithubConnection('ok Deployed: https://app.vercel.app\n  ok Proxy is up\n')).toBe(false);
    expect(missingGithubConnection('')).toBe(false);
  });

  /* The contract itself, read off the other side of it rather than quoted.
     Both halves used to be asserted against their own copy of the sentence, so
     rewording the script left every test green and the wizard silently stopped
     offering the fix — the one failure a pair of pinned strings cannot catch is
     the pair drifting apart. */
  it('matches the sentence the app’s own script exports', async () => {
    const source = join(repoRoot, CONNECTION_SENTENCE_FILE);
    const { NO_GITHUB_CONNECTION } = (await import(pathToFileURL(source).href)) as {
      NO_GITHUB_CONNECTION: string;
    };
    expect(
      missingGithubConnection(NO_GITHUB_CONNECTION),
      `${CONNECTION_SENTENCE_FILE} exports “${NO_GITHUB_CONNECTION}”, which missingGithubConnection in ${MATCHER_FILE} does not match. One of the two was reworded — change the other.`,
    ).toBe(true);

    /* And the line the deploy really prints is built out of that constant
       rather than typed again beside it, which is what makes matching the
       constant enough. */
    const printer = readFileSync(join(repoRoot, CONNECTION_PRINTER_FILE), 'utf8');
    expect(
      printer,
      `${CONNECTION_PRINTER_FILE} no longer builds its warning out of NO_GITHUB_CONNECTION, so nothing ties what it prints to what ${MATCHER_FILE} looks for.`,
    ).toContain('${NO_GITHUB_CONNECTION}');
  });
});
