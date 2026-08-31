import { appendFileSync, chmodSync, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as p from '@clack/prompts';
import { execa } from 'execa';
import type { WizardContext } from '../context';
import { WizardError } from '../errors';
import { registerSecret } from '../log';

export interface EnvEntry {
  name: string;
  value: string;
  /** Declared optional and unresolved — written as a commented `# NAME=` line. */
  commented?: boolean;
}

/** What every reader of a .env agrees is a variable name. */
const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * One variable, one line — and the check that keeps it to one line.
 *
 * The format has no escape: a reader splits on newlines and then on the first
 * `=`, so a value carrying a line break does not produce a broken line, it
 * produces a second variable. The values here are the run's own answers, and
 * some of them come from further away than they look — a workspace title the
 * API returned, a password given on a command line, a manifest default. One of
 * those with `\nADMIN_PASSWORD=` in it would be writing the app's env rather
 * than filling it.
 *
 * There is nowhere to escape it to, so it is refused instead, by name, before
 * the file is written. Manifests are pinned by the content lock and their
 * declarations are shaped by module.schema.json; this is the same rule applied
 * where the line is actually made, for the values no schema covers.
 */
export const envLine = ({ name, value, commented }: EnvEntry): string => {
  if (!ENV_NAME.test(name)) throw new WizardError(`"${name}" is not a usable environment variable name`);
  if (/[\r\n]/.test(value)) {
    throw new WizardError(
      `The value for ${name} contains a line break`,
      'A .env holds one variable per line and has no way to escape one, so a value that spans lines would declare variables of its own. Remove the line break and run this again.',
    );
  }
  return commented ? `# ${name}=` : `${name}=${value}`;
};

/**
 * Whether a file name is one that holds environment values by convention.
 *
 * Asked by the app lock, which will not digest such a file, and by the push
 * gate, which will not let one reach GitHub. One predicate because it is one
 * question: two answers to it means a name one gate counts and the other waves
 * through, and `.envrc` holds credentials exactly like `.env` does.
 *
 * Deliberately the wider rule. A name this matches
 * by accident refuses a push it did not have to, which is loud, named and
 * recoverable in one `git rm --cached`; the other kind of mistake is a token on
 * the internet. The suffixes are the conventional exceptions: a `.example` is
 * the committed, secret-free half of the pair, and the wizard writes one.
 */
const PUBLISHABLE_ENV = /\.(example|sample|template)$/;
export const holdsEnvSecrets = (name: string): boolean => name.startsWith('.env') && !PUBLISHABLE_ENV.test(name);

/** What a declaration looks like, whether it came from a manifest or from below. */
export type EnvDeclaration = { name: string; optional?: boolean; secret?: boolean; default?: string };

/**
 * Env the APP has rather than any one module: what it calls itself, what it
 * looks like, and where it sends somebody who has to go to Chatfuel itself.
 * They belong to no manifest — they are true of the deployment, not of a
 * feature — and could not live in one anyway: a manifest that declares an `app`
 * block is required to have a shell subtree behind it, and these three have no
 * UI of their own. Emitted first, so the file opens with the app's identity.
 *
 * The dashboard URL is the browser-side half of `CHATFUEL_API_BASE`, which is
 * unprefixed and so cannot be read from a bundle. Left unset it is a commented
 * placeholder and the shell falls back to panel.chatfuel.com; it is not
 * defaulted from CHATFUEL_API_BASE, because an API base and the page a person
 * signs in to are only the same host by convention.
 */
const APP_ENV: EnvDeclaration[] = [
  { name: 'VITE_APP_NAME', optional: true },
  { name: 'VITE_APP_LOGO', optional: true },
  { name: 'VITE_CHATFUEL_DASHBOARD_URL', optional: true },
  /* Belongs to no module either: every deployment has a proxy, and this is how
     far the master token behind it reaches. Optional, so a run that answered
     "its own origin only" — the default, and the answer that needs no list —
     leaves a commented placeholder rather than a variable set to nothing. */
  { name: 'ALLOWED_ORIGINS', optional: true },
];

/**
 * The app's own two vars, then the selected modules' declared ones
 * (module.json app.env), then an app preset's extras, in the order the file is
 * written.
 *
 * Exported because the secret gate (github/repo.ts) has to ask the same
 * question this list answers — which names the scaffold puts in a file on
 * purpose. A second, narrower copy of the list is how the brand name came to be
 * read as a credential: VITE_APP_NAME belongs to no manifest, so a gate built
 * from manifests alone had never heard of it.
 *
 * The preset's declarations come LAST on purpose: first-declaration-wins then
 * means an app can add vars of its own but can never redefine CHATFUEL_TOKEN
 * or anything a module declared — that ordering is a security property, not a
 * style choice.
 */
export function declaredEnv(ctx: WizardContext): EnvDeclaration[] {
  return [
    ...APP_ENV,
    ...ctx.answers.modules.flatMap((moduleId) => ctx.registry.manifests.get(moduleId)?.app?.env ?? []),
    ...(ctx.answers.app?.manifest.env ?? []),
  ];
}

/**
 * The declared vars with their values filled in; first declaration wins. Value
 * resolution, in order: a step-resolved value in `ctx.answers.env` (the
 * workspace, brand and auth steps) → the token → the manifest default → ''. An
 * empty OPTIONAL var is emitted commented out so the file documents it without
 * setting it (an empty string is a value to dotenv, and a set-but-empty var
 * reads as "configured").
 */
export function collectEnv(ctx: WizardContext): EnvEntry[] {
  const seen = new Set<string>();
  const lines: EnvEntry[] = [];
  const declared = declaredEnv(ctx);
  for (const env of declared) {
    if (seen.has(env.name)) continue;
    seen.add(env.name);
    let value = '';
    const resolved = ctx.answers.env[env.name];
    if (resolved !== undefined && resolved !== '') value = resolved;
    else if (env.secret && env.name === 'CHATFUEL_TOKEN') value = ctx.answers.token ?? '';
    else if (env.default) value = env.default;
    // Every declared secret, whatever filled it in: the steps mask what they
    // resolve themselves, but a module can declare a secret var of its own and
    // the value then reached the .env writer having passed no step that knew
    // it was one. This is the single place the scaffold turns a declaration
    // into a value, so it is the place that knows.
    if (env.secret && value !== '') registerSecret(value);
    const commented = value === '' && Boolean(env.optional);
    lines.push(commented ? { name: env.name, value, commented: true } : { name: env.name, value });
  }
  return lines;
}

/** Standalone scaffold: write a fresh .env (mode 0600). */
export function writeEnv(ctx: WizardContext, target: string): void {
  const envPath = join(target, '.env');
  const lines = [...collectEnv(ctx).map(envLine), ''];
  writeFileSync(envPath, lines.join('\n'), { mode: 0o600 });
  chmodSync(envPath, 0o600);
}

/**
 * Embed mode: the host may already have a .env — append ONLY the keys it
 * does not define yet, under a marker comment, and warn (never overwrite)
 * when an existing key carries a different value. chmod 0600 only when this
 * call created the file — an existing file's permissions are the host's
 * business.
 */
export function appendEnvMissing(
  envPath: string,
  entries: EnvEntry[],
  options: { dryRun?: boolean } = {},
): { added: string[]; conflicting: string[] } {
  const existed = existsSync(envPath);
  const content = existed ? readFileSync(envPath, 'utf8') : '';
  const present = new Map<string, string>();
  const commentedPresent = new Set<string>();
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (match) present.set(match[1]!, match[2]!.trim());
    // A `# NAME=` placeholder we wrote earlier — do not append it twice.
    const commented = line.match(/^\s*#\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*$/);
    if (commented) commentedPresent.add(commented[1]!);
  }

  const added: string[] = [];
  const conflicting: string[] = [];
  const lines: string[] = [];
  for (const entry of entries) {
    const { name, value, commented } = entry;
    if (present.has(name)) {
      if (!commented && present.get(name) !== value && value !== '') conflicting.push(name);
      continue;
    }
    if (commented && commentedPresent.has(name)) continue;
    lines.push(envLine(entry));
    added.push(name);
  }
  if (options.dryRun) return { added, conflicting };
  if (lines.length > 0) {
    const prefix = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
    appendFileSync(envPath, `${prefix}# Added by chatfuel-wizard\n${lines.join('\n')}\n`);
  }
  tighten(envPath, existed);
  return { added, conflicting };
}

/**
 * 0600 on the file the token now lives in — the host's own `.env` included.
 *
 * The mode used to be set only for a file the wizard created itself, which
 * read as politeness towards a file somebody else owned. But the reason for
 * the mode is not who created the file, it is what is in it now: a live
 * Chatfuel master token, written moments ago by this run. A 0644 `.env` on a
 * shared machine is readable by every local account, and the wizard is the
 * reason there is anything worth reading in it.
 *
 * Narrowing an existing file's mode is said out loud, because it is a change
 * to something the person made and did not ask us to touch.
 */
function tighten(envPath: string, existed: boolean): void {
  if (!existsSync(envPath)) return;
  if (!existed) {
    chmodSync(envPath, 0o600);
    return;
  }
  let mode: number;
  try {
    mode = statSync(envPath).mode & 0o777;
  } catch {
    return;
  }
  if ((mode & 0o077) === 0) return;
  chmodSync(envPath, 0o600);
  p.log.info(`Tightened ${envPath} to 0600 — it now holds a Chatfuel token, and it was readable by other accounts.`);
}

export interface GitignoreGuard {
  /** Whether the token may be written to disk at all. */
  ok: boolean;
  /* Whether the line had to be added. The app lock records it, so an update
     that replaces the file with a newer upstream knows to put it back — the
     one edit here that must survive, since losing it commits the token. */
  appended: boolean;
}

/**
 * The rules that already cover `.env`, in the spellings people actually use.
 *
 * Only ever read to decide whether a line has to be ADDED, so being wide is
 * the safe direction: a pattern this misses costs one duplicate line, and this
 * file can belong to the host project in embed mode. A negation (`!.env`)
 * would undo the rule above it, so a file carrying one is treated as not
 * covered and gets its own line at the end, where the last match wins.
 */
const ENV_IGNORED = /^\s*\/?(?:\*\*\/)?[*.]?\.env\*?\s*$/m;

/**
 * What git says about `.env` here, or nothing when git is not the authority.
 *
 * The text of one `.gitignore` is a guess at the answer; git holds the answer
 * itself, and in embed mode the difference is the whole point. A `.env` that
 * is already TRACKED is not made safe by any line added to any ignore file —
 * git keeps following a file it already follows — and an ignore rule can live
 * in a parent directory, in `.git/info/exclude` or in `core.excludesFile`,
 * none of which the regex below can see.
 *
 * `check-ignore` reports a tracked path as not ignored, which is the same
 * answer this wants for a different reason, and `tracked` is asked separately
 * so the refusal can say which of the two it is.
 */
interface GitVerdict {
  /** git already follows this file: adding an ignore line changes nothing. */
  tracked: boolean;
  /** git would leave it out of a commit. */
  ignored: boolean;
}

/** The exit status, or undefined when git itself never ran. */
async function gitStatus(cwd: string, args: string[]): Promise<number | undefined> {
  try {
    await execa('git', args, { cwd, timeout: 15_000 });
    return 0;
  } catch (err) {
    const code = err && typeof err === 'object' ? (err as { exitCode?: unknown }).exitCode : undefined;
    return typeof code === 'number' ? code : undefined;
  }
}

async function gitVerdict(target: string): Promise<GitVerdict | undefined> {
  if ((await gitStatus(target, ['rev-parse', '--is-inside-work-tree'])) !== 0) return undefined;
  return {
    tracked: (await gitStatus(target, ['ls-files', '--error-unmatch', '--', '.env'])) === 0,
    ignored: (await gitStatus(target, ['check-ignore', '-q', '--', '.env'])) === 0,
  };
}

/** Refuse to persist the token without .env being gitignored. */
export async function gitignoreGuard(ctx: WizardContext, target: string): Promise<GitignoreGuard> {
  const path = join(target, '.gitignore');
  const verdict = await gitVerdict(target);
  if (verdict?.tracked) {
    p.log.warn(`git already tracks ${join(target, '.env')}, so ignoring it now would change nothing:`);
    p.log.warn('the next commit would carry the token. Run  git rm --cached .env  and start again.');
    p.log.warn(`Until then, run the app with:  CHATFUEL_TOKEN=<your token> ${ctx.answers.packageManager} dev`);
    return { ok: false, appended: false };
  }
  if (verdict?.ignored) return { ok: true, appended: false };
  const content = existsSync(path) ? readFileSync(path, 'utf8') : '';
  // The line to add, or nothing at all under --plan, which prints the same
  // sentence instead so the plan says what the run would have written.
  const ignoreEnv = (): void => {
    if (ctx.flags.plan) {
      p.log.info(`--plan: would add .env to ${path}`);
      return;
    }
    appendFileSync(path, '\n.env\n');
  };
  /* Only when git could not be asked: git has already answered "not ignored"
     for every path that reaches this line, and its answer outranks the text. */
  if (verdict === undefined && ENV_IGNORED.test(content) && !/^\s*!\S*\.env\S*\s*$/m.test(content)) {
    return { ok: true, appended: false };
  }
  if (ctx.flags.yes) {
    /* Said rather than done quietly: in embed mode this file is the host
       project's, `--yes` is how a script runs, and an unexplained line in
       somebody's .gitignore is a diff they have to work out later. */
    ignoreEnv();
    if (!ctx.flags.plan) p.log.info(`Added .env to ${path}`);
    return confirmIgnored(ctx, target, verdict);
  }
  const ok = await p.confirm({
    message: 'The scaffold must gitignore .env (it will hold your token). Add it?',
  });
  if (p.isCancel(ok) || !ok) {
    p.log.warn('Refusing to write the token to disk without a .env gitignore.');
    p.log.warn(`Run the app with:  CHATFUEL_TOKEN=<your token> ${ctx.answers.packageManager} dev`);
    return { ok: false, appended: false };
  }
  ignoreEnv();
  return confirmIgnored(ctx, target, verdict);
}

/**
 * The line is written; ask git whether it took.
 *
 * A `!.env` further down, or a rule in a parent that this file cannot override,
 * leaves the token exposed with a success message already printed — so the
 * answer is read back rather than assumed. Under `--plan` nothing was written,
 * so there is nothing to read back.
 */
async function confirmIgnored(
  ctx: WizardContext,
  target: string,
  before: GitVerdict | undefined,
): Promise<GitignoreGuard> {
  if (before === undefined || ctx.flags.plan) return { ok: true, appended: true };
  const after = await gitVerdict(target);
  if (after === undefined || after.ignored) return { ok: true, appended: true };
  p.log.warn(`.env is still not ignored here after the line was added to ${join(target, '.gitignore')}.`);
  p.log.warn('Something else overrides it — a negation (!.env) below, or a rule in a parent directory.');
  p.log.warn(`Refusing to write the token. Run with:  CHATFUEL_TOKEN=<your token> ${ctx.answers.packageManager} dev`);
  return { ok: false, appended: true };
}
