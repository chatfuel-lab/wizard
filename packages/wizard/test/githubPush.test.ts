import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pushToOrigin } from '../src/github/api';
import { runInterruptCleanups } from '../src/interrupt';

/**
 * A push runs for up to fifteen minutes with no prompt open, so Ctrl+C reaches
 * a process that does not unwind and `finally` never runs. What is pinned here
 * is that an interrupt landing DURING the push takes the askpass directory
 * with it, and that nothing is left registered afterwards — a cleanup left
 * behind would delete a directory that a later run had every right to.
 */
const duringPush = { sigint: 0, sigterm: 0, askpass: '', goneAfterInterrupt: false };
let interruptDuringPush = false;

vi.mock('execa', () => ({
  execa: (_file: string, _args: string[], options: { env?: Record<string, string> }) => {
    duringPush.sigint = process.listenerCount('SIGINT');
    duringPush.sigterm = process.listenerCount('SIGTERM');
    duringPush.askpass = options.env?.GIT_ASKPASS ?? '';
    if (interruptDuringPush) {
      // What the shared handler does when Ctrl+C arrives, minus the exit a
      // test cannot afford. See src/interrupt.
      runInterruptCleanups();
      duringPush.goneAfterInterrupt = !existsSync(dirname(duringPush.askpass));
    }
    return Promise.resolve({ stdout: '' });
  },
}));

vi.mock('@clack/prompts', () => ({
  spinner: () => ({ start: () => undefined, message: () => undefined, stop: () => undefined, error: () => undefined }),
  log: { info: () => undefined, warn: () => undefined, error: () => undefined, success: () => undefined },
}));

let appDir: string;

beforeEach(() => {
  appDir = mkdtempSync(join(tmpdir(), 'wizard-push-'));
  duringPush.sigint = 0;
  duringPush.sigterm = 0;
  duringPush.askpass = '';
  duringPush.goneAfterInterrupt = false;
  interruptDuringPush = false;
});

afterEach(() => {
  rmSync(appDir, { recursive: true, force: true });
});

describe('the askpass directory a push needs', () => {
  it('goes with an interrupt that lands while the push is in flight', async () => {
    interruptDuringPush = true;

    expect(await pushToOrigin(appDir, { login: 'someone', token: 't'.repeat(40) })).toBe(true);

    expect(duringPush.goneAfterInterrupt).toBe(true);
  });

  it('adds no signal listener of its own, and leaves nothing registered after it', async () => {
    const sigint = process.listenerCount('SIGINT');
    const sigterm = process.listenerCount('SIGTERM');

    expect(await pushToOrigin(appDir, { login: 'someone', token: 't'.repeat(40) })).toBe(true);

    // One handler for the process, installed once at startup — a per-push
    // listener left behind would swallow the next Ctrl+C the wizard gets.
    expect(duringPush.sigint).toBe(sigint);
    expect(duringPush.sigterm).toBe(sigterm);
    expect(process.listenerCount('SIGINT')).toBe(sigint);
    expect(process.listenerCount('SIGTERM')).toBe(sigterm);
    // And the window is closed: a signal now finds nothing of this push's to do.
    expect(() => runInterruptCleanups()).not.toThrow();
  });

  it('is gone when the push returns', async () => {
    await pushToOrigin(appDir, { login: 'someone', token: 't'.repeat(40) });

    expect(duringPush.askpass).toContain('chatfuel-git-');
    expect(existsSync(dirname(duringPush.askpass))).toBe(false);
  });
});
