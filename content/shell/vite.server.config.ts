import { defineConfig } from 'vite';

/**
 * Builds the production server (`server/entry.ts` → `server/dist/entry.js`).
 * Deliberately plugin-free: no react, no tailwind — this bundle never touches
 * the client. The runtime dependencies the server actually loads stay external
 * — `ws` for the relay, and the two proxy libraries the outbound side uses;
 * node built-ins are external by default in an SSR build.
 *
 *   npm run build         # client + server
 *   npm run build:server  # this config alone
 *   npm start             # node server/dist/entry.js
 */
export default defineConfig({
  build: {
    ssr: 'server/entry.ts',
    outDir: 'server/dist',
    emptyOutDir: true,
    target: 'node22',
    rollupOptions: {
      external: ['ws', 'undici', 'https-proxy-agent'],
      output: { entryFileNames: 'entry.js' },
    },
  },
});
