import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import * as p from '@clack/prompts';
import packageJson from '../../package.json';
import { AGENTS, skillsRootFor } from '../agents';
import { amendAppLock, appLockPath, moveLockTree } from './appLock';
import { SCHEMA_FILES, SCHEMA_IN_SKILL } from '../contentLock';
import type { AppLock } from './appLock';
import type { AgentSpec } from '../agents';
import type { WizardContext } from '../context';

// Single source: tsdown/tsx inline the JSON at build time (resolveJsonModule).
const WIZARD_VERSION: string = packageJson.version;

/**
 * Which agent's layout the skills are written for. Unresolved until the
 * handoff when neither CLI is installed, and Claude's layout is the default in
 * that window — relayoutSkills moves them if the user then picks Codex.
 */
export const skillsSpec = (ctx: WizardContext): AgentSpec => ctx.answers.agentTarget ?? AGENTS.claude;

/** Where this run's skills live: in the app, or in the user's home directory. */
export function skillsRoot(ctx: WizardContext, spec: AgentSpec = skillsSpec(ctx)): string {
  return skillsRootFor(spec, ctx.answers.skillsTarget === 'global' ? homedir() : ctx.answers.appDir!);
}

/** The directory as the reader of the prompt sees it, not as the OS spells it. */
export const skillsRootLabel = (ctx: WizardContext, spec: AgentSpec = skillsSpec(ctx)): string =>
  ctx.answers.skillsTarget === 'global' ? `~/${spec.skillsSubdir}` : spec.skillsSubdir;

/**
 * The skills that belong to no module and are installed with every app.
 *
 * `chatfuel-update` is the one: it is about the app's relationship to the
 * wizard rather than about anything the app does, so tying it to a module the
 * user might not have picked would mean the update story is available to some
 * apps and not others.
 */
export const WIZARD_SKILLS: { name: string; description: string }[] = [
  {
    name: 'chatfuel-update',
    description:
      'Update the app to a newer wizard and resolve the conflicts it reports — the files where upstream moved and you had already edited them.',
  },
];

interface SkillToInstall {
  installAs: string;
  /** Directory to copy from. */
  source: string;
  /** The module it belongs to, when it belongs to one. */
  module?: string;
}

export function toInstall(ctx: WizardContext): SkillToInstall[] {
  const fromModules = ctx.answers.modules.map((moduleId) => {
    const manifest = ctx.registry.manifests.get(moduleId)!;
    return {
      installAs: manifest.skill.installAs,
      source: ctx.content.modulePath(moduleId, manifest.skill.dir ?? 'skill'),
      module: moduleId,
    };
  });
  return [
    ...fromModules,
    ...WIZARD_SKILLS.map((skill) => ({ installAs: skill.name, source: ctx.content.skillPath(skill.name) })),
  ];
}

/**
 * What the app's own lock says about a skill that is already installed.
 *
 * This is the question the sidecar file used to answer, asked of the one ledger
 * instead: does the wizard own this directory, and which version put it there?
 * The scope has to match — a skill in the home directory says nothing about the
 * one sitting in the project, and replacing the wrong one is not recoverable.
 *
 * A global install from some other app is the case this cannot see, and says so
 * by returning nothing: that app's lock is the only record of it, and it is not
 * this app's to read.
 */
function previousInstall(ctx: WizardContext, installAs: string): string | undefined {
  const scope = ctx.answers.skillsTarget === 'global' ? 'home' : 'app';
  try {
    const lock = JSON.parse(readFileSync(appLockPath(ctx.answers.appDir!), 'utf8')) as AppLock;
    const entry = lock.skills[installAs];
    if (entry?.scope !== scope) return undefined;
    /* A directory an earlier run found and deliberately left alone is recorded
       with the same scope as an installed one, and `managed: false` is the only
       thing telling them apart. Read here or the record means nothing: the next
       `--yes` run would take the answer "we know this one" for "we wrote this
       one" and delete somebody's own skill — which is what recording it was
       for. */
    if (entry.managed === false) return undefined;
    /* The lock is a file on disk, and this string goes into the prompt whose
       answer is "delete that directory". A version carrying escape sequences or
       newlines could write the rest of the question itself. */
    return /^[\w.+-]{1,32}$/.test(lock.wizardVersion) ? lock.wizardVersion : undefined;
  } catch {
    return undefined;
  }
}

/** What `installSkills` did: what it wrote, and what it left where it found it. */
export interface InstalledSkills {
  installed: string[];
  /** Directories that were already there and stayed — nobody's to replace. */
  kept: string[];
}

/**
 * Copy each skill dir to <agent skills dir>/chatfuel-<id>/. Existing installs
 * are replaced only after an explicit confirm — or, under `--yes`, only when
 * the app's own lock says this wizard is the one that put the directory there.
 *
 * `--yes` deleting a directory the wizard never wrote is the one outcome an
 * unattended run must not have: in embed mode the skills go into the HOST
 * project (`ctx.answers.appDir` is the host), so `npx @chatfuel/wizard --yes`
 * in somebody's repository would have taken their own `chatfuel-*` skill with
 * it. `offerHostInstall` refuses under `--yes` for exactly this reason.
 */
export async function installSkills(ctx: WizardContext): Promise<InstalledSkills> {
  const spec = skillsSpec(ctx);
  const root = skillsRoot(ctx, spec);
  const dry = ctx.flags.plan;
  if (!dry) mkdirSync(root, { recursive: true });
  const installed: string[] = [];
  const kept: string[] = [];

  for (const skill of toInstall(ctx)) {
    const target = join(root, skill.installAs);

    if (existsSync(target)) {
      const previous = previousInstall(ctx, skill.installAs);
      let overwrite: boolean;
      if (ctx.flags.yes) {
        overwrite = previous !== undefined;
        if (!overwrite) {
          p.log.warn(`${target} exists and this app's lock does not record it as ours — left exactly as it is.`);
        }
      } else {
        const answer = await p.confirm({
          message: previous
            ? `${skill.installAs} is already installed (wizard ${previous}). Replace with ${WIZARD_VERSION}?`
            : `${target} exists and this app's lock does not record it as ours. Replace it?`,
        });
        overwrite = !p.isCancel(answer) && answer;
      }
      if (!overwrite) {
        p.log.warn(`Skipped ${skill.installAs}`);
        kept.push(skill.installAs);
        continue;
      }
      if (!dry) rmSync(target, { recursive: true, force: true });
    }

    if (dry) {
      p.log.info(`--plan: would install ${skill.installAs} into ${target}`);
      continue;
    }
    cpSync(skill.source, target, { recursive: true });
    installSchemaReferences(ctx, skill, target);
    installed.push(skill.installAs);
  }

  /* Not a failure. The one way to get here is a person answering "no" to every
     replacement prompt, which is them keeping the skills they already have —
     and the app is written by then, so throwing would end the run over a
     directory that is finished, and leave it in the state `scaffold` refuses
     to re-enter. Said out loud instead, because a silent nothing looks like a
     step that did not run. */
  if (!dry && installed.length === 0) {
    p.log.warn('No skills were installed — every one of them was already there and kept.');
  }
  ctx.answers.skillsLayout = spec.id;
  ctx.answers.skillsInstalled = installed;
  ctx.answers.skillsPresent = [...installed, ...kept];
  return { installed, kept };
}

/**
 * Put the SDL and its possible-types map inside the core skill that has just
 * been written.
 *
 * Every skill in the repository points an agent at `references/schema.graphql`,
 * and the file is not in the skill directory any more — one copy lives in
 * `content/schema`, read by the codegen at both ends. So the skill is completed
 * here rather than kept in step by hand, and only for a skill this run actually
 * wrote: a directory the user declined to replace is theirs, and writing two
 * files into it would be the overwrite they just refused.
 */
function installSchemaReferences(ctx: WizardContext, skill: SkillToInstall, target: string): void {
  if (skill.module !== 'core') return;
  const references = join(target, SCHEMA_IN_SKILL);
  mkdirSync(references, { recursive: true });
  for (const name of SCHEMA_FILES) cpSync(ctx.content.schemaPath(name), join(references, name));
}

/**
 * Move the installed skills into the layout of the agent that is actually
 * going to open the app.
 *
 * Only one run reaches this: the one that started with no coding agent on
 * PATH, wrote the skills into Claude's directory for want of a better guess,
 * and then had the user accept the Codex install at the handoff. Copying both
 * layouts up front would leave two trees to drift apart instead.
 */
export function relayoutSkills(ctx: WizardContext, spec: AgentSpec): void {
  if (!ctx.answers.skillsLayout || ctx.answers.skillsLayout === spec.id) return;
  const from = skillsRoot(ctx, AGENTS[ctx.answers.skillsLayout]);
  const to = skillsRoot(ctx, spec);
  if (from === to) return;
  mkdirSync(to, { recursive: true });
  const moved: string[] = [];
  for (const name of ctx.answers.skillsInstalled) {
    const source = join(from, name);
    if (!existsSync(source)) continue;
    rmSync(join(to, name), { recursive: true, force: true });
    renameSync(source, join(to, name));
    moved.push(name);
  }
  ctx.answers.skillsLayout = spec.id;
  /* The lock was written before the handoff and still names the directory the
     skills have just left. Per skill and not per directory: a skill that is no
     longer on disk did not move either, and carrying its entries across would
     point them at a second path nothing is at. A global install has no file
     entries to move at all — its skills live outside the app. */
  if (ctx.answers.skillsTarget !== 'global') {
    const rel = (dir: string): string => relative(ctx.answers.appDir!, dir).split(sep).join('/');
    amendAppLock(ctx.answers.appDir!, (lock) => {
      for (const name of moved) moveLockTree(lock, `${rel(from)}/${name}`, `${rel(to)}/${name}`);
    });
  }
  pruneEmpty(from);
  p.log.info(`Moved the skills to ${skillsRootLabel(ctx, spec)} — where ${spec.name} reads them.`);
}

/**
 * Take the vacated directories with us — the skills directory and the agent
 * directory above it — but only while they are empty. A global install shares
 * `~/.claude` with everything else the user keeps there, and a directory that
 * still holds one of those is not ours to remove.
 */
function pruneEmpty(skillsDir: string): void {
  for (const dir of [skillsDir, dirname(skillsDir)]) {
    try {
      if (readdirSync(dir).length > 0) return;
      // Checked empty a line ago; `recursive` is what lets rmSync take a
      // directory at all, not permission to delete anything inside one.
      rmSync(dir, { recursive: true });
    } catch {
      return;
    }
  }
}
