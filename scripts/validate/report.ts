import type { ValidateContext } from './context.ts';

let errorCount = 0;

export const fail = (msg: string): void => {
  console.error(`✗ ${msg}`);
  errorCount += 1;
};

/** Print the final line and set the exit code: 1 iff anything failed. */
export function summarize(ctx: ValidateContext): void {
  if (errorCount > 0) {
    console.error(`\n${errorCount} error(s).`);
    /* The exit code, not process.exit: console.error to a pipe — which is what
       CI hands this process — is asynchronous, and exiting throws away
       whatever has not been flushed yet. The code was right and the list of
       ✗ lines it was explaining arrived cut short. Set the code and let the
       process end on its own, after the writes are out. */
    process.exitCode = 1;
    return;
  }
  const narrowed = process.argv.length > 2 ? ` (pass 0 read only ${process.argv.slice(2).join(' ')})` : '';
  console.log(
    `\nAll checks passed. Measured: ${ctx.graphqlFileCount} GraphQL files, ${ctx.opCount} operations, ` +
      `${ctx.fragCount} fragments, ${ctx.manifests.size} manifests${narrowed}.\n` +
      `Every other pass ran and named nothing. Every tree they read is checked for existence ` +
      `before any of them runs (pass -1), so a pass that named nothing was a pass that had its ` +
      `subject in front of it.`,
  );
}
