/**
 * This app's end of the generator.
 *
 * The body — the flags, the scalar map, the per-module overrides — is in
 * `scripts/codegen/`, copied out of the repository the wizard scaffolded from
 * so that this app generates byte-for-byte what upstream generates. What is
 * here is the part that is only true of this app: where its schema and its
 * documents sit, and where the client goes.
 *
 * Run it with `npm run codegen`, not with the codegen CLI directly. The
 * toolchain is 265 packages this app does not otherwise need, so it is not a
 * dependency; the script checks for it, prints the one command that installs
 * it and stops when it is absent, and afterwards runs the whole cycle —
 * generate, hoist the shared fragment types, record what it generated from.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCodegenConfig } from './scripts/codegen/config.ts';

/* fileURLToPath, not `.pathname`: on Windows that yields `/C:/…`, and any
   path with a space in it comes back percent-encoded. */
const here = fileURLToPath(new URL('.', import.meta.url));

/** Paths as codegen resolves them: relative to the app root, its cwd. */
const SCHEMA = 'src/vendor/schema/schema.graphql';
const OPERATIONS = 'src/vendor/api/operations';

/**
 * The modules this app took, read off the disk rather than listed.
 *
 * The wizard wrote one document per module it installed, and `update` may add
 * or remove one later. A list here would go stale the first time that happened
 * — and it would go stale silently, by generating a client for a module whose
 * documents are gone.
 */
const modules = readdirSync(join(here, OPERATIONS))
  .filter((name) => name.endsWith('.graphql'))
  .map((name) => name.slice(0, -'.graphql'.length))
  .sort();

export default buildCodegenConfig({
  schema: SCHEMA,
  sdl: readFileSync(join(here, SCHEMA), 'utf8'),
  targets: modules.map((id) => ({
    id,
    documents: `${OPERATIONS}/${id}.graphql`,
    output: `src/vendor/api/generated/${id}/graphql.ts`,
  })),
});
