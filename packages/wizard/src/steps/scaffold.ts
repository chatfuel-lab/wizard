import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import * as p from '@clack/prompts';
import { apiModuleOf } from '../content';
import { CONTENT_TREE, SCHEMA_IN_VENDOR } from '../contentLock';
import { resolveFromUserCwd } from '../cwd';
import { stepArt } from '../art';
import { WizardError } from '../errors';
import { onInterrupt } from '../interrupt';
import { gitignoreGuard, writeEnv } from '../scaffold/env';
import {
  appLockPath,
  buildAppLock,
  copied,
  generated,
  newLockDraft,
  recordSkills,
  rewrote,
  writeAppLock,
} from '../scaffold/appLock';
import { copyModuleOperations, recordGeneratedClient } from '../scaffold/apiOperations';
import { copyAuthSql, proxyPluginEntry } from '../scaffold/authAssets';
import { applyBrand } from '../scaffold/brandAssets';
import { applyAppOverlay } from '../scaffold/appOverlay';
import { installDependencies } from '../scaffold/install';
import {
  includeCodegenInScriptsTsconfig,
  pruneModuleDependencies,
  pruneNavGroups,
  pruneTsconfigFallbacks,
  renamePackage,
  repointMarkedImport,
  rewriteMarkedBlock,
} from '../scaffold/transforms';
import { generateModuleRegistry } from '../scaffold/moduleRegistry';
import { generateOperationDocs } from '../scaffold/operationDocs';
import { installSkills, skillsRoot, toInstall } from '../scaffold/skills';
import type { LockDraft } from '../scaffold/appLock';
import type { WizardContext } from '../context';

export const COPY_SKIP = new Set(['node_modules', 'dist', '.env', '.git']);

/**
 * Filter for the vendored package copies. The design system unit-tests its own
 * pure helpers, and those tests are ours, not the user's — shipping them into a
 * scaffolded app would hand people failing `vitest` runs for code they did not
 * write and a devDependency they never asked for.
 */
export const vendorCopyFilter = (src: string) => !COPY_SKIP.has(basename(src)) && !/\.test\.tsx?$/.test(src);

/**
 * The vendored API client, minus the modules this app did not take.
 *
 * `generated/<id>` is a whole GraphQL client per module — livechat's alone is
 * 1.7 MB — and `domain/<id>.ts` is the hand-written half of the same
 * namespace, so the two leave together or the survivor stops compiling. An app
 * with two modules used to carry all eleven of them into the user's history
 * and their editor's type server.
 *
 * What makes the cut safe is a rule the repository already enforces: a module
 * may import its own generated namespace or `core`, and nothing else
 * (scripts/validate/passes/import-boundaries.ts). Nobody left can be reaching
 * for what goes — and `core` needs no exception here, because the dependency
 * closure puts it in every module set.
 *
 * Which files belong to a module is `apiModuleOf`'s to say, not this
 * function's: a packaged wizard downloads by that same rule, and a path one of
 * them keeps and the other drops would only surface on a user's machine.
 */
export function apiCopyFilter(root: string, modules: readonly string[]): (src: string) => boolean {
  const kept = new Set(modules);
  return (src) => {
    if (!vendorCopyFilter(src)) return false;
    const rel = relative(root, src).split(sep).join('/');
    /* Turning the directory away whole is what stops cpSync walking 1.7 MB it
       would drop file by file — but only a directory. A file sitting directly
       in generated/ belongs to no module and stays. The stat follows the link
       rather than describing it, because what decides the question is whether
       a module's files are behind this name; and it answers rather than throws
       for a dangling one, because cpSync calls this filter before it stats the
       entry itself, so an ENOENT here would come out of the copy. */
    const dir = /^generated\/([^/]+)$/.exec(rel)?.[1];
    if (dir !== undefined && statSync(src, { throwIfNoEntry: false })?.isDirectory()) return kept.has(dir);
    const owner = apiModuleOf(rel);
    return owner === undefined || kept.has(owner);
  };
}

/**
 * The generated GraphQL namespaces a copied `vendor/api` ended up with.
 *
 * Takes the directory and not the app root: a scaffolded app keeps it under
 * `src/vendor/api`, an embedded one directly under the embed root, and the
 * barrel is written beside each — the same specifier, two different places to
 * read it from.
 *
 * Sorted, so two runs of the same wizard over the same answers write the same
 * bytes — a barrel whose lines move around would show up as a diff in every
 * app that regenerates it.
 */
export function generatedApiNamespaces(generatedDir: string): string[] {
  return readdirSync(generatedDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function resolveTargetDir(ctx: WizardContext): Promise<string> {
  let dir = ctx.flags.dir;
  if (!dir) {
    if (ctx.flags.yes) {
      dir = './chatfuel-app';
    } else {
      const answer = await p.text({
        message: 'Where should the app be created?',
        placeholder: './chatfuel-app',
        defaultValue: './chatfuel-app',
      });
      if (p.isCancel(answer)) throw new WizardError('Cancelled.');
      dir = answer;
    }
  }
  const target = resolveFromUserCwd(dir);
  if (existsSync(target) && readdirSync(target).length > 0) {
    throw new WizardError(`${target} exists and is not empty`, 'Pick a fresh directory.');
  }
  return target;
}

/**
 * Undo a scaffold that fell over partway through writing the directory.
 *
 * Only a directory this run created may be removed — everything in it came
 * from here, and leaving it is the difference between a command that can be
 * re-run and one that refuses forever over its own debris (`resolveTargetDir`
 * rejects a non-empty target). A directory that was already there belongs to
 * somebody else, and nothing here can tell their files from ours, so it is
 * described and left exactly as the failure left it.
 */
export function undoPartialScaffold(target: string, createdHere: boolean): void {
  if (!existsSync(target)) return;
  if (createdHere) {
    rmSync(target, { recursive: true, force: true });
    p.log.info(`Removed the half-written ${target} — run the same command again.`);
    return;
  }
  p.log.warn(`${target} still holds what was written before the failure. Nothing in it was deleted.`);
}

/**
 * content/shell IS the template. Scaffold = copy + delete unselected module
 * subtrees + regenerate the module registry + filter the nav table + vendor
 * the three source packages + two marked-block rewrites + tsconfig prune +
 * rename + .env + skills + install.
 */
export async function scaffold(ctx: WizardContext): Promise<void> {
  const target = await resolveTargetDir(ctx);
  ctx.answers.appDir = target;
  p.log.message(stepArt('scaffold'));

  if (ctx.flags.plan) {
    printScaffoldPlan(ctx, target);
    return;
  }

  // Asked before anything is written, and only about the target itself: an
  // empty directory someone made and cd'd into is still theirs.
  const createdHere = !existsSync(target);
  const spinner = p.spinner();
  let copying = true;
  spinner.start('Copying the app template…');
  /* Everything the rollback covers, up to and including the lock that makes
     this directory an app.

     `update` will not touch a directory without a lock and `scaffold` will not
     write into a directory that has anything in it, so a run that dies between
     the copy and the lock leaves a full directory neither command will act on
     and nothing in it to say why. The .gitignore append and the .env write sit
     in that window — an ENOSPC, a read-only mount or a permission on either of
     them used to end the run right there, in exactly that dead end. */
  let built: { summary: string; draft: LockDraft };
  /* The same undo, reachable from a signal. Ctrl+C in this window does not
     unwind — see ../interrupt — so the rollback has to be registered for it
     rather than only sitting in the `catch`. Released the moment the lock is
     written, because from then on there is nothing half-written to remove. */
  const releaseUndo = onInterrupt(() => undoPartialScaffold(target, createdHere));
  try {
    built = buildAppDirectory(ctx, target);
    spinner.stop(built.summary);
    copying = false;

    const gitignore = await gitignoreGuard(ctx, target);
    if (gitignore.appended) rewrote(built.draft, '.gitignore', 'envIgnore');
    if (gitignore.ok) writeEnv(ctx, target);
    ctx.answers.envWritten = gitignore.ok;

    writeAppLock(target, buildAppLock(ctx, target, built.draft));
  } catch (err) {
    if (copying) spinner.stop('The app was not written', 1);
    undoPartialScaffold(target, createdHere);
    throw err;
  } finally {
    releaseUndo();
  }

  /* Outside the rollback and not thrown from: by this line the app directory is
     complete and its lock is sealed, so a failed skill copy — a full disk, a
     read-only agent directory, a permission on somebody's ~/.claude — is a
     missing convenience, not a broken app. Deleting the app over it, or ending
     the run in front of the handoff that would explain it, both cost more than
     the skills are worth. */
  let skills: Awaited<ReturnType<typeof installSkills>> = { installed: [], kept: [] };
  try {
    skills = await installSkills(ctx);
  } catch (err) {
    p.log.error(`The skills could not be installed into ${skillsRoot(ctx)}`);
    p.log.message(err instanceof Error ? err.message : String(err));
    p.log.warn('The app itself is complete. Re-run the wizard in this directory to install them.');
  }
  if (skills.installed.length > 0) p.log.success(`Skills installed: ${skills.installed.join(', ')}`);

  // After the skills, because they are files in the app too, and before the
  // install, whose node_modules and lockfile are the package manager's.
  recordSkills(ctx, built.draft, target, skillsRoot(ctx), skills.kept);
  writeAppLock(target, buildAppLock(ctx, target, built.draft));

  const install = await installDependencies(target, ctx.answers.packageManager);
  ctx.answers.packageManager = install.packageManager;
  if (install.failure) {
    ctx.answers.installFailed = true;
    p.log.error(`Could not install the app's dependencies in ${target}`);
    p.log.message(install.failure);
    p.log.warn('The app itself is complete — this is node_modules and nothing else. The run continues.');
  }
}

/**
 * What a real run would put on disk, said instead of done.
 *
 * A --plan creates no app directory and no file in it. Everything asked
 * before this point has been asked, so the plan below is the run the same
 * command would make without the flag — and `resolveTargetDir` has already
 * refused a target that is not free, which is the one failure worth finding out
 * about before anything is written.
 */
function printScaffoldPlan(ctx: WizardContext, target: string): void {
  const say = (what: string): void => {
    p.log.info(`--plan: would ${what}`);
  };
  say(`create ${target}`);
  say(`copy the app template into ${target} (modules: ${ctx.answers.modules.join(', ')})`);
  say(
    `vendor ${CONTENT_TREE.ui}, ${CONTENT_TREE.apiClient} and ${CONTENT_TREE.schema} into ${join(target, 'src', 'vendor')}`,
  );
  say(`vendor ${CONTENT_TREE.proxy} into ${join(target, 'vendor', 'chatfuel-proxy')}`);
  if (ctx.answers.modules.includes('auth')) say(`write the auth migrations into ${join(target, 'supabase')}`);
  say(`add .env to ${join(target, '.gitignore')} and write ${join(target, '.env')}`);
  say(
    `install the skills ${toInstall(ctx)
      .map((skill) => skill.installAs)
      .join(', ')} into ${skillsRoot(ctx)}`,
  );
  say(`write ${appLockPath(target)}`);
  say(`install the app's dependencies with ${ctx.answers.packageManager}`);
  p.note(`Nothing above was written. Run the same command without --plan to do it.`, 'Plan');
}

/**
 * Every write that makes the app directory itself, and nothing that happens
 * after it exists. The rollback boundary is here on purpose: an install that
 * fails leaves a complete app somebody can fix by re-running one command, and
 * deleting it over that would cost more than the bug it undoes.
 */
function buildAppDirectory(ctx: WizardContext, target: string): { summary: string; draft: LockDraft } {
  const templateDir = ctx.content.shellPath();
  mkdirSync(target, { recursive: true });
  cpSync(templateDir, target, {
    recursive: true,
    filter: (src) => !COPY_SKIP.has(basename(src)),
  });
  /* Every write below is recorded as it happens. The lock has to say where
     each file came from and whether the wizard changed it on the way in, and
     the only place that is known is here. */
  const draft = newLockDraft();
  copied(draft, '', CONTENT_TREE.shell);

  // Keep only the selected modules' subtrees and regenerate the registry.
  const modulesDir = join(target, 'src', 'modules');
  const present = readdirSync(modulesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  const selectedWithUi = present.filter((id) => ctx.answers.modules.includes(id));
  if (selectedWithUi.length === 0) {
    throw new WizardError('internal: no selected module has a shell subtree');
  }
  for (const id of present) {
    if (!selectedWithUi.includes(id)) rmSync(join(modulesDir, id), { recursive: true });
  }
  writeFileSync(join(modulesDir, 'index.ts'), generateModuleRegistry(selectedWithUi), 'utf8');
  generated(draft, 'src/modules/index.ts', 'moduleRegistry');
  /* Copied rather than produced, and still recorded as generated — for the one
     effect that has: `update` never touches it again. That is the whole point
     of the file. It is the deployment's settings, the same bargain `.env` gets,
     and it is deliberately a near-empty overrides stub: the values it overrides
     live beside it in src/config/defaults.ts, which IS a plain copy and does
     keep receiving updates. So nothing upstream is frozen here except the
     user's own file. */
  generated(draft, 'src/config/app.ts', 'appConfig');
  // The nav table is curated for every module; this app has some of them.
  const prunedNav = pruneNavGroups(join(modulesDir, 'navGroups.tsx'), selectedWithUi);
  /* A rewrite and not generated: the file is the upstream table with rows taken
     out, so it has an upstream, and calling it generated was what made `update`
     skip it for the life of the app — a module added to the nav table upstream
     would never appear in one. Marked only when rows actually went: with every
     module selected the file is a plain copy, and an update can replace it. */
  if (prunedNav.length > 0) rewrote(draft, 'src/modules/navGroups.tsx', 'navGroups');

  // Vendoring (shadcn philosophy): the app owns every line it runs.
  cpSync(ctx.content.vendorPath('ui', 'src'), join(target, 'src/vendor/ui'), {
    recursive: true,
    filter: vendorCopyFilter,
  });
  const apiSrc = ctx.content.vendorPath('api-client', 'src');
  cpSync(apiSrc, join(target, 'src/vendor/api'), {
    recursive: true,
    filter: apiCopyFilter(apiSrc, ctx.answers.modules),
  });
  /* The proxy is a directory now (dev plugin + prod server + the shared core),
     copied recursively — which is also what would keep a file a module adds
     beside them in the scaffold without anybody having to remember to list it. */
  const proxyDir = join(target, 'vendor/chatfuel-proxy');
  mkdirSync(proxyDir, { recursive: true });
  cpSync(ctx.content.vendorPath('vite-plugin-proxy', 'src'), proxyDir, {
    recursive: true,
    filter: vendorCopyFilter,
  });
  /* The SDL travels with the client it generated. The core skill gets its own
     copy — that is the one an agent reads — but a skill directory may have been
     installed into the user's home, and the app cannot reach it there: codegen
     has to resolve the schema from inside the app or it cannot run at all. */
  cpSync(ctx.content.schemaPath(), join(target, 'src/vendor', SCHEMA_IN_VENDOR), { recursive: true });
  copied(draft, 'src/vendor/ui', CONTENT_TREE.ui);
  copied(draft, 'src/vendor/api', CONTENT_TREE.apiClient);
  copied(draft, `src/vendor/${SCHEMA_IN_VENDOR}`, CONTENT_TREE.schema);
  copied(draft, 'vendor/chatfuel-proxy', CONTENT_TREE.proxy);
  copyModuleOperations(ctx, draft, join(target, 'src/vendor/api'), 'src/vendor/api');
  /* The generator body, beside the app's own `codegen.ts` entry point. It is
     under scripts/ rather than src/ because it reads the disk: nothing here is
     part of the bundle, and the app's main tsconfig never sees it. */
  cpSync(ctx.content.codegenPath(), join(target, 'scripts', 'codegen'), { recursive: true });
  copied(draft, 'scripts/codegen', CONTENT_TREE.codegen);

  /* The operation barrel, written from what the filter above actually left
     behind rather than from the answers: it is the proxy's whole surface, and a
     name in it that no directory backs would be an import that does not
     resolve. Not every module has a generated namespace — auth and admin have
     none — so the directory is the only honest list. */
  const namespaces = generatedApiNamespaces(join(target, 'src/vendor/api/generated'));
  writeFileSync(join(target, 'src/operationDocs.ts'), generateOperationDocs(namespaces), 'utf8');
  generated(draft, 'src/operationDocs.ts', 'operationDocs');
  recordGeneratedClient(
    draft,
    join(target, 'src/vendor/api'),
    'src/vendor/api',
    join(target, 'src/vendor', SCHEMA_IN_VENDOR, 'schema.graphql'),
    namespaces,
  );

  repointMarkedImport(
    join(target, 'vite.config.ts'),
    'proxy-import',
    `./vendor/chatfuel-proxy/${proxyPluginEntry(proxyDir)}.js`,
  );
  rewrote(draft, 'vite.config.ts', 'proxy-import');
  // server/entry.ts is the production server template.
  if (
    repointMarkedImport(join(target, 'server/entry.ts'), 'proxy-server-import', '../vendor/chatfuel-proxy/server.js')
  ) {
    rewrote(draft, 'server/entry.ts', 'proxy-server-import');
  }
  // The Vercel function: the same core again, one directory deeper.
  if (repointMarkedImport(join(target, 'api/chatfuel.ts'), 'proxy-vercel-import', '../vendor/chatfuel-proxy/core.js')) {
    rewrote(draft, 'api/chatfuel.ts', 'proxy-vercel-import');
  }

  // A scaffold without auth must not carry @supabase/supabase-js.
  const selectedManifests = ctx.answers.modules.map((id) => ctx.registry.manifests.get(id)!);
  const unselectedManifests = [...ctx.registry.manifests.values()].filter((m) => !ctx.answers.modules.includes(m.id));
  pruneModuleDependencies(join(target, 'package.json'), unselectedManifests, selectedManifests);

  const authSql = ctx.answers.modules.includes('auth') ? copyAuthSql(ctx, join(target, 'supabase')) : [];
  for (const sql of authSql) {
    // The target name carries one sequence across modules, so it is not the
    // source name — the lock is where the two are tied together again.
    copied(draft, `supabase/${sql.name}`, sql.from);
    if (sql.rendered) rewrote(draft, `supabase/${sql.name}`, 'publishingSecret');
  }

  // Two files, not one: base.css paints the document and tokens.css does not,
  // which is what lets an embed host import the theme without the app's <body>
  // rules coming with it. A standalone scaffold wants both.
  rewriteMarkedBlock(
    join(target, 'src/index.css'),
    'ui-css',
    '@import "./vendor/ui/styles/tokens.css";\n@import "./vendor/ui/styles/base.css";',
  );
  rewrote(draft, 'src/index.css', 'ui-css');
  pruneTsconfigFallbacks(join(target, 'tsconfig.json'));
  rewrote(draft, 'tsconfig.json', 'pruneTsconfigFallbacks');
  includeCodegenInScriptsTsconfig(join(target, 'tsconfig.scripts.json'));
  rewrote(draft, 'tsconfig.scripts.json', 'includeCodegenInScriptsTsconfig');
  renamePackage(join(target, 'package.json'), basename(target));
  rewrote(draft, 'package.json', 'pruneModuleDependencies', 'renamePackage');
  // Before writeEnv, which the caller runs next: the name and the mark are two
  // of the values it writes.
  applyBrand(ctx, target);
  rewrote(draft, 'index.html', 'brandHtml');
  // A logo the user brought has no upstream at all, and it can land on the
  // template's own name.
  const brandLogo = ctx.answers.brand?.logoSource ? ctx.answers.brand.logoFile : undefined;
  if (brandLogo) generated(draft, `public/${brandLogo}`, 'brandLogo');
  /* Last, after every template transform: the drift checks above judge template
     files, and an overlay file must never be what they judge. Recorded in the
     lock by who wrote it — a replaced file still has its template upstream and
     must not read to `update` as the person's own edit, and an added one has no
     upstream at all. */
  const overlay = applyAppOverlay(ctx, target);
  for (const rel of overlay.replaced) rewrote(draft, rel, 'appOverlay');
  for (const rel of overlay.added) generated(draft, rel, 'appOverlay');
  if (overlay.dependencies.length > 0) rewrote(draft, 'package.json', 'appOverlay');

  const summary = `App scaffolded at ${target} (modules: ${selectedWithUi.join(', ')}${
    authSql.length > 0 ? `; supabase/: ${authSql.map((sql) => sql.name).join(', ')}` : ''
  }${ctx.answers.app ? `; app: ${ctx.answers.app.slug}` : ''})`;
  return { summary, draft };
}
