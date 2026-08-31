#!/usr/bin/env node
// Repo-wide validation:
//   1. every *.graphql operations document validates against the SDL in
//      content/schema/schema.graphql, which is also what codegen reads at both
//      ends — one file, so there is nothing to keep in sync
//   2. modules/*/module.json manifests: ajv against module.schema.json + semantic checks
//      (id == dirname, unique installAs, known deps, no requires-cycles, SKILL.md frontmatter)
//   3. reference lint over modules/*/skill/ and content/skills/* files: path references must be
//      written in installed form (intra-skill from the skill root, cross-skill as
//      ../chatfuel-<id>/...), stay inside the module's requires closure (+ direct recommends +
//      core) — content/skills/* belong to no module, so theirs is core alone — and resolve to
//      real files.
//      Bare path tokens in markdown prose (outside code spans) are an error. Application-code
//      references (.ts/.tsx) in code spans must resolve against the module's app tree.
//   4. cross-module name collisions: duplicate operation names are an error; duplicate fragment
//      names are allowed only with byte-identical bodies (self-contained-by-design duplicates)
//   5. the possible-types.json beside that SDL must be what the SDL derives to
//  4c. every type the SDL declares is reachable from Query, Mutation or Subscription — the SDL
//      is a trimmed subset, and trimming a root field leaves the subtree behind it published
//      and uncallable
//   7. shell integrity: every ready module with app has content/shell/src/modules/<id>/index.tsx
//      (and its manifest's `hidden` flag matches the descriptor's)
//      exporting moduleDescriptor, is listed in the shell registry (exactly), has handoff.md,
//      and its embed.roots resolve under content/shell
//   8. template invariants: marked blocks present; tsconfig fallback paths match the
//      pruneTsconfigFallbacks regex shape
//   9. codegen coverage: every codegen module id has an operations.graphql; every ready module
//      with app is in the codegen list
//  10. import boundaries: module code under content/shell/src/modules/<id>/ imports only react,
//      ~ui, ~api (generated docs: own module or core), the ../types contract, its own subtree,
//      and npm deps declared in its module.json embed.npmDependencies; shell-level files never
//      deep-import module subtrees (the registry file is the sanctioned exception)
//  12. Supabase migration hygiene: modules/*/supabase/migrations/*.sql — re-runnable DDL,
//      security-definer + empty search_path + revoked execute on every function, no 64-hex,
//      PostgREST schema reload
//  13. publishability: nothing in the trees the wizard packs may carry non-English text,
//      a name only we can see (a ticket, an environment, a person, a repo-only tool) or a
//      credential — see scripts/check-publishable.ts
//  10b. provider/consumer split: the component rendering <IdContext.Provider> must not itself
//      call a hook that needs it (directly or via the module's own hooks) — that throws at
//      runtime, and neither tsc nor a node-only vitest can see it
//  10c. intra-module import cycles: the file graph of content/shell/src/modules/<id>/ must be
//      acyclic over value imports (type-only edges erase at compile time and are exempt)
//  14. bot fence coverage: every argument of type BotID in the SDL is one the
//      proxy's fence can see — either named botID, or listed by field in the proxy's
//      BOT_ID_ARGUMENT_BY_FIELD. One it cannot see is a bot reached under the master token
//  15. every target="_blank" in packages/ and content/ carries a rel — nothing else
//      checks it: eslint-plugin-react is not configured, and content/modules/ is a
//      globalIgnores entry
//  16. every mechanism SECURITY.md's scope section names still exists in the file the same
//      bullet attributes it to — a promised gate that was renamed reads as one that is there
//  17. the proxy's allowedOperations.ts is what the modules' operations.graphql derive to —
//      it is generated (scripts/allowed-operations.ts), and a stale copy 403s a real feature
//  18. every name in a ```graphql block in markdown is one the bundled SDL has. Those blocks
//      are excerpts and sketches rather than documents, so pass 0 never sees them: a renamed
//      field goes on being taught to an agent long after the schema dropped it
// Usage: node scripts/validate.ts [files or dirs...]
// Those arguments REPLACE the GraphQL document root of pass 0 (content/modules by
// default) and are ignored by every other pass, which always read the whole repo.
// Requires `graphql` (v16+) and `ajv` (v8+).
//
// The passes live in scripts/validate/passes/, one module per pass, and run in
// the order below over a single shared context (scripts/validate/context.ts).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSchema } from 'graphql';
import { checkPublishable } from './check-publishable.ts';
import type { ValidateContext } from './validate/context.ts';
import { fail, summarize } from './validate/report.ts';
import { checkTrees } from './validate/passes/trees.ts';
import { checkManifests } from './validate/passes/manifests.ts';
import { checkSkillReferences } from './validate/passes/skill-references.ts';
import { checkGraphqlDocuments } from './validate/passes/graphql-documents.ts';
import { checkNameCollisions } from './validate/passes/name-collisions.ts';
import { checkPossibleTypes } from './validate/passes/possible-types.ts';
import { checkSchemaReachability } from './validate/passes/schema-reachability.ts';
import { checkAssetTwins } from './validate/passes/asset-twins.ts';
import { checkShellIntegrity } from './validate/passes/shell-integrity.ts';
import { checkTemplateInvariants } from './validate/passes/template-invariants.ts';
import { checkCodegenCoverage } from './validate/passes/codegen-coverage.ts';
import { checkMigrations } from './validate/passes/migrations.ts';
import { checkImportBoundaries } from './validate/passes/import-boundaries.ts';
import { checkProviderConsumerSplit } from './validate/passes/provider-consumer.ts';
import { checkImportCycles } from './validate/passes/import-cycles.ts';
import { checkDesignSystem } from './validate/passes/design-system.ts';
import { checkClassnames } from './validate/passes/design-classnames.ts';
import { checkNulBytes } from './validate/passes/nul-bytes.ts';
import { checkBotFence, checkResourceFence, checkResourceIdNames } from './validate/passes/bot-fence.ts';
import { checkTargetBlank } from './validate/passes/target-blank.ts';
import { checkSecurityScope } from './validate/passes/security-scope.ts';
import { checkOperationAllowlist } from './validate/passes/operation-allowlist.ts';
import { checkOperationDocs } from './validate/passes/operation-docs.ts';
import { checkMarkdownGraphql } from './validate/passes/markdown-graphql.ts';
import { checkContentIndex } from './validate/passes/content-index.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const ctx: ValidateContext = {
  root,
  modulesDir: join(root, 'content', 'modules'),
  shellDir: join(root, 'content', 'shell'),
  uiSrc: join(root, 'content', 'ui', 'src'),
  schemaDir: join(root, 'content', 'schema'),
  schema: buildSchema(readFileSync(join(root, 'content', 'schema', 'schema.graphql'), 'utf8')),
  manifests: new Map(),
  installMap: new Map(),
  docs: new Map(),
  graphqlFileCount: 0,
  opCount: 0,
  fragCount: 0,
};

// Nothing below can read a tree that is not there, so the run stops here rather
// than letting twenty passes report their own silence as success. The failures
// pass -1 recorded are printed by summarize below, which sets the exit code.
if (checkTrees(ctx)) {
  checkManifests(ctx); // pass 1 — module manifests
  checkSkillReferences(ctx); // pass 2 — skill reference lint
  checkGraphqlDocuments(ctx); // pass 0 — GraphQL documents vs schema
  checkNameCollisions(ctx); // pass 3 — cross-file name collisions
  checkPossibleTypes(ctx); // pass 4 — possible-types.json vs the SDL
  checkSchemaReachability(ctx); // pass 4c — every declaration in the SDL is reachable from a root
  checkAssetTwins(ctx); // pass 4b — shipped asset twins
  checkShellIntegrity(ctx); // pass 7 — shell integrity
  checkTemplateInvariants(ctx); // pass 8 — template invariants
  checkCodegenCoverage(ctx); // pass 9 — codegen coverage
  checkMigrations(ctx); // pass 12 — Supabase migration hygiene
  checkImportBoundaries(ctx); // pass 10 — import boundaries
  checkProviderConsumerSplit(ctx); // pass 10b — provider/consumer split
  checkImportCycles(ctx); // pass 10c — intra-module import cycles
  checkBotFence(ctx); // pass 14 — the proxy's bot fence covers every BotID argument
  checkResourceFence(ctx); // pass 14b — and its resource fence skips every account-scoped id
  checkResourceIdNames(ctx); // pass 14c — and reads every bot-scoped id, whatever its argument is called
  checkTargetBlank(ctx); // pass 15 — every target="_blank" carries a rel
  checkSecurityScope(ctx); // pass 16 — SECURITY.md's scope names mechanisms that exist
  checkOperationAllowlist(ctx); // pass 17 — the proxy's operation allowlist vs the shipped documents
  checkOperationDocs(ctx); // pass 17b — the shell's operation barrel vs the generated namespaces
  checkMarkdownGraphql(ctx); // pass 18 — the GraphQL names in shipped markdown vs the SDL
  checkContentIndex(ctx); // pass 19 — content.index.json vs the trees it describes

  // Pass 11 — design-system integrity
  //   a. the two dark-mode blocks in tokens.css declare the same property set
  //   b. no raw color literal in a content/ui component (icons/ is markup)
  //   c. content/ui/src matches the vendored snapshot the wizard ships
  //   d. every component file is re-exported from index.ts (internal/ opts out)
  //   e. `focus-ring` is only ever used as `focus-visible:focus-ring`
  //   g. no viewport prefix in module code — a module is sized by its container
  //   h. no text-[Npx] — every size a module needs has a role in the type scale
  checkDesignSystem(ctx); // (a), (b), (e), (d)
  await checkClassnames(ctx); // (g), (h), (i), (j)
  checkNulBytes(ctx); // (k)

  // (c) was a byte-parity check between content/ui/src and a committed copy at
  // packages/wizard/chatfuel-app/src/vendor/ui. That directory is gone: it was an
  // early clone of content/shell that described itself as the scaffold template
  // while the wizard has always copied content/shell (content.ts's shellPath). Its
  // vendor tree was the only part anything read, and only this pass read it — the
  // wizard cpSyncs content/ui/src into a target at scaffold time, so there was
  // never any drift for it to catch except its own.

  // ---------------------------------------------------------------------------
  // Pass 13 — publishability of the trees the wizard packs
  // ---------------------------------------------------------------------------
  for (const problem of checkPublishable({ mode: 'source' })) fail(problem);
}

summarize(ctx);
