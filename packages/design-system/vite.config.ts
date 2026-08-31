import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const dir = path.dirname(fileURLToPath(import.meta.url));
const uiDir = path.join(dir, '../../content/ui/src');

// Monorepo-only app: no vendored mode, no proxy plugin — the gallery renders
// the design system straight from content/ui/src.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5180 },
  resolve: {
    alias: [
      { find: /^~ui$/, replacement: path.join(uiDir, 'index.ts') },
      { find: /^~ui\//, replacement: `${uiDir}/` },
    ],
  },
});
