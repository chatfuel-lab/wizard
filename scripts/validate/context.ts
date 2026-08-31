// Shared state the passes hand each other. The entry (scripts/validate.ts)
// builds one ValidateContext and threads it through every pass in order:
// pass 1 fills `manifests` and `installMap` (read by passes 2, 7, 8, 9, 10
// and 12), pass 0 fills `docs` and the counts (read by pass 3 and the final
// summary line).
import type { DocumentNode, GraphQLSchema } from 'graphql';

/**
 * The slice of modules/<id>/module.json the validator reads.
 * packages/module-manifest/module.schema.json (ajv, pass 1) is the authority on the
 * full shape; this type only names the fields the passes consume.
 */
export interface ModuleManifest {
  id?: string;
  status?: string;
  hidden?: boolean;
  requires?: string[];
  recommends?: string[];
  skill?: { dir?: string; installAs?: string };
  app?: {
    embed?: {
      roots?: string[];
      playbook?: string;
      entryComponent?: string;
      npmDependencies?: Record<string, string>;
    };
  };
}

interface InstallTarget {
  id: string;
  skillDir: string;
}

export interface ValidateContext {
  root: string;
  modulesDir: string;
  shellDir: string;
  uiSrc: string;
  /** content/schema — the SDL and the possible-types map derived from it. */
  schemaDir: string;
  schema: GraphQLSchema;
  /** id -> manifest (pass 1). */
  manifests: Map<string, ModuleManifest>;
  /** installAs -> { id, skillDir } (pass 1). */
  installMap: Map<string, InstallTarget>;
  /** file -> AST (pass 0). */
  docs: Map<string, DocumentNode>;
  graphqlFileCount: number;
  opCount: number;
  fragCount: number;
}

const transitiveRequires = (
  manifests: Map<string, ModuleManifest>,
  id: string,
  acc: Set<string> = new Set(),
): Set<string> => {
  for (const dep of manifests.get(id)?.requires ?? []) {
    if (!acc.has(dep)) {
      acc.add(dep);
      transitiveRequires(manifests, dep, acc);
    }
  }
  return acc;
};

export const closure = (manifests: Map<string, ModuleManifest>, id: string): Set<string> => {
  const set = transitiveRequires(manifests, id);
  for (const dep of manifests.get(id)?.recommends ?? []) set.add(dep);
  set.add(id);
  set.add('core');
  return set;
};
