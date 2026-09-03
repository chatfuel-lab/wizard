import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { execa } from 'execa';
import { stepArt } from '../art';
import { askForGithubToken, createRepo, pushToOrigin, pushWithToken } from '../github/api';
import { ensureGh, ghAccountLogin, ghCreateAndPush, ghIsAuthenticated, ghLogin, ghSetupGit } from '../github/cli';
import { originUrl, prepareLocalRepo } from '../github/repo';
import type { PrepareResult } from '../github/repo';
import { WizardError } from '../errors';
import type { GithubAccount } from '../github/api';
import type { GhCli } from '../github/cli';
import type { WizardContext } from '../context';

/**
 * Everything part one settled: which repository, and what may create it.
 *
 * Exactly one of `cli` and `account` is set — a `gh` that is signed in, or a
 * token the person pasted because there was none.
 */
export interface GithubPlan {
  appDir: string;
  name: string;
  isPrivate: boolean;
  description: string;
  /** Where the repository will be, when the account it goes under is known. */
  url?: string;
  cli?: GhCli;
  account?: GithubAccount;
}

/**
 * What to type when the wizard did not do it.
 *
 * `gh repo create --source .` needs a repository to read; part one runs before
 * the commit, so on every path that gives up here there is not one yet, and
 * advice that assumes otherwise fails on the first word.
 */
const finishByHand = (appDir: string): string =>
  `cd ${appDir} && git init && git add -A && git commit -m "Initial commit" && gh repo create --source . --push`;

/**
 * Part one of putting the app on GitHub: every question, and the sign-in.
 *
 * The deploy step deliberately needs no repository — that invariant is why
 * `npm run deploy` works from a bare directory and always will. This is the
 * separate, later question: the app is built, it may already be live, and the
 * code is still sitting in an un-versioned folder on one laptop.
 *
 * Nothing here reaches GitHub or the working tree. It runs BEFORE the handoff
 * for the terminal's sake — `gh auth login` prints a code and waits for a
 * browser, and after the handoff an agent session may own the terminal — while
 * the commit and the push wait until the handoff has finished writing the app.
 *
 * Never in `--yes` runs and never without a TTY. A repository under somebody's
 * GitHub account, holding the source of an app wired to their bot, is not
 * something a non-interactive flag should be able to cause.
 */
export async function prepareGithub(ctx: WizardContext): Promise<GithubPlan | undefined> {
  const appDir = ctx.answers.appDir;
  // Embed mode has no app of its own — the repository is the host project's.
  if (!appDir || ctx.answers.mode === 'embed') return undefined;
  if (ctx.flags.yes || ctx.flags.dryRun || !process.stdin.isTTY) return undefined;

  p.log.message(stepArt('github'));
  const go = await p.confirm({
    message: 'Put this app on GitHub?',
    initialValue: false,
  });
  if (p.isCancel(go) || !go) {
    p.log.info(`You can do it later:  ${finishByHand(appDir)}`);
    return undefined;
  }

  const entered = await p.text({
    message: 'Name for the repository:',
    placeholder: basename(appDir),
    defaultValue: basename(appDir),
  });
  /* Declining the offer above is an answer and is handled there. This is
     Ctrl+C, and returning from it made the run carry on to the next step —
     the one gesture every terminal agrees means stop. */
  if (p.isCancel(entered)) throw new WizardError('Cancelled.');
  const name = repoName(entered.trim() || basename(appDir));

  const visibility = await p.select({
    message: 'Who can see it?',
    initialValue: 'private',
    options: [
      { value: 'private', label: 'Private', hint: 'only you, until you say otherwise' },
      { value: 'public', label: 'Public', hint: 'anyone can read it' },
    ],
  });
  if (p.isCancel(visibility)) throw new WizardError('Cancelled.');

  const credentials = await resolveCredentials();
  if (!credentials) {
    p.log.warn(`Nothing was pushed. You can do it later:  ${finishByHand(appDir)}`);
    return undefined;
  }

  /* Asked for here, where the sign-in just happened, because the handoff runs
     between this and the push: the instructions file it writes is the agent's
     only account of where the code lives, and a URL discovered after the write
     reaches it never. `githubUrl` is still only set by a push that finished —
     the outro says the code IS pushed, and that has to stay earned. */
  const login = credentials.account?.login ?? (credentials.cli ? await ghAccountLogin(credentials.cli) : null);
  const url = login ? `https://github.com/${login}/${name}` : undefined;
  ctx.answers.githubPlannedUrl = url;

  return {
    appDir,
    name,
    isPrivate: visibility === 'private',
    description: `${ctx.answers.brand?.name ?? 'Chatfuel app'} — built with Chatfuel`,
    url,
    ...credentials,
  };
}

/**
 * Part two: the commit and the push, once the app is finished being written.
 *
 * It has to be here and not beside the questions. The handoff writes the
 * instructions file, the finish-setup checklist and the final lock, and a push
 * made before it produced a repository with none of them in it and a working
 * tree the wizard had dirtied itself — which the first `chatfuel-wizard update`
 * then refused to touch, over files it had written after its own commit.
 *
 * `prepareLocalRepo` is what stages and commits, and the secret scan in front
 * of the commit lives there with it.
 */
export async function pushToGithub(ctx: WizardContext, plan: GithubPlan | undefined): Promise<void> {
  // Nobody was asked, or the answer was no: there is nothing to finish.
  if (!plan) return;
  const { appDir } = plan;

  /* A push that cannot be made is not a run that failed. Everything the wizard
     owed the person is already on disk by now, and the outro below this step is
     where some of it is said out loud for the only time — the generated admin
     password exists nowhere else. Letting the secret scan's WizardError out of
     here would take that with it, over a repository the person can push by
     hand. Said here instead, and the run finishes. */
  let prepared: PrepareResult;
  try {
    prepared = await prepareLocalRepo(ctx, appDir);
  } catch (err) {
    if (!(err instanceof WizardError)) throw err;
    p.log.error(err.message);
    if (err.hint) p.log.info(err.hint);
    p.log.warn(`Nothing was pushed. The app is finished in ${appDir} — put it on GitHub when it is sorted.`);
    return;
  }
  if (prepared === 'unpushed') {
    await finishPush(ctx, plan);
    return;
  }
  if (prepared !== 'ready') return;

  const created = await createAndPush(plan);
  if (!created) {
    p.log.warn(`The commit is made. Finish it later with:  cd ${appDir} && gh repo create --source . --push`);
    return;
  }
  /* A repository that exists but has nothing in it is not a failure to repeat:
     it holds the name, so the advice above would fail on that very name, and
     `origin` already points at it. `githubUrl` stays unset — the outro uses it
     to say the code is pushed, and it is not. (The handoff, which has already
     run by now, works from `githubPlannedUrl` instead and says only that the
     code is in git — which the commit above made true.) */
  if (!created.pushed) {
    p.log.warn(`${created.url} was created, but the push did not go through.`);
    p.log.info(`Everything else is done. Finish it with:  cd ${appDir} && git push -u origin HEAD`);
    return;
  }

  ctx.answers.githubUrl = created.url;
  p.log.success(`Pushed to ${created.url}`);
  await connectVercel(ctx, appDir);
}

/**
 * Finish a push that was interrupted after `origin` was set.
 *
 * The repository on GitHub exists already and holds the name already, so
 * creating it a second time fails on the name and asking for another one would
 * leave two repositories where the person wanted one. Only the push is missing.
 *
 * The name and visibility answered above are not used here for that same
 * reason — the confirm names the repository the push is going to, so which one
 * it is does not have to be guessed at.
 */
async function finishPush(ctx: WizardContext, plan: GithubPlan): Promise<void> {
  const { appDir } = plan;
  const origin = await originUrl(appDir);
  if (!origin) return;

  const go = await p.confirm({ message: `Finish pushing to ${origin}?`, initialValue: true });
  if (p.isCancel(go) || !go) {
    p.log.info(`You can do it later:  cd ${appDir} && git push -u origin HEAD`);
    return;
  }

  if (!(await plainPush(appDir))) {
    // The token part one asked for, when it had to ask for one; a signed-in gh
    // leaves a credential helper behind and `plainPush` has already used it.
    const account = plan.account ?? (await askForGithubToken());
    if (!account || !(await pushToOrigin(appDir, account))) {
      p.log.warn(`Not pushed. Finish it later with:  cd ${appDir} && git push -u origin HEAD`);
      return;
    }
  }

  ctx.answers.githubUrl = webUrl(origin);
  p.log.success(`Pushed to ${ctx.answers.githubUrl}`);
  await connectVercel(ctx, appDir);
}

/**
 * A push with nothing but what the machine already has.
 *
 * Whoever got as far as setting this `origin` may have left a working
 * credential helper behind — gh installs one — and asking for a token before
 * finding that out is a question with an answer already on disk.
 */
async function plainPush(appDir: string): Promise<boolean> {
  const spinner = p.spinner();
  spinner.start('Pushing…');
  try {
    await execa('git', ['push', '-u', 'origin', 'HEAD'], {
      cwd: appDir,
      timeout: 15 * 60_000,
      // No helper on this machine has to fail here and now, rather than under a
      // spinner on a terminal prompt nobody can see.
      env: { GIT_TERMINAL_PROMPT: '0' },
    });
    spinner.stop('Pushed');
    return true;
  } catch {
    spinner.error('That did not go through — trying with a token.');
    return false;
  }
}

/** The remote URL as a page a person can open: no credentials, no `.git`. */
export function webUrl(origin: string): string {
  const ssh = /^[^@]+@([^:]+):(.+?)(?:\.git)?$/.exec(origin);
  if (ssh) return `https://${ssh[1]}/${ssh[2]}`;
  return origin.replace(/^(https?:\/\/)[^@/]+@/, '$1').replace(/\.git$/, '');
}

/**
 * GitHub accepts letters, digits, dot, dash and underscore, and silently
 * rewrites everything else — so the name the person is told about would not be
 * the name they got. Rewrite it here, where it can be seen.
 */
export function repoName(raw: string): string {
  const cleaned = raw
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[-.]+/, '')
    .replace(/[-.]+$/, '');
  return cleaned || 'chatfuel-app';
}

/**
 * gh when there is one, a pasted token when there is not.
 *
 * Everything in here talks to a browser or to the person, and nothing in here
 * talks to the repository — which is what lets it run before the handoff while
 * the writing waits until after it.
 *
 * The token fallback is for the absence of a working gh, not for a gh that
 * tried and failed: a name already taken fails identically on both paths, and
 * asking for a token after that is two questions to reach the same error.
 */
async function resolveCredentials(): Promise<Pick<GithubPlan, 'cli' | 'account'> | undefined> {
  const cli = await ensureGh();
  if (cli) {
    let authenticated = await ghIsAuthenticated(cli);
    if (!authenticated) {
      authenticated = await ghLogin(cli);
      // Only after a sign-in that happened here. A gh that was ALREADY signed
      // in belongs to a machine somebody has set up the way they want it, and
      // rewriting their global git config on the way past is not our business.
      if (authenticated) await ghSetupGit(cli);
    }
    if (authenticated) return { cli };
    p.log.warn('gh is not signed in — using a token instead.');
  }

  const account = await askForGithubToken();
  return account ? { account } : undefined;
}

/** Create the repository and push it, with whatever part one signed in as. */
async function createAndPush(plan: GithubPlan): Promise<{ url: string; pushed: boolean } | undefined> {
  const { appDir, name, isPrivate, description } = plan;
  if (plan.cli) {
    const url = await ghCreateAndPush(plan.cli, appDir, name, isPrivate, description);
    return url ? { url, pushed: true } : undefined;
  }
  const account = plan.account;
  if (!account) return undefined;
  const url = await createRepo(account, name, isPrivate, description);
  if (!url) return undefined;
  return { url, pushed: await pushWithToken(appDir, account, name) };
}

/**
 * Offer to make `git push` the deploy command.
 *
 * Only when the deploy step already linked a Vercel project — without one there
 * is nothing to connect the repository TO, and `vercel git connect` would ask
 * the person to pick a project they have not made yet.
 *
 * The work is in the app (`scripts/connect-git.mjs`), not here, for the reason
 * the deploy step gives: the same command has to keep working a month from now,
 * when the wizard is long gone.
 */
async function connectVercel(ctx: WizardContext, appDir: string): Promise<void> {
  if (!existsSync(join(appDir, '.vercel', 'project.json'))) return;

  const go = await p.confirm({
    message: 'Redeploy to Vercel on every push to GitHub?',
    initialValue: true,
  });
  if (p.isCancel(go) || !go) return;

  const pm = ctx.answers.packageManager;
  console.log(pc.dim(`\n  ${pm} run connect-git\n`));
  try {
    await execa(pm, ['run', 'connect-git'], { cwd: appDir, stdio: 'inherit', timeout: 10 * 60_000 });
  } catch {
    p.log.warn(`Not connected — the output above says why. Re-run it with: ${pm} run connect-git`);
  }
}
