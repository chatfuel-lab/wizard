import { OPERATIONS_IN_API, SCHEMA_IN_VENDOR } from './contentLock';

/**
 * The words every document uses for the regeneration cycle.
 *
 * The cycle is told in three places — the app's README, the chatfuel-core
 * playbook, and this command's output — and a reader who meets it twice must
 * meet the same sentence twice. Three paraphrases of one procedure read like
 * three procedures, and the one an agent follows is whichever it saw last.
 * test/codegenDocs.test.ts checks the copies against these.
 */
export const CODEGEN_COMMAND = 'npm run codegen';

/** Editing a document, from the edit to the commit. */
export const CODEGEN_CYCLE: readonly string[] = [
  `Edit the document: src/vendor/api/${OPERATIONS_IN_API}/<module>.graphql`,
  `Run ${CODEGEN_COMMAND} — the first run prints the one command that installs the generator, and stops.`,
  'Commit the regenerated files under src/vendor/api/generated/ together with the document you edited.',
];

/** The same cycle entered from the other end: an update moved the inputs. */
export const CODEGEN_AFTER_UPDATE: readonly string[] = [
  'Read the diff you have now — it is the new schema and operation documents.',
  `Run ${CODEGEN_COMMAND} — the first run prints the one command that installs the generator, and stops.`,
  'Read the second diff — it is the regenerated client under src/vendor/api/generated/.',
  'Commit both together. A client that does not match the documents beside it is worse than an old one.',
];

/**
 * A file the generator reads.
 *
 * Written against the vendored layout rather than an app-root path, because
 * the two modes put the same tree in two places: `src/vendor/…` in a scaffold,
 * `src/chatfuel/vendor/…` in an embed. Only the documents count — the possible
 * types beside the SDL are runtime data, and the generator never opens them.
 */
const CODEGEN_INPUT = new RegExp(`(?:^|/)vendor/(?:${SCHEMA_IN_VENDOR}|api/${OPERATIONS_IN_API})/[^/]+\\.graphql$`);

export const isCodegenInput = (at: string): boolean => CODEGEN_INPUT.test(at);

/** The module an operation document belongs to; the SDL belongs to none. */
export const moduleOfCodegenInput = (at: string): string | undefined =>
  new RegExp(`(?:^|/)vendor/api/${OPERATIONS_IN_API}/([^/]+)\\.graphql$`).exec(at)?.[1];
