import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { execa } from 'execa';
import pc from 'picocolors';
import { createContentSource, packagedFile } from '../content';
import { CODEGEN_AFTER_UPDATE, CODEGEN_COMMAND, isCodegenInput, moduleOfCodegenInput } from '../codegen';
import { cacheRoot, materialise } from '../contentStore';
import { FULL_SHA, isInsideTree, REPO_NAME } from '../contentOrigin';
import { lockForRun } from '../contentRef';
import { digestOf } from '../lockFormat';
import { resolveFromUserCwd } from '../cwd';
import { WizardError } from '../errors';
import { insideProblem } from '../insidePath';
import { onInterrupt } from '../interrupt';
import { releaseNotes } from '../releaseNotes';
import { APP_LOCK_REL, appLockPath, writeAppLock } from '../scaffold/appLock';
import type { AppFileEntry, AppLock } from '../scaffold/appLock';
import type { ContentLock } from '../contentLock';

/**
 * `chatfuel-wizard update` — bring an app the wizard generated up to the
 * content a newer wizard is pinned to, without taking the person's work with it.
 *
 * Two inputs and no guesswork: `.chatfuel/lock.json`, which says what every file
 * in the app was made of, and the content lock of the version being updated to.
 * Each file lands in exactly one of three states, and the state is decided by
 * digests rather than by timestamps, heuristics or a diff:
 *
 *   upstream unchanged                       → skip
 *   upstream changed, on disk still ours     → overwrite
 *   upstream changed, on disk theirs         → leave alone, report as conflict
 *
 * A file the wizard rewrote on the way in (a marked block, a prune, a rename)
 * is never blind-overwritten even when nobody touched it: the upstream bytes
 * alone would drop the edit that makes the app run. It goes to the conflicts,
 * where the `chatfuel-update` skill re-applies the transform the lock names.
 *
 * What this command deliberately does not do: add files the newer content has
 * and the app has never had. The lock maps the app's files to their origins,
 * not the trees they were copied from, so an added upstream file has no place
 * to land that this command could work out on its own. It is the skill's job,
 * with the release notes in hand.
 */
export type SkipReason = 'unchanged' | 'generated' | 'no upstream' | 'gone upstream';
export type ConflictReason = 'edited here' | 'wizard rewrote it' | 'deleted here';

export interface UpdateItem {
  /** Path inside the app. */
  at: string;
  /** Path in the content repository the new bytes come from. */
  from: string;
}

export interface ConflictItem extends UpdateItem {
  why: ConflictReason;
  /** The transforms the wizard applied, for whoever re-applies them. */
  rewritten?: string[];
  /**
   * Where the upstream copy was put, so it can be read beside the file in the
   * app. Filled in JSON mode only: nothing but the skill has a use for it, and
   * fetching a file the run is not going to write is a cost the plain listing
   * should not pay.
   */
  theirs?: string;
}

export interface SkipItem {
  at: string;
  why: SkipReason;
}

/**
 * What an update owes the generated client.
 *
 * `update` refreshes the schema and the operation documents, and it cannot
 * refresh what is generated from them: the toolchain is not installed in most
 * apps, and running it would be a build the person did not ask for. So the
 * files it did change are named — a count would be nothing anybody could act
 * on — together with the command that closes the gap and the skills that
 * explain the documents it opened.
 */
export interface CodegenNotice {
  /** The inputs this update moved, by their path in the app. */
  inputs: string[];
  /** The installed skills that document them. */
  skills: string[];
  /** How this app regenerates — `null` in embed mode, which ships no generator. */
  command: string | null;
  /** The sequence, in the words the other documents use for it. */
  steps: string[];
}

export interface UpdatePlan {
  update: UpdateItem[];
  conflicts: ConflictItem[];
  skipped: SkipItem[];
  /** Present only when this update touched something the client is generated from. */
  codegen: CodegenNotice | null;
}

/**
 * The app's own lock, checked before anything is decided with it.
 *
 * An app scaffolded from a repo checkout carries no `commit`, on purpose: the
 * sha it was built from means nothing on anybody else's machine. There is
 * nothing to update such an app to, and saying so is better than fetching
 * against a pin that will 404.
 */
export function readAppLock(root: string): AppLock {
  const path = appLockPath(root);
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch (err) {
    throw new WizardError(
      `${root} has no ${APP_LOCK_REL}`,
      'Run this inside an app the wizard created — the lock is what says what the app was made of.',
      err,
    );
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    throw new WizardError(
      `${path} is not valid JSON`,
      'Restore it from git — the wizard wrote it at scaffold time.',
      err,
    );
  }
  const lock = raw as Partial<AppLock>;
  const bad = (what: string, hint: string): never => {
    throw new WizardError(`${path} ${what}`, hint);
  };

  if (!lock.files || typeof lock.files !== 'object' || Array.isArray(lock.files)) {
    bad('lists no files', 'Restore it from git — the wizard wrote it at scaffold time.');
  }
  if (typeof lock.repo !== 'string' || !REPO_NAME.test(lock.repo) || typeof lock.commit !== 'string') {
    bad(
      'names no content repository and commit',
      'This app was scaffolded from a repo checkout, which pins nothing the rest of the world can resolve. There is nothing to update it to.',
    );
  }
  if (!FULL_SHA.test(lock.commit!)) {
    bad(`does not name a full commit sha (${lock.commit!})`, 'A 40-character sha is the only pin that resolves.');
  }
  for (const [at, entry] of Object.entries(lock.files!)) {
    /* Every key here becomes a destination: `join(root, at)`, a mkdir of its
       parent, and a write of bytes fetched from upstream. The bytes are pinned
       and checked, but nothing else says where they land — so a lock that came
       with a cloned repository could name a path outside the app entirely.
       The digests are not a second lock on this: matching one only takes
       knowing what the target already holds. */
    if (!isInsideTree(at)) {
      bad(
        `names a file outside the app (${at})`,
        'A lock only describes files inside the app it belongs to. Restore it from git.',
      );
    }
    /* `.git` is lexically inside the app and is still not the app. The wizard
       has never written a file there, so a lock naming one describes something
       it did not do - and the entry an update would honour first is a hook,
       which git runs. Case-insensitively, for the reason appOverlay.ts spells
       out: macOS and Windows write `.GIT/hooks/pre-commit` into the directory
       git reads. */
    const lower = at.toLowerCase();
    if (lower === '.git' || lower.startsWith('.git/')) {
      bad(`names a file inside .git (${at})`, 'The wizard writes nothing into .git. Restore the lock from git.');
    }
    /* The keys were checked above because they become paths. The values are
       checked here because they become everything else: `from` a lookup into
       the content lock, `sha256` the answer to "did anybody edit this", and
       `rewritten` a line of the report a person reads to decide what to merge.
       An entry that is not an object at all reaches all three as `undefined`
       and reads as a file with no upstream — a silent skip where a wrong lock
       should be a refusal. */
    const value = entry as Partial<AppFileEntry> | null;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      bad(`describes ${at} with something that is not an entry`, 'Restore the lock from git.');
    }
    for (const field of ['from', 'sha256', 'upstream'] as const) {
      if (value![field] !== undefined && typeof value![field] !== 'string') {
        bad(`gives ${at} a ${field} that is not a string`, 'Restore the lock from git.');
      }
    }
    const rewritten = value!.rewritten;
    if (rewritten !== undefined && (!Array.isArray(rewritten) || rewritten.some((one) => typeof one !== 'string'))) {
      bad(`gives ${at} a rewritten list that is not a list of names`, 'Restore the lock from git.');
    }
  }
  return lock as AppLock;
}

/**
 * The three states, computed and nothing written.
 *
 * A file is read off the disk only when its upstream actually moved: an update
 * that brings nothing costs no reads, and the common case — a person running
 * this against the version they already have — is free.
 */
export function planUpdate(root: string, app: AppLock, target: ContentLock): UpdatePlan {
  const plan: UpdatePlan = { update: [], conflicts: [], skipped: [], codegen: null };

  for (const [at, entry] of Object.entries(app.files)) {
    /* Generated files have no upstream to compare against — what they hold
       follows from the module set, and the module set only changes when the
       wizard is run again. */
    if (entry.generated) {
      plan.skipped.push({ at, why: 'generated' });
      continue;
    }
    if (!entry.from) {
      plan.skipped.push({ at, why: 'no upstream' });
      continue;
    }
    const now = target.files[entry.from];
    if (now === undefined) {
      plan.skipped.push({ at, why: 'gone upstream' });
      continue;
    }
    /* `sha256` is of the bytes on disk, which for a rewritten file are not the
       upstream's — `upstream` is what the upstream held at the commit this app
       was built from, and the only honest answer to "did it move?". */
    if (now === (entry.upstream ?? entry.sha256)) {
      plan.skipped.push({ at, why: 'unchanged' });
      continue;
    }

    const conflict = (why: ConflictReason): void => {
      plan.conflicts.push({ at, from: entry.from!, why, ...(entry.rewritten ? { rewritten: entry.rewritten } : {}) });
    };
    const path = join(root, at);
    if (!existsSync(path)) {
      conflict('deleted here');
      continue;
    }
    if (digestOf(readFileSync(path)) !== entry.sha256) {
      conflict('edited here');
      continue;
    }
    if (entry.rewritten) {
      conflict('wizard rewrote it');
      continue;
    }
    plan.update.push({ at, from: entry.from });
  }
  plan.codegen = codegenNotice(app, plan);
  return plan;
}

/**
 * The regeneration this update leaves owing, or `null` if it leaves none.
 *
 * Conflicts count as much as clean updates: a document the person edited and
 * upstream also moved is a document whose generated client is behind either
 * way, and the resolution ends in the same command.
 */
function codegenNotice(app: AppLock, plan: UpdatePlan): CodegenNotice | null {
  const inputs = [...plan.update, ...plan.conflicts].map((item) => item.at).filter(isCodegenInput);
  if (inputs.length === 0) return null;

  /* The lock knows which skill a module was installed as; `chatfuel-<id>` is
     the convention it follows, and the fallback for an app whose skills went
     to the home directory under names this lock did not record. */
  const installedAs = new Map<string, string>();
  for (const [name, entry] of Object.entries(app.skills)) {
    if (entry.module) installedAs.set(entry.module, name);
  }
  const skills = new Set<string>();
  for (const at of inputs) {
    const module = moduleOfCodegenInput(at) ?? 'core';
    skills.add(installedAs.get(module) ?? `chatfuel-${module}`);
  }

  const embedded = app.mode === 'embed';
  return {
    inputs: inputs.sort(),
    skills: [...skills].sort(),
    /* An embed host has the documents and the schema but no `codegen.ts`: a
       file importing node:fs into somebody else's src/ is a file their own
       type check has to accept. Regenerating there is theirs to arrange, and
       naming a command this app does not have would be a lie. */
    command: embedded ? null : CODEGEN_COMMAND,
    steps: embedded ? [] : [...CODEGEN_AFTER_UPDATE],
  };
}

/** The lock the app carries once the overwrites have landed. */
export function nextAppLock(app: AppLock, target: ContentLock, plan: UpdatePlan): AppLock {
  const files: Record<string, AppFileEntry> = { ...app.files };
  for (const item of plan.update) {
    /* Only files that were byte copies get here, so what is on disk after the
       overwrite is the upstream file itself: one digest, no `upstream`. */
    const { upstream: _upstream, ...kept } = app.files[item.at]!;
    files[item.at] = { ...kept, sha256: target.files[item.from]! };
  }
  return { ...app, repo: target.repo, commit: target.commit, wizardVersion: target.wizardVersion, files };
}

/**
 * Record that a conflict has been dealt with.
 *
 * Resolving a conflict means the file on disk is now neither what the wizard
 * wrote nor what upstream holds, and the lock still describes the state it was
 * in before. Left that way, every future update reports the same conflict
 * again — the person's merge would be work the tool never learns about. So the
 * skill says which files it settled, and the lock takes both digests from what
 * is actually there now.
 *
 * A file settled by staying deleted leaves the lock entirely: there is nothing
 * left to compare, and an entry for a file nobody has is a question with no
 * answer.
 */
export function markResolved(app: AppLock, target: ContentLock, root: string, paths: string[]): AppLock {
  if (app.commit !== target.commit) {
    throw new WizardError(
      `This app is still pinned to ${app.commit!.slice(0, 12)}, not ${target.commit.slice(0, 12)}`,
      'Run the update itself first — resolving conflicts against a pin the app has not moved to would record the wrong thing.',
    );
  }
  /* Only a file the update is actually holding back may be settled. Any other
     path in the lock is either already current or was never the wizard's to
     replace, and taking a fresh digest of one would record whatever is on disk
     as the bytes the wizard put there — quietly adopting an edit nobody was
     asked about. Conflicts stay conflicts until they are recorded here, so
     re-planning is the same list the run that reported them printed. */
  const conflicts = new Set(planUpdate(root, app, target).conflicts.map((item) => item.at));

  const files: Record<string, AppFileEntry> = { ...app.files };
  const asked = paths.map((path) => path.split(sep).join('/').replace(/^\.\//, ''));

  /* Every path is judged before any is recorded, and one bad path refuses the
     whole call. The caller settles several conflicts in one command, and the
     merges are already on disk by the time it runs: refusing the first bad path
     and stopping would leave the other files merged and unrecorded, which is
     the state this command exists to get out of. So it says all of what is
     wrong at once, and the caller can re-send the rest unchanged. */
  const refusals: string[] = [];
  for (const at of asked) {
    const entry = files[at];
    if (!entry) {
      refusals.push(`${at} is not in ${APP_LOCK_REL}`);
    } else if (!entry.from) {
      refusals.push(`${at} has no upstream, so it was never a conflict`);
    } else if (target.files[entry.from] === undefined) {
      refusals.push(`${entry.from} is gone from the content at ${target.commit.slice(0, 12)}`);
    } else if (!conflicts.has(at)) {
      refusals.push(`${at} is not one of the conflicts`);
    }
  }
  const hint = 'Run the update first — it prints the files it could not take, and those are the ones to resolve.';
  if (refusals.length === 1) throw new WizardError(refusals[0]!, hint);
  if (refusals.length > 0) {
    const listed = refusals.map((line) => `  ${line}`).join('\n');
    throw new WizardError(
      `${refusals.length} of the ${asked.length} files cannot be resolved, so none of them were recorded`,
      `${hint} Re-send the rest without these:\n${listed}`,
    );
  }

  for (const at of asked) {
    const entry = files[at]!;
    const now = target.files[entry.from!]!;
    const path = join(root, at);
    if (!existsSync(path)) {
      delete files[at];
      continue;
    }
    const sha256 = digestOf(readFileSync(path));
    const { upstream: _was, ...kept } = entry;
    files[at] = sha256 === now ? { ...kept, sha256 } : { ...kept, sha256, upstream: now };
  }
  return { ...app, files };
}

interface GitResult {
  ok: boolean;
  stdout: string;
}

async function git(cwd: string, args: string[]): Promise<GitResult> {
  try {
    const { stdout } = await execa('git', args, { cwd, timeout: 60_000 });
    return { ok: true, stdout: stdout.trim() };
  } catch {
    return { ok: false, stdout: '' };
  }
}

/**
 * Refuse to write into a tree the person cannot roll back.
 *
 * An update is a pile of overwrites, and `git checkout .` is the undo button
 * for all of them at once — but only while there is nothing else uncommitted
 * to lose. Without this, the update's writes mix with the person's unsaved
 * work and neither can be taken back on its own.
 */
async function assertUndoable(root: string): Promise<void> {
  const inside = await git(root, ['rev-parse', '--is-inside-work-tree']);
  if (!inside.ok || inside.stdout !== 'true') {
    throw new WizardError(
      `${root} is not inside a git repository`,
      'Commit the app first (git init && git add -A && git commit -m "before update") — an update you cannot undo is not one to run.',
    );
  }
  const dirty = await git(root, ['status', '--porcelain']);
  if (!dirty.ok) {
    throw new WizardError(`Could not read git status in ${root}`, 'Fix the repository, then run the update again.');
  }
  if (dirty.stdout) {
    throw new WizardError(
      'The working tree has uncommitted changes, so the update was not started',
      `Commit or stash them first — then \`git checkout .\` can undo the whole update at once.\n${dirty.stdout}`,
    );
  }
}

const REASON_ORDER: SkipReason[] = ['unchanged', 'generated', 'no upstream'];

function print(plan: UpdatePlan, app: AppLock, target: ContentLock, dryRun: boolean): void {
  const verb = dryRun ? 'would update' : 'updated';
  console.log('');
  console.log(
    `  ${pc.bold('chatfuel-wizard update')} ${pc.dim(`${app.commit!.slice(0, 12)} → ${target.commit.slice(0, 12)}`)}` +
      (dryRun ? pc.dim('  (dry run — nothing was written)') : ''),
  );
  console.log('');

  console.log(`  ${pc.green(`${verb} (${plan.update.length})`)}`);
  for (const item of plan.update) console.log(`    ${item.at}`);

  console.log(`  ${pc.yellow(`conflicts (${plan.conflicts.length})`)}`);
  for (const item of plan.conflicts) {
    const how = item.rewritten ? `${item.why}: ${item.rewritten.join(', ')}` : item.why;
    console.log(`    ${item.at} ${pc.dim(`— ${how}`)}`);
  }

  /* Every other skip reason is a file that is fine and will stay fine, so a
     count is the whole story. This one is not: upstream no longer has the file
     the app was built from, which is what a rename looks like from here, and
     the app will keep the version it has for good. Nothing downstream can act
     on `gone upstream 14`, so it is named rather than counted. */
  const gone = plan.skipped.filter((item) => item.why === 'gone upstream');
  if (gone.length > 0) {
    console.log(`  ${pc.yellow(`gone upstream (${gone.length})`)}`);
    for (const item of gone) console.log(`    ${item.at}`);
  }

  /* Named, not counted, and for the same reason `gone upstream` is: this is
     the one part of the app the update deliberately left behind. The client
     under src/vendor/api/generated/ is now older than the documents beside it,
     and nothing but the person reading this can close that. */
  if (plan.codegen) {
    console.log(`  ${pc.yellow(`regenerate the client (${plan.codegen.inputs.length})`)}`);
    for (const at of plan.codegen.inputs) console.log(`    ${at}`);
  }

  const counts = REASON_ORDER.map((why) => [why, plan.skipped.filter((item) => item.why === why).length] as const)
    .filter(([, count]) => count > 0)
    .map(([why, count]) => `${why} ${count}`);
  console.log(
    `  ${pc.dim(`skipped (${plan.skipped.length})`)}${counts.length > 0 ? pc.dim(`  ${counts.join(', ')}`) : ''}`,
  );
  console.log('');

  if (plan.conflicts.length > 0) {
    console.log(
      pc.dim(
        '  The conflicts hold your edits and were not touched. The chatfuel-update skill resolves them one by one.',
      ),
    );
    console.log('');
  }

  if (plan.codegen) {
    const { command, steps, skills } = plan.codegen;
    if (command === null) {
      console.log(pc.dim('  The schema and the documents moved; the client generated from them did not.'));
      console.log(pc.dim('  This app is embedded in yours and ships no generator — regeneration is yours to run.'));
    } else {
      console.log('  The client generated from those was not touched. To bring it with them:');
      console.log('');
      for (const [index, step] of steps.entries()) console.log(`    ${index + 1}. ${step}`);
    }
    console.log('');
    console.log(pc.dim(`  What changed is documented by: ${skills.join(', ')}.`));
    console.log('');
  }
}

export interface UpdateOptions {
  /** The app directory. Defaults to where the person is standing. */
  dir?: string;
  dryRun?: boolean;
  /** Print the plan as JSON instead of text — what the skill reads. */
  json?: boolean;
  /** The content this wizard is pinned to. Defaults to the running package's. */
  target?: ContentLock;
  /** The changelog to cut the notes out of. Defaults to the shipped one. */
  changelog?: string;
  /** Conflicting files the caller has settled — see markResolved. */
  resolved?: string[];
  env?: NodeJS.ProcessEnv;
}

/**
 * The changelog of the wizard being updated to, which is this one — it ships in
 * the package rather than being fetched, so the notes are available even when
 * the origin is not.
 */
function changelogOfThisWizard(): string | null {
  const path = packagedFile('CHANGELOG.md');
  if (!path) return null;
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

/**
 * The command. Returns the exit code — conflicts are a normal outcome and not
 * a failure: they are the files the skill is about to work through.
 */
export async function update(options: UpdateOptions = {}): Promise<number> {
  const root = resolveFromUserCwd(options.dir ?? '.');
  const app = readAppLock(root);
  const target = options.target ?? (await contentLockOfThisWizard(options.env));

  if (app.repo !== target.repo) {
    throw new WizardError(
      `This app was built from ${app.repo}, and this wizard carries content from ${target.repo}`,
      'Update it with a wizard published from the repository it came from.',
    );
  }

  if (options.resolved && options.resolved.length > 0) {
    /* No clean-tree check on this path, unlike the update itself: the tree is
       dirty by construction here — it holds the merge the caller has just
       done — and the only thing written is the lock. Which is exactly what
       `--dry-run` says will not happen, so the two together compute the new
       lock, print what it would settle, and drop it: every refusal
       markResolved makes is still made, and nothing is recorded. */
    const resolvedLock = markResolved(app, target, root, options.resolved);
    if (!options.dryRun) writeAppLock(root, resolvedLock);
    console.log('');
    console.log(
      `  ${pc.green(`resolved (${options.resolved.length})`)}${options.dryRun ? pc.dim('  (dry run — nothing was written)') : ''}`,
    );
    for (const at of options.resolved) console.log(`    ${at}`);
    console.log('');
    return 0;
  }

  const plan = planUpdate(root, app, target);
  /* The pin moves even when every file was already current: it is what makes
     the next update ask about the right range. An app already on the target
     commit with nothing to copy is the one case where this writes nothing at
     all — which is what makes a second run in a row a no-op rather than a
     refusal over the first run's own uncommitted changes. */
  const writes = !options.dryRun && (plan.update.length > 0 || app.commit !== target.commit);
  if (writes) {
    await assertUndoable(root);
    const cache = cacheRoot(target.commit, options.env);
    await materialise({
      lock: target,
      root: cache,
      paths: [...new Set(plan.update.map((item) => item.from))],
      env: options.env,
    });
    /* Copies and the lock are one change in two files, and a copy that throws
       halfway used to leave the lock describing bytes that are no longer on
       disk - every file already written would read to the next run as an edit
       the person made, and become a conflict for good. The lock records what
       was actually copied, whether or not the loop ran out. */
    const done: typeof plan.update = [];
    let failure: unknown;
    /* The `catch` below cannot see a signal. Ctrl+C between two `copyFileSync`
       calls ends the process with no `catch` and no `finally`, and the lock
       still describes the commit the app was on — so every file the loop had
       already written reads to the next run as an edit the person made, and
       becomes a conflict that nothing resolves. Same repair, reached from the
       signal handler instead: record what was actually copied. Released once
       the lock below has been written, because after that the registration
       would only rewrite what is already correct. */
    const releaseLock = onInterrupt(() => {
      writeAppLock(root, nextAppLock(app, target, { ...plan, update: done }));
    });
    try {
      for (const item of plan.update) {
        const to = join(root, item.at);
        mkdirSync(dirname(to), { recursive: true });
        /* `isInsideTree` reads the lock's paths, which is a question about
           text. `insideProblem` is the question about the disk: a directory on
           the way to the destination can be a symlink, and then a path that is
           lexically inside the app resolves somewhere else entirely -
           `copyFileSync` follows it and writes there. Re-asked per file,
           because the mkdir above is what creates the parent whose identity is
           in question. */
        if (insideProblem(root, to)) {
          throw new WizardError(
            `${item.at} does not resolve to a file inside the app`,
            'It is a symlink, or a directory on the way to it is one pointing out of the app. Nothing was written there.',
          );
        }
        copyFileSync(join(cache, item.from), to);
        done.push(item);
      }
    } catch (error) {
      failure = error;
    }
    releaseLock();
    /* Written whether or not the loop finished, and never at the cost of the
       reason it did not: a `finally` that throws replaces the copy error with a
       disk error about the lock, and the copy error is the one that says what
       happened to the app. */
    try {
      writeAppLock(root, nextAppLock(app, target, { ...plan, update: done }));
    } catch (lockError) {
      if (failure === undefined) throw lockError;
      console.error(
        pc.yellow(`Could not write ${APP_LOCK_REL} after the failure below: ${(lockError as Error).message}`),
      );
    }
    if (failure !== undefined) throw failure;
  }

  if (options.json) {
    /* The skill cannot resolve a conflict without both sides of it, and the
       side it does not have is upstream's. Verified against the same digests
       as everything else, and put in the cache rather than in the app.
       This happens under `--dry-run` too, and is the one thing that does: the
       skill's own first command is `update --dry-run --json`, and a plan whose
       conflicts have no upstream side to open is a plan it cannot act on. What
       `--dry-run` promises is that the APP is not touched, and it is not — the
       files land in the wizard's content cache, which is the same place a real
       run would have put them and is not the person's project. */
    const cache = cacheRoot(target.commit, options.env);
    await materialise({
      lock: target,
      root: cache,
      paths: [...new Set(plan.conflicts.map((item) => item.from))],
      env: options.env,
    });
    const changelog = options.changelog ?? changelogOfThisWizard();
    console.log(
      JSON.stringify(
        {
          from: app.commit,
          to: target.commit,
          fromVersion: app.wizardVersion,
          toVersion: target.wizardVersion,
          notes: changelog ? releaseNotes(`${app.wizardVersion}..${target.wizardVersion}`, changelog) : null,
          ...plan,
          conflicts: plan.conflicts.map((item) => ({ ...item, theirs: join(cache, item.from) })),
        },
        null,
        2,
      ),
    );
  } else print(plan, app, target, options.dryRun ?? false);
  return 0;
}

/**
 * Where this update is going.
 *
 * Not where the tarball points. The wizard follows a branch, so an update
 * moves an app to whatever `main` holds now — which is what makes a fix to a
 * module reach existing apps without a publish, and what makes running
 * `@latest` twice in a week do something the second time. The tarball's commit
 * is the floor the resolution is checked against, and the answer when there is
 * no network.
 */
async function contentLockOfThisWizard(env?: NodeJS.ProcessEnv): Promise<ContentLock> {
  const floor = createContentSource().lock;
  if (!floor) {
    throw new WizardError(
      'This wizard is running from a repo checkout, which is pinned to no commit',
      'Run the published one: npx chatfuel-wizard@latest update',
    );
  }
  return (await lockForRun({ floor, env })).lock;
}
