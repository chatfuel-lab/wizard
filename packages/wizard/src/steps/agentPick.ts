import * as p from '@clack/prompts';
import { AGENTS, AGENT_IDS, directLauncher, isAgentId } from '../agents';
import { WizardError } from '../errors';
import type { AgentSpec } from '../agents';
import type { WizardContext } from '../context';

/** A command-line mistake, answered before the first prompt. */
export function assertAgentFlags(ctx: WizardContext): void {
  const flag = ctx.flags.agent;
  if (flag === undefined || isAgentId(flag)) return;
  throw new WizardError(`Unknown coding agent "${flag}"`, `--agent takes one of: ${AGENT_IDS.join(', ')}.`);
}

/**
 * Which agent the run is written for. It has to be settled here, before the
 * skills are copied: Claude Code reads .claude/skills, Codex reads
 * .agents/skills, and neither one looks in the other's directory.
 *
 * Silent whenever it can be — the question is only worth asking of someone who
 * has both CLIs installed, and even then only once.
 */
export async function agentPick(ctx: WizardContext): Promise<void> {
  const present = ctx.answers.agentsPresent;
  const flag = ctx.flags.agent;
  const chosen = flag && isAgentId(flag) ? AGENTS[flag] : await fromPath(ctx, present);
  if (!chosen) return;
  ctx.answers.agentTarget = chosen;
  // Only an agent that is really on PATH can be launched; a flagged one that is
  // missing gets installed by the handoff step, which then fills this in.
  if (present.some((spec) => spec.id === chosen.id)) ctx.answers.agent = directLauncher(chosen);
}

async function fromPath(ctx: WizardContext, present: AgentSpec[]): Promise<AgentSpec | undefined> {
  if (present.length < 2 || ctx.flags.yes) return present[0];
  const choice = await p.select<AgentSpec>({
    message: 'You have more than one coding agent. Which should finish the setup?',
    options: present.map((spec) => ({ value: spec, label: spec.name, hint: spec.skillsSubdir })),
  });
  if (p.isCancel(choice)) throw new WizardError('Cancelled.');
  return choice;
}
