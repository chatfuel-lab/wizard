/**
 * What Ctrl+C does to a run that is halfway through writing a directory.
 *
 * Nothing, is the answer without this file, and that is not an exaggeration:
 * `@clack/prompts`' spinner registers its own `SIGINT` listener, and a
 * registered listener replaces Node's default disposition. So the first Ctrl+C
 * under a spinner — the template copy, the install, the push, the deploy —
 * prints "Canceled" and the run carries on writing. The second one arrives
 * after `spinner.stop()` has removed that listener, gets the default
 * disposition, and kills the process where it stands: no `catch`, no `finally`,
 * no rollback. The scaffold's undo lives in a `catch` (`steps/scaffold.ts`), so
 * what is left on disk is an app directory with no `.chatfuel/lock.json` —
 * which `update` will not touch because there is no lock, and `scaffold` will
 * not touch because the directory is not empty. A dead end made by the one key
 * everybody presses to get out of trouble.
 *
 * One handler for the whole process, installed before any command runs, and a
 * registry of what each step wants undone. A step registers while it is inside
 * its own dangerous window and releases on the way out, so the handler always
 * knows exactly what is half-written at the moment the signal lands — which no
 * single handler written in one place could.
 *
 * Cleanups run newest first: they nest the way the code that registered them
 * nests, and the inner one is the one that knows about the temporary directory
 * the outer one is about to remove.
 */
export type InterruptCleanup = () => void;

const cleanups = new Set<InterruptCleanup>();
let installed: ((signal: NodeJS.Signals) => void) | null = null;

/**
 * Register what should be undone if the process is interrupted right now.
 * Returns the release — call it once the window is over, or the cleanup will
 * still be run by a signal that arrives long after it stopped being right.
 */
export function onInterrupt(cleanup: InterruptCleanup): () => void {
  cleanups.add(cleanup);
  return () => {
    cleanups.delete(cleanup);
  };
}

/**
 * Run every registered cleanup, newest first. A cleanup that throws must not
 * take the ones under it with it: this is the last code that will ever run,
 * and half an undo is what the whole file exists to prevent.
 */
export function runInterruptCleanups(): void {
  for (const cleanup of [...cleanups].reverse()) {
    cleanups.delete(cleanup);
    try {
      cleanup();
    } catch {
      // Nothing left to report to and nothing left to do about it.
    }
  }
}

/**
 * Install the handler. `exit` is a parameter only so a test can watch the code
 * without ending the test runner; nothing else should pass it.
 *
 * 130 and 143 are what a shell reports for a process killed by SIGINT and
 * SIGTERM — a script that checks `$?` should not learn a different number just
 * because the wizard tidied up on the way out.
 */
export function installInterruptHandler(exit: (code: number) => void = process.exit): () => void {
  if (installed) return () => undefined;
  const handler = (signal: NodeJS.Signals): void => {
    runInterruptCleanups();
    exit(signal === 'SIGINT' ? 130 : 143);
  };
  installed = handler;
  process.on('SIGINT', handler);
  process.on('SIGTERM', handler);
  return () => {
    process.off('SIGINT', handler);
    process.off('SIGTERM', handler);
    installed = null;
  };
}
