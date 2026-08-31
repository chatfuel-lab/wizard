/**
 * The trees the wizard installs on a user's disk.
 *
 * One list, imported by everything that has an opinion about it: the gate that
 * scans what ships, the lock that pins it, and the packaging script. It used to
 * be written out three times, and three copies of one fact is the shape every
 * drift bug in this repository has had.
 *
 * Every one of them lives under `content/`, which is what that directory is for:
 * `content/shell` is the scaffold template, the three `src` trees are vendored
 * into every generated app, `content/modules` carries the manifests, migrations,
 * skills and route code each module contributes, `content/skills` carries the
 * ones that belong to no module — the wizard's own, installed with every app
 * whatever was picked — `content/schema` holds the SDL the whole repository
 * is generated from, which belongs to no single module and is read by both the
 * codegen here and the one that ships with every app, and `content/codegen` is
 * that generator's shared body, copied into every app beside it.
 */
export const CONTENT_TREE = {
  shell: 'content/shell',
  ui: 'content/ui/src',
  apiClient: 'content/api-client/src',
  proxy: 'content/vite-plugin-proxy/src',
  modules: 'content/modules',
  skills: 'content/skills',
  schema: 'content/schema',
  codegen: 'content/codegen',
} as const;

/**
 * The same trees as a list, for everything that walks them rather than naming one.
 * Derived so that a tree added above cannot be missed here.
 */
export const CONTENT_TREES = Object.values(CONTENT_TREE);

/**
 * The two files in `content/schema`, and the two places each one is installed.
 *
 * They are one source with two audiences. An agent reads the SDL through the
 * core skill, where every skill document already points at it as
 * `references/schema.graphql`; the app's codegen reads it from a path inside
 * the app, because a skill directory may have been installed to the user's home
 * instead and the app cannot reach it there. So the scaffold writes both, and
 * this is the one place that says so — the skill-reference lint resolves the
 * first against it, and the scaffold writes the second from it.
 */
export const SCHEMA_FILES = ['schema.graphql', 'possible-types.json'] as const;

/** Inside an installed core skill, relative to the skill root. */
export const SCHEMA_IN_SKILL = 'references';

/**
 * Inside a generated app, beside the other vendored trees.
 *
 * Relative to the vendor directory rather than to the app, because the two
 * install modes put that directory in different places — `src/vendor` in a
 * standalone app, `src/chatfuel/vendor` inside a host project.
 */
export const SCHEMA_IN_VENDOR = 'schema';

/**
 * Where a generated app keeps the operation documents it generates from,
 * relative to the vendored api-client.
 *
 * In this repository they live under each module's skill, one per module, and
 * they are what the skill teaches an agent to edit. An app may have sent its
 * skills to the user's home directory, so it gets its own copy beside the
 * client they produce — that pair, source and output, is what makes the cycle
 * "edit the document, re-run codegen" possible in an app at all.
 */
export const OPERATIONS_IN_API = 'operations';

/**
 * Where the module manifests travel inside the published package.
 *
 * The picker has to draw before anything is fetched, so these few files ship
 * while the trees do not. Named here because prepack fills this directory and
 * the wizard reads it, and those two have to be the same directory.
 */
export const MANIFEST_DIR = 'manifests';
