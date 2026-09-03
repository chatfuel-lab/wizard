import { beforeEach, describe, expect, it, vi } from 'vitest';

const execa = vi.hoisted(() => vi.fn());
vi.mock('execa', () => ({ execa }));
vi.mock('@clack/prompts', () => ({
  spinner: () => ({ start: () => {}, stop: () => {}, message: () => {}, error: () => {} }),
  log: { warn: () => {}, info: () => {}, success: () => {}, error: () => {} },
}));

const { installDependencies } = await import('../src/scaffold/install');

/**
 * The install used to be a swallowed catch: a non-developer got a directory
 * that cannot start plus a "run it manually" line. These are the three
 * outcomes that replaced it.
 */
describe('installDependencies', () => {
  // Braces matter: a hook that RETURNS a function hands vitest a teardown, and
  // mockReset() returns the mock itself — vitest would call it after the test.
  beforeEach(() => {
    execa.mockReset();
  });

  it('uses the preferred package manager and reports it back', async () => {
    execa.mockResolvedValue({});
    await expect(installDependencies('/tmp/app', 'npm')).resolves.toEqual({ packageManager: 'npm' });
    expect(execa).toHaveBeenCalledTimes(1);
    expect(execa.mock.calls[0].slice(0, 2)).toEqual(['npm', ['install']]);
  });

  it('falls back to npm — the one package manager Node guarantees', async () => {
    execa.mockRejectedValueOnce(new Error('spawn pnpm ENOENT')).mockResolvedValueOnce({});
    await expect(installDependencies('/tmp/app', 'pnpm')).resolves.toEqual({ packageManager: 'npm' });
    expect(execa.mock.calls.map((c) => c[0])).toEqual(['pnpm', 'npm']);
  });

  it('reports the failure instead of throwing — the app is written either way', async () => {
    execa.mockRejectedValue(Object.assign(new Error('boom'), { stderr: 'npm ERR! network timeout' }));
    const outcome = await installDependencies('/tmp/app', 'pnpm');

    /* Thrown, this abandoned the deploy, the repository, the handoff and the
       closing summary — where the admin password this run invented is printed. */
    expect(outcome.packageManager).toBe('npm');
    expect(outcome.failure).toContain('npm ERR! network timeout');
    expect(outcome.failure).toContain('cd /tmp/app && npm install');
  });
});
