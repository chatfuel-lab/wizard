/**
 * This repository's end of the generator.
 *
 * The body — the flags, the scalar map, the per-module overrides — lives in
 * `content/codegen`, because the app the wizard scaffolds runs the same one.
 * What is left here is the part that is only true of this repository: where the
 * schema and the documents sit, and where the output goes.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CodegenConfig } from '@graphql-codegen/cli';
import { buildCodegenConfig } from '../codegen/config.ts';

/* fileURLToPath, not `.pathname`: on Windows that yields `/C:/…`, and any
   path with a space in it comes back percent-encoded. */
const here = fileURLToPath(new URL('.', import.meta.url));

/** Paths as codegen resolves them: relative to `content/api-client`, its cwd. */
const SCHEMA = '../schema/schema.graphql';
const MODULES = '../modules';

/**
 * The modules with operations, read off the disk rather than listed.
 *
 * Three of the fourteen modules ship no `operations.graphql` — they call no API
 * of their own — and which ones those are has changed. A list here would be a
 * fourth copy of the fact, next to the manifests, the package exports and the
 * generated directory; the directory that already answers it is used instead.
 */
const modules = readdirSync(join(here, MODULES), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((id) => {
    try {
      readFileSync(join(here, MODULES, id, 'skill/examples/operations.graphql'));
      return true;
    } catch {
      return false;
    }
  })
  .sort();

const config = buildCodegenConfig({
  schema: SCHEMA,
  sdl: readFileSync(join(here, SCHEMA), 'utf8'),
  targets: modules.map((id) => ({
    id,
    documents: `${MODULES}/${id}/skill/examples/operations.graphql`,
    output: `src/generated/${id}/graphql.ts`,
  })),
});

/**
 * The shared body describes the config shape itself, so that an app without the
 * codegen toolchain installed still typechecks. This assignment is where the
 * two are held together: the toolchain IS installed here, and this file fails
 * to compile the day the hand-written shape stops being a real `CodegenConfig`.
 */
const checked: CodegenConfig = config;

export default checked;
