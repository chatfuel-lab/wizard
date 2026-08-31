import * as p from '@clack/prompts';
import { WizardError } from '../errors';
import type { WizardContext } from '../context';

/**
 * Standalone (default) or embed into the current project. `--embed` and
 * `--yes` skip the prompt: --embed forces embed, plain --yes stays
 * standalone (the non-interactive default from the start).
 */
export async function mode(ctx: WizardContext): Promise<void> {
  // An app preset is a standalone product by definition; assertAppFlags
  // already refused --app --embed, so this never contradicts a flag.
  if (ctx.answers.app) {
    ctx.answers.mode = 'standalone';
    return;
  }
  if (ctx.flags.embed) {
    ctx.answers.mode = 'embed';
    return;
  }
  if (ctx.flags.yes) {
    ctx.answers.mode = 'standalone';
    return;
  }
  const answer = await p.select({
    message: 'How should the modules be installed?',
    options: [
      { value: 'standalone', label: 'New app', hint: 'scaffold a fresh runnable project (default)' },
      {
        value: 'embed',
        label: 'Embed here',
        hint: 'copy the modules into the current project; an agent wires them up',
      },
    ],
    initialValue: 'standalone',
  });
  if (p.isCancel(answer)) throw new WizardError('Cancelled.');
  ctx.answers.mode = answer as 'standalone' | 'embed';
}
