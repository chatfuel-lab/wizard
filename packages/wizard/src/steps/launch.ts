import * as p from '@clack/prompts';
import pc from 'picocolors';
import { execa } from 'execa';
import { stepArt } from '../art';
import { shellUrl } from '../constants';
import type { WizardContext } from '../context';

/**
 * The wow moment: offer to start the dev server right away — vite's --open
 * flag opens the browser the second the server is ready. Foreground on
 * purpose: the wizard is done, the terminal now belongs to the app; Ctrl+C
 * stops the server and ends the process cleanly.
 */
export async function launch(ctx: WizardContext): Promise<void> {
  const appDir = ctx.answers.appDir;
  // Skip when non-interactive, when the user already handed off to a coding
  // agent (its session drives the app from here), or when there is no
  // node_modules to run — offering a dev server that cannot start reads as the
  // scaffold being broken rather than the install having failed. And on a
  // --dry-run, where `appDir` names a directory the run deliberately did not
  // create: `npm run dev` in it would create it back, empty.
  if (!appDir || ctx.flags.yes || ctx.flags.dryRun) return;
  if (ctx.answers.handedOffToAgent || ctx.answers.installFailed) return;

  p.log.message(stepArt('launch'));
  const start = await p.confirm({
    message: `Start the dev server and open ${shellUrl()} in your browser now?`,
    initialValue: true,
  });
  if (p.isCancel(start) || !start) return;

  console.log(pc.dim(`\n  ${ctx.answers.packageManager} run dev — Ctrl+C stops it.\n`));
  const args = ctx.answers.packageManager === 'npm' ? ['run', 'dev', '--', '--open'] : ['run', 'dev', '--open'];
  await execa(ctx.answers.packageManager, args, { cwd: appDir, stdio: 'inherit' }).catch(() => {
    // Ctrl+C lands here — a clean end, not an error.
  });
}
