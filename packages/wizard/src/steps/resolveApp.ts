import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import * as p from '@clack/prompts';
import { DEFAULT_APPS_REPO } from '../constants';
import { WizardError } from '../errors';
import { insideProblem } from '../insidePath';
import { fetchAppsRepo, isLocalRepoPath } from '../apps/fetch';
import { listAppSlugs, parseAppManifest } from '../apps/manifest';
import { logoProblem } from '../scaffold/brandAssets';
import type { WizardContext } from '../context';

const SLUG_PATTERN = /^[a-z][a-z0-9-]*$/;

/**
 * The shape of the app flags, judged before anybody is asked anything — the
 * same contract as the other assert*Flags: a contradiction on the command line
 * is answered by the command line.
 *
 * `--app-name` and `--logo` stay legal WITH `--app` and win over the app's
 * brand: the preset is a default, the person's own flags are a decision.
 */
export function assertAppFlags(ctx: WizardContext): void {
  const { app, appsRepo, appsRef, embed, modules } = ctx.flags;
  if (app === undefined) {
    if (appsRepo !== undefined || appsRef !== undefined) {
      throw new WizardError('--apps-repo/--apps-ref only make sense with --app.');
    }
    return;
  }
  if (!SLUG_PATTERN.test(app)) {
    throw new WizardError(`--app "${app}" is not an app slug`, 'Slugs look like: instagram-comments');
  }
  if (embed) {
    throw new WizardError('--app cannot be combined with --embed', 'An app preset scaffolds a new standalone app.');
  }
  if (modules !== undefined) {
    throw new WizardError('--app cannot be combined with --modules', 'The app decides which modules it installs.');
  }
}

/** Where the catalog comes from: flag → CHATFUEL_APPS_REPO env → the default. */
const appsRepoUrl = (ctx: WizardContext): string =>
  ctx.flags.appsRepo ?? process.env.CHATFUEL_APPS_REPO ?? DEFAULT_APPS_REPO;

/**
 * A catalog other than the built-in one, named out loud before it is fetched.
 *
 * What an app preset is, stated plainly: files copied into the new app, npm
 * dependencies added to its package.json, and a playbook handed to the coding
 * agent as its build plan. Every one of those is content from the catalog, and
 * the agent follows the playbook. So the catalog is trusted code, and the
 * catalog can be chosen by an environment variable that nobody typed today —
 * CHATFUEL_APPS_REPO set once in a shell profile, or inherited by a CI job.
 * That is the case this exists for: the default is silent, anything else has
 * to be looked at.
 *
 * `--yes` cannot be asked, so where the URL came from decides for it, and the
 * two sources are not equivalent. `--apps-repo` is on the command line that is
 * running: whoever typed `--yes` typed the catalog beside it and meant both.
 * CHATFUEL_APPS_REPO is not — it can predate this command by months, and under
 * `--yes` there is no prompt left in which anyone would notice. So the flag
 * proceeds and the variable refuses, naming itself, rather than warning into a
 * log nobody is reading at the time.
 *
 * A path on this machine is named but not held up for a yes: it is code the
 * person already has, no fetch crosses the network to get it, and it is the
 * ordinary way to work on a catalog locally.
 */
async function confirmAppsRepo(ctx: WizardContext, repo: string): Promise<void> {
  if (repo === DEFAULT_APPS_REPO) return;
  const source = ctx.flags.appsRepo ? '--apps-repo' : 'CHATFUEL_APPS_REPO in this environment';
  if (isLocalRepoPath(repo)) {
    p.log.info(`App preset catalog: ${repo} (${source}) — a directory on this machine, not the standard catalog.`);
    return;
  }
  p.note(
    [
      `Catalog: ${repo}`,
      `Named by: ${source}`,
      '',
      'An app preset is trusted code. From this catalog the wizard will copy files',
      'into the new app, add the npm dependencies its manifest names, and hand its',
      'playbook to the coding agent as the build plan the agent then follows.',
      '',
      'Use a catalog you control or trust as you would trust a dependency.',
    ].join('\n'),
    'Not the standard apps catalog',
  );
  if (ctx.flags.yes) {
    if (ctx.flags.appsRepo) {
      p.log.warn(`--yes: fetching the app preset from ${repo} without asking, because --apps-repo named it.`);
      return;
    }
    throw new WizardError(
      `--yes will not fetch an app preset from a catalog named only by CHATFUEL_APPS_REPO (${repo})`,
      'Pass --apps-repo <url> to say the catalog is meant, unset CHATFUEL_APPS_REPO to use the standard one, or drop --yes and answer the question.',
    );
  }
  const go = await p.confirm({ message: `Fetch the app preset from ${repo}?`, initialValue: false });
  if (p.isCancel(go) || !go) throw new WizardError('Cancelled.');
}

/** What the chosen preset adds to the app, before it is added. */
function noteAppEffects(ctx: WizardContext): void {
  const app = ctx.answers.app;
  if (!app) return;
  const deps = Object.entries(app.manifest.npmDependencies ?? {});
  p.note(
    [
      `Modules: ${app.manifest.modules.join(', ')}`,
      `npm dependencies added: ${deps.length === 0 ? 'none' : deps.map(([name, range]) => `${name}@${range}`).join(', ')}`,
      'Files: the preset overlays its own source over the scaffold (it never replaces .env, package.json or the proxy entry points — though its dependencies above are merged into package.json).',
      "Playbook: goes into the coding agent's instructions as the plan to build from.",
    ].join('\n'),
    `The "${app.manifest.name}" preset`,
  );
}

/**
 * Fetch the catalog and pin down everything the later steps will lean on —
 * the manifest, the playbook, the logo — so a broken app fails here, in
 * seconds, not after a token prompt and a scaffold.
 *
 * Runs right after preflight: selectModules and brand read `answers.app`.
 * The clone must outlive the scaffold step (it copies the overlay from it);
 * run.ts calls `cleanup` in its `finally`.
 */
export async function resolveApp(ctx: WizardContext): Promise<void> {
  const slug = ctx.flags.app;
  if (!slug) return;

  const repo = appsRepoUrl(ctx);
  await confirmAppsRepo(ctx, repo);
  const spinner = p.spinner();
  spinner.start(`Fetching the apps catalog from ${repo}`);
  let checkout;
  try {
    checkout = await fetchAppsRepo(repo, ctx.flags.appsRef);
  } catch (err) {
    spinner.stop('Could not fetch the apps catalog');
    throw err;
  }

  try {
    const appDir = join(checkout.dir, 'apps', slug);
    const manifestPath = join(appDir, 'app.json');
    if (!existsSync(manifestPath)) {
      const slugs = listAppSlugs(checkout.dir);
      throw new WizardError(
        `The catalog has no app "${slug}"`,
        slugs.length > 0 ? `Available apps: ${slugs.join(', ')}` : 'The catalog has no apps at all.',
      );
    }

    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (err) {
      throw new WizardError(
        `App "${slug}": app.json is not valid JSON`,
        err instanceof Error ? err.message : undefined,
      );
    }
    const manifest = parseAppManifest(raw, `App "${slug}"`);
    if (manifest.id !== slug) {
      throw new WizardError(`App "${slug}": app.json says id "${manifest.id}" — the catalog is inconsistent`);
    }

    // Read the playbook NOW: the handoff is the last step of a long run, and
    // "the file was missing all along" is not an ending it should have.
    const playbookRel = manifest.playbook ?? 'playbook.md';
    const playbookPath = resolve(appDir, playbookRel);
    // The playbook is copied verbatim into CLAUDE.md and AGENTS.md and
    // committed, so a symlink here is a file of the person's choosing read out
    // into a repository they are about to push.
    if (insideProblem(appDir, playbookPath) || !existsSync(playbookPath)) {
      throw new WizardError(`App "${slug}": playbook "${playbookRel}" is missing from the catalog`);
    }
    const playbook = readFileSync(playbookPath, 'utf8').trim();

    // The logo goes through the same gate as --logo, for the same reason the
    // two flags share one: a preset must not ship what a prompt would refuse.
    if (manifest.brand.logo) {
      const logoPath = resolve(appDir, manifest.brand.logo);
      const escape = insideProblem(appDir, logoPath);
      const problem = escape ? `${manifest.brand.logo} escapes the app directory: ${escape}` : logoProblem(logoPath);
      if (problem) throw new WizardError(`App "${slug}": its logo cannot be used`, problem);
    }

    ctx.answers.app = {
      slug,
      manifest,
      dir: appDir,
      repo,
      sha: checkout.sha,
      playbook,
      cleanup: checkout.cleanup,
    };
    spinner.stop(`App "${manifest.name}" (${slug}) from ${repo} @ ${checkout.sha.slice(0, 7)}`);
    noteAppEffects(ctx);
  } catch (err) {
    checkout.cleanup();
    spinner.stop(`App "${slug}" could not be resolved`);
    throw err;
  }
}
