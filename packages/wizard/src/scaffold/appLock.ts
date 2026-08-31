import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import packageJson from '../../package.json';
import { CONTENT_TREE, SCHEMA_FILES, SCHEMA_IN_SKILL } from '../contentLock';
import { isInsideTree } from '../contentOrigin';
import { WizardError } from '../errors';
import { digestOf } from '../lockFormat';
import { holdsEnvSecrets } from './env';
import { WIZARD_SKILLS } from './skills';
import type { WizardContext } from '../context';

/**
 * What the generated app was made of, written into the app itself.
 *
 * `chatfuel-wizard update` reads it to answer the only question that matters
 * when new content lands upstream: for each file, has the person edited it
 * since? A digest of the bytes the scaffold wrote is the whole answer — equal
 * means the file is still ours to replace, different means it is theirs and an
 * update must leave it alone and say so.
 *
 * It records provenance, never values. Nothing from `ctx.answers.env` reaches
 * this file: `.env` is not one of the paths, and no entry carries content —
 * only where a file came from and what its bytes hash to.
 */
export const APP_LOCK_DIR = '.chatfuel';
export const APP_LOCK_REL = `${APP_LOCK_DIR}/lock.json`;
export const appLockPath = (root: string): string => join(root, APP_LOCK_DIR, 'lock.json');

export interface AppFileEntry {
  /** Where the bytes came from, as a path in the content repository. */
  from?: string;
  /** sha256 (base64) of what was written to disk, not of the upstream file. */
  sha256?: string;
  /**
   * sha256 of the upstream file, when the wizard changed the bytes on the way
   * in and the two therefore differ. `sha256` answers "did the person edit
   * this?"; this answers "did upstream move?", and an update needs both.
   */
  upstream?: string;
  /** The producer that wrote it. A generated file has no upstream to compare. */
  generated?: string;
  /** Transforms applied to the copied bytes: marked blocks, prunes, renames. */
  rewritten?: string[];
}

export interface AppSkillEntry {
  /** The module it came with. Absent for a skill that belongs to no module. */
  module?: string;
  from: string;
  /** `app` — inside the app directory, so its files are in `files` too. */
  scope: 'app' | 'home';
  /**
   * False for a directory that was already there and the person kept.
   *
   * The wizard did not write it, so `update` must not replace it — but leaving
   * it out of the lock entirely is worse than saying so: an unrecorded skill is
   * one no future run has ever heard of, and a stale copy then stays stale for
   * the life of the app with nothing anywhere to say why. Absent means the
   * wizard installed it, which is what every entry written before this field
   * existed meant.
   */
  managed?: false;
}

export interface AppLock {
  mode: 'standalone' | 'embed';
  wizardVersion: string;
  /* Present exactly when the wizard ran from a published package, which is the
     only case where there is a commit the rest of the world can resolve. A run
     from a checkout writes neither, and `update` refuses such an app rather
     than fetching against a pin that means nothing outside this machine. */
  repo?: string;
  commit?: string;
  modules: string[];
  skills: Record<string, AppSkillEntry>;
  files: Record<string, AppFileEntry>;
}

/** A directory or a single file the scaffold copied, and where it came from. */
export interface LockTree {
  /** Root-relative path in the app. The empty string is the app root. */
  at: string;
  /** Content-relative path it was copied from. */
  from: string;
}

export interface LockDraft {
  trees: LockTree[];
  entries: Record<string, AppFileEntry>;
  skills: Record<string, AppSkillEntry>;
}

export const newLockDraft = (): LockDraft => ({ trees: [], entries: {}, skills: {} });

const toPosix = (path: string): string => (sep === '/' ? path : path.split(sep).join('/'));

/**
 * Record a copied tree (or file). Later calls may nest inside earlier ones.
 *
 * A tree entry maps directory onto directory: every file under `at` is taken to
 * have come from the same-named file under `from`. That holds only while the
 * copy kept its names. A file that was renamed on the way in — or that came
 * from a tree other than the one it now sits inside — has to be registered on
 * its own, and `buildAppLock` resolves the most specific entry first so the
 * per-file call wins over the directory it lands in.
 */
export function copied(draft: LockDraft, at: string, from: string): void {
  draft.trees.push({ at: toPosix(at), from });
}

/** Record a file the wizard produced rather than copied. */
export function generated(draft: LockDraft, at: string, producer: string): void {
  const key = toPosix(at);
  draft.entries[key] = { ...draft.entries[key], generated: producer };
}

/** Record a transform applied to a copied file, by the name update must re-apply. */
export function rewrote(draft: LockDraft, at: string, ...names: string[]): void {
  const key = toPosix(at);
  const existing = draft.entries[key]?.rewritten ?? [];
  draft.entries[key] = { ...draft.entries[key], rewritten: [...existing, ...names] };
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist']);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* walk(path);
      /* The wizard only ever writes `.env`, but the app is the user's from the
         moment it exists and `.env.local` is where the next person puts a key.
         A digest is not the secret, but it is a record of a file nobody meant
         to describe. */
    } else if (entry.isFile() && !holdsEnvSecrets(entry.name)) {
      yield path;
    }
  }
}

/**
 * The lock for what is on disk right now.
 *
 * Only the declared trees are read, never the whole directory: in embed mode
 * the root is somebody else's project, and a walk of it would put their files
 * in a lock that claims the wizard wrote them.
 *
 * A file inside two trees belongs to the more specific one — the vendored
 * design system is under the app root, and its files came from `content/ui`,
 * not from `content/shell/src/vendor` where nothing lives.
 */
export function buildAppLock(ctx: WizardContext, root: string, draft: LockDraft): AppLock {
  const origins = new Map<string, string>();
  for (const tree of [...draft.trees].sort((a, b) => b.at.length - a.at.length)) {
    const at = join(root, tree.at);
    if (!existsSync(at)) continue;
    const isFile = statSync(at).isFile();
    for (const path of isFile ? [at] : walk(at)) {
      const rel = toPosix(relative(root, path));
      if (rel === APP_LOCK_REL || origins.has(rel)) continue;
      origins.set(rel, isFile ? tree.from : `${tree.from}/${rel.slice(tree.at ? tree.at.length + 1 : 0)}`);
    }
  }

  const files: Record<string, AppFileEntry> = {};
  for (const rel of [...origins.keys()].sort()) {
    const marked = draft.entries[rel];
    /* No digest and no `from`: what a generated file holds follows from the
       module set, so there is nothing upstream to compare it against. Any
       transform recorded for it rides along — `update` skips on `generated`
       before it reads that, but a lock that drops a fact it was told is a lock
       that cannot be trusted with the next one. */
    if (marked?.generated) {
      files[rel] = marked.rewritten
        ? { generated: marked.generated, rewritten: marked.rewritten }
        : { generated: marked.generated };
      continue;
    }
    const from = origins.get(rel)!;
    const entry: AppFileEntry = { sha256: digestOf(readFileSync(join(root, rel))) };
    /* A `from` that names nothing upstream would send `update` to fetch a path
       the origin does not have. Leaving it off says what is true — the wizard
       wrote this file and cannot point at what it came from — and update reads
       that as a file to leave alone. */
    const source = join(ctx.content.root, from);
    if (existsSync(source)) {
      entry.from = from;
      const upstream = digestOf(readFileSync(source));
      if (upstream !== entry.sha256) entry.upstream = upstream;
    }
    if (marked?.rewritten) entry.rewritten = marked.rewritten;
    files[rel] = entry;
  }

  return {
    mode: ctx.answers.mode === 'embed' ? 'embed' : 'standalone',
    wizardVersion: packageJson.version,
    ...(ctx.content.lock ? { repo: ctx.content.lock.repo, commit: ctx.content.lock.commit } : {}),
    modules: [...ctx.answers.modules],
    skills: draft.skills,
    files,
  };
}

/**
 * Record the skills that went into the app itself; a global install has no
 * files here.
 *
 * `kept` are the ones a person declined to replace. They are recorded too, as
 * `managed: false` and with no file entries — the directory is theirs, so there
 * is nothing for `update` to compare or overwrite, but a run that can name it
 * can also tell them it is being skipped.
 */
export function recordSkills(
  ctx: WizardContext,
  draft: LockDraft,
  root: string,
  skillsRoot: string,
  kept: readonly string[] = [],
): void {
  const scope = ctx.answers.skillsTarget === 'global' ? 'home' : 'app';
  const sources: [installAs: string, from: string, module?: string][] = [];
  for (const id of ctx.answers.modules) {
    const manifest = ctx.registry.manifests.get(id);
    if (!manifest) continue;
    sources.push([manifest.skill.installAs, `content/modules/${id}/${manifest.skill.dir ?? 'skill'}`, id]);
  }
  for (const skill of WIZARD_SKILLS) sources.push([skill.name, `content/skills/${skill.name}`]);

  for (const [installAs, from, module] of sources) {
    if (kept.includes(installAs)) {
      draft.skills[installAs] = { ...(module ? { module } : {}), from, scope, managed: false };
      continue;
    }
    if (!ctx.answers.skillsInstalled.includes(installAs)) continue;
    draft.skills[installAs] = { ...(module ? { module } : {}), from, scope };
    if (scope === 'home') continue;
    const at = toPosix(relative(root, join(skillsRoot, installAs)));
    copied(draft, at, from);
    /* Two files inside that directory did not come from it. `buildAppLock`
       resolves the most specific tree first, so naming each file on its own
       is what points `update` at content/schema instead of at a path under
       the core skill that upstream no longer has. */
    if (module === 'core') {
      for (const name of SCHEMA_FILES) {
        copied(draft, `${at}/${SCHEMA_IN_SKILL}/${name}`, `${CONTENT_TREE.schema}/${name}`);
      }
    }
  }
}

/** The skills the lock says are on disk but not the wizard's to touch. */
export function unmanagedSkills(root: string): string[] {
  try {
    const lock = JSON.parse(readFileSync(appLockPath(root), 'utf8')) as AppLock;
    return Object.entries(lock.skills ?? {})
      .filter(([, entry]) => entry.managed === false)
      .map(([name]) => name)
      .sort();
  } catch {
    return [];
  }
}

/**
 * Change the lock of an app that already has one.
 *
 * The scaffold writes the lock and the handoff then keeps writing: the
 * instructions, the finish-setup checklist, and — if the user accepted the
 * other agent at the last prompt — the skills, moved into that agent's
 * directory. Whatever moves after the lock is written has to be said here,
 * because a lock naming a path nothing is at reads to `update` as a file the
 * person deleted, and the file that did move is left out of every update from
 * then on.
 *
 * An app with no lock is not an error: a dry run writes none, and neither does
 * a handoff aimed at a directory the wizard did not scaffold.
 */
export function amendAppLock(root: string, amend: (lock: AppLock) => void): void {
  const path = appLockPath(root);
  if (!existsSync(path)) return;
  /* Having a lock and not being able to read it is a different thing from not
     having one, and swallowing it would drop this amendment silently — the run
     would report success while the lock quietly stopped describing the app.
     Which is what a bare `catch { return }` around the read did: an unreadable
     file and an absent one came out the same way. */
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch (err) {
    throw new WizardError(
      `${path} could not be read, so it could not be brought up to date`,
      'Check the permissions on it — the wizard wrote it at scaffold time.',
      err,
    );
  }
  let lock: AppLock;
  try {
    lock = JSON.parse(text) as AppLock;
  } catch (err) {
    throw new WizardError(
      `${appLockPath(root)} is not valid JSON, so it could not be brought up to date`,
      'Restore it from git — the wizard wrote it at scaffold time.',
      err,
    );
  }
  amend(lock);
  writeAppLock(root, lock);
}

/** Move every file entry under `from` to sit under `to` instead. */
export function moveLockTree(lock: AppLock, from: string, to: string): void {
  const prefix = `${toPosix(from)}/`;
  for (const at of Object.keys(lock.files)) {
    if (!at.startsWith(prefix)) continue;
    lock.files[`${toPosix(to)}/${at.slice(prefix.length)}`] = lock.files[at]!;
    delete lock.files[at];
  }
}

export function writeAppLock(root: string, lock: AppLock): string {
  /* The read side refuses a lock naming a file outside the app, because every
     key there is somewhere `update` will write. Checking the same thing here is
     what keeps that refusal from being the way anyone finds out: a key that
     climbed out — a skills tree relayouted to a global directory, an amendment
     built from the wrong root — would otherwise be written once and then reject
     the whole lock, and every file in it, on the next run. */
  for (const at of Object.keys(lock.files)) {
    if (!isInsideTree(at)) {
      throw new WizardError(
        `internal: the lock for ${root} would name a file outside it (${at})`,
        'This is a bug in the wizard. The lock was not written.',
      );
    }
  }
  const path = appLockPath(root);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
  return path;
}
