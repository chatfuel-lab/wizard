import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AGENTS, directLauncher } from '../src/agents';
import { createContext } from '../src/run';
import { handoff, launchAgent } from '../src/steps/handoff';
import { launch } from '../src/steps/launch';
import type { WizardContext } from '../src/context';

/**
 * `handedOffToAgent` means one thing: an agent has the terminal from here on.
 * `launch` reads it to decide whether to offer the dev server itself, so
 * setting it before the agent has actually started is a claim the run cannot
 * yet make — and an agent that is on PATH but cannot execute (the wrong
 * architecture, a broken shim, a permission bit) ended the run with a warning,
 * no agent session and no dev server either.
 *
 * `spawn` is the event that separates the two: execa emits it only once the
 * binary is really running.
 *
 * The offer itself is `launchAgent`, which `run` calls after the push and the
 * outro rather than inside the handoff: the agent takes the terminal with it,
 * and everything the run still owes the person has to be said first. The
 * handoff writes the files; this is the step that hands over.
 */
const confirms: string[] = [];
let confirmAnswer: boolean | symbol = true;
vi.mock('@clack/prompts', () => ({
  isCancel: (value: unknown) => typeof value === 'symbol',
  confirm: (opts: { message: string }) => {
    confirms.push(opts.message);
    return Promise.resolve(confirmAnswer);
  },
  text: () => Promise.resolve(''),
  select: (opts: { initialValue?: unknown }) => Promise.resolve(opts.initialValue),
  note: () => undefined,
  intro: () => undefined,
  outro: () => undefined,
  log: {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    success: () => undefined,
    message: () => undefined,
    step: () => undefined,
  },
  spinner: () => ({ start: () => undefined, message: () => undefined, stop: () => undefined, error: () => undefined }),
}));

/** A subprocess that either got as far as running, or never did. */
let spawned = true;
const commands: string[] = [];
vi.mock('execa', () => ({
  execa: (command: string) => {
    commands.push(command);
    const result: Promise<unknown> & {
      nodeChildProcess?: { once: (event: string, fn: () => void) => unknown };
    } = spawned
      ? Promise.resolve({ exitCode: 0 })
      : Promise.reject(Object.assign(new Error('ENOENT'), { exitCode: undefined }));
    // execa 10 stopped forwarding the child's events, so the subscription is on
    // the ChildProcess itself and the mock has to carry one.
    const child = {
      once: (event: string, fn: () => void) => {
        // The real one fires this only when the binary is actually running.
        if (event === 'spawn' && spawned) fn();
        return child;
      },
    };
    result.nodeChildProcess = child;
    return result;
  },
}));

let appDir: string;

function context(): WizardContext {
  const ctx = createContext({ yes: false, dryRun: false, verbose: false, dir: appDir });
  ctx.answers.mode = 'standalone';
  ctx.answers.modules = ['core', 'livechat'];
  ctx.answers.appDir = appDir;
  ctx.answers.skillsTarget = 'project';
  ctx.answers.token = 'a'.repeat(64);
  ctx.answers.packageManager = 'npm';
  ctx.answers.agentTarget = AGENTS.claude;
  ctx.answers.agent = directLauncher(AGENTS.claude);
  return ctx;
}

beforeEach(() => {
  appDir = mkdtempSync(join(tmpdir(), 'chatfuel-handoff-launch-'));
  confirms.length = 0;
  commands.length = 0;
  confirmAnswer = true;
  spawned = true;
});
afterEach(() => {
  rmSync(appDir, { recursive: true, force: true });
});

describe('handing the terminal to an agent', () => {
  it('records the handoff once the agent has actually started', async () => {
    const ctx = context();

    await handoff(ctx);
    await launchAgent(ctx);

    expect(commands).toEqual([AGENTS.claude.bin]);
    expect(ctx.answers.handedOffToAgent).toBe(true);
  });

  it('records nothing when the agent never started, and the run still offers the dev server', async () => {
    spawned = false;
    const ctx = context();

    await handoff(ctx);
    await launchAgent(ctx);

    expect(ctx.answers.handedOffToAgent).toBeFalsy();

    confirms.length = 0;
    await launch(ctx);
    expect(confirms.join('\n')).toContain('dev server');
  });

  it('records nothing when the launch was declined', async () => {
    const ctx = context();
    confirmAnswer = false;

    await handoff(ctx);
    await launchAgent(ctx);

    expect(commands).toEqual([]);
    expect(ctx.answers.handedOffToAgent).toBeFalsy();
  });

  it('does not offer the dev server once an agent really has the terminal', async () => {
    const ctx = context();

    await handoff(ctx);
    await launchAgent(ctx);
    confirms.length = 0;
    await launch(ctx);

    expect(confirms).toEqual([]);
  });
});
