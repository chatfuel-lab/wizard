import * as p from '@clack/prompts';
import { execa } from 'execa';
import type { PackageManager } from '../context';

/** Enough of the failure to act on, without pasting a whole npm log. */
function tail(text: string, lines = 8): string {
  return text
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .slice(-lines)
    .join('\n');
}

export interface InstallOutcome {
  /** The one that worked, or the last one tried. The caller prints commands with it. */
  packageManager: PackageManager;
  /** Set only when nothing installed: the error text plus the command that finishes the job. */
  failure?: string;
}

/**
 * Installs the scaffolded app's dependencies, and refuses to pretend it worked.
 *
 * This used to be a swallowed catch and a "run it manually" warning — which
 * handed a non-developer a directory that cannot start, with the error text
 * captured and thrown away. Now: the failure is shown, npm gets a second go
 * (it is the one package manager Node guarantees), and a total failure is
 * reported rather than swallowed.
 *
 * Reported and not thrown, though. The app directory is complete before this
 * runs — that is where the scaffold's rollback boundary is — so an install that
 * cannot reach the registry is a missing `node_modules` and nothing else. A
 * throw here abandoned the rest of the run over it: no deploy, no repository,
 * no handoff, and no closing summary, which is the only place the admin
 * password this run invented is ever printed. One npm timeout cost all of that.
 */
export async function installDependencies(target: string, preferred: PackageManager): Promise<InstallOutcome> {
  const attempts: PackageManager[] = preferred === 'npm' ? ['npm'] : [preferred, 'npm'];
  let lastFailure = '';

  for (const [i, pm] of attempts.entries()) {
    const spinner = p.spinner({ indicator: 'timer' });
    spinner.start(`Installing dependencies with ${pm} — this takes a minute…`);
    try {
      await execa(pm, ['install'], { cwd: target, timeout: 15 * 60_000 });
      spinner.stop(`Dependencies installed with ${pm}`);
      return { packageManager: pm };
    } catch (err) {
      const e = err as { stderr?: string; shortMessage?: string; message?: string };
      lastFailure = tail(e.stderr || e.shortMessage || e.message || 'unknown error');
      spinner.stop(`${pm} install failed`, 1);
      if (i < attempts.length - 1) {
        p.log.warn(`${pm} could not install the dependencies — retrying with npm.`);
      }
    }
  }

  return {
    packageManager: 'npm',
    failure: `${lastFailure}\n\nFix the error above, then finish with:  cd ${target} && npm install`,
  };
}
