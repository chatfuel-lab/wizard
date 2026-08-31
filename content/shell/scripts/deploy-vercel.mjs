#!/usr/bin/env node
/**
 * Deploy this app to Vercel with the Vercel CLI, in one command.
 *
 *   npm run deploy
 *
 * No GitHub repo, no dashboard, no "Deploy to Vercel" button: check the CLI,
 * check the login, link the project, push the environment, deploy, then ask the
 * deployment itself whether it came up configured.
 *
 * Re-running is the normal case, so every step is idempotent: an existing
 * `.vercel/project.json` is kept (the project is never re-created), and
 * variables go up with `vercel env add --force`, which OVERWRITES the value for
 * that target instead of adding a second one. Variables that exist on Vercel
 * but not in the local .env are left alone — this script never deletes.
 *
 * What goes where, and why it matters:
 *   - CHATFUEL_TOKEN and SUPABASE_SERVICE_ROLE_KEY are runtime-only secrets.
 *     They are pushed as sensitive (Vercel's default for production/preview),
 *     so they cannot be read back out of the dashboard. They have no VITE_
 *     prefix, so Vite cannot bake them into the client bundle even in principle.
 *   - VITE_* are read TWICE: baked into dist/ at build time and read again by
 *     the proxy at runtime. They must be identical in both, which is why they
 *     are pushed as project variables rather than passed to the build alone.
 *   - .env itself is never uploaded (see .vercelignore). Vercel's project
 *     environment is the only source, so a build cannot silently pick up a
 *     stale local file.
 *
 * The helpers live in scripts/deploy/, one module per concern. This file runs
 * the deploy and re-exports the tested surface, so the modules under
 * scripts/deploy/ stay internal.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { checkEnv, parseEnvFile, selectEnv } from './deploy/env.mjs';
import { deployHosts, failNetwork, looksLikeNetworkFailure } from './deploy/network.mjs';
import { projectSlug } from './deploy/output.mjs';
import { fail, info, warn } from './deploy/report.mjs';
import { makeRunner, makeStreamRunner, resolveCli } from './deploy/runners.mjs';
import { stepCli, stepDeploy, stepEnv, stepHealth, stepLink, stepLogin, stepPublicUrl } from './deploy/steps.mjs';

export {
  DEPLOY_ENV,
  TARGETS,
  targetsFor,
  HEALTH_PATH,
  parseEnvFile,
  selectEnv,
  checkEnv,
  undeployedProxyVars,
} from './deploy/env.mjs';
export { proxyEnv, describeProxy, childEnv } from './deploy/egress.mjs';
export {
  projectSlug,
  projectNameArg,
  parseProjectNames,
  parseDeployUrl,
  maskValue,
  parseAliases,
} from './deploy/output.mjs';
export { deployHosts, looksLikeNetworkFailure, hostsInOutput, networkFailureLines } from './deploy/network.mjs';
export { makeRunner, makeStreamRunner } from './deploy/runners.mjs';
export { stepCli, listProjectNames } from './deploy/steps.mjs';

/** @param {string} [appDir] */
export async function main(appDir = process.cwd()) {
  console.log('\nDeploying to Vercel\n');

  const envPath = join(appDir, '.env');
  if (!existsSync(envPath)) {
    fail(`No .env in ${appDir}.`, 'Run the Chatfuel wizard here, or copy .env.example to .env and fill it in.');
  }
  const values = parseEnvFile(readFileSync(envPath, 'utf8'));
  const { errors, warnings } = checkEnv(values);
  for (const line of warnings) warn(line);
  if (errors.length > 0) {
    fail('.env is not deployable yet:', errors.join('\n  '));
  }
  const entries = selectEnv(values);

  let pkgName;
  try {
    pkgName = JSON.parse(readFileSync(join(appDir, 'package.json'), 'utf8')).name;
  } catch {
    fail(`No readable package.json in ${appDir}.`);
  }
  const slug = projectSlug(pkgName);

  const cli = resolveCli();
  if (cli.firstRunNote) info(cli.firstRunNote);
  const run = makeRunner(cli);
  const runStreamed = makeStreamRunner(cli);

  // The note above, then the call that does the waiting: stepCli is the first
  // call the CLI makes, so it is where the download and any reason it cannot
  // run at all both land.
  await stepCli(run, cli);
  await stepLogin(run, cli);
  await stepLink(run, appDir, slug);
  stepEnv(run, entries);
  const deploymentUrl = await stepDeploy(run, runStreamed, cli);
  const url = (await stepPublicUrl(run, deploymentUrl)) ?? deploymentUrl;
  await stepHealth(url);

  console.log(`\n  ${url}\n`);
  if (values.has('VITE_SUPABASE_URL')) {
    console.log('  One thing Vercel cannot do for you: Supabase must be told this origin is allowed to');
    console.log('  receive auth redirects, or sign-in on the deployed domain fails.');
    console.log('  Supabase -> Authentication -> URL configuration -> Redirect URLs, add:');
    console.log(`    ${url}/**\n`);
  }
}

/**
 * Anything that got past a step, reported the way the steps report.
 *
 * What actually arrives here is a child that would not start - ENOENT, EACCES -
 * because a host blocked inside the CLI comes back as a non-zero exit with
 * output, which stepDeploy owns. The network branch is belt and braces. The
 * point of the whole function is the rule at fail(): a raw stack trace claims
 * this script has a bug, and none of these are that.
 *
 * @param {any} err Whatever was thrown — the `code` sniff needs it untyped.
 * @returns {Promise<never>}
 */
async function failUnexpected(err) {
  const message = err instanceof Error ? err.message : String(err);
  if (err && err.code === 'ENOENT') {
    fail('Could not start the Vercel CLI.', 'Install it and run this again: npm i -g vercel');
  }
  if (looksLikeNetworkFailure(message)) await failNetwork(message, deployHosts(false), 'The deploy');
  fail(message || 'The deploy stopped unexpectedly.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main(fileURLToPath(new URL('..', import.meta.url)));
  } catch (err) {
    await failUnexpected(err);
  }
}
