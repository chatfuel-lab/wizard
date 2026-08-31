import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/bin.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  // bin/chatfuel-wizard.cjs loads dist/bin.js by name. On a node platform the extension would
  // otherwise be fixed to .mjs; following the package type keeps it .js.
  fixedExtension: false,
  // Workspace sources (api-client, module-manifest) are bundled; published runtime deps (clack, commander, graphql, …) stay external.
  deps: { alwaysBundle: [/^@chatfuel\//] },
  clean: true,
  outputOptions: {
    // Source doc comments explain this codebase to whoever edits it, not to whoever installs it —
    // and the bundle is installed. Keep them out of the shipped bytes; `legal` and `annotation`
    // stay on, and line comments are dropped by the bundler either way.
    comments: { jsdoc: false },
  },
});
