import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execa } from 'execa';
import { DEFAULT_APPS_REPO } from '../constants';
import { WizardError } from '../errors';
import { onInterrupt } from '../interrupt';
import { registerSecret } from '../log';

export interface AppsRepoCheckout {
  /** Absolute path of the shallow clone. */
  dir: string;
  /** Full commit SHA the clone is at. */
  sha: string;
  cleanup: () => void;
}

const CLONE_TIMEOUT_MS = 120_000;

/* What a catalog URL may be fetched over. The list is short on purpose: git
   understands more than these, and two of the extras are not transports at all.
   `ext::` hands the rest of the URL to a shell — `git clone "ext::sh -c whoami"`
   runs whoami — and `transport-helper` schemes reach any `git-remote-<name>` on
   PATH. Neither is a thing a catalog is published over, and both turn a URL the
   user was talked into pasting (or a CHATFUEL_APPS_REPO inherited from a shell
   profile) into code execution. `git://` is left out for a different reason:
   it authenticates nobody, and the catalog it carries is a playbook that the
   coding agent then follows — silent tampering, not a broken download. */
const ALLOWED_GIT_SCHEMES = new Set(['https:', 'http:', 'ssh:', 'git+ssh:', 'file:']);
/* `git@github.com:owner/repo.git` — scp syntax, which is not a URL and is what
   an SSH remote normally looks like. Anchored, and with no space anywhere, so
   nothing that merely starts this way smuggles a second argument along. */
const SCP_SHORTHAND = /^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+:[^\s]+$/;
/* A path on this machine. Also not a URL, and the ordinary way to point at a
   catalog you are editing locally. */
const LOCAL_PATH = /^(?:[.~]{0,2}\/|[A-Za-z]:[\\/])/;

/**
 * Whether this location is a directory on this machine rather than something
 * fetched over a network. Asked by the step that confirms a non-default
 * catalog: a path is code the person already has, and no stale environment
 * variable can turn it into somebody else's server.
 */
export const isLocalRepoPath = (repo: string): boolean => LOCAL_PATH.test(repo.trim());

/**
 * Refuse a catalog location that is not one of the three shapes a catalog is
 * actually published in, before git is asked to fetch it. The check is here
 * rather than at the flag because CHATFUEL_APPS_REPO reaches the clone without
 * passing a flag at all.
 *
 * Exported for the tests: the interesting cases are the ones that must be
 * refused, and they cannot be exercised by cloning them.
 */
export function assertFetchableRepo(repo: string): void {
  const refuse = (reason: string) =>
    new WizardError(
      `The apps catalog cannot be fetched from ${repo}: ${reason}`,
      'Give --apps-repo (or CHATFUEL_APPS_REPO) an https:// or ssh:// URL, a git@host:owner/repo remote, or a path on this machine.',
    );
  const value = repo.trim();
  if (value === '') throw refuse('it is empty');
  if (SCP_SHORTHAND.test(value) || LOCAL_PATH.test(value)) return;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw refuse('it is neither a URL, an SSH remote, nor a path');
  }
  if (!ALLOWED_GIT_SCHEMES.has(parsed.protocol)) {
    throw refuse(`${parsed.protocol} is not a transport this fetches over`);
  }
}

/* The same list, said to git itself, so that whatever the URL turned out to
   mean — a redirect, a `insteadOf` rewrite in the user's own git config, a
   submodule the catalog carries — cannot land on a transport the check above
   refused. git reads this as colon-separated protocol names. */
const GIT_ALLOW_PROTOCOL = [...ALLOWED_GIT_SCHEMES].map((scheme) => scheme.replace(/:$/, '')).join(':');

/**
 * Auth for a private https catalog, injected through git config in the
 * environment rather than argv — argv is visible to every `ps` on the machine.
 * The global log scrubber already refuses to print anything shaped like a
 * token, but the cleanest secret is one that never enters a printable place.
 */
function tokenEnv(token: string): Record<string, string> {
  const basic = Buffer.from(`x-access-token:${token}`).toString('base64');
  /* Registered with the scrubber as well: git's own failure output is what the
     clone error carries back, and a header it decides to echo would otherwise
     be printed whole. Both forms, because the encoded one is not the one the
     token was typed as. */
  registerSecret(token);
  registerSecret(basic);
  return {
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
    GIT_CONFIG_VALUE_0: `Authorization: Basic ${basic}`,
  };
}

async function gitClone(repo: string, ref: string | undefined, dir: string, extraEnv: Record<string, string>) {
  await execa('git', ['clone', '--depth', '1', '--single-branch', ...(ref ? ['--branch', ref] : []), '--', repo, dir], {
    timeout: CLONE_TIMEOUT_MS,
    // Never hang a non-interactive run on a username prompt; fail instead.
    env: { GIT_TERMINAL_PROMPT: '0', GIT_ALLOW_PROTOCOL, ...extraEnv },
  });
}

/**
 * Shallow-clone the apps catalog into a temp directory. A catalog that needs
 * no credentials is cloned with none. For one that does, ambient git
 * credentials (gh's helper, SSH agent) are the normal path and a GITHUB_TOKEN
 * / GH_TOKEN env var is the fallback for https URLs — CI has tokens where
 * laptops have helpers.
 */
export async function fetchAppsRepo(repo: string, ref?: string): Promise<AppsRepoCheckout> {
  assertFetchableRepo(repo);
  registerRepoCredentials(repo);
  const dir = mkdtempSync(join(tmpdir(), 'chatfuel-apps-'));
  const remove = () => rmSync(dir, { recursive: true, force: true });
  /* This clone outlives the step — run.ts removes it in its `finally`, after
     the scaffold has copied the overlay out of it — so Ctrl+C anywhere in the
     run would otherwise leave a whole repository in tmp. See ../interrupt. */
  const releaseInterrupt = onInterrupt(remove);
  const cleanup = () => {
    releaseInterrupt();
    remove();
  };

  try {
    await gitClone(repo, ref, dir, {});
  } catch (firstError) {
    const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
    const isEnoent = (firstError as NodeJS.ErrnoException).code === 'ENOENT';
    if (isEnoent) {
      cleanup();
      throw new WizardError('git is not installed (or not on PATH)', 'Install git, then re-run.');
    }
    if (!token || !repo.startsWith('https://')) {
      cleanup();
      throw cloneError(repo, ref, firstError);
    }
    try {
      await gitClone(repo, ref, dir, tokenEnv(token));
    } catch (retryError) {
      cleanup();
      throw cloneError(repo, ref, retryError);
    }
  }

  const { stdout: sha } = await execa('git', ['-C', dir, 'rev-parse', 'HEAD']);
  return { dir, sha: sha.trim(), cleanup };
}

/**
 * A catalog URL can carry its own credentials — `https://user:token@host/...`
 * is what `--apps-repo` and CHATFUEL_APPS_REPO accept — and the URL is printed
 * back verbatim the moment a clone fails. Registered before the first clone,
 * the same way contentOrigin registers an origin's, and including the whole
 * `user:pass@` prefix because the scrubber ignores anything under twelve
 * characters.
 */
function registerRepoCredentials(repo: string): void {
  let parsed: URL;
  try {
    parsed = new URL(repo);
  } catch {
    return; // ssh shorthand or a local path: nothing shaped like a credential
  }
  if (parsed.username) registerSecret(parsed.username);
  if (parsed.password) registerSecret(parsed.password);
  if (parsed.username || parsed.password) {
    registerSecret(`${parsed.protocol}//${parsed.username}:${parsed.password}@`);
  }
}

/**
 * What to tell someone whose catalog would not come down.
 *
 * GitHub answers 404 for a repository that is private and one that does not exist
 * alike — deliberately, so a stranger learns nothing from the difference. For a
 * catalog somebody pointed the wizard at, "you may need access" is therefore the
 * right guess. For the official one it is the wrong guess: it sends the reader to
 * authenticate against a repository no credential opens, and they retry the login
 * rather than the thing that would work. So the default catalog gets its own line,
 * and it says the two things that do work — pick modules directly, or bring a
 * catalog of your own.
 *
 * Exported for the tests: the default catalog cannot be failed against without a
 * network, and the advice is the whole of what this decides.
 */
export function catalogFetchHint(repo: string): string {
  if (repo === DEFAULT_APPS_REPO) {
    return (
      'That is the official catalog, and it is not answering — it may not be published yet. ' +
      'Run without --app to choose modules directly, or point --apps-repo (or CHATFUEL_APPS_REPO) ' +
      'at a catalog you have.'
    );
  }
  return (
    'While the catalog is private you need access: sign in with `gh auth login`, or set GITHUB_TOKEN. ' +
    'If you overrode --apps-repo or CHATFUEL_APPS_REPO, check the URL.'
  );
}

function cloneError(repo: string, ref: string | undefined, cause: unknown): WizardError {
  const error = new WizardError(
    `Could not fetch the apps catalog from ${repo}${ref ? ` (ref ${ref})` : ''}`,
    catalogFetchHint(repo),
  );
  error.cause = cause;
  return error;
}
