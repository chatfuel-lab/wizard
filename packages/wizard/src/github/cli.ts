import * as p from '@clack/prompts';
import pc from 'picocolors';
import { execa } from 'execa';
import { installGhFromRelease } from './release';

/**
 * Getting to a working `gh`, in the order that costs the person least.
 *
 * Already installed is free. A package manager they already have is one
 * command. Everything else is the published release archive (release.ts) —
 * which is also the ONLY route on Linux, because every distro package manager
 * there needs `sudo`, and the wizard does not escalate privileges on somebody's
 * behalf anywhere (the same rule installAgent states in agents.ts).
 *
 * Every route ends the same way: run the binary and see if it answers. An
 * installer that reported success and left nothing on PATH is not an install.
 */

export interface GhCli {
  /** What to actually spawn: bare `gh` when it is on PATH, else an absolute path. */
  bin: string;
  /** How it got here — the difference matters when configuring git below. */
  source: 'path' | 'brew' | 'winget' | 'scoop' | 'release';
}

interface InstallRoute {
  label: string;
  manager: string;
  args: string[];
  source: GhCli['source'];
}

/** Does this binary exist and answer? Used for `gh`, and for the installers. */
async function answers(bin: string): Promise<boolean> {
  try {
    await execa(bin, ['--version'], { timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * The package managers worth trying on this platform, in preference order.
 *
 * Linux is deliberately empty: apt, dnf, pacman and zypper all need root, and
 * the release archive needs nothing.
 */
function packageManagerRoutes(platform: string = process.platform): InstallRoute[] {
  if (platform === 'darwin') {
    return [{ label: 'Homebrew', manager: 'brew', args: ['install', 'gh'], source: 'brew' }];
  }
  if (platform === 'win32') {
    return [
      {
        label: 'winget',
        manager: 'winget',
        args: [
          'install',
          '--id',
          'GitHub.cli',
          '-e',
          '--silent',
          '--accept-package-agreements',
          '--accept-source-agreements',
        ],
        source: 'winget',
      },
      { label: 'Scoop', manager: 'scoop', args: ['install', 'gh'], source: 'scoop' },
    ];
  }
  return [];
}

/** The last few lines of a failure, short enough to read. */
const briefly = (err: unknown): string => {
  const message = err instanceof Error ? err.message : String(err);
  return pc.dim(message.split('\n').slice(-3).join(' ').slice(0, 300));
};

/**
 * A `gh` this process can run, installing it when the person says yes.
 *
 * Returns null when there is none — not an error: the caller has a second way
 * to reach GitHub that needs no binary at all.
 */
export async function ensureGh(): Promise<GhCli | null> {
  if (await answers('gh')) return { bin: 'gh', source: 'path' };

  const go = await p.confirm({
    message: 'The GitHub CLI (gh) is not installed. Install it now?',
    initialValue: true,
  });
  if (p.isCancel(go) || !go) return null;

  for (const route of packageManagerRoutes()) {
    if (!(await answers(route.manager))) continue;
    const spinner = p.spinner({ indicator: 'timer' });
    spinner.start(`Installing the GitHub CLI (${route.manager} ${route.args.join(' ')})…`);
    try {
      await execa(route.manager, route.args, { timeout: 15 * 60_000 });
    } catch (err) {
      spinner.stop(`${route.label} could not install it`, 1);
      p.log.warn(briefly(err));
      continue;
    }
    if (await answers('gh')) {
      spinner.stop(`GitHub CLI installed with ${route.label}`);
      return { bin: 'gh', source: route.source };
    }
    spinner.stop(`${route.label} finished, but \`gh\` is not on this shell's PATH`, 1);
  }

  const spinner = p.spinner({ indicator: 'timer' });
  spinner.start('Downloading the official GitHub CLI release…');
  try {
    const bin = await installGhFromRelease();
    if (!bin) {
      spinner.stop(`The GitHub CLI publishes no build for ${process.platform}/${process.arch}`, 1);
      return null;
    }
    if (await answers(bin)) {
      spinner.stop('GitHub CLI ready');
      return { bin, source: 'release' };
    }
    spinner.stop('The downloaded GitHub CLI did not run', 1);
  } catch (err) {
    spinner.stop('The GitHub CLI download did not finish', 1);
    p.log.warn(briefly(err));
  }
  return null;
}

/** Is this `gh` already signed in to github.com? */
export async function ghIsAuthenticated(cli: GhCli): Promise<boolean> {
  try {
    await execa(cli.bin, ['auth', 'status', '--hostname', 'github.com'], { timeout: 60_000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Whose account this `gh` is signed in as, or null.
 *
 * Asked for so the repository's address is known BEFORE it exists: the handoff
 * writes the agent's instructions while the push is still ahead of it, and a
 * file that cannot name the repository leaves the agent believing there is
 * none. A failure here is not one — the address is simply left unsaid.
 */
export async function ghAccountLogin(cli: GhCli): Promise<string | null> {
  try {
    const { stdout } = await execa(cli.bin, ['api', 'user', '--jq', '.login'], { timeout: 60_000 });
    const login = stdout.trim();
    return /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(login) ? login : null;
  } catch {
    return null;
  }
}

/**
 * Sign in, in a browser, with the terminal handed straight to `gh`.
 *
 * `stdio: 'inherit'` is the point: gh prints a one-time code and waits for the
 * browser. Capturing that output would show the person nothing and then hang.
 * This is why the whole step runs before the handoff — after it, an agent may
 * already own the terminal.
 */
export async function ghLogin(cli: GhCli): Promise<boolean> {
  p.log.info('Signing in to GitHub — gh will print a code and open your browser.');
  try {
    await execa(cli.bin, ['auth', 'login', '--hostname', 'github.com', '--git-protocol', 'https', '--web'], {
      stdio: 'inherit',
      timeout: 15 * 60_000,
    });
  } catch {
    return false;
  }
  return ghIsAuthenticated(cli);
}

/**
 * Teach git to use gh's credentials for github.com, so the person's own pushes
 * work after the wizard is gone. Called only after a sign-in this run performed.
 *
 * Skipped for a `gh` out of the cache: `gh auth setup-git` writes the binary's
 * path into the global git config, and a path into a cache directory is one
 * cleanup script away from breaking every github.com push on the machine. gh
 * authenticates the push it makes itself either way, so nothing is lost.
 */
export async function ghSetupGit(cli: GhCli): Promise<void> {
  if (cli.source === 'release') return;
  await execa(cli.bin, ['auth', 'setup-git', '--hostname', 'github.com'], { reject: false, timeout: 60_000 });
}

/**
 * Create the repository and push to it in one call.
 *
 * gh authenticates the push it makes itself, so this works even when git on
 * this machine has no github.com credentials of its own — which is exactly the
 * case on the run where gh was installed a minute ago.
 *
 * Returns the repository's URL, which gh prints, or undefined with the reason
 * already on screen.
 */
export async function ghCreateAndPush(
  cli: GhCli,
  appDir: string,
  name: string,
  isPrivate: boolean,
  description: string,
): Promise<string | undefined> {
  const spinner = p.spinner({ indicator: 'timer' });
  spinner.start(`Creating ${name} on GitHub and pushing…`);
  try {
    const { stdout } = await execa(
      cli.bin,
      [
        'repo',
        'create',
        name,
        '--source',
        '.',
        '--remote',
        'origin',
        '--push',
        isPrivate ? '--private' : '--public',
        '--description',
        description,
      ],
      { cwd: appDir, timeout: 15 * 60_000 },
    );
    spinner.stop('Pushed');
    const url = stdout
      .split('\n')
      .map((line) => line.trim())
      .reverse()
      .find((line) => /^https:\/\/\S+$/.test(line));
    return url ?? `https://github.com/${name}`;
  } catch (err) {
    spinner.stop('gh could not create the repository', 1);
    p.log.warn(briefly(err));
    return undefined;
  }
}
