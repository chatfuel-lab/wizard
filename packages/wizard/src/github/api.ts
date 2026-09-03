import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { execa } from 'execa';
import { onInterrupt } from '../interrupt';
import { registerSecret } from '../log';
import { outboundFetch } from '../net';

/**
 * GitHub without the GitHub CLI: a pasted token, the REST API, and plain git.
 *
 * This is the path for the machine where `gh` is not installed and cannot be —
 * no Homebrew, no winget, no build published for the architecture, or the
 * person simply said no. It needs nothing but git, which they already have
 * because nothing here could push without it.
 *
 * The token is registered with the log scrubber the moment it arrives, and it
 * reaches git through GIT_ASKPASS rather than through an argument or a remote
 * URL: an argument list is world-readable on the machine, and a token written
 * into .git/config outlives this run by years.
 */

const TOKEN_PAGE = 'https://github.com/settings/tokens/new?scopes=repo&description=Chatfuel+wizard';

export interface GithubAccount {
  login: string;
  token: string;
}

interface ApiError {
  message?: string;
  errors?: Array<{ message?: string }>;
}

/** The first sentence GitHub said about a failure, or the status. */
async function apiMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiError;
    const detail = body.errors?.map((e) => e.message).filter(Boolean)[0];
    return [body.message, detail].filter(Boolean).join(' — ') || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

const headers = (token: string): Record<string, string> => ({
  accept: 'application/vnd.github+json',
  authorization: `Bearer ${token}`,
  'x-github-api-version': '2022-11-28',
});

/**
 * Ask for a token and check it before anything depends on it.
 *
 * The scope check is worth the extra call: without `repo`, creating the
 * repository fails several questions later with a 404 that reads like a bug in
 * the wizard. A fine-grained token reports no scopes at all — that header is
 * empty rather than wrong, so an empty one is allowed through and the create
 * call gets to speak for itself.
 */
export async function askForGithubToken(): Promise<GithubAccount | null> {
  p.note(
    [
      'Create a token on this page — the defaults are already set:',
      '',
      `  ${pc.bold(pc.cyan(pc.underline(TOKEN_PAGE)))}`,
      '',
      'It is used once, here, and never written to disk.',
    ].join('\n'),
    'GitHub token',
  );

  const entered = await p.password({
    message: 'Paste your GitHub token:',
    validate: (value) => ((value ?? '').trim().length >= 20 ? undefined : 'That is shorter than any GitHub token'),
  });
  if (p.isCancel(entered)) return null;
  const token = entered.trim();
  registerSecret(token);

  const spinner = p.spinner();
  spinner.start('Checking the token…');
  let response: Response;
  try {
    response = await outboundFetch('https://api.github.com/user', { headers: headers(token) });
  } catch (err) {
    spinner.error('Could not reach the GitHub API');
    p.log.warn(err instanceof Error ? err.message : String(err));
    return null;
  }
  if (!response.ok) {
    spinner.error('GitHub rejected the token');
    p.log.warn(await apiMessage(response));
    return null;
  }

  const scopes = response.headers.get('x-oauth-scopes') ?? '';
  if (scopes.trim() && !scopes.split(',').some((scope) => scope.trim() === 'repo')) {
    spinner.error('That token cannot create repositories');
    p.log.warn(`It is missing the \`repo\` scope. Make one with it at ${TOKEN_PAGE}`);
    return null;
  }

  const body = (await response.json()) as { login?: string };
  if (!body.login) {
    spinner.error('GitHub did not say who that token belongs to');
    return null;
  }
  spinner.stop(`Authenticated as ${body.login}`);
  return { login: body.login, token };
}

/** Create the repository. Returns its https URL, or undefined with the reason said. */
export async function createRepo(
  account: GithubAccount,
  name: string,
  isPrivate: boolean,
  description: string,
): Promise<string | undefined> {
  const spinner = p.spinner();
  spinner.start(`Creating ${account.login}/${name}…`);
  let response: Response;
  try {
    response = await outboundFetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: { ...headers(account.token), 'content-type': 'application/json' },
      body: JSON.stringify({ name, private: isPrivate, description }),
    });
  } catch (err) {
    spinner.error('Could not reach the GitHub API');
    p.log.warn(err instanceof Error ? err.message : String(err));
    return undefined;
  }
  if (!response.ok) {
    spinner.error('GitHub would not create the repository');
    p.log.warn(await apiMessage(response));
    return undefined;
  }
  const body = (await response.json()) as { html_url?: string };
  spinner.stop(`Created ${account.login}/${name}`);
  return body.html_url ?? `https://github.com/${account.login}/${name}`;
}

/**
 * The script git calls when it wants the password.
 *
 * The login goes in the remote URL, so git never asks for a username and this
 * only ever has one answer to give. The token arrives in the child's
 * environment, not in the file — a file is read by whoever can list the temp
 * directory, an environment is not.
 */
function writeAskpass(dir: string): string {
  if (process.platform === 'win32') {
    const path = join(dir, 'askpass.cmd');
    writeFileSync(path, '@echo off\r\necho %CHATFUEL_GIT_TOKEN%\r\n', { mode: 0o700 });
    return path;
  }
  const path = join(dir, 'askpass.sh');
  writeFileSync(path, '#!/bin/sh\nprintf \'%s\\n\' "$CHATFUEL_GIT_TOKEN"\n', { mode: 0o700 });
  chmodSync(path, 0o700);
  return path;
}

/** `https://<login>@github.com/<login>/<name>.git` — a username, not a secret. */
export const remoteUrl = (login: string, name: string): string => `https://${login}@github.com/${login}/${name}.git`;

/**
 * Push the current branch to wherever `origin` already points.
 *
 * The interrupt registration is here because the `finally` below is not
 * enough: this push can run for fifteen minutes with no prompt open, so Ctrl+C
 * reaches a process that does not unwind and the askpass directory is left in
 * tmp. Its contents are safe — the script reads the token out of the
 * environment and the token is not in the file — but litter with a name like
 * `chatfuel-git-*` invites exactly the wrong guess about what is in it.
 */
export async function pushToOrigin(appDir: string, account: GithubAccount): Promise<boolean> {
  const dir = mkdtempSync(join(tmpdir(), 'chatfuel-git-'));
  const clean = (): void => rmSync(dir, { recursive: true, force: true });
  const releaseClean = onInterrupt(clean);

  const spinner = p.spinner();
  spinner.start('Pushing…');
  try {
    await execa('git', ['push', '-u', 'origin', 'HEAD'], {
      cwd: appDir,
      timeout: 15 * 60_000,
      env: {
        GIT_ASKPASS: writeAskpass(dir),
        CHATFUEL_GIT_TOKEN: account.token,
        // Without this, a failed askpass falls through to a terminal prompt
        // that nobody is watching and the push hangs until the timeout.
        GIT_TERMINAL_PROMPT: '0',
      },
    });
    spinner.stop('Pushed');
    return true;
  } catch (err) {
    spinner.error('The push failed');
    p.log.warn(err instanceof Error ? err.message.split('\n').slice(-3).join(' ').slice(0, 300) : String(err));
    return false;
  } finally {
    releaseClean();
    clean();
  }
}

/** Point `origin` at the new repository and push the current branch to it. */
export async function pushWithToken(appDir: string, account: GithubAccount, name: string): Promise<boolean> {
  const url = remoteUrl(account.login, name);
  await execa('git', ['remote', 'remove', 'origin'], { cwd: appDir, reject: false });
  await execa('git', ['remote', 'add', 'origin', url], { cwd: appDir });
  return pushToOrigin(appDir, account);
}
