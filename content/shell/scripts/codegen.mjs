/**
 * Regenerates `src/vendor/api/generated/` from `src/vendor/api/operations/`.
 *
 * The generator is not a dependency of this app. It is 265 packages and 62 MB
 * that nothing but this command needs, and an app that never edits a GraphQL
 * document would carry all of it for nothing. So this script does not install
 * anything: it prints the one command that adds the toolchain, with the
 * versions already filled in, and stops. Adding dependencies to a project is
 * the project owner's decision, and this is the only place the decision comes
 * up.
 *
 * The versions are pinned rather than ranged because the plugins decide the
 * shape of the generated code. A patch release that renames a generated type
 * is not a break for graphql-codegen; it is a break for every file in this app
 * that imports one. These are the versions the vendored client was generated
 * with upstream.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

const TOOLCHAIN = [
  '@graphql-codegen/cli@5.0.7',
  '@graphql-codegen/typescript@4.1.6',
  '@graphql-codegen/typescript-operations@4.6.1',
  '@graphql-codegen/typed-document-node@5.1.2',
  /* The three plugins above share this one, and it is the half that writes the
     types. Naming it here is what stops two of them resolving two copies. */
  '@graphql-codegen/visitor-plugin-common@5.8.0',
  /* Loads the TypeScript config and the hoisting pass; the CLI picks it up. */
  'tsx@4.23.12',
];

/** Whichever package manager wrote the lockfile is the one to be told. */
const MANAGERS = [
  { lock: 'pnpm-lock.yaml', install: 'pnpm add -D -E' },
  { lock: 'yarn.lock', install: 'yarn add -D -E' },
  { lock: 'bun.lockb', install: 'bun add -d -E' },
  { lock: 'bun.lock', install: 'bun add -d -E' },
  { lock: 'package-lock.json', install: 'npm install --save-dev --save-exact' },
];

const manager = MANAGERS.find((m) => existsSync(join(root, m.lock))) ?? MANAGERS[MANAGERS.length - 1];

const require = createRequire(join(root, 'package.json'));
let installed = true;
try {
  require.resolve('@graphql-codegen/cli');
} catch {
  installed = false;
}

if (!installed) {
  console.error('The GraphQL generator is not installed. Add it once, then run this again:\n');
  console.error(`  ${manager.install} \\\n    ${TOOLCHAIN.join(' \\\n    ')}\n`);
  console.error('The versions are the ones the vendored client was generated with; do not widen them.');
  process.exit(1);
}

/** @param {string} file @param {string[]} args */
const run = (file, args) => {
  execFileSync(file, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
};

/* Package managers all write node_modules/.bin; npx is the fallback for a run
   that installed into a store somewhere else. */
const local = join(
  root,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'graphql-codegen.cmd' : 'graphql-codegen',
);
if (existsSync(local)) run(local, ['--config', 'codegen.ts']);
else run('npx', ['--no-install', 'graphql-codegen', '--config', 'codegen.ts']);

run(process.execPath, [
  '--import',
  'tsx',
  join('scripts', 'codegen', 'hoist-cli.ts'),
  join('src', 'vendor', 'api', 'generated'),
]);

/* What the client was generated from, written down beside it. `chatfuel
   update` refreshes the schema and the documents but cannot regenerate the
   client — the toolchain may not be here — so it compares these digests
   against the files on disk and tells the reader when the two have parted.
   The algorithm matches the one the app lock uses, so a value here and the
   sha256 of the same file in .chatfuel/lock.json are the same string. */
/** @param {string} file */
const digest = (file) => createHash('sha256').update(readFileSync(file)).digest('base64');

const operationsDir = join(root, 'src', 'vendor', 'api', 'operations');
const stamp = {
  schema: digest(join(root, 'src', 'vendor', 'schema', 'schema.graphql')),
  operations: Object.fromEntries(
    readdirSync(operationsDir)
      .filter((name) => name.endsWith('.graphql'))
      .sort()
      .map((name) => [name.slice(0, -'.graphql'.length), digest(join(operationsDir, name))]),
  ),
};
writeFileSync(
  join(root, 'src', 'vendor', 'api', 'generated', '.codegen-inputs.json'),
  `${JSON.stringify(stamp, null, 2)}\n`,
  'utf8',
);
