/**
 * The codegen config, built once and used from both ends.
 *
 * There are two places that run codegen against this schema: this repository,
 * where the generated client is committed, and every app the wizard scaffolds,
 * where the same generator has to keep working after the app has been changed.
 * The flags below were arrived at painfully — each comment records what breaks
 * without it — so they live here, in one body, rather than in two copies that
 * would drift apart the first time one of them was tuned.
 *
 * Nothing here imports `@graphql-codegen/*`; see `types.ts` for why.
 */
import type { CodegenConfigShape, CodegenTarget } from './types.ts';

/** One generated file: which documents go into it, and where it lands. */
export interface CodegenTargetInput {
  /** Module id, e.g. `flow-builder`. Selects the per-module overrides below. */
  id: string;
  /** Path to the module's operations, as codegen resolves it. */
  documents: string;
  /** Path of the file to write, as codegen resolves it. */
  output: string;
}

export interface CodegenInput {
  /** Path to the SDL, as codegen resolves it (relative to the working directory). */
  schema: string;
  /** The SDL itself, already read — the scalar map is derived from its text. */
  sdl: string;
  targets: CodegenTargetInput[];
}

/** All SDL scalars → 'string', except the known non-string wire shapes. */
export function buildScalarMap(sdl: string): Record<string, string> {
  const NON_STRING: Record<string, string> = {
    Long: 'number',
    Map: 'Record<string, unknown>',
  };
  const names = [...sdl.matchAll(/^scalar (\w+)/gm)].map((m) => m[1]);
  return Object.fromEntries(names.map((name) => [name!, NON_STRING[name!] ?? 'string']));
}

/**
 * Per-module overrides. Only one module needs one, and it needs it badly.
 *
 * flow-builder: operation results reference the exported *Fragment types
 * instead of re-inlining BlockParts/FlowParts into every result — the default
 * 'inline' re-expands the 30-variant element union per op and the generated
 * file reaches tens of MB, OOMing tsc at the default heap.
 */
const OVERRIDES: Record<string, CodegenTarget['config']> = {
  'flow-builder': { inlineFragmentTypes: 'combine' },
};

/**
 * One generates-entry per module: each module's documents stay an isolated
 * set, so identical-body fragment names repeated across modules (FileInfo,
 * AssigneeInfo, BotInfo, RoleInfo) never collide in a single run.
 */
export function buildCodegenConfig(input: CodegenInput): CodegenConfigShape {
  return {
    schema: input.schema,
    config: {
      useTypeImports: true,
      // Emit only the schema types the operations actually reach — the full
      // 8.8k-line SDL would otherwise inflate every generated file by ~1 MB.
      onlyOperationTypes: true,
      // strictScalars + a full map derived from the SDL: every scalar is an
      // opaque string on the wire except the exceptions in buildScalarMap, so
      // the blanket rule stays correct as the schema grows and codegen fails
      // loudly only if a scalar vanishes from the SDL while still referenced.
      defaultScalarType: 'unknown',
      scalars: buildScalarMap(input.sdl),
      strictScalars: true,
      // Documents as printed strings, not AST objects. Every documentNode mode
      // inlines each fragment's AST into every operation that spreads it (the
      // *ImportFragments variant too — read _gql() in client-side-base-visitor),
      // and flow-builder has 200+ operations over BlockParts/FlowParts, so the
      // same fragment ASTs were repeated hundreds of times as object literals
      // no bundler can dedupe: a 5.5 MB chunk. A string still carries the
      // fragments it needs, but as text — one literal per operation that
      // minifies and gzips like text — and the transport was only ever going
      // to print() the AST back into one anyway.
      documentMode: 'string',
    },
    generates: Object.fromEntries(
      input.targets.map((target) => [
        target.output,
        {
          documents: target.documents,
          plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
          ...(OVERRIDES[target.id] ? { config: OVERRIDES[target.id] } : {}),
        },
      ]),
    ),
  };
}
