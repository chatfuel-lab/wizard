import * as p from '@clack/prompts';
import { skillsSpec } from '../scaffold/skills';
import { WizardError } from '../errors';
import type { WizardContext } from '../context';

export async function skillsTarget(ctx: WizardContext): Promise<void> {
  if (ctx.flags.yes) {
    ctx.answers.skillsTarget = 'project';
    return;
  }
  // Each CLI reads skills from its own directory, so the offer has to name the
  // one the agent chosen a moment ago actually looks in.
  const { skillsSubdir } = skillsSpec(ctx);
  const target = await p.select({
    message: 'Where should the module skills be installed?',
    options: [
      { value: 'project' as const, label: `Into the scaffolded project (${skillsSubdir}/)`, hint: 'recommended' },
      { value: 'global' as const, label: `Globally (~/${skillsSubdir}/)`, hint: 'available in every project' },
    ],
  });
  if (p.isCancel(target)) throw new WizardError('Cancelled.');
  ctx.answers.skillsTarget = target;
}
