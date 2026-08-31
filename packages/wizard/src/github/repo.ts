import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as p from '@clack/prompts';
import { execa } from 'execa';
import type { WizardContext } from '../context';
import { WizardError } from '../errors';
import { onInterrupt } from '../interrupt';
import { declaredEnv, holdsEnvSecrets } from '../scaffold/env';

/**
 * The local repository, and the gate in front of it.
 *
 * This is the first step in the whole wizard that would make the app directory
 * public, and that directory holds a live Chatfuel token. `.gitignore` covers
 * it (content/shell/.gitignore) and gitignoreGuard refuses to write the token
 * without that line — but gitignoreGuard can be DECLINED, a person can add a
 * file of their own between then and now, and a wrong answer here is a token on
 * the internet. So nothing is trusted: what is about to be committed is read
 * back out of the index and checked, by name and by content, and a hit stops
 * the step rather than warning about it.
 */

export type PrepareResult = 'ready' | 'stop' | 'has-remote' | 'unpushed';

/** Paths that must never be committed, whatever the ignore rules say. */
export function forbiddenPaths(paths: readonly string[]): string[] {
  return paths.filter((path) => {
    const name = path.split('/').pop() ?? path;
    if (holdsEnvSecrets(name)) return true;
    if (name.endsWith('.pem') || name.startsWith('id_rsa') || name.startsWith('id_ed25519')) return true;
    /* Credential files that are not `.env` and are not keys by extension. Each
       one is a file a developer's own tooling writes into a project directory
       and never expects to leave it: an npm auth token, a git or curl password
       store, a PKCS#12 bundle, AWS keys. `git add -A` stages them like
       anything else, and the content scan cannot see them — it knows only the
       values this run collected. */
    if (/^(?:\.npmrc|\.git-credentials|\.netrc|_netrc|credentials)$/.test(name)) {
      return name !== 'credentials' || `/${path}`.includes('/.aws/');
    }
    if (/\.(?:key|p12|pfx|jks|keystore|ppk)$/i.test(name)) return true;
    return `/${path}`.includes('/.vercel/');
  });
}

/**
 * The values that would be a breach if they were published.
 *
 * Not everything the run knows: the Supabase URL and the anon key are shipped
 * to the browser by design, and the workspace id is not a secret either.
 * Grepping for those would block real pushes over files that are supposed to
 * contain them, and a gate that cries wolf gets switched off.
 *
 * So the declarations decide, and they decide the safe way round: a var is
 * scanned unless the scaffold declares it and says it is NOT secret. A literal
 * list of the credentials the wizard itself holds would cover none of the ones
 * it collects for modules — ADMIN_PASSWORD and PUBLISHING_SECRET live in
 * `answers.env` and both open the deployment. Read from the declarations, a
 * module added tomorrow is covered without anybody remembering to come back
 * here.
 */
export function secretValues(ctx: WizardContext): string[] {
  const published = new Set(declaredEnv(ctx).flatMap((env) => (env.secret ? [] : [env.name])));
  const values = [
    ctx.answers.token,
    ctx.answers.auth?.secretKey,
    /* The most privileged credential of the run - it creates projects, reads
       every API key and patches the auth config - and the one the declarations
       cannot cover, because it is never an app env var. It lives in ctx.secrets
       precisely so no child process sees it, which is also why it has to be
       named here by hand. A .env* file is refused by name above, but a PAT
       pasted into a Makefile or a README is only caught here. */
    ctx.secrets.supabaseToken,
    ...Object.entries(ctx.answers.env)
      .filter(([name]) => !published.has(name))
      .map(([, value]) => value),
  ];
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.length >= 16))];
}

interface GitResult {
  ok: boolean;
  stdout: string;
  /**
   * git's own exit code, when there was one. Undefined means the command never
   * ran (git missing, killed, timed out) — which is a different fact from any
   * status git could report, and the secret scan below depends on the
   * difference.
   */
  exitCode?: number;
}

interface GitOptions {
  timeout?: number;
  env?: NodeJS.ProcessEnv;
  /** Written to git's stdin. Object names go this way rather than as arguments. */
  input?: string;
}

async function git(cwd: string, args: string[], options: GitOptions = {}): Promise<GitResult> {
  try {
    const { stdout } = await execa('git', args, {
      cwd,
      timeout: options.timeout ?? 5 * 60_000,
      env: options.env,
      input: options.input,
    });
    return { ok: true, stdout: stdout.trim(), exitCode: 0 };
  } catch (err) {
    const failure = err && typeof err === 'object' ? (err as { stdout?: unknown; exitCode?: unknown }) : {};
    const stdout = 'stdout' in failure ? String(failure.stdout ?? '') : '';
    const exitCode = typeof failure.exitCode === 'number' ? failure.exitCode : undefined;
    return { ok: false, stdout: stdout.trim(), exitCode };
  }
}

/**
 * The repository root this directory belongs to, or null when it is in none.
 *
 * Both sides are resolved through the filesystem before being compared. git
 * answers with the real path, and the path the wizard was given can be a
 * symlink — /tmp on macOS is one, and so is many a home directory. Comparing
 * the two as written makes a directory look like a SUBDIRECTORY of its own
 * repository, and the step then politely refuses to touch it.
 */
async function repoRoot(appDir: string): Promise<string | null> {
  const result = await git(appDir, ['rev-parse', '--show-toplevel']);
  if (!result.ok || !result.stdout) return null;
  try {
    return realpathSync(result.stdout);
  } catch {
    return result.stdout;
  }
}

/** The app directory as the filesystem knows it, for that same comparison. */
function realPath(appDir: string): string {
  try {
    return realpathSync(appDir);
  } catch {
    return appDir;
  }
}

/**
 * Which staged files contain one of the secrets.
 *
 * The patterns go to git in a file rather than on the command line: an argument
 * list is readable by every process on the machine, and the whole point of this
 * function is that these strings do not get out.
 */
async function filesContainingSecrets(appDir: string, secrets: string[]): Promise<string[]> {
  if (secrets.length === 0) return [];
  const dir = mkdtempSync(join(tmpdir(), 'chatfuel-scan-'));
  const patterns = join(dir, 'patterns');
  /* The one temp file in the wizard that holds the secrets themselves. A Ctrl+C
     while git is grepping does not unwind, so the `finally` below is not enough
     to keep it from outliving the run. See ../interrupt. */
  const releaseClean = onInterrupt(() => rmSync(dir, { recursive: true, force: true }));
  try {
    writeFileSync(patterns, `${secrets.join('\n')}\n`, { mode: 0o600 });
    /* Two exit codes are answers: 0 with the file list, and 1 for "no matches",
       which is the good case. Everything else is git saying it could not look —
       128 for a broken index or an unreadable pattern file, undefined for a git
       that never started — and every one of those comes back with empty stdout,
       which is byte for byte what a clean tree looks like. Reading that as
       "clean" is how a live token gets pushed, so a scan that did not run stops
       the push instead of blessing it. */
    const result = await git(appDir, ['grep', '--cached', '-l', '-F', '-f', patterns]);
    if (result.exitCode !== 0 && result.exitCode !== 1) {
      throw new WizardError(
        'The check that nothing secret is about to be published could not run',
        `\`git grep --cached\` ${result.exitCode === undefined ? 'did not start' : `exited ${result.exitCode}`} in ${appDir}. Nothing was pushed. Make sure git works there (\`git status\`) and run this again.`,
      );
    }
    return result.stdout.split('\n').filter(Boolean);
  } finally {
    releaseClean();
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Every path this repository has ever committed, on any branch.
 *
 * The staged scan answers a question about the working tree, and a push
 * publishes more than that: every commit reachable from every ref goes with it,
 * and a `.env` that was committed in March and deleted in April is still
 * readable in the history of the repository that arrives on GitHub.
 *
 * null is "could not look", kept apart from the empty list the way the staged
 * scan keeps them apart, and for the same reason: an empty answer here reads as
 * a clean history.
 */
async function pathsInHistory(appDir: string): Promise<string[] | null> {
  const any = await git(appDir, ['rev-list', '-n', '1', '--all']);
  if (!any.ok) return null;
  // A repository with no commits has no history to scan, which is not a failure.
  if (!any.stdout) return [];
  const log = await git(appDir, ['log', '--all', '--pretty=format:', '--name-only']);
  if (!log.ok) return null;
  return [
    ...new Set(
      log.stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  ];
}

/*
 * The ceilings on the content scan below, and why each one is where it is.
 *
 * Reading every blob a repository has ever held is the only way to find a
 * credential that was committed INSIDE a file rather than as one — the path
 * scan above sees `.env`, and sees nothing at all in a token pasted into a
 * README that is still there today. On a repository with years of history it is
 * also a way to spend a quarter of an hour and a gigabyte of memory, so the
 * scan is bounded and says when a bound was reached: "scanned N of M" is a
 * different promise from "clean", and whoever is about to make the repository
 * public has to be able to tell the two apart.
 */
const HISTORY_MAX_BLOBS = 20_000;
/** A credential is a short string. A blob past this is a bundle, a lockfile or an image. */
const HISTORY_MAX_BLOB_BYTES = 1024 * 1024;
const HISTORY_MAX_TOTAL_BYTES = 256 * 1024 * 1024;
/** How much of it is held in memory at one time. */
const HISTORY_BATCH_BYTES = 8 * 1024 * 1024;

interface HistoryScan {
  /** The paths, as history knew them, of the blobs that hold one of the secrets. */
  paths: string[];
  /** Blobs actually read, out of the blobs the history holds. */
  read: number;
  blobs: number;
  /** Left unread because it is bigger than one blob may be, and because a ceiling was reached. */
  tooLarge: number;
  pastCeiling: number;
}

const EMPTY_SCAN: HistoryScan = { paths: [], read: 0, blobs: 0, tooLarge: 0, pastCeiling: 0 };

/**
 * Walk one `git cat-file --batch` answer, calling back for every blob that
 * holds a secret.
 *
 * The format is a header line — `<name> <type> <size>` — then exactly `size`
 * bytes and a newline. A name git does not have comes back as `<name> missing`,
 * a line with no body, which is why the header length is checked rather than
 * assumed. The contents are compared as bytes: a credential pasted into a
 * minified bundle or a binary is still the same bytes, and decoding the blob as
 * UTF-8 first would corrupt exactly those.
 */
function blobsHolding(batch: Buffer, secrets: readonly Buffer[], found: (name: string) => void): void {
  let at = 0;
  while (at < batch.length) {
    const newline = batch.indexOf(10, at);
    if (newline === -1) return;
    const header = batch.toString('utf8', at, newline).split(' ');
    at = newline + 1;
    if (header.length < 3) continue; // `<name> missing`, and no body follows it
    const size = Number(header[2]);
    if (!Number.isFinite(size) || size < 0) return;
    const body = batch.subarray(at, at + size);
    at += size + 1;
    if (secrets.some((secret) => body.includes(secret))) found(header[0] ?? '');
  }
}

/**
 * Which committed file contents hold one of this run's secrets.
 *
 * The path scan above answers "was a file of this kind ever committed"; this one
 * answers the question that a deleted `.env` does not exhaust — a token pasted
 * into a Makefile, a README, a test fixture. Both are needed, because neither
 * sees what the other does.
 *
 * The secrets never leave this process: the object names go to git on stdin and
 * the contents come back on stdout, and the comparison happens here. An
 * argument list is readable by every process on the machine.
 *
 * null is "could not look", kept apart from a clean answer for the reason the
 * two scans above keep them apart.
 */
async function historyHoldingSecrets(appDir: string, secrets: string[]): Promise<HistoryScan | null> {
  if (secrets.length === 0) return EMPTY_SCAN;
  const listed = await git(appDir, ['rev-list', '--objects', '--all']);
  if (!listed.ok) return null;
  if (!listed.stdout) return EMPTY_SCAN;

  /* `rev-list --objects` names commits, trees and blobs alike, and the path on
     a line does not say which — a tree carries its directory's. So the names go
     back to git for their types and sizes, and the paths are kept beside them
     for the refusal message. A blob that lived at two paths is reported at the
     first, which is enough to find it. */
  const pathOf = new Map<string, string>();
  for (const line of listed.stdout.split('\n')) {
    const space = line.indexOf(' ');
    if (space === -1) continue; // a commit: a name and nothing else
    const name = line.slice(0, space);
    if (!pathOf.has(name)) pathOf.set(name, line.slice(space + 1));
  }
  if (pathOf.size === 0) return EMPTY_SCAN;

  const checked = await git(appDir, ['cat-file', '--batch-check'], { input: `${[...pathOf.keys()].join('\n')}\n` });
  if (!checked.ok) return null;

  const scan: HistoryScan = { paths: [], read: 0, blobs: 0, tooLarge: 0, pastCeiling: 0 };
  const wanted: string[] = [];
  const sizeOf = new Map<string, number>();
  let budget = 0;
  for (const line of checked.stdout.split('\n')) {
    const [name, type, size] = line.split(' ');
    if (type !== 'blob' || name === undefined) continue;
    scan.blobs += 1;
    const bytes = Number(size);
    if (!Number.isFinite(bytes) || bytes > HISTORY_MAX_BLOB_BYTES) {
      scan.tooLarge += 1;
      continue;
    }
    if (wanted.length >= HISTORY_MAX_BLOBS || budget + bytes > HISTORY_MAX_TOTAL_BYTES) {
      scan.pastCeiling += 1;
      continue;
    }
    wanted.push(name);
    sizeOf.set(name, bytes);
    budget += bytes;
  }

  const secretBytes = secrets.map((secret) => Buffer.from(secret, 'utf8'));
  const hits = new Set<string>();
  let batch: string[] = [];
  let held = 0;
  const flush = async (): Promise<boolean> => {
    if (batch.length === 0) return true;
    let out: Uint8Array;
    try {
      const result = await execa('git', ['cat-file', '--batch'], {
        cwd: appDir,
        input: `${batch.join('\n')}\n`,
        encoding: 'buffer',
        timeout: 5 * 60_000,
      });
      out = result.stdout;
    } catch {
      return false;
    }
    blobsHolding(Buffer.from(out.buffer, out.byteOffset, out.byteLength), secretBytes, (name) => hits.add(name));
    scan.read += batch.length;
    batch = [];
    held = 0;
    return true;
  };

  for (const name of wanted) {
    batch.push(name);
    held += sizeOf.get(name) ?? 0;
    if (held < HISTORY_BATCH_BYTES) continue;
    if (!(await flush())) return null;
  }
  if (!(await flush())) return null;

  scan.paths = [...new Set([...hits].map((name) => pathOf.get(name) ?? name))];
  return scan;
}

/** A commit needs a name and an address, and git says so in a way nobody can act on. */
async function ensureIdentity(appDir: string): Promise<boolean> {
  const name = (await git(appDir, ['config', 'user.name'])).stdout;
  const email = (await git(appDir, ['config', 'user.email'])).stdout;
  if (name && email) return true;

  p.log.info('git has no commit identity configured on this machine yet.');
  const askedName = await p.text({
    message: 'Your name, for the commit:',
    placeholder: name || 'Jane Doe',
    defaultValue: name,
    validate: (value) => (value.trim() ? undefined : 'git will not commit without a name'),
  });
  if (p.isCancel(askedName)) return false;
  const askedEmail = await p.text({
    message: 'Your email, for the commit:',
    placeholder: email || 'jane@example.com',
    defaultValue: email,
    validate: (value) => (value.includes('@') ? undefined : 'git will not commit without an email'),
  });
  if (p.isCancel(askedEmail)) return false;

  // --local: this is the person's answer for THIS app, not a machine-wide
  // setting the wizard had no business changing.
  await git(appDir, ['config', '--local', 'user.name', askedName.trim()]);
  await git(appDir, ['config', '--local', 'user.email', askedEmail.trim()]);
  return true;
}

/**
 * Stage everything, refuse if a secret got staged, then commit.
 *
 * On a refusal the repository this function created is removed again: the
 * person asked for their app on GitHub, not for a half-made git directory they
 * now have to understand before they can retry.
 *
 * In a repository that was already there, `git reset` takes the place of that
 * removal, and it matters most on the branch that refuses over a secret: the
 * staged copy of that very file would otherwise sit in the index, one blind
 * `git commit` away from the publication this function just prevented.
 */
async function stageAndCommit(ctx: WizardContext, appDir: string, createdRepo: boolean): Promise<boolean> {
  const undo = async (): Promise<void> => {
    if (createdRepo) {
      rmSync(join(appDir, '.git'), { recursive: true, force: true });
      return;
    }
    await git(appDir, ['reset']);
  };

  await git(appDir, ['add', '-A']);
  const staged = (await git(appDir, ['ls-files', '--cached'])).stdout.split('\n').filter(Boolean);

  const byName = forbiddenPaths(staged);
  // A scan that could not run throws rather than answering, and the index has
  // to come back out either way — see the header on undo().
  let byContent: string[];
  try {
    byContent = await filesContainingSecrets(appDir, secretValues(ctx));
  } catch (err) {
    await undo();
    throw err;
  }
  const offenders = [...new Set([...byName, ...byContent])];
  if (offenders.length > 0) {
    await undo();
    p.log.error('Stopping: these files would have been published with your credentials in them.');
    for (const path of offenders.slice(0, 10)) p.log.message(`  ${path}`);
    p.log.warn('Add them to .gitignore (or remove the credentials from them) and run the push again.');
    return false;
  }

  if (staged.length === 0) {
    await undo();
    p.log.warn('Nothing to commit — the app directory is empty.');
    return false;
  }

  /* The two scans above look at what is about to be committed. In a repository
     that was already here, that is the smaller half of what the push sends. */
  if (!createdRepo) {
    const history = await pathsInHistory(appDir);
    if (history === null) {
      await undo();
      throw new WizardError(
        "The check that nothing secret is already in this repository's history could not run",
        `\`git log\` failed in ${appDir}. Nothing was pushed. Make sure git works there (\`git status\`) and run this again.`,
      );
    }
    /* Names are half the question. A token pasted into a Makefile is committed
       under a name nothing here would object to, and the staged scan above
       never sees it if the paste was undone since. */
    const inside = await historyHoldingSecrets(appDir, secretValues(ctx));
    if (inside === null) {
      await undo();
      throw new WizardError(
        "The check that nothing secret is already in this repository's history could not run",
        `\`git cat-file\` failed in ${appDir}. Nothing was pushed. Make sure git works there (\`git status\`) and run this again.`,
      );
    }
    /* Said whenever the scan was partial, and said whether or not it found
       anything: a bounded scan that found nothing is not a clean history, and
       the difference is the whole reason for printing a count. */
    if (inside.tooLarge > 0 || inside.pastCeiling > 0) {
      p.log.warn(
        `Read the contents of ${inside.read} of this repository's ${inside.blobs} committed files — ` +
          `${inside.tooLarge} are larger than ${HISTORY_MAX_BLOB_BYTES / 1024} KB and ${inside.pastCeiling} are past the scan's ceiling. ` +
          'A credential inside one of those would not have been noticed.',
      );
    }

    const past = [...new Set([...forbiddenPaths(history), ...inside.paths])];
    if (past.length > 0) {
      p.log.error('This repository has already committed your credentials, or files of the kind that hold them:');
      for (const path of past.slice(0, 10)) p.log.message(`  ${path}`);
      p.log.warn(
        'Deleting them since does not help — the push publishes every commit, and their contents stay readable in the history.',
      );
      /* Unattended, the answer is no. Somebody watching can weigh their own
         history against what it would cost them; a script cannot, and this is
         the direction that is not undoable once the repository is public. */
      const anyway = ctx.flags.yes
        ? false
        : await p.confirm({ message: 'Push this history to GitHub anyway?', initialValue: false });
      if (ctx.flags.yes || p.isCancel(anyway) || !anyway) {
        await undo();
        p.log.warn('Nothing was pushed. Rewrite the history (git filter-repo) or rotate those credentials first.');
        return false;
      }
    }
  }

  if (!(await ensureIdentity(appDir))) {
    await undo();
    return false;
  }

  /* Nothing is staged in an existing repo that had no changes; committing then
     fails, and there is nothing wrong with that. A git that could not answer is
     a different matter: it comes back with the same empty stdout, and reading
     that as "already committed" hands the caller a repository whose new files
     were never recorded, and calls it done. */
  const pending = await git(appDir, ['diff', '--cached', '--name-only']);
  if (!pending.ok) {
    await undo();
    p.log.warn(`git could not tell what is staged in ${appDir} — nothing was committed.`);
    return false;
  }
  if (!pending.stdout) return true;

  const commit = await git(appDir, ['commit', '-m', 'Initial commit: Chatfuel app scaffolded by @chatfuel/wizard']);
  if (!commit.ok) {
    await undo();
    p.log.warn('git could not make the first commit.');
    return false;
  }
  return true;
}

/** Where `origin` points, or undefined when there is no `origin`. */
export async function originUrl(appDir: string): Promise<string | undefined> {
  const origin = await git(appDir, ['remote', 'get-url', 'origin']);
  return origin.ok && origin.stdout ? origin.stdout : undefined;
}

/**
 * What is on the other end of `origin`, as far as it can be established.
 *
 * `unknown` covers every reason the question could not be answered — offline,
 * no credentials, a URL that resolves to nothing — and is deliberately not
 * folded into `empty`: "we could not look" and "we looked and it is empty" lead
 * to opposite actions, and only one of them is safe to guess at.
 */
type RemoteState = 'matches' | 'empty' | 'diverged' | 'unknown';

async function remoteState(appDir: string): Promise<RemoteState> {
  const local = await git(appDir, ['rev-parse', 'HEAD']);
  if (!local.ok || !local.stdout) return 'unknown';

  const remote = await git(appDir, ['ls-remote', 'origin', 'HEAD'], {
    // A network call in a helper that is otherwise all local: five minutes is
    // the wrong ceiling for it, and a private repository with no credentials to
    // hand would ask the terminal for a password and wait there forever.
    timeout: 20_000,
    env: { GIT_TERMINAL_PROMPT: '0' },
  });
  if (!remote.ok) return 'unknown';

  const sha = remote.stdout.split(/\s/)[0] ?? '';
  if (!sha) return 'empty';
  return sha === local.stdout ? 'matches' : 'diverged';
}

/**
 * Get the app directory to the point where there is something to push.
 *
 * `has-remote` is its own answer rather than a failure: a directory that
 * already has an `origin` belongs to a repository somebody set up, and taking
 * it over is not what "put this on GitHub" asked for.
 *
 * An `origin` on its own does not say which repository, though, and the wizard
 * sets `origin` BEFORE the push it can be killed in the middle of. So the three
 * states are separated rather than collapsed: a remote that carries our commit
 * is a finished push, a remote with nothing in it is our own unfinished one and
 * gets offered again, and anything else is somebody's repository and is left
 * exactly as it was.
 */
export async function prepareLocalRepo(ctx: WizardContext, appDir: string): Promise<PrepareResult> {
  const root = await repoRoot(appDir);

  if (root && root !== realPath(appDir)) {
    p.log.warn(`This directory is already inside the git repository at ${root} — leaving it alone.`);
    return 'stop';
  }

  if (root) {
    const origin = await originUrl(appDir);
    if (origin) {
      const state = await remoteState(appDir);
      if (state === 'matches') {
        p.log.info(`Already pushed to ${origin}`);
        return 'has-remote';
      }
      if (state === 'empty') {
        p.log.info(`${origin} exists but has nothing in it — the push never finished.`);
        return (await stageAndCommit(ctx, appDir, false)) ? 'unpushed' : 'stop';
      }
      p.log.info(`This directory already belongs to ${origin} — leaving it alone.`);
      return 'has-remote';
    }
    return (await stageAndCommit(ctx, appDir, false)) ? 'ready' : 'stop';
  }

  const init = await git(appDir, ['init']);
  if (!init.ok) {
    p.log.warn('git init failed — is git installed?');
    return 'stop';
  }
  // `git init -b main` needs git 2.28; setting the unborn HEAD works everywhere
  // and there are no commits yet for it to move.
  await git(appDir, ['symbolic-ref', 'HEAD', 'refs/heads/main']);
  return (await stageAndCommit(ctx, appDir, true)) ? 'ready' : 'stop';
}
