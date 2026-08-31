/**
 * Two environment variables that must not reach anything the wizard starts.
 *
 * `npx --package=X ...` and `npx -c ...` export npm_config_package and
 * npm_config_call to every child, and `npm exec` reads its own configuration
 * from those. So a nested `npx <spec> <command>` — which is how the app's
 * deploy script reaches the Vercel CLI, and how the handoff starts an agent
 * whose global install was refused — sees a package list nobody asked for, and
 * npm's bin swap is skipped:
 *
 *   let needPackageCommandSwap = (args.length > 0) && (packages.length === 0)
 *
 * The spec is then run as a command, and the whole failure is one line from a
 * shell: `sh: vercel@latest: command not found`, from a CLI that installs fine.
 *
 * Dropped from this process rather than per spawn: everything here inherits
 * process.env, and the wizard has no use for either value. Only those two go —
 * npm_config_registry, _cache and _proxy are what lets a nested npx install
 * anything at all.
 */
const NPM_EXEC_VARS = ['npm_config_package', 'npm_config_call'];

/**
 * Delete them, whatever case they arrived in (environment names are
 * case-insensitive on Windows). Returns the names actually removed, for tests
 * and for `doctor`-style reporting.
 */
export function scrubNpmExecEnv(env: NodeJS.ProcessEnv = process.env): string[] {
  const removed: string[] = [];
  for (const key of Object.keys(env)) {
    if (!NPM_EXEC_VARS.includes(key.toLowerCase())) continue;
    delete env[key];
    removed.push(key);
  }
  return removed;
}
