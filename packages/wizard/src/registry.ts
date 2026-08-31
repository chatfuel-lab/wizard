import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ModuleManifest } from '@chatfuel/module-manifest';
import type { ContentSource } from './content';
import { CONTENT_TREE } from './contentLock';
import { WizardError } from './errors';

export type { ModuleManifest };

export interface Registry {
  manifests: Map<string, ModuleManifest>;
  ready(): ModuleManifest[];
  /** Selected ids + transitive requires + implicit core, dependency-first order. */
  closure(ids: string[]): string[];
}

const MANIFEST_PATH = new RegExp(`^${CONTENT_TREE.modules}/([^/]+)/module\\.json$`);

/**
 * Which module directories this source is allowed to have.
 *
 * The lock decides whenever there is one. Everything else about the packaged
 * wizard's content is decided by it — a file is fetched because the lock names
 * it and written because its digest matched — and reading the cache directory
 * instead put the one unverified step in the middle of that: a directory left
 * by another version, or written by anything else that can reach
 * ~/.cache, is a manifest the lock never vouched for and the run would load it.
 *
 * A repo checkout has no lock and the directory listing IS the source of truth
 * there, so it stays. What holds on both sides is the second check below.
 *
 * Dot-directories are not modules. A checkout is a working directory, and a
 * tool that drops its state beside the modules would otherwise be read as one
 * more of them — a manifest that is not there, and a run that ends on ENOENT
 * before it has asked the first question.
 */
function moduleDirs(content: ContentSource): string[] {
  if (content.lock) {
    return Object.keys(content.lock.files).flatMap((path) => MANIFEST_PATH.exec(path)?.[1] ?? []);
  }
  return readdirSync(join(content.root, CONTENT_TREE.modules), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name);
}

const CONTENT_HINT = 'Reinstall the wizard — this content did not come from the pinned commit.';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

/* The shapes `module.schema.json` gives these three fields, restated where a
   run can enforce them. Every one of them becomes a path: the id names the
   directory the module's files are read from, `skill.dir` the directory copied
   out of it, and `installAs` the directory written INTO the agent's skills
   root — `join(root, installAs)` in scaffold/skills.ts, which would resolve a
   traversal as readily as a name. A name is all these patterns admit. ajv
   checks the same three, and ajv is a devDep that only CI runs, so the run
   itself has to be the one that enforces them. */
const MODULE_ID = /^[a-z][a-z0-9-]*$/;
const SKILL_INSTALL_AS = /^chatfuel-[a-z0-9-]+$/;
const SKILL_DIR = /^[A-Za-z0-9_-]+$/;

/* The rest of the schema's patterns, restated for the same reason: on the
   no-lock path nothing has validated this file, and each of these ends up
   somewhere a string is no longer only a string. `npmDependencies` is the one
   that leaves the machine's own disk - name and range are joined into one npm
   install argument and run, install scripts included, in the user's project -
   so it is checked first and hardest. `roots` is resolved against the shell,
   `entryComponent` is written into generated source, `playbook` is read out of
   the skill directory, and an env name is written into a .env whose format has
   no escape. */
const NPM_NAME = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const NPM_RANGE =
  /^(?:[a-z][a-z0-9-]*|[~^<>=]{0,2}[0-9xX*][0-9A-Za-z.+-]*(?:\s*(?:\|\|)?\s*[~^<>=]{0,2}[0-9xX*][0-9A-Za-z.+-]*)*)$/;
const EMBED_ROOT = /^src\/[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*$/;
const ENTRY_COMPONENT = /^[A-Z][A-Za-z0-9_]*$/;
const MARKDOWN_PATH = /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*\.md$/;
const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * The fields every later step reads without asking whether they are there.
 *
 * `module.schema.json` is the authority and CI holds every manifest in this
 * repository to it — but a run does not: the no-lock path reads whatever
 * `module.json` a checkout or `CHATFUEL_CONTENT_ORIGIN` puts in front of it,
 * and a missing `skill` surfaced as a TypeError inside the handoff, hundreds of
 * lines after the file that caused it. Named here, against the file, before
 * anything is copied.
 */
function checkedManifest(at: string, dir: string, value: unknown): ModuleManifest {
  const refuse = (what: string): never => {
    throw new WizardError(`${at} ${what}`, CONTENT_HINT);
  };
  if (!isRecord(value)) refuse('is not a JSON object');
  const manifest = value as Record<string, unknown>;
  /* The id and the directory name are two spellings of one fact, and every
     path this registry hands out is built from the directory while every
     lookup goes through the id. Left unchecked, a manifest can answer for a
     module whose files live somewhere else entirely — including shadowing
     one the lock does pin. */
  if (!isText(manifest.id)) refuse('declares no id');
  if (!MODULE_ID.test(String(manifest.id))) {
    refuse(`declares id ${JSON.stringify(manifest.id)}, which is not a module name`);
  }
  if (manifest.id !== dir) refuse(`declares id "${String(manifest.id)}" but sits in "${dir}"`);
  for (const field of ['name', 'description'] as const) {
    if (!isText(manifest[field])) refuse(`declares no ${field}`);
  }
  if (manifest.status !== 'ready' && manifest.status !== 'planned') {
    refuse(`declares status ${JSON.stringify(manifest.status)}, which is neither "ready" nor "planned"`);
  }
  if (!isRecord(manifest.skill) || !isText(manifest.skill.installAs)) {
    refuse('declares no skill.installAs — every module ships a skill');
  }
  const skill = manifest.skill as Record<string, unknown>;
  if (!SKILL_INSTALL_AS.test(skill.installAs as string)) {
    refuse(`installs its skill as ${JSON.stringify(skill.installAs)}, which is not a chatfuel-* directory name`);
  }
  if (skill.dir !== undefined && (!isText(skill.dir) || !SKILL_DIR.test(skill.dir))) {
    refuse(`declares skill.dir ${JSON.stringify(skill.dir)}, which is not one directory name inside the module`);
  }
  for (const field of ['requires', 'recommends'] as const) {
    const value = manifest[field];
    if (value === undefined) continue;
    if (!Array.isArray(value) || value.some((id) => !isText(id) || !MODULE_ID.test(id))) {
      refuse(`declares ${field} ${JSON.stringify(value)}, which is not a list of module names`);
    }
  }
  if (manifest.app !== undefined) {
    if (!isRecord(manifest.app)) refuse('declares an "app" that is not an object');
    checkedApp(refuse, manifest.app as Record<string, unknown>);
  }
  return manifest as unknown as ModuleManifest;
}

/**
 * The half of the manifest that reaches the scaffold: what is installed, what
 * is embedded, and what is written into the .env.
 *
 * Split out of `checkedManifest` only for length; it refuses the same way, and
 * `refuse` still names the file the manifest came from.
 */
function checkedApp(refuse: (what: string) => never, app: Record<string, unknown>): void {
  const env = app.env;
  if (env !== undefined) {
    if (!Array.isArray(env)) refuse('declares an "app.env" that is not an array');
    for (const entry of env as unknown[]) {
      if (!isRecord(entry) || !isText(entry.name) || !ENV_NAME.test(entry.name)) {
        refuse(`declares an app.env entry ${JSON.stringify(entry)} without a variable name`);
      }
      const value = (entry as Record<string, unknown>).default;
      if (value !== undefined && (typeof value !== 'string' || /[\r\n]/.test(value))) {
        refuse(
          `declares an app.env default for ${JSON.stringify((entry as Record<string, unknown>).name)} that is not one line`,
        );
      }
    }
  }
  const embed = app.embed;
  if (embed === undefined) return;
  if (!isRecord(embed)) refuse('declares an "app.embed" that is not an object');
  const { roots, entryComponent, npmDependencies, playbook } = embed as Record<string, unknown>;
  if (roots !== undefined) {
    if (!Array.isArray(roots) || roots.length === 0 || roots.some((root) => !isText(root) || !EMBED_ROOT.test(root))) {
      refuse(`declares app.embed.roots ${JSON.stringify(roots)}, which is not a list of shell-relative src/ paths`);
    }
  }
  if (entryComponent !== undefined && (!isText(entryComponent) || !ENTRY_COMPONENT.test(entryComponent))) {
    refuse(`declares app.embed.entryComponent ${JSON.stringify(entryComponent)}, which is not a component name`);
  }
  if (playbook !== undefined && (!isText(playbook) || !MARKDOWN_PATH.test(playbook))) {
    refuse(`declares app.embed.playbook ${JSON.stringify(playbook)}, which is not a markdown file inside the skill`);
  }
  if (npmDependencies !== undefined) {
    if (!isRecord(npmDependencies)) refuse('declares an "app.embed.npmDependencies" that is not an object');
    for (const [name, range] of Object.entries(npmDependencies as Record<string, unknown>)) {
      if (name.length > 214 || !NPM_NAME.test(name)) {
        refuse(`asks to install ${JSON.stringify(name)}, which is not an npm package name`);
      }
      if (typeof range !== 'string' || range.length === 0 || range.length > 100 || !NPM_RANGE.test(range)) {
        refuse(`asks to install ${name}@${JSON.stringify(range)}, which names a source rather than a version`);
      }
    }
  }
}

/**
 * The file's JSON, or a WizardError naming the file.
 *
 * Everything else about a bad manifest is reported that way; a syntax error
 * escaped as a raw SyntaxError whose message ("Unexpected token } in JSON at
 * position 412") names no file at all, and a truncated download is exactly how
 * one gets here.
 */
function parsed(at: string): unknown {
  const source = readFileSync(at, 'utf8');
  try {
    return JSON.parse(source);
  } catch (err) {
    throw new WizardError(
      `${at} is not valid JSON — ${err instanceof Error ? err.message : String(err)}`,
      CONTENT_HINT,
    );
  }
}

export function loadRegistry(content: ContentSource): Registry {
  const manifests = new Map<string, ModuleManifest>();
  /* Two manifests sharing an installAs both copy into the same skill directory
     and the second one wins, silently, in whatever order the lock happens to
     list them. CI already refuses it (scripts/validate/passes/manifests.ts);
     the runtime reads content CI never saw. */
  const skillDirs = new Map<string, string>();
  for (const dir of moduleDirs(content)) {
    const at = content.modulePath(dir, 'module.json');
    const manifest = checkedManifest(at, dir, parsed(at));
    const claimed = skillDirs.get(manifest.skill.installAs);
    if (claimed !== undefined) {
      throw new WizardError(
        `${at} installs its skill as "${manifest.skill.installAs}", which "${claimed}" already claims`,
        CONTENT_HINT,
      );
    }
    skillDirs.set(manifest.skill.installAs, manifest.id);
    manifests.set(manifest.id, manifest);
  }

  function closure(ids: string[]): string[] {
    const seen = new Set<string>();
    const order: string[] = [];
    const visit = (id: string) => {
      if (seen.has(id)) return;
      seen.add(id);
      const manifest = manifests.get(id);
      if (!manifest) throw new WizardError(`Unknown module "${id}"`);
      for (const dep of manifest.requires ?? []) visit(dep);
      order.push(id);
    };
    visit('core'); // implicit for every module
    for (const id of ids) visit(id);
    return order;
  }

  return {
    manifests,
    ready: () => [...manifests.values()].filter((m) => m.status === 'ready'),
    closure,
  };
}
