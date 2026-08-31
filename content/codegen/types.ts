/**
 * The shape of a codegen config, described here rather than imported.
 *
 * `@graphql-codegen/cli` exports `CodegenConfig`, and importing it would be the
 * obvious thing. It cannot be done here: this directory is copied into every
 * generated app as `scripts/codegen/`, the app's `check` script runs
 * `tsc -p tsconfig.scripts.json` over `scripts/` with `strict`, and the codegen
 * toolchain is installed only by the people who actually extend the API. An
 * import of a package that is usually absent would turn `npm run check` red for
 * everyone else — including everyone who never runs codegen at all.
 *
 * So the shape is written out, narrowly: exactly the fields this repository
 * sets, and nothing else. The check that it is still the right shape has not
 * been lost, only moved to where the toolchain does exist — `codegen.ts` in
 * `content/api-client` assigns the result of `buildCodegenConfig` to a real
 * `CodegenConfig`, and this repository's own type check fails if the two
 * ever part company.
 */

/** The `config` block, applied to every target unless a target overrides it. */
export interface CodegenPluginConfig {
  useTypeImports?: boolean;
  onlyOperationTypes?: boolean;
  defaultScalarType?: string;
  scalars?: Record<string, string>;
  strictScalars?: boolean;
  documentMode?: string;
  inlineFragmentTypes?: string;
}

/** One generated file: the documents that go into it and the plugins that write it. */
export interface CodegenTarget {
  documents: string;
  plugins: string[];
  config?: CodegenPluginConfig;
}

/** What `graphql-codegen --config` is handed. */
export interface CodegenConfigShape {
  schema: string;
  config: CodegenPluginConfig;
  generates: Record<string, CodegenTarget>;
}
