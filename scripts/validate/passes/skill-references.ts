// ---------------------------------------------------------------------------
// Pass 2 — reference lint over modules/*/skill/ and content/skills/*
// (installed-layout resolution):
// path references must be written in installed form (intra-skill from the
// skill root, cross-skill as ../chatfuel-<id>/...), stay inside the module's
// requires closure (+ direct recommends + core), and resolve to real files.
// Bare path tokens in markdown prose (outside code spans) are an error.
// Application-code references (.ts/.tsx) in code spans must resolve too, in
// the two shapes that are checkable: repo-rooted module paths and
// module-relative paths starting at lib/, hooks/, components/, views/,
// screens/, adapters/ or team/.
// content/skills/* are the wizard's own skills, installed into every app beside
// the modules' and written in the same installed layout — so they are read here
// too. They belong to no module: their closure is chatfuel-core, which every app
// gets, and a module-relative code path has no module to resolve against.
// ---------------------------------------------------------------------------
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { OPERATIONS_IN_API, SCHEMA_FILES, SCHEMA_IN_SKILL, SCHEMA_IN_VENDOR } from '../../content-trees.ts';
import { closure, type ValidateContext } from '../context.ts';
import { fail } from '../report.ts';
import { walkAll } from '../walk.ts';

const PATH_RE = /(?:\.\.\/)*[\w@-]+(?:\/[\w.-]+)*\.(?:md|graphql|json|mjs)/g;

/**
 * Application-code references (.ts/.tsx) in skill docs. PATH_RE covers files a
 * skill directory can contain; code files live in the app tree, and a rename
 * there leaves the doc pointing at nothing with no gate noticing. Two shapes
 * are checkable without guessing what the writer meant: a repo-rooted module
 * path, and a module-relative path that starts at one of the app tree's fixed
 * directories (the common six, plus the adapters/ and team/ segments that one
 * module's sanctioned layout uses). Everything else path-shaped — bare
 * filenames, the host app's `src/...` forms, vendored packages — has no single
 * resolvable meaning from here; the shape restriction IS the escape valve, so
 * there is no allowlist.
 * Prose still only bans the PATH_RE shapes: a code token belongs in a code
 * span for the same reasons a doc path does, but that is the writer's habit,
 * not a resolvable claim.
 */
const APP_CODE_RE =
  /(?<![\w/.-])(?:content\/shell\/src\/modules\/[\w./-]+|(?:lib|hooks|components|views|screens|adapters|team)\/[\w./-]+)\.tsx?(?!\w)/g;

/**
 * Filenames that are path-shaped but are never files in a skill directory:
 * they are the config of the app a reader is building, and naming them
 * precisely is the whole point of the sentence they appear in. Everything else
 * path-shaped still has to resolve — this list stays short on purpose.
 */
// `chatfuel/lock.json` and not `.chatfuel/lock.json`: PATH_RE's first character
// class has no dot, so a leading-dot directory reaches here without it.
const WELL_KNOWN_CONFIG = new Set(['package.json', 'tsconfig.json', 'vercel.json', 'chatfuel/lock.json']);

/**
 * The paths inside the core skill that `content/schema` fills in at install
 * time — `references/schema.graphql` and its possible-types map.
 *
 * Every skill in the repository points at the SDL, and the SDL is no longer
 * kept under any skill: one copy lives in `content/schema` and the scaffold
 * writes it into the installed core skill. The references are therefore right
 * about the layout an agent will see and wrong about this repository's, and
 * this is the set the lint resolves against instead of the disk.
 */
const INSTALLED_INTO_CORE_SKILL = new Set(SCHEMA_FILES.map((name) => `${SCHEMA_IN_SKILL}/${name}`));

/**
 * Paths inside the app the reader is building, rather than inside the skill
 * they are reading — and the file in this repository each one is a copy of.
 *
 * The codegen inputs are the only app paths a skill has to name outright: the
 * cycle is "edit this file, then run that command", and one that cannot name
 * the file is not a cycle. They resolve rather than being waived, because
 * every one of them is written from something here, and a rename on this side
 * is exactly the drift the lint exists to catch.
 */
function vendoredCodegenInput(token: string): string | null {
  const schema = new RegExp(`^src/(?:chatfuel/)?vendor/${SCHEMA_IN_VENDOR}/([\\w.-]+)$`).exec(token);
  if (schema && (SCHEMA_FILES as readonly string[]).includes(schema[1]!)) return `content/schema/${schema[1]!}`;

  const document = new RegExp(`^src/(?:chatfuel/)?vendor/api/${OPERATIONS_IN_API}/([\\w-]+)\\.graphql$`).exec(token);
  if (document) return `content/modules/${document[1]!}/skill/examples/operations.graphql`;

  return null;
}

/** The module the skill belongs to, or null for a skill under content/skills/. */
type Owner = string | null;

function lintReference(ctx: ValidateContext, token: string, file: string, moduleId: Owner, skillDir: string): void {
  if (WELL_KNOWN_CONFIG.has(token)) return;
  const label = `${relative(ctx.root, file)}`;
  const vendored = vendoredCodegenInput(token);
  if (vendored !== null) {
    if (!existsSync(join(ctx.root, vendored))) {
      fail(`${label}: "${token}" is written from ${vendored}, which does not exist`);
    }
    return;
  }
  if (token.startsWith('../')) {
    const m = token.match(/^\.\.\/(chatfuel-[a-z0-9-]+)\/(.+)$/);
    if (!m) {
      fail(`${label}: cross-skill reference "${token}" must be ../chatfuel-<id>/<path>`);
      return;
    }
    const target = ctx.installMap.get(m[1]);
    if (!target) {
      fail(`${label}: reference "${token}" points to unknown skill "${m[1]}"`);
      return;
    }
    if (moduleId === null) {
      // Installed with every app, so the only skill guaranteed to be beside it
      // is core's — a module's skill is there or not by the user's choice.
      if (target.id !== 'core') {
        fail(`${label}: reference "${token}" — this skill ships with every app, so only chatfuel-core is beside it`);
        return;
      }
    } else if (!closure(ctx.manifests, moduleId).has(target.id)) {
      fail(`${label}: reference "${token}" leaves the requires/recommends closure of "${moduleId}"`);
      return;
    }
    if (target.id === 'core' && INSTALLED_INTO_CORE_SKILL.has(m[2])) return;
    if (!existsSync(join(target.skillDir, m[2]))) {
      fail(`${label}: dangling reference "${token}" (no such file in modules/${target.id}/skill/)`);
    }
    return;
  }
  if (moduleId === 'core' && INSTALLED_INTO_CORE_SKILL.has(token)) return;
  const fromFile = resolve(dirname(file), token);
  const fromRoot = resolve(skillDir, token);
  const resolved = existsSync(fromFile) ? fromFile : existsSync(fromRoot) ? fromRoot : null;
  if (!resolved) {
    fail(`${label}: dangling reference "${token}"`);
  } else if (!(resolved + sep).startsWith(resolve(skillDir) + sep) && resolved !== resolve(skillDir)) {
    fail(`${label}: reference "${token}" escapes the skill directory`);
  }
}

function lintAppCodeReference(ctx: ValidateContext, token: string, file: string, moduleId: Owner): void {
  const label = relative(ctx.root, file);
  if (token.startsWith('content/shell/src/modules/')) {
    if (!existsSync(join(ctx.root, token))) fail(`${label}: dangling code reference "${token}"`);
    return;
  }
  if (moduleId === null) {
    fail(
      `${label}: module-relative code reference "${token}" — this skill belongs to no module, so write it repo-rooted as content/shell/src/modules/<id>/...`,
    );
    return;
  }
  const moduleAppDir = join(ctx.shellDir, 'src', 'modules', moduleId);
  if (!existsSync(moduleAppDir)) {
    // The skill named a path under the module's app directory, so "the module
    // has no app directory" is the finding, not a reason to stop looking.
    fail(`${label}: names "${token}" under content/shell/src/modules/${moduleId}/, which does not exist`);
    return;
  }
  if (!existsSync(join(moduleAppDir, token))) {
    fail(`${label}: dangling code reference "${token}" (no such file in content/shell/src/modules/${moduleId}/)`);
  }
}

function lintSkillFile(ctx: ValidateContext, file: string, moduleId: Owner, skillDir: string): void {
  const text = readFileSync(file, 'utf8');
  const label = relative(ctx.root, file);
  if (file.endsWith('.md')) {
    const codeSegments: string[] = [];
    let prose = text.replace(/```[\s\S]*?```/g, (m) => {
      codeSegments.push(m);
      return ' ';
    });
    prose = prose.replace(/`[^`\n]*`/g, (m) => {
      codeSegments.push(m);
      return ' ';
    });
    for (const token of prose.match(PATH_RE) ?? []) {
      fail(`${label}: path reference "${token}" in prose — wrap it in a code span`);
    }
    for (const seg of codeSegments) {
      for (const token of seg.match(PATH_RE) ?? []) lintReference(ctx, token, file, moduleId, skillDir);
      for (const token of seg.match(APP_CODE_RE) ?? []) lintAppCodeReference(ctx, token, file, moduleId);
    }
  } else if (file.endsWith('.graphql')) {
    for (const line of text.split('\n')) {
      if (!line.trimStart().startsWith('#')) continue;
      for (const token of line.match(PATH_RE) ?? []) lintReference(ctx, token, file, moduleId, skillDir);
    }
  }
}

export function checkSkillReferences(ctx: ValidateContext): void {
  const lintTree = (skillDir: string, owner: Owner): void => {
    for (const file of walkAll(skillDir)) {
      if (file.endsWith('.md') || file.endsWith('.graphql')) {
        if (!file.endsWith(`${sep}schema.graphql`)) lintSkillFile(ctx, file, owner, skillDir);
      }
    }
  };
  for (const { id, skillDir } of ctx.installMap.values()) {
    if (!existsSync(skillDir)) continue; // reported by checkManifests, which owns the manifest's claim
    lintTree(skillDir, id);
  }
  /* content/skills/ is copied into every generated app by the wizard
     (packages/wizard/src/scaffold/skills.ts, WIZARD_SKILLS), so its path
     references are read by exactly the same reader as a module's — and until
     now by no pass at all. */
  const wizardSkills = join(ctx.root, 'content', 'skills');
  for (const entry of readdirSync(wizardSkills, { withFileTypes: true })) {
    if (entry.isDirectory()) lintTree(join(wizardSkills, entry.name), null);
  }
}
