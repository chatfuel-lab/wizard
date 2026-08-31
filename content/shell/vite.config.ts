import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
/* @chatfuel:proxy-import (the wizard rewrites this to the vendored copy) */
import { chatfuelProxy } from '../vite-plugin-proxy/src/vite';
/* @chatfuel:end-proxy-import */
/* The app's own operation surface — the proxy refuses a document that is in
   none of these namespaces. The path is the same from all three hosts, so it is
   plain template text rather than a marked block. */
import { operations } from './src/operationDocs.js';

const dir = path.dirname(fileURLToPath(import.meta.url));

// Dual-mode aliases: a scaffolded app has src/vendor/{ui,api} (vendored
// sources); in the source repository the same aliases point at packages/*/src.
// Identical file in both modes — existsSync picks the target.
const vendored = existsSync(path.join(dir, 'src/vendor/ui'));
const uiDir = vendored ? path.join(dir, 'src/vendor/ui') : path.join(dir, '../ui/src');
const apiDir = vendored ? path.join(dir, 'src/vendor/api') : path.join(dir, '../api-client/src');

export default defineConfig({
  /*
   * Where this app is served from. '/' unless the app is mounted under a
   * sub-path of somebody else's domain, in which case the same value goes to
   * the production server as BASE_PATH: this rewrites the asset URLs in
   * index.html, and the router reads it back as import.meta.env.BASE_URL.
   */
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), chatfuelProxy({ operations })],
  resolve: {
    alias: [
      { find: /^~ui$/, replacement: path.join(uiDir, 'index.ts') },
      { find: /^~ui\//, replacement: `${uiDir}/` },
      { find: /^~api$/, replacement: path.join(apiDir, 'index.ts') },
      { find: /^~api\//, replacement: `${apiDir}/` },
    ],
  },
});
