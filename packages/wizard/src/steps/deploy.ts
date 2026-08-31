import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { execa } from 'execa';
import { stepArt } from '../art';
import { authPatchDiff, desiredAuthPatch } from '../supabase/authConfig';
import { createManagementClient } from '../supabase/management';
import { WizardError } from '../errors';
import type { WizardContext } from '../context';

/**
 * Offer to put the freshly scaffolded app on Vercel, right here, with the
 * Vercel CLI — no GitHub repo, no dashboard.
 *
 * The work is not done here: `scripts/deploy-vercel.mjs` ships INSIDE the app
 * and does all of it (CLI, login, link, environment, deploy, health check).
 * This step is only the offer, so that the same command keeps working a month
 * later when the wizard is long gone. Everything the wizard knows that the
 * script cannot — chiefly the Supabase project it just created — is applied
 * afterwards, from here.
 *
 * Placed BEFORE the handoff on purpose: the handoff can start a coding-agent
 * session that owns the terminal until the user is finished with it, and a
 * question asked on the other side of that is a question asked into a session
 * somebody has already walked away from. Deploying needs the terminal (the
 * Vercel login is interactive), so it goes first.
 *
 * Never in `--yes` runs and never without a TTY: a deployment is a public URL
 * with somebody's Chatfuel token behind it, and that is not something a
 * non-interactive flag should be able to cause.
 */
export async function deploy(ctx: WizardContext): Promise<void> {
  const appDir = ctx.answers.appDir;
  // Embed mode has no app of its own — deployment is the host project's story.
  if (!appDir || ctx.answers.mode === 'embed') return;
  if (ctx.flags.yes || ctx.flags.dryRun || !process.stdin.isTTY) return;
  if (!existsSync(join(appDir, 'vercel.json'))) return;

  p.log.message(stepArt('deploy'));
  const go = await p.confirm({
    message: 'Deploy this app to Vercel now? (free tier is enough to start)',
    initialValue: false,
  });
  if (p.isCancel(go) || !go) {
    p.log.info(`You can do it later:  cd ${appDir} && ${ctx.answers.packageManager} run deploy`);
    return;
  }

  // The name is the address: <name>.vercel.app when it is free. Derived from
  // the directory it would be the same for everybody the wizard ever runs for,
  // and the second app would land on top of the first — so it is asked.
  const name = await p.text({
    message: 'Name for the Vercel project (it becomes the app’s address):',
    placeholder: basename(appDir),
    defaultValue: basename(appDir),
  });
  // Declining is answered above; this is Ctrl+C, and it ends the run.
  if (p.isCancel(name)) throw new WizardError('Cancelled.');

  const pm = ctx.answers.packageManager;
  const project = name.trim() || basename(appDir);

  // A failed deploy is offered again rather than reported and left behind. Most
  // of what stops it is one command away — a sign-in, an install, a network —
  // and the person is still here, at the terminal, with the whole log on screen.
  for (;;) {
    const result = await runDeployScript(appDir, pm, project);
    if (result.url) {
      ctx.answers.deployUrl = result.url;
      p.log.success(`Live at ${result.url}`);
      await allowRedirectsTo(ctx, result.url);
      return;
    }
    if (result.ok) {
      // Exit 0 and no address to read: it deployed, we just cannot say where.
      // Nothing downstream is told a URL it would then print or allowlist.
      p.log.warn(
        `The deploy finished but printed no address for the app. Check it with: cd ${appDir} && ${pm} run deploy`,
      );
      return;
    }
    p.log.error(`The deploy stopped${result.reason ? `: ${result.reason}` : '.'}`);
    const next = await p.select({
      message: 'What now?',
      options: [
        { value: 'retry', label: 'Try again' },
        { value: 'skip', label: 'Skip for now' },
      ],
      initialValue: 'retry',
    });
    if (!p.isCancel(next) && next === 'retry') continue;
    // Remembered, because nothing else in the run would ever mention it again:
    // the closing summary would print `run deploy` as a fresh suggestion, as if
    // this had not just been tried.
    ctx.answers.deployFailed = true;
    p.log.warn(`Not deployed. Once it is fixed:  cd ${appDir} && ${pm} run deploy`);
    return;
  }
}

/** What one run of the app's deploy script came back with. */
interface DeployRun {
  /** The script exited 0. */
  ok: boolean;
  /** The public URL, when the output carried one. */
  url?: string;
  /** The one line worth repeating when it did not — the script's own STOPPED line. */
  reason?: string;
}

/**
 * Run the app's own deploy script and read the URL back off its output.
 *
 * Both streams are teed rather than swallowed: the script's step-by-step log IS
 * the error message when something fails, and `vercel login` needs the terminal
 * (stdin stays inherited, so the login is still a conversation). stderr is kept
 * as well as shown, because the sentence that ends a failed run is on it and is
 * hundreds of lines up by the time anyone is asked what to do about it.
 */
async function runDeployScript(appDir: string, pm: string, projectName: string): Promise<DeployRun> {
  console.log(pc.dim(`\n  ${pm} run deploy\n`));
  let output = '';
  let errors = '';
  try {
    const child = execa(pm, ['run', 'deploy'], {
      cwd: appDir,
      stdio: ['inherit', 'pipe', 'pipe'],
      // The script asks for this itself when it is run on its own later.
      // execa extends process.env rather than replacing it, so the deploy script
      // gets everything this process has. The Vercel CLI's own environment is
      // the script's business - it sets what it needs on each call it makes.
      env: { VERCEL_PROJECT_NAME: projectName },
    });
    child.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString();
      process.stdout.write(chunk);
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      errors += chunk.toString();
      process.stderr.write(chunk);
    });
    await child;
  } catch {
    return { ok: false, reason: stopReason(errors) };
  }
  return { ok: true, url: deploymentUrl(output) };
}

/**
 * Hosts that appear in a successful deploy's output and are not the app.
 * `vercel.link` is where the CLI puts inspection pages and the explanations
 * behind its errors; `vercel.com` is the dashboard. Both are printed on lines
 * of their own, and both outlive the run — an origin taken from one of them is
 * written into the Supabase redirect allowlist and handed to the user as the
 * address of their app.
 */
const NOT_A_DEPLOYMENT = ['vercel.com', 'vercel.link', 'vercel.sh'];

/**
 * The public URL, out of everything the script printed.
 *
 * Deliberately not "the last line that looks like a URL". That was wrong in
 * both directions: the deploy script prints the Supabase redirect hint
 * `<url>/**` AFTER the URL whenever the auth module is on, so the last match was
 * routinely the hint and not the address; and any vercel.link the CLI happened
 * to print last would have been taken for the deployment.
 *
 * What a deployment URL is: https, with nothing after the host — no path, no
 * query, no fragment — on a host that is not one of Vercel's own service
 * domains. Stated as a rejection rather than as `*.vercel.app` because a
 * project on a custom domain is still a deployment, and its address is the one
 * the user actually wants.
 *
 * Undefined when nothing qualifies. That is a real outcome, not a failure: the
 * deploy succeeded and this run simply cannot say where. Every caller treats it
 * as unknown rather than guessing.
 */
export function deploymentUrl(output: string): string | undefined {
  const lines = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of [...lines].reverse()) {
    if (!/^https:\/\/\S+$/.test(line)) continue;
    let parsed: URL;
    try {
      parsed = new URL(line);
    } catch {
      continue;
    }
    if (parsed.search || parsed.hash) continue;
    if (parsed.pathname !== '/' && parsed.pathname !== '') continue;
    const host = parsed.hostname.toLowerCase();
    // A bare hostname is a machine on somebody's network, not a deployment.
    if (!host.includes('.')) continue;
    if (host.endsWith('.vercel.app')) return parsed.origin;
    if (NOT_A_DEPLOYMENT.some((service) => host === service || host.endsWith(`.${service}`))) continue;
    return parsed.origin;
  }
  return undefined;
}

/**
 * The script says why it stopped on a `STOPPED:` line; anything else on stderr
 * is the package manager's own noise about a non-zero exit code.
 */
function stopReason(errors: string): string | undefined {
  const lines = errors
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const stopped = lines.findIndex((line) => line.startsWith('STOPPED:'));
  if (stopped === -1) return undefined;
  return lines
    .slice(stopped, stopped + 2)
    .join(' ')
    .replace(/^STOPPED:\s*/, '');
}

/**
 * Add the deployed origin to the Supabase redirect allowlist.
 *
 * Without it, signing in on the deployed domain fails: GoTrue refuses to
 * redirect anywhere that is not on the list, and the app is the redirect
 * target. The wizard already does this for `--app-url`, but at that point in
 * the run nobody knows the URL yet — it does not exist until the deploy above.
 *
 * Only possible on the PAT path: the manual path never had a Management API
 * token, so there the answer is one line telling the person exactly what to
 * add, said once, here.
 */
async function allowRedirectsTo(ctx: WizardContext, url: string): Promise<void> {
  const auth = ctx.answers.auth;
  if (!auth) return; // no auth module — no redirect allowlist to keep

  const ref = auth.projectRef;
  const pat = ctx.secrets.supabaseToken;
  if (auth.method !== 'pat' || !ref || !pat) {
    p.log.warn(
      [
        'One last thing, and sign-in on that domain will not work without it:',
        'Supabase → Authentication → URL configuration → Redirect URLs, add',
        `  ${url}/**`,
      ].join('\n'),
    );
    return;
  }

  const spinner = p.spinner();
  spinner.start('Allowing that origin to receive Supabase auth redirects…');
  try {
    const client = createManagementClient({ token: pat });
    const current = await client.getAuthConfig(ref);
    const patch = desiredAuthPatch(current, { appUrl: url });
    const changed = authPatchDiff(current, patch);
    if (changed.length === 0) {
      spinner.stop('Supabase redirect allowlist already covers it');
      return;
    }
    await client.patchAuthConfig(ref, patch);
    ctx.answers.auth = { ...auth, appUrl: url };
    spinner.stop(`Supabase redirect allowlist updated (${changed.join(', ')})`);
  } catch {
    spinner.stop('Supabase redirect allowlist not updated');
    p.log.warn(`Add it by hand: Authentication → URL configuration → Redirect URLs → ${url}/**`);
  }
}
