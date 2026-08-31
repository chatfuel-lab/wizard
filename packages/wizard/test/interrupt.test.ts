import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installInterruptHandler, onInterrupt, runInterruptCleanups } from '../src/interrupt';
import { scaffold } from '../src/steps/scaffold';
import { embedScaffold, EMBED_DIR } from '../src/steps/embed';
import { createContext } from '../src/run';
import type { WizardContext } from '../src/context';

/**
 * Ctrl+C during a scaffold used to be the worst of both answers: the first
 * press did nothing but print "Canceled" (clack's spinner registers its own
 * SIGINT listener, which replaces Node's default disposition and does not
 * exit), and the press after it killed the process with no unwind at all — so
 * the rollback in the `catch` never ran and the app directory was left with no
 * `.chatfuel/lock.json`, which neither `update` nor `scaffold` will touch.
 *
 * The signal is delivered for real here (`process.emit`), and the scaffold's
 * window is entered for real: the template copy is not mocked, so what these
 * tests read off the disk is what a person would find there.
 */
vi.mock('@clack/prompts', () => ({
  isCancel: (value: unknown) => typeof value === 'symbol',
  text: () => Promise.resolve('./chatfuel-app'),
  log: {
    info: (m: string) => lines.push(m),
    warn: (m: string) => lines.push(m),
    error: (m: string) => lines.push(m),
    success: (m: string) => lines.push(m),
    message: () => undefined,
  },
  note: () => undefined,
  /* Ctrl+C in the middle of the write window, from the one call the scaffold
     makes between the copy and the lock. A real spinner would be spinning here
     with nothing to interrupt it. */
  spinner: () => ({
    start: () => undefined,
    message: () => undefined,
    stop: () => {
      if (!interruptOnStop) return;
      interruptOnStop = false;
      process.emit('SIGINT', 'SIGINT');
    },
  }),
}));

/**
 * The one thing a test cannot let happen for real is the exit — it would end
 * the test runner. Throwing in its place is the closest honest stand-in: like
 * `process.exit`, it means nothing below the signal runs, which is the whole
 * property under test. Production passes `process.exit` and never comes back.
 */
class Exited extends Error {
  constructor(readonly code: number) {
    super(`the process would have exited ${code}`);
  }
}

/** A signal raised from the test itself, whose exit lands in the test. */
function interrupt(signal: NodeJS.Signals = 'SIGINT'): void {
  try {
    process.emit(signal, signal);
  } catch (err) {
    if (!(err instanceof Exited)) throw err;
  }
}

/* The one test below that lets a scaffold finish is about what happens after
   the lock is written, and the install that follows it is a real npm reaching a
   real registry. Nothing here is about npm. */
/* Ctrl+C in the middle of the embed's write window. The embed stops its
   spinner only once the window is over, so the signal is raised from a call
   inside it instead. */
vi.mock('../src/scaffold/apiOperations', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/scaffold/apiOperations')>();
  return {
    ...actual,
    copyModuleOperations: (...args: Parameters<typeof actual.copyModuleOperations>) => {
      if (interruptOnOperations) {
        interruptOnOperations = false;
        process.emit('SIGINT', 'SIGINT');
      }
      return actual.copyModuleOperations(...args);
    },
  };
});

vi.mock('../src/scaffold/install', () => ({
  installDependencies: (_target: string, preferred: string) => Promise.resolve({ packageManager: preferred }),
}));

const lines: string[] = [];
let interruptOnStop = false;
let interruptOnOperations = false;
let parent: string;
let target: string;
let uninstall: () => void;
const exits: number[] = [];

beforeEach(() => {
  parent = mkdtempSync(join(tmpdir(), 'wizard-interrupt-'));
  target = join(parent, 'app');
  lines.length = 0;
  exits.length = 0;
  interruptOnStop = false;
  interruptOnOperations = false;
  uninstall = installInterruptHandler((code) => {
    exits.push(code);
    throw new Exited(code);
  });
});

afterEach(() => {
  uninstall();
  runInterruptCleanups();
  rmSync(parent, { recursive: true, force: true });
});

describe('the interrupt registry', () => {
  it('runs what is registered, newest first', () => {
    const order: string[] = [];
    onInterrupt(() => order.push('outer'));
    onInterrupt(() => order.push('inner'));

    interrupt();

    expect(order).toEqual(['inner', 'outer']);
    expect(exits).toEqual([130]);
  });

  it('finishes the rest when one of them throws', () => {
    const done: string[] = [];
    onInterrupt(() => done.push('outer'));
    onInterrupt(() => {
      throw new Error('this cleanup is broken');
    });

    interrupt('SIGTERM');

    // Half an undo is what the registry exists to prevent, and the exit code
    // is still the one a shell reports for the signal that arrived.
    expect(done).toEqual(['outer']);
    expect(exits).toEqual([143]);
  });

  it('forgets a cleanup once its window is released', () => {
    const done: string[] = [];
    const release = onInterrupt(() => done.push('stale'));
    release();

    interrupt();

    expect(done).toEqual([]);
  });

  it('runs each cleanup once, however many signals arrive', () => {
    const done: string[] = [];
    onInterrupt(() => done.push('once'));

    interrupt();
    interrupt();

    expect(done).toEqual(['once']);
    expect(exits).toEqual([130, 130]);
  });
});

function context(dir: string, modules: string[]): WizardContext {
  const ctx = createContext({ yes: true, dryRun: false, verbose: false, dir });
  ctx.answers.mode = 'standalone';
  ctx.answers.modules = modules;
  ctx.answers.brand = { name: 'Test app' };
  ctx.answers.token = 'a'.repeat(64);
  return ctx;
}

describe('Ctrl+C between the copy and the lock', () => {
  it('takes the half-written directory with it, and can be run again', async () => {
    interruptOnStop = true;
    /* Registered before the scaffold's own, so it runs after it: what it sees
       is the state the SIGNAL left, before any unwinding. Production exits
       inside the handler and never reaches a `catch`, so an undo that only
       happened on the way out would be an undo that never happens. */
    let goneWhenTheSignalFinished: boolean | null = null;
    onInterrupt(() => {
      goneWhenTheSignalFinished = !existsSync(target);
    });

    await expect(scaffold(context(target, ['core', 'livechat']))).rejects.toBeInstanceOf(Exited);

    expect(goneWhenTheSignalFinished).toBe(true);

    expect(exits).toEqual([130]);
    // Not "most of an app with no lock in it": nothing. The next run gets a
    // fresh directory instead of `${target} exists and is not empty`.
    expect(existsSync(target)).toBe(false);
    expect(lines.join('\n')).toContain('Removed the half-written');
  });

  it('leaves a directory that was somebody else’s, and says what is in it', async () => {
    interruptOnStop = true;

    await expect(scaffold(context(join(parent, '.'), ['core', 'livechat']))).rejects.toBeInstanceOf(Exited);

    expect(exits).toEqual([130]);
    expect(existsSync(parent)).toBe(true);
    expect(lines.join('\n')).toContain('Nothing in it was deleted');
  });

  it('is not still armed once the lock is written', async () => {
    await scaffold(context(target, ['core', 'livechat']));

    // The window is over: the app is complete and its lock is sealed, so a
    // signal now must not delete the app the run just finished.
    interrupt();

    expect(existsSync(join(target, '.chatfuel', 'lock.json'))).toBe(true);
  });
});

describe('Ctrl+C in the middle of an embed', () => {
  it('removes the footprint it was writing into somebody else’s project', async () => {
    const host = parent;
    writeFileSync(join(host, 'package.json'), JSON.stringify({ name: 'host-app', dependencies: { react: '^19.0.0' } }));
    writeFileSync(host + '/notes.md', 'mine\n');
    const ctx = createContext({ yes: true, dryRun: false, verbose: false, embed: true, dir: host });
    ctx.answers.mode = 'embed';
    ctx.answers.modules = ['core', 'livechat'];
    ctx.answers.skillsTarget = 'project';
    ctx.answers.token = 'a'.repeat(64);
    ctx.answers.packageManager = 'npm';
    interruptOnOperations = true;
    // As above: the state the signal itself left, not what unwinding tidied.
    let goneWhenTheSignalFinished: boolean | null = null;
    onInterrupt(() => {
      goneWhenTheSignalFinished = !existsSync(join(host, EMBED_DIR));
    });

    await expect(embedScaffold(ctx)).rejects.toBeInstanceOf(Exited);

    expect(goneWhenTheSignalFinished).toBe(true);

    // The root came from this run, so removing it is exactly an undo — and
    // without it the guard at the top of the step refuses every retry.
    expect(existsSync(join(host, EMBED_DIR))).toBe(false);
    // Everything that was the host's own is still theirs.
    expect(existsSync(join(host, 'notes.md'))).toBe(true);
    expect(exits).toEqual([130]);
  });
});
