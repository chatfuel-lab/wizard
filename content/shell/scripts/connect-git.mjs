#!/usr/bin/env node
/**
 * Point the Vercel project at this app's GitHub repository, so a push deploys.
 *
 *   npm run connect-git
 *
 * `npm run deploy` stays what it always was: a deploy from this directory that
 * needs no repository at all. This is the other half — once there IS a
 * repository, connecting it means `git push` and `npm run deploy` do the same
 * thing, and the person can stop remembering which.
 *
 * Two things must already be true, and neither is this script's to arrange:
 * the project must be linked (`.vercel/project.json`, written by the deploy),
 * and the remote must exist (`origin`). Both are checked before the CLI is
 * called, because Vercel's own error for either is a menu the person did not
 * expect.
 *
 * Not idempotent by accident: `vercel git connect` on an already-connected
 * project is a no-op that says so, so re-running is safe.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { fail, info, ok, warn } from './deploy/report.mjs';
import { makeRunner, resolveCli } from './deploy/runners.mjs';

/**
 * The push URL of `origin`, or null when there is no repository yet.
 *
 * @param {string} appDir
 * @returns {string | null}
 */
export function originUrl(appDir) {
  const result = spawnSync('git', ['remote', 'get-url', 'origin'], {
    cwd: appDir,
    encoding: 'utf8',
    // No shell, on any platform: git ships as an .exe on Windows too, so the
    // one reason the Vercel CLI needs one does not apply here.
  });
  if (result.status !== 0) return null;
  const url = (result.stdout ?? '').trim();
  return url === '' ? null : url;
}

/**
 * The two halves a repository URL is allowed to be made of.
 *
 * Narrow on purpose. The remote is read out of `.git/config`, so it is the
 * clone author's text, not this app's — and on Windows it goes on to be an
 * argument of a command line. The runner refuses shell syntax by itself, but a
 * value that cannot contain it in the first place is one less thing standing
 * between a cloned repository and a `cmd.exe`. Anything outside these sets is
 * reported as an unreadable remote, which is what it is.
 */
const URL_HOST = /^[A-Za-z0-9.-]+$/;
const URL_PATH = /^[A-Za-z0-9._/-]+$/;

/**
 * Vercel wants a plain repository URL. A remote can carry a username
 * (`https://someone@github.com/...`) or be an SSH remote — both name the same
 * repository, and neither form is what the CLI accepts.
 *
 * @param {string} remote
 * @returns {string | null}
 */
export function repositoryUrl(remote) {
  const ssh = /^git@([^:]+):(.+?)(?:\.git)?$/.exec(remote);
  if (ssh) return plainUrl(ssh[1], ssh[2]);
  const https = /^https?:\/\/(?:[^@/]+@)?([^/]+)\/(.+?)(?:\.git)?$/.exec(remote);
  if (https) return plainUrl(https[1], https[2]);
  return null;
}

/**
 * @param {string | undefined} host
 * @param {string | undefined} path
 * @returns {string | null}
 */
function plainUrl(host, path) {
  if (!host || !path) return null;
  if (!URL_HOST.test(host) || !URL_PATH.test(path)) return null;
  return `https://${host}/${path}`;
}

/**
 * @param {string} [appDir]
 * @returns {Promise<void>}
 */
export async function main(appDir = process.cwd()) {
  console.log('\nConnecting the Vercel project to Git\n');

  if (!existsSync(join(appDir, '.vercel', 'project.json'))) {
    fail('This app is not linked to a Vercel project yet.', 'Deploy it first: npm run deploy');
  }

  const remote = originUrl(appDir);
  if (!remote) {
    fail('This directory has no `origin` remote.', 'Create the repository first: gh repo create --source . --push');
  }

  const url = repositoryUrl(remote);
  if (!url) fail(`Could not read a repository URL out of the remote: ${remote}`);
  info(`Repository: ${url}`);

  const cli = resolveCli();
  if (cli.firstRunNote) info(cli.firstRunNote);
  const run = makeRunner(cli);

  const result = run(['git', 'connect', url, '--yes'], { cwd: appDir });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (result.status === 0) {
    ok('Connected — pushing to the default branch now deploys to production.');
    return;
  }

  // Not a failure of this app: the commonest cause by far is a Vercel account
  // with no GitHub connection at all, which only the person can grant, in a
  // browser. Vercel says so itself, so its output goes first and the two places
  // to fix it follow.
  warn('Vercel would not connect the repository.');
  if (output.trim()) console.log(output.trim());
  warn('Connect GitHub to Vercel, then run this again:');
  warn('  vercel.com → Settings → Authentication → GitHub');
  warn('  or:  vercel.com → this project → Settings → Git');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main(fileURLToPath(new URL('..', import.meta.url)));
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
}
