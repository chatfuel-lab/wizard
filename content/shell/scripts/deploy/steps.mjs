/**
 * The deploy, step by step: sign-in, link, environment, deploy, public URL,
 * health. Every step takes the runner it shells out with as a parameter
 * rather than importing one, so a caller decides how the CLI is called.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { HEALTH_PATH, targetsFor } from './env.mjs';
import { describeProxy, outboundFetch } from './egress.mjs';
import {
  deployHosts,
  failNetwork,
  hostsInOutput,
  looksLikeNetworkFailure,
  networkFailureLines,
  unreachableHosts,
} from './network.mjs';
import {
  lastLine,
  maskValue,
  parseAliases,
  parseDeployUrl,
  parseProjectNames,
  projectNameArg,
  projectSlug,
} from './output.mjs';
import { ask, fail, info, ok, warn } from './report.mjs';

/** @typedef {import('./runners.mjs').Cli} Cli */
/** @typedef {import('./runners.mjs').Runner} Runner */
/** @typedef {import('./runners.mjs').StreamRunner} StreamRunner */
/** @typedef {import('./env.mjs').DeployEntry} DeployEntry */

/**
 * Before anything else: does the CLI we resolved actually run?
 *
 * One `--version` call, and it earns its place twice over. It is where the
 * first-run download happens, so the wait sits under the line that explains it;
 * and it separates "the CLI cannot start" from every later step's own failure.
 * Without it a CLI that never ran at all comes back as `whoami` exiting
 * non-zero, which reads as "not signed in" - and the run goes on to open a login
 * with a binary that does not exist, then reports a login that did not complete.
 * The reason is on screen the whole time and named nowhere.
 *
 * @param {Runner} run
 * @param {Cli} cli
 */
export async function stepCli(run, cli) {
  const probe = run(['--version'], { stdio: ['ignore', 'pipe', 'pipe'] });
  const output = `${probe.stdout || ''}\n${probe.stderr || ''}`;
  if (probe.status === 0) {
    // "Vercel CLI 59.5.0" - the name is already in the line being printed.
    const version = (lastLine(probe.stdout || '') ?? '').replace(/^vercel cli\s*/i, '');
    ok(`Vercel CLI: ${cli.label ?? cli.bin}${version ? ` (${version})` : ''}`);
    return;
  }
  if (looksLikeNetworkFailure(output)) {
    await failNetwork(output, deployHosts(cli.bin === 'npx'), 'Fetching the Vercel CLI');
  }
  fail(
    `The Vercel CLI could not be started (${cli.label ?? cli.bin}).`,
    [lastLine(output), 'Install it and run this again:  npm i -g vercel'].filter(Boolean).join('\n  '),
  );
}

/**
 * @param {Runner} run
 * @param {Cli} cli
 */
export async function stepLogin(run, cli) {
  const who = run(['whoami'], { stdio: ['ignore', 'pipe', 'pipe'] });
  if (who.status === 0) {
    ok(`Signed in to Vercel as ${who.stdout.trim()}`);
    return;
  }
  // A CLI that could not REACH Vercel also exits non-zero here, and reading
  // that as a rejected token sends somebody off to rotate a credential nobody
  // ever saw.
  const answer = `${who.stdout || ''}\n${who.stderr || ''}`;
  if (looksLikeNetworkFailure(answer)) {
    await failNetwork(answer, deployHosts(cli.bin === 'npx'), 'The Vercel sign-in check');
  }
  if (process.env.VERCEL_TOKEN) {
    fail('VERCEL_TOKEN was rejected by Vercel.', (who.stderr || '').trim().split('\n').pop());
  }
  if (!process.stdin.isTTY) {
    fail(
      'Not signed in to Vercel, and this is not an interactive terminal.',
      'Run `vercel login` yourself, or set VERCEL_TOKEN to a token from https://vercel.com/account/tokens',
    );
  }
  info('Not signed in - opening the Vercel login...');
  // Fully inherited: the login is a conversation - a piped stream would keep
  // the CLI's own prompts off the screen and leave somebody answering nothing.
  // Nothing is captured, so the remedies are the ones that hold either way.
  const login = run(['login'], { stdio: 'inherit', encoding: undefined });
  if (login.status !== 0) {
    fail(
      'Vercel login did not complete.',
      [
        'Sign in yourself, then run this again:  vercel login',
        'Or skip the browser: set VERCEL_TOKEN to a token from https://vercel.com/account/tokens',
      ].join('\n  '),
    );
  }
  ok('Signed in to Vercel');
}

/**
 * Every Vercel project name on this account, or `undefined` when the question
 * could not be asked.
 *
 * Two ways this used to answer "the name is free" when it did not know. The
 * exit status was never read, so a CLI that failed - not signed in, rate
 * limited, offline - handed back an empty list, and the deploy went ahead into
 * a project that already existed, replacing its environment variables and
 * whatever was live under it. And the list is paginated: past the first page
 * the names simply were not there, which reads the same way.
 *
 * So: the status decides, and the pages are followed to the end. `--limit` is
 * not in every version of the CLI, and a run that fails on the first page with
 * it falls back to the plain call rather than reporting an account it could not
 * read.
 *
 * @param {Runner} run
 * @returns {Set<string> | undefined}
 */
export function listProjectNames(run) {
  const call = (/** @type {string[]} */ args) => run(args, { stdio: ['ignore', 'pipe', 'pipe'] });
  const names = new Set();
  let base = ['project', 'ls', '--limit', '100'];
  let next;
  for (let page = 0; page < 20; page += 1) {
    let result = call(next ? [...base, '--next', next] : base);
    if (result.status !== 0) {
      if (page > 0 || !base.includes('--limit')) return undefined;
      base = ['project', 'ls'];
      result = call(base);
      if (result.status !== 0) return undefined;
    }
    for (const name of parseProjectNames(result.stdout || '')) names.add(name);
    /* The CLI prints the command for the next page in its own footer, which is
       the only place the cursor appears. No footer means this was the last. */
    const more = /--next\s+(\d+)/.exec(`${result.stdout || ''}\n${result.stderr || ''}`);
    if (!more || more[1] === next) return names;
    next = more[1];
  }
  return names;
}

/**
 * The Vercel project name — which is also the address the app answers on
 * (`<name>.vercel.app`, or `<name>-<word>.vercel.app` when the short one is
 * taken). Asked rather than derived, because the derived one is the scaffold's
 * directory name and every app the wizard makes starts out called the same
 * thing; the second one would silently land on top of the first.
 *
 * Precedence: --project, then VERCEL_PROJECT_NAME (the wizard asks and passes
 * it), then the terminal, then the directory name.
 *
 * @param {Runner} run
 * @param {string} appDir
 * @param {string} fallback
 * @returns {Promise<string>}
 */
async function stepName(run, appDir, fallback) {
  const given = projectNameArg(process.argv.slice(2)) ?? process.env.VERCEL_PROJECT_NAME;
  const taken = listProjectNames(run);
  if (!taken) {
    warn('Could not list your Vercel projects, so this cannot tell you whether a name is already taken.');
    info('A name that already exists is deployed into: its environment variables and what is live are replaced.');
  }

  if (given) {
    const slug = projectSlug(given);
    if (taken?.has(slug)) warn(`The Vercel project "${slug}" already exists — deploying into it.`);
    return slug;
  }

  for (;;) {
    const answer = await ask(`\n  Name for the Vercel project [${fallback}]: `, fallback);
    const slug = projectSlug(answer);
    if (slug !== answer.trim()) info(`Vercel needs a plain lowercase name — using "${slug}".`);
    if (taken && !taken.has(slug)) return slug;
    if (!process.stdin.isTTY) {
      warn(
        taken
          ? `The Vercel project "${slug}" already exists — deploying into it.`
          : `Deploying as "${slug}" without knowing whether it already exists.`,
      );
      return slug;
    }
    if (taken) {
      warn(`You already have a Vercel project called "${slug}". Deploying into it would overwrite its`);
      info('environment variables and replace whatever is live there.');
    } else {
      warn(`Nothing here knows whether "${slug}" is free. If it is not, this overwrites what is under it.`);
    }
    const reuse = await ask('  Deploy into that existing project anyway? [y/N]: ', 'n');
    if (/^y(es)?$/i.test(reuse)) return slug;
  }
}

/**
 * @param {Runner} run
 * @param {string} appDir
 * @param {string} fallback
 */
export async function stepLink(run, appDir, fallback) {
  const linkFile = join(appDir, '.vercel', 'project.json');
  if (existsSync(linkFile)) {
    let name = 'unknown';
    try {
      name = JSON.parse(readFileSync(linkFile, 'utf8')).projectName ?? name;
    } catch {
      /* a link file we cannot read is still a link - vercel owns its shape */
    }
    ok(`Already linked to the Vercel project "${name}" (.vercel/project.json) - reusing it`);
    return;
  }
  const slug = await stepName(run, appDir, fallback);
  info(`Linking this directory to a Vercel project named "${slug}"...`);
  const linked = run(['link', '--yes', '--project', slug], { stdio: 'inherit', encoding: undefined });
  if (linked.status !== 0 || !existsSync(linkFile)) {
    fail(
      `Could not link the project "${slug}".`,
      'A project with that name may belong to another team - run `vercel link` by hand once, then re-run this.',
    );
  }
  ok(`Linked to "${slug}"`);
}

/**
 * @param {Runner} run
 * @param {DeployEntry[]} entries
 * @param {string[]} [targets]
 */
export function stepEnv(run, entries, targets = targetsFor()) {
  if (entries.length === 0) {
    warn('Nothing to push: .env has none of the variables this app reads.');
    return;
  }
  if (targets.includes('preview')) {
    warn(
      'DEPLOY_PREVIEW_ENV=1: these values also go to preview, where every branch build can read them. Use it only with a preview-only .env.',
    );
  }
  info(`Pushing ${entries.length} variable(s) to ${targets.join(' and ')}...`);
  for (const entry of entries) {
    for (const target of targets) {
      const base = ['env', 'add', entry.name, target, '--force'];
      let result = run([...base, ...(entry.secret ? [] : ['--no-sensitive'])], {
        input: entry.value,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      // A team can enforce sensitive variables, and then --no-sensitive is an
      // error rather than a preference. Take the enforced answer.
      if (result.status !== 0 && !entry.secret) {
        result = run(base, { input: entry.value, stdio: ['pipe', 'pipe', 'pipe'] });
      }
      if (result.status !== 0) {
        fail(
          `Could not set ${entry.name} for ${target}.`,
          (result.stderr || result.stdout || '').trim().split('\n').filter(Boolean).pop(),
        );
      }
    }
    ok(`${entry.name} = ${maskValue(entry.value, entry.secret)}`);
  }
}

/**
 * @param {Runner} run
 * @param {StreamRunner} runStreamed
 * @param {Cli} cli
 * @returns {Promise<string>}
 */
export async function stepDeploy(run, runStreamed, cli) {
  info('Building and deploying to production...');
  // Both streams are kept, because the CLI promises nothing about which one the
  // URL arrives on and has already moved it once - see parseDeployUrl. Both are
  // written on as they arrive, so a failing build stays readable as it happens.
  const deployed = await runStreamed(['deploy', '--prod', '--yes']);
  if (deployed.status !== 0) {
    const output = `${deployed.stdout}\n${deployed.stderr}`;
    const hosts = deployHosts(cli.bin === 'npx');
    if (deployed.timedOut) {
      const named = hostsInOutput(output);
      const unreachable = named.length > 0 ? [] : await unreachableHosts(hosts);
      const evidence = networkFailureLines({ named, unreachable, checked: hosts, proxy: describeProxy() }).slice(1);
      fail('The deployment was still running after 15 minutes and was stopped.', evidence.join('\n  '));
    }
    if (looksLikeNetworkFailure(output)) await failNetwork(output, hosts);
    // The log is on screen already, but the sentence that ends it is what a
    // person needs, and it is 500 lines up by the time they read this.
    fail('The deployment failed - the build output above says why.', lastLine(output));
  }
  let url = parseDeployUrl(deployed.stdout, deployed.stderr);
  if (!url) {
    // The deployment itself succeeded; only the reading of it failed. Ask for
    // the same answer a second way rather than throw a live deployment away.
    warn('Vercel printed no URL - asking it for the deployment that just went live.');
    const listed = run(['ls', '--environment', 'production', '--limit', '1'], { stdio: ['ignore', 'pipe', 'pipe'] });
    url = parseAliases(`${listed.stdout || ''}\n${listed.stderr || ''}`)[0];
  }
  if (!url) {
    fail('The deployment finished but Vercel printed no URL.', `${deployed.stdout}\n${deployed.stderr}`.trim());
  }
  ok(`Deployed: ${url}`);
  return url;
}

/**
 * How a URL answered: open to anyone, behind Vercel's SSO wall, or not reachable
 * from this machine at all.
 *
 * The three are worth telling apart. "Protected" is a setting somebody has to
 * change in the dashboard; "unreachable" is usually this machine's own network,
 * and reporting it as a protection setting sends people to the wrong page.
 *
 * @param {string} url
 * @returns {Promise<{ state: 'open' | 'protected' } | { state: 'unreachable', reason: string }>}
 */
async function probe(url) {
  try {
    const res = await outboundFetch(`${url}/`, { redirect: 'manual', signal: AbortSignal.timeout(20_000) });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location') ?? '';
      const wall = location.includes('/sso-api') || res.headers.get('set-cookie')?.includes('_vercel_sso_nonce');
      return wall ? { state: 'protected' } : { state: 'open' };
    }
    return { state: 'open' };
  } catch (err) {
    return { state: 'unreachable', reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * The URL to hand somebody who is not on this Vercel team.
 *
 * `vercel deploy` prints the DEPLOYMENT url (project-hash-team.vercel.app), and
 * under Vercel's default Deployment Protection that one is behind an SSO wall —
 * fine for the deployer, a dead link for everybody else. The production domain
 * assigned alongside it is public. Both are aliases of the same deployment, and
 * which is which is not derivable from the name, so each candidate is asked
 * rather than guessed: the first that does not answer with the SSO wall wins.
 *
 * @param {Runner} run
 * @param {string} deploymentUrl
 * @returns {Promise<string | null>}
 */
export async function stepPublicUrl(run, deploymentUrl) {
  const inspected = run(['inspect', deploymentUrl], { stdio: ['ignore', 'pipe', 'pipe'] });
  const candidates = parseAliases(`${inspected.stdout || ''}\n${inspected.stderr || ''}`).filter(
    (u) => u !== deploymentUrl,
  );
  let unreachable;
  for (const candidate of [...candidates, deploymentUrl]) {
    const verdict = await probe(candidate);
    if (verdict.state === 'open') {
      if (candidate !== deploymentUrl) ok(`Public URL: ${candidate}`);
      return candidate;
    }
    if (verdict.state === 'unreachable') unreachable = verdict.reason;
  }

  if (unreachable) {
    warn(`No URL for this deployment answered from this machine (${unreachable}).`);
    const proxy = describeProxy();
    if (proxy) info(`Requests went through ${proxy} — check that the proxy allows vercel.app.`);
    return null;
  }

  warn('Every URL for this deployment is behind Vercel Authentication — nobody outside your Vercel team can open it.');
  info('Nobody can sign up through an SSO wall. Turn it off in the dashboard:');
  info('  Project -> Settings -> Deployment Protection -> Vercel Authentication -> Disabled.');
  info('That is the one step the Vercel CLI cannot do; everything else here is automatic.');
  return null;
}

/**
 * Ask the deployment what it thinks of its own configuration.
 *
 * This is the step that catches the failure this whole script exists to
 * prevent: a build that succeeded and an app that cannot reach Chatfuel because
 * a variable did not make it. It costs one request and no Chatfuel call.
 *
 * @param {string} url
 */
export async function stepHealth(url) {
  let response;
  try {
    // redirect: 'manual' on purpose. Vercel's Deployment Protection answers
    // 302 to its SSO page; following it would turn a diagnosable redirect into
    // an HTML 200 and the reason would be lost.
    response = await outboundFetch(`${url}${HEALTH_PATH}`, { redirect: 'manual', signal: AbortSignal.timeout(30_000) });
  } catch (err) {
    warn(`Could not reach ${url}${HEALTH_PATH} (${err instanceof Error ? err.message : String(err)}).`);
    const proxy = describeProxy();
    if (proxy) info(`Requests went through ${proxy} — check that the proxy allows this deployment.`);
    return;
  }
  if (response.status >= 300 && response.status < 400) {
    warn(`${url}${HEALTH_PATH} redirected to ${response.headers.get('location') || '(no Location header)'}.`);
    return;
  }
  const body = await response.text();
  let health;
  try {
    health = JSON.parse(body);
  } catch {
    warn(`${url}${HEALTH_PATH} did not answer JSON (HTTP ${response.status}).`);
    info('Something other than the proxy answered — check the routes in vercel.json.');
    return;
  }
  /* One field, and one field only: the route answers an unauthenticated caller,
     so it deliberately says nothing about the gate or which variable is missing.
     That answer lives in the deployment's own start-up log, where
     `describeProblem` names the variable — send the reader there rather than
     printing `undefined` for fields the route stopped returning. */
  if (health.ok) {
    ok('Proxy is up');
    return;
  }
  fail(
    'The app is deployed but its proxy is misconfigured.',
    'Open the deployment log — the proxy names the variable it is missing on start-up — then check it with `vercel env ls` and run this again.',
  );
}
