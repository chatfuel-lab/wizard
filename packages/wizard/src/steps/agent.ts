import * as p from '@clack/prompts';
import { AGENTS, AGENT_IDS, installAgent, type AgentId } from '../agents';
import type { WizardContext } from '../context';

/**
 * Make sure there is an agent to hand off to.
 *
 * Deliberately NOT in preflight: asking a non-developer to install a coding
 * agent before they have seen anything is a barrier at the door. By the time
 * this runs the app exists on disk, and the offer reads as what it is — the
 * thing that finishes the setup for them.
 */
export async function ensureAgent(ctx: WizardContext): Promise<void> {
  if (ctx.answers.agent) return;

  const names = AGENT_IDS.map((id) => AGENTS[id].name).join(' or ');
  if (ctx.flags.yes) {
    p.log.warn(`No coding agent found (${names}) — the setup prompt is written but not launched.`);
    return;
  }
  /* `npm install -g` is the largest thing this wizard does to a machine, and a
     dry run does none of it. The offer is not made either: an answer that
     cannot be acted on is a question asked for nothing. */
  if (ctx.flags.dryRun) {
    p.log.info(`--dry-run: would offer to install a coding agent (${names}). Nothing is installed.`);
    return;
  }

  // --agent already said which one; asking again would be asking twice.
  const asked = ctx.answers.agentTarget?.id ?? (await askWhich());
  if (!asked) return;

  const launcher = await installAgent(AGENTS[asked]);
  if (launcher) ctx.answers.agent = launcher;
}

async function askWhich(): Promise<AgentId | null> {
  const choice = await p.select<AgentId | 'skip'>({
    message: 'The setup is finished by a coding agent, and neither is installed. Install one now?',
    options: [
      ...AGENT_IDS.map((id) => ({
        value: id,
        label: `Install ${AGENTS[id].name}`,
        hint: AGENTS[id].npmPackage,
      })),
      { value: 'skip' as const, label: 'Skip', hint: 'the prompt is still written to the app' },
    ],
    initialValue: AGENT_IDS[0],
  });
  return p.isCancel(choice) || choice === 'skip' ? null : choice;
}
