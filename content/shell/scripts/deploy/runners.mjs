/**
 * Finding and calling the Vercel CLI: a captured runner for the quick calls,
 * and a streamed one for the deploy, whose log has to be watched and kept.
 */
import { spawn, spawnSync } from 'node:child_process';

import { childEnv } from './egress.mjs';
import { fail } from './report.mjs';

/** @typedef {{ bin: string, prefix: string[], label?: string, firstRunNote?: string }} Cli */
/** @typedef {{ status: number | null, stdout: string, stderr: string }} RunResult */
/** @typedef {RunResult & { signal: string | null, timedOut: boolean }} StreamResult */
/** @typedef {{ timeout?: number, env?: NodeJS.ProcessEnv, stdio?: unknown, encoding?: string, input?: string, cwd?: string }} RunOptions */
/** @typedef {(args: string[], options?: RunOptions) => RunResult} Runner */
/** @typedef {(args: string[], options?: RunOptions) => Promise<StreamResult>} StreamRunner */

// The spawner seams are structural on purpose: a test hands in a plain
// function, so neither is typed as typeof spawnSync / typeof spawn.
/** @typedef {(bin: string, args: string[], options: Record<string, unknown>) => RunResult} SyncSpawner */
/** @typedef {{ stdout: import('node:stream').Readable, stderr: import('node:stream').Readable, kill: () => void, on: (event: string, listener: (...args: any[]) => void) => unknown }} StreamChild */
/** @typedef {(bin: string, args: string[], options: Record<string, unknown>) => StreamChild} StreamSpawner */

/**
 * Windows needs a shell here and cannot be talked out of it: the Vercel CLI and
 * npx are `.cmd` files, and since the 2024 argument-injection fix Node refuses
 * to spawn one without `shell: true`. So the shell stays, and the arguments are
 * made safe by construction instead — `cmd.exe` splits on these characters, and
 * an argument that cannot contain them cannot become a second command.
 *
 * This is a THROW, not a filter. A caller that needs a character outside this
 * set has found something this guard has not thought about, and finding out by
 * a failed deploy beats finding out by a shell it did not mean to open. On
 * every other platform the argv form is used and nothing is checked.
 */
const SHELL_SAFE_ARG = /^[A-Za-z0-9._:@/\\=+,-]*$/;

const usesShell = process.platform === 'win32';

/**
 * @param {string[]} args
 * @returns {string[]}
 */
function shellSafe(args) {
  if (!usesShell) return args;
  for (const arg of args) {
    if (!SHELL_SAFE_ARG.test(arg)) {
      throw new Error(
        `Refusing to run the Vercel CLI: the argument ${JSON.stringify(arg)} carries characters that cmd.exe reads as syntax.`,
      );
    }
  }
  return args;
}

const has = (/** @type {string} */ bin) =>
  spawnSync(bin, ['--version'], { stdio: 'ignore', shell: usesShell, env: childEnv() }).status === 0;

/**
 * `vercel ...` when it is installed, `npx --yes vercel@latest ...` when it is not.
 *
 * @returns {Cli}
 */
export function resolveCli() {
  if (has('vercel')) return { bin: 'vercel', prefix: [], label: 'vercel (installed)' };
  if (!has('npx')) {
    fail('Neither the Vercel CLI nor npx is available.', 'Install the CLI: npm i -g vercel');
  }
  return {
    bin: 'npx',
    prefix: ['--yes', 'vercel@latest'],
    label: 'npx vercel@latest',
    // The first call downloads ~50 MB with nothing on screen, because these
    // invocations are captured rather than inherited. Say so, or the wait
    // reads as a hang.
    firstRunNote: 'fetching the Vercel CLI (first run only, ~30-90s)...',
  };
}

/**
 * Every captured Vercel call.
 *
 * `env` is set AFTER the spread on purpose. Every other default here stays
 * something a caller can take back; the telemetry flag is not a preference a
 * caller gets to express, because a deploy that a blocked telemetry host can
 * stop is exactly the bug childEnv exists to close.
 *
 * `VERCEL_TOKEN` is deliberately NOT passed as `--token`: argv is world-readable
 * on this machine (`ps auxww`, `/proc/<pid>/cmdline`) and is copied verbatim
 * into CI process-audit logs and container exec logs. The CLI reads the
 * variable itself, and childEnv already hands it the whole environment — so the
 * token travels the same way the app's own secrets do.
 *
 * The spawner is a parameter so the option object can be read in a test without
 * a Vercel account. It is exported for that, not for reuse.
 *
 * @param {Cli} cli
 * @param {SyncSpawner} [spawnImpl]
 * @returns {Runner}
 */
// The default is the real spawnSync, narrowed through unknown to the structural seam.
export function makeRunner(cli, spawnImpl = /** @type {SyncSpawner} */ (/** @type {unknown} */ (spawnSync))) {
  return function run(args, options = {}) {
    return spawnImpl(cli.bin, shellSafe([...cli.prefix, ...args]), {
      encoding: 'utf8',
      timeout: options.timeout ?? 15 * 60_000,
      shell: usesShell,
      ...options,
      env: childEnv(options.env),
    });
  };
}

/**
 * The same runner, for the one call whose output has to be both watched and
 * read.
 *
 * `spawnSync` can do one or the other: an inherited stream reaches the terminal
 * but not this script, a piped one reaches this script but shows nothing until
 * the command is over — and the deploy is the step that takes minutes and whose
 * log is the error message when it fails. So it is spawned instead, and every
 * chunk is written on as it arrives while being kept.
 *
 * The cost is that the CLI's streams are no longer terminals, so its spinner
 * comes out as plain lines rather than an animation. That is the price of being
 * able to read what it says.
 *
 * @param {Cli} cli
 * @param {StreamSpawner} [spawnImpl]
 * @returns {StreamRunner}
 */
// The default is the real spawn, narrowed through unknown to the structural seam.
export function makeStreamRunner(cli, spawnImpl = /** @type {StreamSpawner} */ (/** @type {unknown} */ (spawn))) {
  return function runStreamed(args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawnImpl(cli.bin, shellSafe([...cli.prefix, ...args]), {
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: usesShell,
        ...options,
        env: childEnv(options.env),
      });
      let stdout = '';
      let stderr = '';
      // Decoded by the stream rather than per chunk: a character can straddle a
      // chunk boundary, and half of one is not a character.
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
        process.stdout.write(chunk);
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
        process.stderr.write(chunk);
      });
      // Kept apart from the exit status, because they read the same and are
      // not the same thing: a policy that DROPS packets rather than refusing
      // them prints no error at all, it just never finishes, and the kill that
      // follows looks exactly like a build that failed silently.
      let timedOut = false;
      const timer = setTimeout(
        () => {
          timedOut = true;
          child.kill();
        },
        options.timeout ?? 15 * 60_000,
      );
      child.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
      child.on('close', (status, signal) => {
        clearTimeout(timer);
        resolve({ status, signal, timedOut, stdout, stderr });
      });
    });
  };
}
