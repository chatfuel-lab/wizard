import * as p from '@clack/prompts';
import { createContentSource } from './content';
import { DISCORD_URL } from './constants';
import { loadRegistry } from './registry';
import { WizardError } from './errors';
import { capture } from './telemetry';
import { secretFlagsInUse } from './secretFlags';
import { registerSecret } from './log';
import { preflight } from './steps/preflight';
import { resolveContent } from './steps/resolveContent';
import { welcome } from './steps/welcome';
import { mode } from './steps/mode';
import { selectModules } from './steps/selectModules';
import { materialiseContent } from './steps/materialise';
import { embedScaffold } from './steps/embed';
import { agentPick, assertAgentFlags } from './steps/agentPick';
import { skillsTarget } from './steps/skillsTarget';
import { token } from './steps/token';
import { workspacePick } from './steps/workspacePick';
import { trial } from './steps/trial';
import { authSetup, assertAuthFlags } from './steps/authSetup';
import { adminSetup, assertAdminFlags } from './steps/adminSetup';
import { originsSetup, assertAllowedOriginsFlag } from './steps/originsSetup';
import { brand, assertBrandFlags } from './steps/brand';
import { resolveApp, assertAppFlags } from './steps/resolveApp';
import { scaffold } from './steps/scaffold';
import { deploy } from './steps/deploy';
import { prepareGithub, pushToGithub } from './steps/github';
import { handoff, launchAgent } from './steps/handoff';
import { outro } from './steps/outro';
import { launch } from './steps/launch';
import type { WizardContext, WizardFlags } from './context';

export function createContext(flags: WizardFlags): WizardContext {
  const content = createContentSource();
  // A Supabase PAT typed at the prompt is masked the moment it is read
  // (steps/authSetupProject.ts). One handed in on the command line or through
  // the environment took a different road to the same places and arrived
  // unmasked, so anything the run printed that carried it — a management API
  // error body, a verbose transport message — echoed it into the terminal and
  // into whatever CI log was reading along.
  const supabaseToken = flags.supabaseToken ?? process.env.SUPABASE_ACCESS_TOKEN;
  if (supabaseToken) registerSecret(supabaseToken);
  return {
    flags,
    secrets: { supabaseToken },
    content,
    registry: loadRegistry(content),
    answers: {
      mode: 'standalone',
      modules: [],
      skillsTarget: 'project',
      packageManager: 'npm',
      agentsPresent: [],
      skillsInstalled: [],
      skillsPresent: [],
      env: {},
    },
  };
}

/**
 * Say a failure the way the wizard says everything else, and report whether it
 * was ours to say. Every command goes through this — a command that skipped it
 * ended in a raw stack trace, which is the one output a person cannot act on.
 */
export function reportWizardError(err: unknown, verbose = false): boolean {
  if (!(err instanceof WizardError)) return false;
  p.log.error(err.message);
  if (err.hint) p.log.info(err.hint);
  // The cause carries what the transport actually said: noise in the normal
  // case, and the whole answer when someone is diagnosing one.
  if (verbose && err.cause instanceof Error) p.log.message(err.cause.message);
  p.log.info(`Stuck? Ask in the community: ${DISCORD_URL}`);
  p.outro('Wizard stopped.');
  process.exitCode = 1;
  return true;
}

/**
 * A run that will ask questions needs somebody who can answer them.
 *
 * clack reads from stdin and ends the PROCESS on end-of-input — it does not
 * throw, and it does not return. Piped, redirected from /dev/null, or started
 * by a CI job, the first prompt therefore exits 0 in the middle of the run:
 * success, by every signal a script can read, with no app anywhere. The token
 * step says this for itself because it is the one that used to be reached
 * first; every step below it had the same hole and no such line.
 *
 * Said once, before anything is asked or spent, and only when there is no
 * `--yes` to answer with.
 */
function assertAnswerable(flags: WizardFlags): void {
  if (flags.yes || process.stdin.isTTY) return;
  throw new WizardError(
    'This run has questions and nothing is attached to the terminal to answer them',
    'Add --yes and the flags for the answers, or run the wizard in a terminal.',
  );
}

export async function run(flags: WizardFlags): Promise<void> {
  const ctx = createContext(flags);
  capture('wizard_started');
  try {
    assertAnswerable(flags);
    await welcome(ctx);
    // Said once, before the value is used for anything: `ps` shows a command
    // line to every process on the machine, and the shell keeps it in history.
    for (const { flag, env } of secretFlagsInUse(flags)) {
      p.log.warn(
        `${flag} puts a credential on the command line, where other processes can read it. ${env} does the same job without that.`,
      );
    }
    // Command-line mistakes answered here, before the first prompt: nothing
    // below this line is cheap enough to spend on a run that cannot finish.
    assertAuthFlags(ctx);
    assertBrandFlags(ctx);
    assertAgentFlags(ctx);
    assertAdminFlags(ctx);
    assertAppFlags(ctx);
    assertAllowedOriginsFlag(ctx);
    await preflight(ctx);
    // Which commit the content comes from, before anything reads a manifest.
    await resolveContent(ctx);
    // Before mode and selectModules: an app preset answers both.
    await resolveApp(ctx);
    await mode(ctx);
    await selectModules(ctx);
    // The modules are known, so what has to be downloaded is known — and every
    // step from here can read content off the disk the way the repo flow does.
    // Before the auth step, which reads the migrations, and long before the
    // scaffold, which is the first thing to write anything.
    await materialiseContent(ctx);
    // Which agent, before anything is copied: the two CLIs read skills from
    // different directories, and skillsTarget names the one being written to.
    await agentPick(ctx);
    await skillsTarget(ctx);
    await token(ctx);
    // The workspace is the only Chatfuel thing asked for. With auth it decides
    // where the accounts' bots get created; without it, which bots the app
    // opens on. Either way the bots themselves are the app's business.
    await workspacePick(ctx);
    // Before anything is written to disk: a workspace with no subscription has
    // no AI, and a scaffold whose bot says nothing reads as a broken scaffold.
    await trial(ctx);
    // The last thing asked and the first thing seen: what this app is called
    // and what it looks like. Before the auth work, so every question the run
    // has is behind the person before the long steps start.
    await brand(ctx);
    if (ctx.answers.modules.includes('auth')) await authSetup(ctx);
    // After the auth step and before anything is written: the panel's password
    // is one more line in the .env the scaffold is about to produce.
    await adminSetup(ctx);
    // Same place, same reason: one more line in the .env, and the last thing
    // the run has to ask about how far the master token reaches.
    await originsSetup(ctx);
    if (ctx.answers.mode === 'embed') await embedScaffold(ctx);
    else await scaffold(ctx);
    // Before the handoff, not after: the handoff can start an agent session
    // that owns the terminal from then on, and the Vercel login needs it.
    await deploy(ctx);
    /* The GitHub step is two halves with the handoff's writing between them,
       and it is the handoff that puts it there.

       The questions and the sign-in go first, for the deploy step's reason:
       gh's browser sign-in needs the terminal, and the handoff can hand the
       terminal to an agent session that keeps it. The commit and the push wait
       until after, because the handoff is still writing the app — the
       instructions file, the finish-setup checklist, the final lock — and a
       push made in front of it published a repository missing all of them,
       over a working tree the wizard had dirtied after its own commit.

       The agent launch is no longer part of either half: it is the last call
       in this function, below. */
    const github = await prepareGithub(ctx);
    await handoff(ctx);
    await pushToGithub(ctx, github);
    outro(ctx);
    capture('wizard_completed');
    /* Last, and after the closing notes on purpose. The agent takes the
       terminal and the process group with it, so everything the run still owed
       the person — the push it was told to make, the summary, a generated admin
       password that exists nowhere else — is finished before it is offered. */
    await launchAgent(ctx);
    // Nothing runnable exists in embed mode until the agent wires the host.
    if (ctx.answers.mode !== 'embed') await launch(ctx);
  } catch (err) {
    capture('wizard_failed');
    if (reportWizardError(err, flags.verbose)) return;
    throw err;
  } finally {
    // The scaffold step copies the app overlay straight from the temp clone,
    // so the clone lives until the whole run is over.
    ctx.answers.app?.cleanup();
    await ctx.client?.dispose();
  }
}
