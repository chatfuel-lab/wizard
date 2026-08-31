/**
 * The deployment's settings, as a module may read them.
 *
 * `config/` sits at the shell's root, outside every module subtree, and the
 * module boundary is what stops a module reaching for it — the same boundary
 * that stops it reaching for another module's files. But a setting is not
 * another module's business; it is the deployment's, and a module that formats
 * money or opens a calendar has to know what this deployment decided. So the
 * config is re-exported here, beside `types.ts` and `shellApi.ts`, and a module
 * imports `../shellConfig` rather than climbing out of its own tree.
 *
 * A third contract file rather than another export on `shellApi.ts` for the
 * reason `types.ts` is its own file: `shellApi.ts` brings React with it, and
 * the callers here are plain `lib/` modules that today compile to arithmetic
 * and a string.
 *
 * Read-only, because `APP_CONFIG` is frozen: a setting is a fact about the
 * deployment, so nothing that reads it may also set it.
 */
export type { AppConfig } from '../config';
export { APP_CONFIG } from '../config';
