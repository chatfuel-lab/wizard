import * as p from '@clack/prompts';
import pc from 'picocolors';
import { printBanner } from '../art';
import { DISCORD_URL } from '../constants';
import type { WizardContext } from '../context';

export async function welcome(ctx: WizardContext): Promise<void> {
  // Animate only for a human on a TTY; --yes/CI gets the banner in one shot.
  await printBanner(!ctx.flags.yes && Boolean(process.stdout.isTTY));
  p.intro(pc.bgCyan(pc.black(' chatfuel-wizard ')));
  p.note(
    [
      'This wizard scaffolds a working Chatfuel app, installs the matching',
      'skills for your coding agent and creates starter assets in your bot.',
      '',
      'Questions, or want to see what other people built?',
      `  ${pc.bold(pc.cyan(pc.underline(DISCORD_URL)))}`,
    ].join('\n'),
    'Welcome',
  );
}
