import { execa } from 'execa';
import { detectAgents } from '../agents';
import { nodeIsSupported, nodeUpgradeHint } from '../node';
import { WizardError } from '../errors';
import type { PackageManager, WizardContext } from '../context';

async function hasBinary(bin: string): Promise<boolean> {
  try {
    await execa(bin, ['--version'], { timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * npm ships with Node, so it is the only package manager the audience is
 * guaranteed to have. pnpm is picked only when pnpm launched us (the monorepo
 * dev flow) AND is really installed — a stray `pnpm-lock.yaml` in the user's
 * cwd used to be enough to choose a binary that does not exist, and the run
 * then ended by asking them to install one by hand.
 */
async function resolvePackageManager(): Promise<PackageManager> {
  const launchedByPnpm = (process.env.npm_config_user_agent ?? '').includes('pnpm');
  if (launchedByPnpm && (await hasBinary('pnpm'))) return 'pnpm';
  if (await hasBinary('npm')) return 'npm';
  if (await hasBinary('pnpm')) return 'pnpm';
  throw new WizardError(
    'No package manager found on PATH',
    'npm normally comes with Node. Reinstall Node from https://nodejs.org/en/download and try again.',
  );
}

/**
 * Which agent CLIs are already on PATH. Choosing between them is agentPick's
 * business, and installing the missing one the handoff step's (steps/agent.ts)
 * — by then the offer has a reason.
 */
async function detectAgent(ctx: WizardContext): Promise<void> {
  ctx.answers.agentsPresent = await detectAgents();
}

export async function preflight(ctx: WizardContext): Promise<void> {
  if (!nodeIsSupported()) {
    throw new WizardError(`Node ${process.versions.node} is too old`, nodeUpgradeHint());
  }

  ctx.answers.packageManager = await resolvePackageManager();
  await detectAgent(ctx);
}
