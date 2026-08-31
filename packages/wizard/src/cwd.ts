import { resolve } from 'node:path';

/**
 * Where the user actually stood when they started the wizard.
 *
 * `process.cwd()` is not that under a package-manager run: `pnpm --filter
 * @chatfuel/wizard dev` moves into `packages/wizard`, so a default
 * `./chatfuel-app` used to be created INSIDE this repo, where the workspace
 * then swallowed its install and left it without node_modules. npm and pnpm
 * both export the original directory as INIT_CWD.
 */
export function userCwd(): string {
  return process.env.INIT_CWD ?? process.cwd();
}

/** resolve() against the user's directory rather than the process's. */
export function resolveFromUserCwd(path: string): string {
  return resolve(userCwd(), path);
}
